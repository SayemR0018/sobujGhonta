"""
Anomaly Detector for Environmental Telemetry.
Compares current conditions vs 7-day hourly distribution (residual / quantile threshold).
Flags unusually smoky or hot conditions as a short line.
Designates safety relevance for spoken audio gating.
"""

import numpy as np
from datetime import datetime
from typing import Dict, Any, List, Optional
from config import settings

def parse_hour(iso_str: str) -> int:
    try:
        clean = iso_str.replace("Z", "+00:00")
        return datetime.fromisoformat(clean).hour
    except Exception:
        if "T" in iso_str:
            return int(iso_str.split("T")[1].split(":")[0])
        return 12

def detect_environmental_anomaly(
    current: Dict[str, Any],
    history: Dict[str, Any],
    city_name: str = "your area"
) -> Dict[str, Any]:
    """
    Evaluates current air quality and heat metrics against historical distribution
    for the corresponding hour of day over the past 2-7 days (48-168 hours).

    Returns:
    {
        "detected": bool,
        "severity": "none" | "info" | "caution" | "warning",
        "message": str,
        "safetyRelevant": bool,
        "metrics": { "aqi": {...}, "apparent_temp": {...} }
    }
    """
    curr_time_str = current.get("time") or datetime.now().isoformat()
    curr_hour = parse_hour(curr_time_str)

    curr_aqi = float(current.get("aqi", current.get("us_aqi", 50)))
    curr_pm25 = float(current.get("pm25", current.get("pm2_5", 15)))
    curr_app_temp = float(current.get("apparentTemp", current.get("apparent_temp", 25)))

    hist_times = history.get("times", [])
    hist_aqi = history.get("us_aqi", [])
    hist_temp = history.get("apparent_temp", history.get("temp", []))

    # Match historical records from the same hour of day (+/- 1 hour window)
    matched_aqi = []
    matched_temp = []

    for idx, t_str in enumerate(hist_times):
        h = parse_hour(t_str)
        if abs(h - curr_hour) <= 1 or abs(h - curr_hour) >= 23:
            if idx < len(hist_aqi) and hist_aqi[idx] is not None:
                matched_aqi.append(float(hist_aqi[idx]))
            if idx < len(hist_temp) and hist_temp[idx] is not None:
                matched_temp.append(float(hist_temp[idx]))

    # If no matched hours (empty history), fallback to all history or defaults
    if not matched_aqi and hist_aqi:
        matched_aqi = [float(v) for v in hist_aqi]
    if not matched_temp and hist_temp:
        matched_temp = [float(v) for v in hist_temp]

    # Calculate distribution statistics for AQI
    if matched_aqi:
        mean_aqi = float(np.mean(matched_aqi))
        std_aqi = max(float(np.std(matched_aqi)), 3.0)
        q90_aqi = float(np.percentile(matched_aqi, 90))
        q95_aqi = float(np.percentile(matched_aqi, 95))
    else:
        mean_aqi, std_aqi, q90_aqi, q95_aqi = 65.0, 15.0, 90.0, 110.0

    # Calculate distribution statistics for Apparent Temperature
    if matched_temp:
        mean_temp = float(np.mean(matched_temp))
        std_temp = max(float(np.std(matched_temp)), 1.0)
        q90_temp = float(np.percentile(matched_temp, 90))
        q95_temp = float(np.percentile(matched_temp, 95))
    else:
        mean_temp, std_temp, q90_temp, q95_temp = 27.0, 3.0, 31.0, 33.0

    # Residuals & Z-scores
    z_aqi = (curr_aqi - mean_aqi) / std_aqi
    z_temp = (curr_app_temp - mean_temp) / std_temp

    aqi_spike = z_aqi >= settings.ANOMALY_Z_THRESHOLD or (curr_aqi >= q95_aqi and curr_aqi > 75)
    temp_spike = z_temp >= settings.ANOMALY_Z_THRESHOLD or (curr_app_temp >= q95_temp and curr_app_temp > 32)

    anomaly_detected = aqi_spike or temp_spike

    # Determine safety relevance:
    # Safety-relevant IF AQI crosses unhealthy (>150), apparent temp crosses extreme heat (>=38C),
    # or a significant spike pushes condition into unsafe territory
    safety_relevant = False
    if curr_aqi > settings.AQI_SAFETY_LIMIT:
        safety_relevant = True
    elif curr_app_temp >= settings.APPARENT_TEMP_SAFETY_LIMIT:
        safety_relevant = True
    elif aqi_spike and curr_aqi >= 120:
        safety_relevant = True
    elif temp_spike and curr_app_temp >= 36:
        safety_relevant = True

    # Severity classification
    if not anomaly_detected:
        severity = "none"
        message = f"Conditions typical for {curr_hour % 12 or 12} {'PM' if curr_hour >= 12 else 'AM'} in {city_name}."
    else:
        if z_aqi >= 3.0 or z_temp >= 3.0 or safety_relevant:
            severity = "warning"
        elif z_aqi >= 2.0 or z_temp >= 2.0:
            severity = "caution"
        else:
            severity = "info"

        # Generate concise single-line message
        messages = []
        hour_label = f"{curr_hour % 12 or 12} {'PM' if curr_hour >= 12 else 'AM'}"

        if aqi_spike:
            pct_diff = round(((curr_aqi - mean_aqi) / max(mean_aqi, 1.0)) * 100)
            sign = "+" if pct_diff >= 0 else ""
            messages.append(
                f"Unusually smoky for {hour_label} in {city_name}: AQI {round(curr_aqi)} vs typical {round(mean_aqi)} ({sign}{pct_diff}%)."
            )

        if temp_spike:
            diff_deg = round(curr_app_temp - mean_temp, 1)
            sign = "+" if diff_deg >= 0 else ""
            messages.append(
                f"Abnormally hot for {hour_label}: apparent temperature {round(curr_app_temp, 1)}°C vs typical {round(mean_temp, 1)}°C ({sign}{diff_deg}°C)."
            )

        message = " ".join(messages)

    return {
        "detected": anomaly_detected,
        "severity": severity,
        "message": message,
        "safetyRelevant": safety_relevant,
        "metrics": {
            "aqi": {
                "current": round(curr_aqi, 1),
                "historical_mean": round(mean_aqi, 1),
                "historical_std": round(std_aqi, 1),
                "z_score": round(z_aqi, 2),
                "is_anomaly": aqi_spike
            },
            "apparent_temp": {
                "current": round(curr_app_temp, 1),
                "historical_mean": round(mean_temp, 1),
                "historical_std": round(std_temp, 1),
                "z_score": round(z_temp, 2),
                "is_anomaly": temp_spike
            }
        }
    }
