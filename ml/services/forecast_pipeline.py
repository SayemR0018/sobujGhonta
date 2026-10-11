"""
Forecast pipeline: Transforms continuous historical Open-Meteo hourly observations
into tabular feature matrices for TabPFN in-context regression and baseline evaluation.
"""

import numpy as np
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

from services.tabpfn_engine import engine

def parse_iso_hour(iso_str: str) -> int:
    """Extracts hour-of-day (0-23) from ISO date string."""
    try:
        # Handles formats like 2026-10-08T12:00 or 2026-10-08T12:00:00Z
        clean_str = iso_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_str)
        return dt.hour
    except Exception:
        # Fallback to simple split
        if "T" in iso_str:
            time_part = iso_str.split("T")[1]
            return int(time_part.split(":")[0])
        return 12

def parse_iso_weekday(iso_str: str) -> int:
    """Extracts day-of-week (0-6) from ISO date string."""
    try:
        clean_str = iso_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_str)
        return dt.weekday()
    except Exception:
        return 3

def sanitize_series(series: Optional[List[Any]], default_val: float = 0.0) -> List[float]:
    """
    Sanitizes an input time series by replacing None / NaN / non-numeric entries
    with previous valid observation or median.
    """
    if not series:
        return []
    valid_vals = []
    for v in series:
        if v is not None and not (isinstance(v, float) and np.isnan(v)):
            try:
                num = float(v)
                if np.isfinite(num):
                    valid_vals.append(num)
            except (ValueError, TypeError):
                pass
    fallback_val = float(np.median(valid_vals)) if valid_vals else default_val
    clean = []
    prev = fallback_val
    for v in series:
        if v is None or (isinstance(v, float) and np.isnan(v)):
            clean.append(prev)
        else:
            try:
                num = float(v)
                if np.isfinite(num):
                    clean.append(num)
                    prev = num
                else:
                    clean.append(prev)
            except (ValueError, TypeError):
                clean.append(prev)
    return clean

