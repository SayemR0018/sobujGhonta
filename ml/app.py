"""
Sobuj Ghonta ML Sidecar - FastAPI Application.
Exposes Prior Labs TabPFN tabular forecasting, anomaly detection,
and personal walk log endpoints.
"""

from fastapi import FastAPI, HTTPException, Header, Request, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

from config import settings
from services.tabpfn_engine import engine
from services.forecast_pipeline import run_multi_target_forecast
from services.anomaly_detector import detect_environmental_anomaly
from services.personal_log import (
    export_walk_logs_to_csv,
    import_walk_logs_from_csv,
    predict_walk_satisfaction
)

app = FastAPI(
    title="Sobuj Ghonta ML Sidecar",
    description="Prior Labs TabPFN Tabular Foundation Model & Baseline Services",
    version="1.0.0"
)

# Allow local CORS for Express backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Request Models ---

class ForecastRequest(BaseModel):
    lat: Optional[float] = 23.74
    lon: Optional[float] = 90.40
    history: Dict[str, Any]
    horizonHours: Optional[int] = 24
    token: Optional[str] = None

class AnomalyRequest(BaseModel):
    current: Dict[str, Any]
    history: Dict[str, Any]
    city: Optional[str] = "your area"

class WalkPredictRequest(BaseModel):
    historical_sessions: List[Dict[str, Any]] = []
    candidate: Dict[str, Any]

class WalkImportCsvRequest(BaseModel):
    csv_content: str

class WalkExportCsvRequest(BaseModel):
    sessions: List[Dict[str, Any]]


# --- Routes ---

@app.get("/health")
def health_check():
    """Health check endpoint reporting engine status and mode."""
    engine_status = engine.get_status()
    return {
        "status": "ok",
        "service": "sobuj-ghonta-ml",
        "engine": engine_status
    }

@app.post("/forecast")
def generate_forecast(
    payload: ForecastRequest,
    x_tabpfn_token: Optional[str] = Header(None)
):
    """
    Generates quantile forecasts [p10, p50, p90] for AQI, PM2.5, apparent temp, and UV.
    Prior Labs syntax output_type='quantiles', quantiles=[0.1, 0.5, 0.9].
    Fallback chain: local TabPFN -> client TabPFN -> deterministic baseline.
    """
    token = payload.token or x_tabpfn_token
    try:
        horizon = min(72, max(1, payload.horizonHours or 24))
        result = run_multi_target_forecast(
            history=payload.history,
            horizon=horizon,
            request_token=token
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecast pipeline error: {str(e)}")

@app.post("/anomaly")
def check_anomaly(payload: AnomalyRequest):
    """
    Evaluates current air quality and heat vs 7-day hourly distribution.
    Flags unusual spikes and determines safety relevance for spoken audio alerts.
    """
    try:
        result = detect_environmental_anomaly(
            current=payload.current,
            history=payload.history,
            city_name=payload.city or "your area"
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Anomaly detector error: {str(e)}")

@app.post("/personal-log/predict")
def predict_walk_log(payload: WalkPredictRequest):
    """
    Predicts personal walk satisfaction rating (1-5) based on historical sessions.
    """
    try:
        result = predict_walk_satisfaction(
            historical_sessions=payload.historical_sessions,
            candidate=payload.candidate
        )
        return {"ok": True, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Personal log error: {str(e)}")

@app.post("/personal-log/import-csv")
def import_csv(payload: WalkImportCsvRequest):
    """Parses and validates RFC 4180 CSV walk logs."""
    try:
        sessions, stats = import_walk_logs_from_csv(payload.csv_content)
        return {
            "ok": True,
            "sessions": sessions,
            "stats": stats
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CSV import failed: {str(e)}")

@app.post("/personal-log/export-csv")
def export_csv(payload: WalkExportCsvRequest):
    """Converts structured walk sessions into CSV string."""
    try:
        csv_str = export_walk_logs_to_csv(payload.sessions)
        return {
            "ok": True,
            "csv_content": csv_str
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CSV export failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host=settings.ML_HOST, port=settings.ML_PORT, reload=False)
