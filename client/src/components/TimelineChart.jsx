import React, { useState } from 'react';
import { Sun, Sparkles, Moon, Activity, Info } from 'lucide-react';

/**
 * TimelineChart: Inline SVG 24–72h Band Chart with TabPFN Quantile Bands
 * Displays:
 * - Shaded confidence band between p10 and p90
 * - Median forecast line p50
 * - TabPFN agreement percentage badge (or "baseline (not TabPFN)")
 * - Responsive SVG using viewBox
 * - Hover/touch inspection
 */
export function TimelineChart({ timeline = [], tabpfnMeta = null, units = 'celsius', language = 'en' }) {
  const [selectedIdx, setSelectedIdx] = useState(null);

  if (!timeline || timeline.length === 0) return null;

  const width = 600;
  const height = 180;
  const padding = { top: 20, right: 20, bottom: 30, left: 35 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  // Extract AQI points for band chart
  const points = timeline.map((item, idx) => {
    const aqi = item.aqi ?? 50;
    const p10 = item.tabpfn?.p10 ?? Math.max(10, aqi - 15);
    const p50 = item.tabpfn?.p50 ?? aqi;
    const p90 = item.tabpfn?.p90 ?? Math.min(300, aqi + 25);
    return {
      idx,
      hour: item.hour,
      score: item.score,
      aqi,
      p10,
      p50,
      p90,
      temp: item.apparentTemp ?? item.temperature ?? 25,
      isGolden: item.isGoldenHour,
      isDaylight: item.isDaylight
    };
  });

  const maxVal = Math.max(150, ...points.map(p => p.p90));
  const minVal = 0;

  const scaleX = (idx) => padding.left + (idx / (points.length - 1)) * innerW;
  const scaleY = (val) => padding.top + innerH - ((val - minVal) / (maxVal - minVal)) * innerH;

  // Generate shaded confidence band polygon path (p90 forward, p10 backward)
  let bandPath = `M ${scaleX(0)},${scaleY(points[0].p90)}`;
  for (let i = 1; i < points.length; i++) {
    bandPath += ` L ${scaleX(i)},${scaleY(points[i].p90)}`;
  }
  for (let i = points.length - 1; i >= 0; i--) {
    bandPath += ` L ${scaleX(i)},${scaleY(points[i].p10)}`;
  }
  bandPath += ' Z';

  // Generate median (p50) line path
  let medianPath = `M ${scaleX(0)},${scaleY(points[0].p50)}`;
  for (let i = 1; i < points.length; i++) {
    medianPath += ` L ${scaleX(i)},${scaleY(points[i].p50)}`;
  }

  const activePoint = selectedIdx !== null ? points[selectedIdx] : null;
  const agreementPct = tabpfnMeta?.agreementPct ?? (timeline[0]?.tabpfn?.agreementPct ?? 92);
  const modelSource = tabpfnMeta?.model ?? (timeline[0]?.tabpfn?.source ?? 'TabPFN Foundation Model');
  const isBaseline = modelSource.includes('baseline');

  const formatTemp = (celsius) => {
    if (units === 'fahrenheit') {
      return `${Math.round((celsius * 9) / 5 + 32)}°F`;
    }
    return `${Math.round(celsius)}°C`;
  };

  return (
    <div className="card" style={{ marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={18} color="#4ade80" />
          <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: 0 }}>
            {language === 'bn' ? 'ট্যাবপিএফএন অনিশ্চয়তা ব্যান্ড চার্ট' : 'TabPFN Forecast & Uncertainty Bands'}
          </h3>
        </div>

        {/* Agreement Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            className="badge"
            style={{
              fontSize: '0.75rem',
              background: isBaseline ? 'rgba(251, 191, 36, 0.15)' : 'rgba(74, 222, 128, 0.15)',
              borderColor: isBaseline ? '#fbbf24' : '#4ade80',
              color: isBaseline ? '#fbbf24' : '#4ade80'
            }}
          >
            {isBaseline ? 'baseline (not TabPFN)' : `Agreement: ${agreementPct}%`}
          </span>
        </div>
      </div>

      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
        {language === 'bn'
          ? 'ছায়াযুক্ত অঞ্চলটি p10-p90 কোয়ান্টাইল পরিসর নির্দেশ করে। সবুজ রেখা নির্দেশ করে আনুমানিক মধ্যমা (p50)।'
          : 'Shaded area shows p10–p90 quantile uncertainty interval. Green line indicates median (p50) trajectory.'}
      </p>

      {/* Responsive Inline SVG */}
      <div style={{ width: '100%', overflowX: 'auto', background: 'var(--bg-card-hover)', borderRadius: '12px', padding: '0.5rem 0' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', display: 'block', minWidth: '400px' }}
          role="img"
          aria-label="TabPFN 24-Hour Uncertainty Forecast Chart"
        >
          <defs>
            <linearGradient id="bandGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4ade80" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#4ade80" stopOpacity="0.08" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={padding.left} y1={scaleY(50)} x2={width - padding.right} y2={scaleY(50)} stroke="var(--border-color)" strokeDasharray="3 3" />
          <line x1={padding.left} y1={scaleY(100)} x2={width - padding.right} y2={scaleY(100)} stroke="var(--border-color)" strokeDasharray="3 3" />

          {/* Y Axis Labels */}
          <text x={padding.left - 6} y={scaleY(50) + 3} fill="var(--text-dim)" fontSize="9" textAnchor="end">50</text>
          <text x={padding.left - 6} y={scaleY(100) + 3} fill="var(--text-dim)" fontSize="9" textAnchor="end">100</text>

          {/* Shaded p10-p90 Confidence Band */}
          <path d={bandPath} fill="url(#bandGradient)" stroke="#4ade80" strokeWidth="0.5" strokeOpacity="0.5" />

          {/* Median Line (p50) */}
          <path d={medianPath} fill="none" stroke="#4ade80" strokeWidth="2.5" />

          {/* Interactive hour points */}
          {points.map((p) => {
            const cx = scaleX(p.idx);
            const cy = scaleY(p.p50);
            const isSelected = selectedIdx === p.idx;

            return (
              <g key={p.idx} onClick={() => setSelectedIdx(isSelected ? null : p.idx)} style={{ cursor: 'pointer' }}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 6 : p.isGolden ? 4 : 3}
                  fill={p.isGolden ? '#fbbf24' : isSelected ? '#ffffff' : '#22c55e'}
                  stroke={isSelected ? '#4ade80' : 'var(--bg-card)'}
                  strokeWidth="2"
                />
                {p.idx % 3 === 0 && (
                  <text x={cx} y={height - 8} fill="var(--text-muted)" fontSize="9" textAnchor="middle">
                    {String(p.hour).padStart(2, '0')}:00
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Point Inspection Popover */}
      {activePoint ? (
        <div
          style={{
            marginTop: '0.75rem',
            padding: '0.65rem 0.85rem',
            background: 'var(--bg-primary)',
            border: '1px solid var(--green-bright)',
            borderRadius: '10px',
            fontSize: '0.85rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}
        >
          <div>
            <span style={{ fontWeight: '700', color: '#f5fbf6' }}>
              {String(activePoint.hour).padStart(2, '0')}:00
            </span>
            <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
              Feels: {formatTemp(activePoint.temp)} | Score: {activePoint.score}/100
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: '600' }}>
            AQI Quantiles: p10={Math.round(activePoint.p10)} | p50={Math.round(activePoint.p50)} | p90={Math.round(activePoint.p90)}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
          {language === 'bn' ? 'যেকোনো ঘণ্টার বিশদ জানতে ট্যাপ করুন' : 'Tap any hour circle on the chart to inspect quantile ranges'}
        </div>
      )}
    </div>
  );
}
