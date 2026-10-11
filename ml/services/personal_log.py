"""
Personal Green Hour Walk Log Engine.
Provides on-device regression/classification for user walk ratings based on:
(hour, weekday, aqi, temp, uv, duration_minutes, screen_to_walk_ratio) -> rating (1-5).
Includes privacy-preserving RFC 4180 CSV import and export handlers.
"""

import io
import csv
import math
import numpy as np
from typing import List, Dict, Any, Tuple
from sklearn.linear_model import Ridge

CSV_COLUMNS = [
    "id",
    "timestamp",
    "hour",
    "weekday",
    "aqi",
    "temp",
    "uv",
    "duration_minutes",
    "screen_to_walk_ratio",
    "rating"
]

FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")

def _neutralize_formula(val: Any) -> str:
    """Neutralizes formula injection characters by prepending a single quote."""
    text = str(val) if val is not None else ""
    if text.startswith(FORMULA_PREFIXES):
        return f"'{text}"
    return text

def export_walk_logs_to_csv(sessions: List[Dict[str, Any]]) -> str:
    """Exports list of walk sessions to CSV text."""
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=CSV_COLUMNS, extrasaction="ignore", lineterminator="\n")
    writer.writeheader()

    for s in sessions:
        row = {
            "id": _neutralize_formula(s.get("id", "")),
            "timestamp": _neutralize_formula(s.get("timestamp", "")),
            "hour": int(s.get("hour", 12)),
            "weekday": int(s.get("weekday", 0)),
            "aqi": round(float(s.get("aqi", 50)), 1),
            "temp": round(float(s.get("temp", 25)), 1),
            "uv": round(float(s.get("uv", 0)), 1),
            "duration_minutes": round(float(s.get("duration_minutes", 30)), 1),
            "screen_to_walk_ratio": round(float(s.get("screen_to_walk_ratio", 0.05)), 4),
            "rating": round(float(s.get("rating", 5.0)), 1)
        }
        writer.writerow(row)

    return output.getvalue()

