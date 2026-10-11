"""
Unit & Integration Test Suite for Sobuj Ghonta ML Sidecar.
Tests FastAPI endpoints, Prior Labs quantile syntax, fallback chain,
anomaly detector, personal walk-log model, and CSV import/export.
"""

import sys
import os
import pytest
from fastapi.testclient import TestClient
import numpy as np

# Ensure ml directory is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import app
from services.baseline_models import (
    PersistenceBaseline,
    SeasonalNaiveBaseline,
    DeterministicEnsembleBaseline,
    pinball_loss,
    mean_absolute_error,
    compute_forecast_agreement,
    MODEL_LABEL_BASELINE
)
from services.personal_log import (
    export_walk_logs_to_csv,
    import_walk_logs_from_csv,
    predict_walk_satisfaction
)

client = TestClient(app)

# Fixture: 48-hour synthetic historical series
def sample_history():
    times = []
    aqi = []
    pm25 = []
    temp = []
    app_temp = []
    uv = []

    # 48 hours starting at 2026-10-06T00:00
    for day in range(2):
        for h in range(24):
            times.append(f"2026-10-0{6+day}T{h:02d}:00")
            # Diurnal curve for temperature and UV
            diurnal = 5.0 * (1.0 - abs(h - 14) / 12.0)
            t = 24.0 + diurnal
            temp.append(t)
            app_temp.append(t + 1.5)
            # UV peak at noon
            uv.append(max(0.0, (12.0 - abs(h - 12)) * 0.8) if 6 <= h <= 18 else 0.0)
            # AQI higher in evening/morning
            aqi_val = 70.0 + 20.0 * (1.0 if (h <= 9 or h >= 19) else 0.0)
            aqi.append(aqi_val)
            pm25.append(aqi_val * 0.35)

    return {
        "times": times,
        "us_aqi": aqi,
        "pm2_5": pm25,
        "temp": temp,
        "apparent_temp": app_temp,
        "uv": uv
    }

