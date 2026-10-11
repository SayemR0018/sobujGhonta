"""
Adversarial stress tests for Personal Green Hour Walk Log and CSV Import/Export.
Tests:
1. Malicious CSVs (formula/CSV injection, null bytes, long inputs, BOM)
2. RFC 4180 corner cases (newlines in quotes, commas in values, escaped quotes, CRLF)
3. Non-numeric and extreme values (NaN, Infinity, strings in numeric fields, bounds)
"""

import math
import pytest
from services.personal_log import (
    import_walk_logs_from_csv,
    export_walk_logs_to_csv,
    predict_walk_satisfaction
)

def test_rfc4180_newlines_inside_quotes():
    """RFC 4180 Section 2.6: Fields containing line breaks should be enclosed in double-quotes."""
    csv_text = (
        'id,timestamp,hour,weekday,aqi,temp,uv,duration_minutes,screen_to_walk_ratio,rating\n'
        '"session\nwith\nnewline",2026-10-10T14:00,14,2,45,26.5,1.0,30,0.02,4.5\n'
    )
    sessions, stats = import_walk_logs_from_csv(csv_text)
    assert stats["valid_rows"] == 1
    assert "newline" in sessions[0]["id"]
    assert sessions[0]["hour"] == 14

def test_rfc4180_commas_and_escaped_quotes():
    """RFC 4180 Section 2.5 & 2.7: Fields containing commas or escaped double quotes."""
    csv_text = (
        'id,timestamp,hour,weekday,aqi,temp,uv,duration_minutes,screen_to_walk_ratio,rating\n'
        '"walk, ""quoted"" name",2026-10-10T15:00,15,3,60,28.0,2.0,45,0.04,5.0\n'
    )
    sessions, stats = import_walk_logs_from_csv(csv_text)
    assert stats["valid_rows"] == 1
    assert 'walk, "quoted" name' == sessions[0]["id"]

def test_rfc4180_crlf_line_endings():
    """RFC 4180 Section 2.1: Each record should be on a separate line, delimited by CRLF."""
    csv_text = (
        "id,timestamp,hour,weekday,aqi,temp,uv,duration_minutes,screen_to_walk_ratio,rating\r\n"
        "session_crlf,2026-10-10T16:00,16,4,50,25.0,0.5,25,0.01,4.0\r\n"
    )
    sessions, stats = import_walk_logs_from_csv(csv_text)
    assert stats["valid_rows"] == 1
    assert sessions[0]["id"] == "session_crlf"

def test_non_numeric_and_nan_in_numeric_columns():
    """Adversarial input: string, NaN, Infinity, -Infinity in numeric fields."""
    # Test strings where floats are expected
    csv_string_err = (
        'id,timestamp,hour,weekday,aqi,temp,uv,duration_minutes,screen_to_walk_ratio,rating\n'
        's1,2026-10-10,invalid_hour,0,50,25,0,30,0.05,4.0\n'
        's2,2026-10-10,12,0,bad_aqi,25,0,30,0.05,4.0\n'
        's3,2026-10-10,12,0,50,bad_temp,0,30,0.05,4.0\n'
        's4,2026-10-10,12,0,50,25,0,bad_duration,0.05,4.0\n'
    )
    sessions, stats = import_walk_logs_from_csv(csv_string_err)
    assert stats["valid_rows"] == 0
    assert stats["invalid_rows"] == 4

    # Test IEEE 754 NaN / Infinity
    csv_nan_inf = (
        'id,timestamp,hour,weekday,aqi,temp,uv,duration_minutes,screen_to_walk_ratio,rating\n'
        'nan_row,2026-10-10,12,0,NaN,25,0,30,0.05,4.0\n'
        'inf_row,2026-10-10,12,0,50,Infinity,0,30,0.05,4.0\n'
    )
    sessions_nan, stats_nan = import_walk_logs_from_csv(csv_nan_inf)
    # Check if NaN or Infinity leaked into imported valid sessions:
    # NaN and Inf are valid Python floats, but invalid in strict JSON / ML models
    for s in sessions_nan:
        assert not math.isnan(s.get("aqi", 0)), "NaN was accepted into aqi!"
        assert not math.isinf(s.get("temp", 0)), "Infinity was accepted into temp!"