def engineer_tabular_features(
    times: List[str],
    series: List[float],
    exog_temp: List[float] = None,
    horizon: int = 24
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Constructs tabular feature matrix (X_train, y_train, X_test) from hourly time series.
    Features per row:
    - sin_hour, cos_hour (cyclical diurnal features)
    - weekday (scaled 0-1)
    - lag_1, lag_2, lag_3, lag_24
    - rolling_mean_6h, rolling_std_6h, rolling_mean_24h
    - exog_temperature (if available)
    """
    if not series:
        X_train = np.empty((0, 11), dtype=float)
        y_train = np.empty((0,), dtype=float)
        X_test = np.zeros((horizon, 11), dtype=float)
        return X_train, y_train, X_test

    series = sanitize_series(series, default_val=0.0)
    if not series:
        X_train = np.empty((0, 11), dtype=float)
        y_train = np.empty((0,), dtype=float)
        X_test = np.zeros((horizon, 11), dtype=float)
        return X_train, y_train, X_test

    if exog_temp:
        exog_temp = sanitize_series(exog_temp, default_val=25.0)

    n = len(series)
    if n < 25:
        # If history is very short, construct minimal synthetic lags
        series = list(series) + [series[-1]] * (25 - n)
        n = len(series)

    features = []
    targets = []

    # Build historical training samples starting at index 24 (so lag_24 exists)
    for i in range(24, n):
        t_str = times[i] if i < len(times) else "2026-10-08T12:00"
        h = parse_iso_hour(t_str)
        w = parse_iso_weekday(t_str)

        sin_h = np.sin(2 * np.pi * h / 24.0)
        cos_h = np.cos(2 * np.pi * h / 24.0)

        lag_1 = series[i - 1]
        lag_2 = series[i - 2]
        lag_3 = series[i - 3]
        lag_24 = series[i - 24]

        roll_6_mean = float(np.mean(series[max(0, i - 6):i]))
        roll_6_std = float(np.std(series[max(0, i - 6):i])) if i >= 6 else 1.0
        roll_24_mean = float(np.mean(series[max(0, i - 24):i]))

        exog = exog_temp[i] if (exog_temp and i < len(exog_temp)) else 25.0

        features.append([
            sin_h, cos_h, w / 7.0,
            lag_1, lag_2, lag_3, lag_24,
            roll_6_mean, roll_6_std, roll_24_mean,
            exog
        ])
        targets.append(series[i])

    X_train = np.array(features, dtype=float)
    y_train = np.array(targets, dtype=float)

    # Build future test samples for forecast horizon
    test_features = []
    last_series = list(series)

    for h_step in range(1, horizon + 1):
        future_idx = n - 1 + h_step
        # Compute future hour
        last_hour = parse_iso_hour(times[-1]) if times else 12
        last_weekday = parse_iso_weekday(times[-1]) if times else 3
        h = (last_hour + h_step) % 24
        w = (last_weekday + ((last_hour + h_step) // 24)) % 7

        sin_h = np.sin(2 * np.pi * h / 24.0)
        cos_h = np.cos(2 * np.pi * h / 24.0)

        lag_1 = last_series[-1]
        lag_2 = last_series[-2] if len(last_series) >= 2 else lag_1
        lag_3 = last_series[-3] if len(last_series) >= 3 else lag_2
        lag_24 = last_series[-24] if len(last_series) >= 24 else last_series[0]

        roll_6_mean = float(np.mean(last_series[-6:]))
        roll_6_std = float(np.std(last_series[-6:])) if len(last_series) >= 6 else 1.0
        roll_24_mean = float(np.mean(last_series[-24:]))

        exog = exog_temp[-1] if exog_temp else 25.0

        test_features.append([
            sin_h, cos_h, w / 7.0,
            lag_1, lag_2, lag_3, lag_24,
            roll_6_mean, roll_6_std, roll_24_mean,
            exog
        ])

    X_test = np.array(test_features, dtype=float)
    return X_train, y_train, X_test

def run_multi_target_forecast(
    history: Dict[str, Any],
    horizon: int = 24,
    request_token: Optional[str] = None
) -> Dict[str, Any]:
    """
    Runs TabPFN quantile regression across AQI, PM2.5, apparent temp, and UV.
    Computes uncertainty intervals [p10, p50, p90] and forecast agreement.
    """
    times = history.get("times", []) or []
    us_aqi = sanitize_series(history.get("us_aqi", []) or [], default_val=0.0)
    pm2_5 = sanitize_series(history.get("pm2_5", []) or [], default_val=0.0)
    temp = sanitize_series(history.get("temp", []) or [], default_val=25.0)
    apparent_temp = sanitize_series(history.get("apparent_temp", []) or [], default_val=25.0)
    uv = sanitize_series(history.get("uv", []) or [], default_val=0.0)
    om_aqi_forecast = history.get("om_aqi_forecast", None)

    # 1. AQI forecast
    X_train_aqi, y_train_aqi, X_test_aqi = engineer_tabular_features(
        times=times, series=us_aqi, exog_temp=temp, horizon=horizon
    )
    aqi_result = engine.predict_regression_quantiles(
        X_train=X_train_aqi,
        y_train=y_train_aqi,
        X_test=X_test_aqi,
        history_series=us_aqi,
        om_guidance=om_aqi_forecast,
        request_token=request_token,
        clamp_min=0.0
    )

    # 2. PM2.5 forecast
    X_train_pm, y_train_pm, X_test_pm = engineer_tabular_features(
        times=times, series=pm2_5, exog_temp=temp, horizon=horizon
    )
    pm25_result = engine.predict_regression_quantiles(
        X_train=X_train_pm,
        y_train=y_train_pm,
        X_test=X_test_pm,
        history_series=pm2_5,
        request_token=request_token,
        clamp_min=0.0
    )

    # 3. Apparent Temperature forecast
    X_train_temp, y_train_temp, X_test_temp = engineer_tabular_features(
        times=times, series=apparent_temp, exog_temp=temp, horizon=horizon
    )
    temp_result = engine.predict_regression_quantiles(
        X_train=X_train_temp,
        y_train=y_train_temp,
        X_test=X_test_temp,
        history_series=apparent_temp,
        request_token=request_token,
        clamp_min=-40.0
    )

    # 4. UV Index forecast (clamped >= 0)
    X_train_uv, y_train_uv, X_test_uv = engineer_tabular_features(
        times=times, series=uv, exog_temp=temp, horizon=horizon
    )
    uv_result = engine.predict_regression_quantiles(
        X_train=X_train_uv,
        y_train=y_train_uv,
        X_test=X_test_uv,
        history_series=uv,
        request_token=request_token,
        clamp_min=0.0
    )

    return {
        "ok": True,
        "model": aqi_result["model"],
        "version": aqi_result.get("version", "1.0"),
        "fallback": aqi_result.get("fallback", False),
        "horizonHours": horizon,
        "agreement": aqi_result.get("agreement", 90.0),
        "forecasts": {
            "us_aqi": aqi_result["quantiles"],
            "pm2_5": pm25_result["quantiles"],
            "apparent_temp": temp_result["quantiles"],
            "uv": uv_result["quantiles"]
        }
    }