class TestMLSidecar:
    def test_health_endpoint(self):
        res = client.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert "engine" in data
        assert "active_mode" in data["engine"]

    def test_forecast_endpoint_quantiles_and_ordering(self):
        hist = sample_history()
        payload = {
            "lat": 23.74,
            "lon": 90.40,
            "history": hist,
            "horizonHours": 24
        }
        res = client.post("/forecast", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["ok"] is True
        assert "model" in data
        assert "forecasts" in data
        assert "us_aqi" in data["forecasts"]

        aqi_fc = data["forecasts"]["us_aqi"]
        assert "p10" in aqi_fc and "p50" in aqi_fc and "p90" in aqi_fc
        assert len(aqi_fc["p10"]) == 24
        assert len(aqi_fc["p50"]) == 24
        assert len(aqi_fc["p90"]) == 24

        # Verify quantile monotonicity: p10 <= p50 <= p90
        for i in range(24):
            assert aqi_fc["p10"][i] <= aqi_fc["p50"][i], f"Hour {i}: p10 > p50"
            assert aqi_fc["p50"][i] <= aqi_fc["p90"][i], f"Hour {i}: p50 > p90"

        # Check agreement metric is a reasonable percentage
        assert 0.0 <= data["agreement"] <= 100.0

    def test_anomaly_detection_normal_vs_spike(self):
        hist = sample_history()

        # 1. Normal condition (hour 14, typical temp & AQI)
        normal_current = {
            "time": "2026-10-08T14:00",
            "aqi": 72.0,
            "apparentTemp": 29.5
        }
        res_normal = client.post("/anomaly", json={
            "current": normal_current,
            "history": hist,
            "city": "Dhaka"
        })
        assert res_normal.status_code == 200
        data_normal = res_normal.json()
        assert data_normal["detected"] is False
        assert data_normal["severity"] == "none"
        assert data_normal["safetyRelevant"] is False

        # 2. Hazardous Smoke Spike (AQI 185 vs typical 70)
        spike_current = {
            "time": "2026-10-08T17:00",
            "aqi": 185.0,
            "apparentTemp": 28.0
        }
        res_spike = client.post("/anomaly", json={
            "current": spike_current,
            "history": hist,
            "city": "Dhaka"
        })
        assert res_spike.status_code == 200
        data_spike = res_spike.json()
        assert data_spike["detected"] is True
        assert data_spike["severity"] in ["caution", "warning"]
        assert data_spike["safetyRelevant"] is True
        assert "Unusually smoky" in data_spike["message"]
        assert data_spike["metrics"]["aqi"]["is_anomaly"] is True

        # 3. Extreme Heat Spike (apparentTemp 41°C vs typical 28°C)
        heat_current = {
            "time": "2026-10-08T13:00",
            "aqi": 60.0,
            "apparentTemp": 41.2
        }
        res_heat = client.post("/anomaly", json={
            "current": heat_current,
            "history": hist,
            "city": "Dhaka"
        })
        assert res_heat.status_code == 200
        data_heat = res_heat.json()
        assert data_heat["detected"] is True
        assert data_heat["safetyRelevant"] is True
        assert "Abnormally hot" in data_heat["message"]

    def test_personal_walk_log_prediction(self):
        sessions = [
            {"id": "1", "hour": 17, "weekday": 1, "aqi": 55, "temp": 25, "uv": 1, "duration_minutes": 40, "screen_to_walk_ratio": 0.02, "rating": 5.0},
            {"id": "2", "hour": 17, "weekday": 2, "aqi": 60, "temp": 26, "uv": 1, "duration_minutes": 35, "screen_to_walk_ratio": 0.03, "rating": 4.8},
            {"id": "3", "hour": 12, "weekday": 3, "aqi": 130, "temp": 34, "uv": 8, "duration_minutes": 15, "screen_to_walk_ratio": 0.25, "rating": 2.1},
            {"id": "4", "hour": 18, "weekday": 4, "aqi": 50, "temp": 24, "uv": 0, "duration_minutes": 45, "screen_to_walk_ratio": 0.01, "rating": 5.0}
        ]

        candidate_good = {
            "hour": 17, "weekday": 5, "aqi": 52, "temp": 25, "uv": 1, "duration_minutes": 35, "screen_to_walk_ratio": 0.02
        }
        res_pred = client.post("/personal-log/predict", json={
            "historical_sessions": sessions,
            "candidate": candidate_good
        })
        assert res_pred.status_code == 200
        data_pred = res_pred.json()
        assert data_pred["ok"] is True
        assert 3.5 <= data_pred["predicted_rating"] <= 5.0
        assert data_pred["satisfied"] is True

    def test_personal_walk_log_csv_roundtrip(self):
        sample_sessions = [
            {
                "id": "walk_001",
                "timestamp": "2026-10-08T16:45:00Z",
                "hour": 16,
                "weekday": 3,
                "aqi": 58.0,
                "temp": 26.2,
                "uv": 1.1,
                "duration_minutes": 32.5,
                "screen_to_walk_ratio": 0.025,
                "rating": 4.8
            },
            {
                "id": "walk_002",
                "timestamp": "2026-10-09T17:10:00Z",
                "hour": 17,
                "weekday": 4,
                "aqi": 64.0,
                "temp": 25.0,
                "uv": 0.5,
                "duration_minutes": 45.0,
                "screen_to_walk_ratio": 0.018,
                "rating": 5.0
            }
        ]

        # 1. Export to CSV
        res_export = client.post("/personal-log/export-csv", json={"sessions": sample_sessions})
        assert res_export.status_code == 200
        csv_str = res_export.json()["csv_content"]
        assert "screen_to_walk_ratio" in csv_str
        assert "walk_001" in csv_str

        # 2. Import back from CSV
        res_import = client.post("/personal-log/import-csv", json={"csv_content": csv_str})
        assert res_import.status_code == 200
        imported = res_import.json()
        assert imported["ok"] is True
        assert imported["stats"]["valid_rows"] == 2
        assert imported["stats"]["invalid_rows"] == 0
        assert len(imported["sessions"]) == 2
        assert imported["sessions"][0]["id"] == "walk_001"
        assert imported["sessions"][0]["hour"] == 16
        assert imported["sessions"][1]["rating"] == 5.0

    def test_baseline_models_directly(self):
        history = [60.0, 62.0, 65.0, 70.0, 80.0, 85.0, 90.0, 75.0, 65.0, 60.0] * 3
        # Persistence
        pers = PersistenceBaseline.forecast(history, horizon=6)
        assert len(pers["p50"]) == 6
        assert all(pers["p10"][i] <= pers["p50"][i] <= pers["p90"][i] for i in range(6))

        # Seasonal Naive
        s_naive = SeasonalNaiveBaseline.forecast(history, horizon=6)
        assert len(s_naive["p50"]) == 6
        assert all(s_naive["p10"][i] <= s_naive["p50"][i] <= s_naive["p90"][i] for i in range(6))

        # Deterministic Ensemble
        ens = DeterministicEnsembleBaseline.forecast(history, horizon=6)
        assert ens["model"] == MODEL_LABEL_BASELINE
        assert len(ens["quantiles"]["p50"]) == 6

        # Metrics
        y_true = np.array([50.0, 60.0, 70.0])
        y_pred = np.array([52.0, 58.0, 75.0])
        mae = mean_absolute_error(y_true, y_pred)
        assert round(mae, 2) == 3.0
        pb_50 = pinball_loss(y_true, y_pred, 0.5)
        assert round(pb_50, 2) == 1.5
