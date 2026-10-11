"""
Configuration for Sobuj Ghonta ML Sidecar.
Supports Prior Labs TabPFN integration modes: 'local', 'client', 'off', 'auto'.
"""

import os
from typing import List, Literal

TabpfnMode = Literal["local", "client", "off", "auto"]

class Settings:
    # Mode: 'local', 'client', 'off', or 'auto' (detects availability)
    TABPFN_MODE: str = os.getenv("TABPFN_MODE", "auto").lower()

    # Prior Labs Client Access Token
    TABPFN_TOKEN: str = (
        os.getenv("TABPFN_TOKEN")
        or os.getenv("TABPFN_API_KEY")
        or os.getenv("PRIOR_LABS_API_KEY")
        or ""
    )

    # Server binding
    ML_HOST: str = os.getenv("ML_HOST", "127.0.0.1")
    ML_PORT: int = int(os.getenv("ML_PORT", "8000"))

    # Quantiles according to Prior Labs syntax
    DEFAULT_QUANTILES: List[float] = [0.1, 0.5, 0.9]

    # Anomaly detection statistical parameters
    ANOMALY_Z_THRESHOLD: float = float(os.getenv("ANOMALY_Z_THRESHOLD", "2.0"))
    ANOMALY_QUANTILE_THRESHOLD: float = float(os.getenv("ANOMALY_QUANTILE_THRESHOLD", "0.95"))
    AQI_SAFETY_LIMIT: float = 150.0
    APPARENT_TEMP_SAFETY_LIMIT: float = 38.0

settings = Settings()