def test_range_boundary_clamping_and_rejections():
    """Out of range hours, weekdays, durations, ratios, and ratings."""
    csv_bounds = (
        'id,timestamp,hour,weekday,aqi,temp,uv,duration_minutes,screen_to_walk_ratio,rating\n'
        'neg_hour,2026-10-10,-1,0,50,25,0,30,0.05,4.0\n'
        'over_hour,2026-10-10,24,0,50,25,0,30,0.05,4.0\n'
        'neg_weekday,2026-10-10,12,-1,50,25,0,30,0.05,4.0\n'
        'over_weekday,2026-10-10,12,7,50,25,0,30,0.05,4.0\n'
        'zero_duration,2026-10-10,12,0,50,25,0,0,0.05,4.0\n'
        'neg_duration,2026-10-10,12,0,50,25,0,-15,0.05,4.0\n'
        'clamp_test,2026-10-10,12,0,50,25,0,30,1.5,9.9\n'
    )
    sessions, stats = import_walk_logs_from_csv(csv_bounds)
    assert stats["invalid_rows"] == 6
    assert stats["valid_rows"] == 1
    # Check clamp
    assert sessions[0]["screen_to_walk_ratio"] == 1.0
    assert sessions[0]["rating"] == 5.0

def test_csv_formula_injection_vectors():
    """
    Test CSV Formula Injection (DDE injection).
    Spreadsheet software (Excel, Calc) interprets cells beginning with '=', '+', '-', '@', '\t', '\r' as formulas.
    """
    malicious_sessions = [
        {
            "id": "=cmd|'/C calc'!A0",
            "timestamp": "@SUM(1,2)",
            "hour": 14,
            "weekday": 2,
            "aqi": 40,
            "temp": 24,
            "uv": 1,
            "duration_minutes": 30,
            "screen_to_walk_ratio": 0.02,
            "rating": 5.0
        },
        {
            "id": "-2+5+cmd|' /C calc'!A0",
            "timestamp": "+12345",
            "hour": 15,
            "weekday": 3,
            "aqi": 45,
            "temp": 25,
            "uv": 1,
            "duration_minutes": 35,
            "screen_to_walk_ratio": 0.03,
            "rating": 4.5
        }
    ]
    exported_csv = export_walk_logs_to_csv(malicious_sessions)
    # Check whether export neutralizes formula prefixes (e.g. by prefixing with single quote or tab)
    # Standard security mitigation for CSV injection: prefix formula triggers (=, +, -, @) with single quote `'`
    lines = exported_csv.strip().split("\n")
    row1 = lines[1]
    assert not row1.startswith("="), f"Formula injection '=' not sanitized in exported CSV: {row1}"
    assert not row1.startswith("@"), f"Formula injection '@' not sanitized in exported CSV: {row1}"

def test_utf8_bom_handling():
    """UTF-8 BOM at the beginning of CSV content."""
    csv_bom = (
        '\ufeffid,timestamp,hour,weekday,aqi,temp,uv,duration_minutes,screen_to_walk_ratio,rating\n'
        'bom_session,2026-10-10T12:00,12,0,50,25,0,30,0.05,4.0\n'
    )
    sessions, stats = import_walk_logs_from_csv(csv_bom)
    # If DictReader doesn't strip BOM, header becomes '\ufeffid' and 'id' column fails or defaults
    assert stats["valid_rows"] == 1
    assert sessions[0]["id"] == "bom_session", f"BOM corrupted 'id' column: got {sessions[0]['id']}"
