"""
TabPFN Engine for Prior Labs Tabular Foundation Model Integration.
Supports Prior Labs syntax: output_type='quantiles', quantiles=[0.1, 0.5, 0.9].
Implements tri-state fallback: local TabPFN -> client TabPFN -> deterministic baseline.
Non-TabPFN outputs are explicitly labeled "baseline (not TabPFN)".
"""

import sys
import logging
import numpy as np
from typing import List, Dict, Any, Optional, Tuple

from config import settings
from services.baseline_models import (
    DeterministicEnsembleBaseline,
    compute_forecast_agreement,
    MODEL_LABEL_BASELINE
)

logger = logging.getLogger("tabpfn_engine")

# Probe for local TabPFN package
LOCAL_TABPFN_AVAILABLE = False
try:
    import tabpfn
    LOCAL_TABPFN_AVAILABLE = True
    LOCAL_TABPFN_VERSION = getattr(tabpfn, "__version__", "2.0.0")
except ImportError:
    LOCAL_TABPFN_VERSION = None

# Probe for client TabPFN package
CLIENT_TABPFN_AVAILABLE = False
try:
    import tabpfn_client
    CLIENT_TABPFN_AVAILABLE = True
    CLIENT_TABPFN_VERSION = getattr(tabpfn_client, "__version__", "0.1.0")
except ImportError:
    CLIENT_TABPFN_VERSION = None


class TabPFNEngine:
    """
    Manages TabPFN Regressor and Classifier executions across local and client modes,
    with seamless fallback to deterministic baseline models.
    """

    def __init__(self):
        self.mode = settings.TABPFN_MODE
        self.token = settings.TABPFN_TOKEN
        self.quantiles = settings.DEFAULT_QUANTILES

    def get_status(self) -> Dict[str, Any]:
        """Returns engine status, active mode, and package availability."""
        active_mode = self.resolve_active_mode()
        return {
            "configured_mode": self.mode,
            "active_mode": active_mode,
            "local_package_available": LOCAL_TABPFN_AVAILABLE,
            "local_version": LOCAL_TABPFN_VERSION,
            "client_package_available": CLIENT_TABPFN_AVAILABLE,
            "client_version": CLIENT_TABPFN_VERSION,
            "token_configured": bool(self.token),
            "quantiles": self.quantiles
        }

    def resolve_active_mode(self, request_token: Optional[str] = None) -> str:
        """Determines the active operational mode based on config and environment."""
        token = request_token or self.token
        if self.mode == "off":
            return "off"
        elif self.mode == "local" and LOCAL_TABPFN_AVAILABLE:
            return "local"
        elif self.mode == "client" and (CLIENT_TABPFN_AVAILABLE or token):
            return "client"
        elif self.mode == "auto":
            if LOCAL_TABPFN_AVAILABLE:
                return "local"
            if CLIENT_TABPFN_AVAILABLE and token:
                return "client"
            return "off"
        return "off"

    def predict_regression_quantiles(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_test: np.ndarray,
        history_series: List[float],
        om_guidance: Optional[List[float]] = None,
        request_token: Optional[str] = None,
        clamp_min: float = 0.0
    ) -> Dict[str, Any]:
        """
        Executes TabPFN quantile regression using Prior Labs syntax:
        output_type='quantiles', quantiles=[0.1, 0.5, 0.9]

        Fallback chain:
        1. Local TabPFN if requested / available
        2. Client TabPFN if token / client package available
        3. Deterministic baseline labeled "baseline (not TabPFN)"
        """
        active_mode = self.resolve_active_mode(request_token)
        horizon = len(X_test)
        token = request_token or self.token

        # 1. Attempt Local TabPFN
        if active_mode == "local" or (self.mode == "local" and LOCAL_TABPFN_AVAILABLE):
            try:
                from tabpfn import TabPFNRegressor
                regressor = TabPFNRegressor(device="cpu")
                regressor.fit(X_train, y_train)

                # Prior Labs official syntax
                preds = regressor.predict(
                    X_test,
                    output_type="quantiles",
                    quantiles=self.quantiles
                )

                # preds is shape (n_samples, 3) where columns correspond to quantiles [0.1, 0.5, 0.9]
                p10 = [round(max(clamp_min, float(p[0])), 2) for p in preds]
                p50 = [round(max(clamp_min, float(p[1])), 2) for p in preds]
                p90 = [round(max(clamp_min, float(p[2])), 2) for p in preds]

                agreement = compute_forecast_agreement(p50, om_guidance) if om_guidance else 90.0

                return {
                    "ok": True,
                    "model": f"TabPFN (local)",
                    "version": LOCAL_TABPFN_VERSION or "2.0",
                    "quantiles": {"p10": p10, "p50": p50, "p90": p90},
                    "agreement": agreement,
                    "fallback": False
                }
            except Exception as e:
                logger.warning(f"Local TabPFN execution failed: {e}. Cascading to client/fallback.")

        # 2. Attempt Client TabPFN
        if (active_mode == "client" or token) and CLIENT_TABPFN_AVAILABLE:
            try:
                from tabpfn_client import TabPFNRegressor, init
                if token:
                    init(token=token)

                regressor = TabPFNRegressor()
                regressor.fit(X_train, y_train)

                preds = regressor.predict(
                    X_test,
                    output_type="quantiles",
                    quantiles=self.quantiles
                )

                p10 = [round(max(clamp_min, float(p[0])), 2) for p in preds]
                p50 = [round(max(clamp_min, float(p[1])), 2) for p in preds]
                p90 = [round(max(clamp_min, float(p[2])), 2) for p in preds]

                agreement = compute_forecast_agreement(p50, om_guidance) if om_guidance else 90.0

                return {
                    "ok": True,
                    "model": "TabPFN (client)",
                    "version": CLIENT_TABPFN_VERSION or "0.1",
                    "quantiles": {"p10": p10, "p50": p50, "p90": p90},
                    "agreement": agreement,
                    "fallback": False
                }
            except Exception as e:
                logger.warning(f"Client TabPFN execution failed: {e}. Cascading to baseline.")

        # 3. Deterministic Baseline Fallback (Strictly labeled "baseline (not TabPFN)")
        fallback_res = DeterministicEnsembleBaseline.forecast(
            history=history_series,
            horizon=horizon,
            quantiles=self.quantiles,
            clamp_min=clamp_min,
            om_guidance=om_guidance
        )

        return {
            "ok": True,
            "model": MODEL_LABEL_BASELINE,
            "version": "1.0",
            "quantiles": fallback_res["quantiles"],
            "agreement": fallback_res["agreement"],
            "fallback": True
        }


engine = TabPFNEngine()
