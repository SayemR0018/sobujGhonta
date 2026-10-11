"""
tests/adversarial/test_sidecar_adversarial.py
Adversarial stress harness for Python ML sidecar services and FastAPI endpoints.
Tests extreme inputs: empty arrays, single-item arrays, NaN values, extreme AQI, extreme cold, extreme UV.
"""

import math
import numpy as np
import pytest
from fastapi.testclient import TestClient

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "ml"))

from app import app
from services.forecast_pipeline import engineer_tabular_features, run_multi_target_forecast
from services.baseline_models import (
    DeterministicEnsembleBaseline,
    PersistenceBaseline,
    SeasonalNaiveBaseline,
    compute_forecast_agreement
)
from services.anomaly_detector import detect_environmental_anomaly

client = TestClient(app)

def test_sidecar_health():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"

def test_sidecar_extreme_zero_aqi():
    zeros = [0.0] * 96
    times = [f"2026-10-08T{h%24:02d}:00:00Z" for h in range(96)]
    payload = {
        "lat": 23.74,
        "lon": 90.40,
        "history": {
            "times": times,
            "us_aqi": zeros,
            "pm2_5": zeros,
            "temp": [25.0] * 96,
            "apparent_temp": [25.0] * 96,
            "uv": [0.0] * 96
        },
        "horizonHours": 24
    }
    res = client.post("/forecast", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    quantiles = data["forecasts"]["us_aqi"]
    p10, p50, p90 = quantiles["p10"], quantiles["p50"], quantiles["p90"]
    assert len(p10) == 24
    for i in range(24):
        assert p10[i] <= p50[i] <= p90[i]
        assert p10[i] >= 0.0

def test_sidecar_extreme_500_aqi():
    high = [500.0] * 96
    times = [f"2026-10-08T{h%24:02d}:00:00Z" for h in range(96)]
    payload = {
        "lat": 23.74,
        "lon": 90.40,
        "history": {
            "times": times,
            "us_aqi": high,
            "pm2_5": [250.0] * 96,
            "temp": [35.0] * 96,
            "apparent_temp": [42.0] * 96,
            "uv": [12.0] * 96
        },
        "horizonHours": 24
    }
    res = client.post("/forecast", json=payload)
    assert res.status_code == 200
    data = res.json()
    quantiles = data["forecasts"]["us_aqi"]
    p10, p50, p90 = quantiles["p10"], quantiles["p50"], quantiles["p90"]
    for i in range(24):
        assert p10[i] <= p50[i] <= p90[i]

def test_sidecar_extreme_subzero_temp():
    cold = [-40.0] * 96
    times = [f"2026-10-08T{h%24:02d}:00:00Z" for h in range(96)]
    payload = {
        "lat": 64.14,
        "lon": -21.94,
        "history": {
            "times": times,
            "us_aqi": [20.0] * 96,
            "pm2_5": [5.0] * 96,
            "temp": cold,
            "apparent_temp": cold,
            "uv": [0.0] * 96
        },
        "horizonHours": 24
    }
    res = client.post("/forecast", json=payload)
    assert res.status_code == 200
    data = res.json()
    quantiles = data["forecasts"]["apparent_temp"]
    p10, p50, p90 = quantiles["p10"], quantiles["p50"], quantiles["p90"]
    for i in range(24):
        assert p10[i] <= p50[i] <= p90[i]
        assert p50[i] <= -30.0

def test_sidecar_extreme_uv_15():
    uv_vals = [(15.0 if 10 <= (h%24) <= 14 else 0.0) for h in range(96)]
    times = [f"2026-10-08T{h%24:02d}:00:00Z" for h in range(96)]
    payload = {
        "lat": -0.18,
        "lon": -78.46,
        "history": {
            "times": times,
            "us_aqi": [30.0] * 96,
            "pm2_5": [10.0] * 96,
            "temp": [25.0] * 96,
            "apparent_temp": [27.0] * 96,
            "uv": uv_vals
        },
        "horizonHours": 24
    }
    res = client.post("/forecast", json=payload)
    assert res.status_code == 200
    data = res.json()
    quantiles = data["forecasts"]["uv"]
    p10, p50, p90 = quantiles["p10"], quantiles["p50"], quantiles["p90"]
    for i in range(24):
        assert p10[i] <= p50[i] <= p90[i]
        assert p10[i] >= 0.0

def test_sidecar_empty_arrays():
    payload = {
        "lat": 23.74,
        "lon": 90.40,
        "history": {
            "times": [],
            "us_aqi": [],
            "pm2_5": [],
            "temp": [],
            "apparent_temp": [],
            "uv": []
        },
        "horizonHours": 24
    }
    res = client.post("/forecast", json=payload)
    print("Empty arrays status code:", res.status_code, res.text)
    # Does this succeed or fail with 500?

def test_sidecar_single_item_history():
    payload = {
        "lat": 23.74,
        "lon": 90.40,
        "history": {
            "times": ["2026-10-08T12:00:00Z"],
            "us_aqi": [55.0],
            "pm2_5": [18.0],
            "temp": [25.0],
            "apparent_temp": [27.0],
            "uv": [3.0]
        },
        "horizonHours": 24
    }
    res = client.post("/forecast", json=payload)
    print("Single item status code:", res.status_code, res.text)

def test_sidecar_null_values():
    null_series = [50.0] * 96
    null_series[10] = None  # None turns into null in JSON
    null_series[50] = None
    times = [f"2026-10-08T{h%24:02d}:00:00Z" for h in range(96)]
    payload = {
        "lat": 23.74,
        "lon": 90.40,
        "history": {
            "times": times,
            "us_aqi": null_series,
            "pm2_5": null_series,
            "temp": [25.0] * 96,
            "apparent_temp": [25.0] * 96,
            "uv": [0.0] * 96
        },
        "horizonHours": 24
    }
    res = client.post("/forecast", json=payload)
    print("Null values status code:", res.status_code, res.text)


def test_sidecar_anomaly_extremes():
    # 1. Extreme 500 AQI
    res1 = client.post("/anomaly", json={
        "current": {"aqi": 500, "apparentTemp": 25, "time": "2026-10-08T12:00:00Z"},
        "history": {"times": ["2026-10-07T12:00:00Z"], "us_aqi": [50], "apparent_temp": [25]},
        "city": "Dhaka"
    })
    assert res1.status_code == 200
    d1 = res1.json()
    assert d1["detected"] is True
    assert d1["safetyRelevant"] is True
    assert d1["severity"] == "warning"

    # 2. Empty history
    res2 = client.post("/anomaly", json={
        "current": {"aqi": 45, "apparentTemp": 22},
        "history": {"times": [], "us_aqi": []},
        "city": "Dhaka"
    })
    assert res2.status_code == 200
    d2 = res2.json()
    assert d2["detected"] is False

    # 3. None/Null inputs
    res3 = client.post("/anomaly", json={
        "current": {},
        "history": {},
        "city": "Dhaka"
    })
    assert res3.status_code == 200