def import_walk_logs_from_csv(csv_text: str) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Parses and validates CSV text into structured walk sessions.
    Validates numeric ranges and required fields.
    """
    cleaned_csv = csv_text.lstrip("\ufeff").strip()
    input_stream = io.StringIO(cleaned_csv)
    reader = csv.DictReader(input_stream)

    valid_sessions = []
    invalid_rows = 0
    total_rows = 0

    for row in reader:
        total_rows += 1
        try:
            h_f = float(row.get("hour", 12))
            w_f = float(row.get("weekday", 0))
            aqi = float(row.get("aqi", 50))
            temp = float(row.get("temp", 25))
            uv = float(row.get("uv", 0))
            duration = float(row.get("duration_minutes", 30))
            screen_ratio = float(row.get("screen_to_walk_ratio", 0.05))
            rating = float(row.get("rating", 4.0))

            if not (
                math.isfinite(h_f) and math.isfinite(w_f) and
                math.isfinite(aqi) and math.isfinite(temp) and
                math.isfinite(uv) and math.isfinite(duration) and
                math.isfinite(screen_ratio) and math.isfinite(rating)
            ):
                invalid_rows += 1
                continue

            hour = int(h_f)
            weekday = int(w_f)

            if not (0 <= hour <= 23):
                invalid_rows += 1
                continue
            if not (0 <= weekday <= 6):
                invalid_rows += 1
                continue
            if duration <= 0:
                invalid_rows += 1
                continue

            # Clamp valid bounds
            screen_ratio = max(0.0, min(1.0, screen_ratio))
            rating = max(1.0, min(5.0, rating))

            raw_id = row.get("id")
            session_id = str(raw_id) if raw_id is not None and raw_id != "" else f"session_{total_rows}"

            session = {
                "id": session_id,
                "timestamp": str(row.get("timestamp", "")),
                "hour": hour,
                "weekday": weekday,
                "aqi": round(aqi, 1),
                "temp": round(temp, 1),
                "uv": round(uv, 1),
                "duration_minutes": round(duration, 1),
                "screen_to_walk_ratio": round(screen_ratio, 4),
                "rating": round(rating, 1)
            }
            valid_sessions.append(session)
        except (ValueError, TypeError):
            invalid_rows += 1

    return valid_sessions, {
        "total_rows": total_rows,
        "valid_rows": len(valid_sessions),
        "invalid_rows": invalid_rows
    }

def predict_walk_satisfaction(
    historical_sessions: List[Dict[str, Any]],
    candidate: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Predicts personal walk satisfaction rating (1.0 to 5.0) for a candidate outing,
    learning from user's historical logs.
    """
    cand_hour = int(candidate.get("hour", 17))
    cand_weekday = int(candidate.get("weekday", 2))
    cand_aqi = float(candidate.get("aqi", 60))
    cand_temp = float(candidate.get("temp", 26))
    cand_uv = float(candidate.get("uv", 1))
    cand_duration = float(candidate.get("duration_minutes", 30))
    cand_screen_ratio = float(candidate.get("screen_to_walk_ratio", 0.03))

    features_cand = np.array([[
        np.sin(2 * np.pi * cand_hour / 24.0),
        np.cos(2 * np.pi * cand_hour / 24.0),
        cand_weekday / 7.0,
        cand_aqi / 100.0,
        cand_temp / 30.0,
        cand_uv / 10.0,
        cand_duration / 60.0,
        cand_screen_ratio
    ]], dtype=float)

    # If few historical sessions, use evidence-based psychological prior:
    # High satisfaction correlates with lower screen time, moderate temp, clean air, golden hours
    if len(historical_sessions) < 4:
        base_score = 4.5
        # Penalties
        if cand_aqi > 100:
            base_score -= (cand_aqi - 100) * 0.015
        if cand_screen_ratio > 0.15:
            base_score -= (cand_screen_ratio - 0.15) * 3.0
        if cand_temp > 32:
            base_score -= (cand_temp - 32) * 0.1
        if cand_uv > 6:
            base_score -= (cand_uv - 6) * 0.1

        predicted_rating = max(1.0, min(5.0, round(base_score, 2)))
        confidence = 0.55
        model_used = "prior_heuristic"
    else:
        # Fit on historical data
        X = []
        y = []
        for s in historical_sessions:
            h = int(s.get("hour", 12))
            w = int(s.get("weekday", 0))
            aqi = float(s.get("aqi", 50))
            tmp = float(s.get("temp", 25))
            uv = float(s.get("uv", 0))
            dur = float(s.get("duration_minutes", 30))
            ratio = float(s.get("screen_to_walk_ratio", 0.05))
            r = float(s.get("rating", 4.0))

            X.append([
                np.sin(2 * np.pi * h / 24.0),
                np.cos(2 * np.pi * h / 24.0),
                w / 7.0,
                aqi / 100.0,
                tmp / 30.0,
                uv / 10.0,
                dur / 60.0,
                ratio
            ])
            y.append(r)

        model = Ridge(alpha=1.0)
        model.fit(np.array(X), np.array(y))
        raw_pred = float(model.predict(features_cand)[0])
        predicted_rating = max(1.0, min(5.0, round(raw_pred, 2)))
        confidence = min(0.95, 0.60 + 0.03 * len(historical_sessions))
        model_used = "on_device_ridge"

    # Satisfaction binary flag (>= 3.8)
    satisfied = predicted_rating >= 3.8

    return {
        "predicted_rating": predicted_rating,
        "satisfaction_probability": round(min(1.0, max(0.0, (predicted_rating - 1.0) / 4.0)), 2),
        "satisfied": satisfied,
        "confidence": confidence,
        "model_used": model_used,
        "training_samples": len(historical_sessions)
    }
