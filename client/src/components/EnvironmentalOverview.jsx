import React from 'react';
import { Wind, Thermometer, Sun, CloudRain, Clock, AlertTriangle, Sparkles } from 'lucide-react';

export function EnvironmentalOverview({ weather, bestWindow, t, language }) {
  if (!weather) return null;

  const score = weather.score ?? 75;
  const aqi = weather.aqi ?? 65;
  const temp = Math.round(weather.apparentTemp ?? 28);
  const uv = weather.uv ?? 1;
  const precipProb = weather.precipProb ?? 0;

  const getScoreBadgeClass = (s) => {
    if (s >= 80) return 'badge-optimal';
    if (s >= 65) return 'badge-good';
    if (s >= 45) return 'badge-fair';
    if (s >= 25) return 'badge-poor';
    return 'badge-hazardous';
  };

  const getAqiColor = (a) => {
    if (a <= 50) return '#4ade80';
    if (a <= 100) return '#a3e635';
    if (a <= 150) return '#fbbf24';
    if (a <= 200) return '#f97316';
    if (a <= 300) return '#ef4444';
    return '#b91c1c';
  };

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      {/* Top Banner: Green Window Score */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '0.85rem',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '0.85rem'
        }}
      >
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t.currentScore}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.2rem' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: '800', lineHeight: 1, color: 'var(--text-main)' }}>
              {score}
            </span>
            <span style={{ fontSize: '1rem', color: 'var(--text-dim)' }}>/100</span>
          </div>
        </div>

        <div>
          <span className={`badge ${getScoreBadgeClass(score)}`} style={{ fontSize: '0.9rem', padding: '0.45rem 0.85rem' }}>
            {language === 'bn' ? (weather.categoryBn || 'অনুকূল') : t.scoreCategories[weather.category || 'good']}
          </span>
        </div>
      </div>

      {/* 4-Metric Environmental Grid */}
      <div className="grid-4" style={{ marginBottom: '0.85rem' }}>
        {/* AQI */}
        <div style={{ background: '#09150c', padding: '0.65rem', borderRadius: '10px', border: '1px solid #14281a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
            <Wind size={14} color={getAqiColor(aqi)} />
            <span>AQI</span>
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: '700', color: getAqiColor(aqi) }}>
            {aqi}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#889f8d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {aqi <= 50 ? 'Good' : aqi <= 100 ? 'Moderate' : aqi <= 150 ? 'Sensitive' : 'Unhealthy'}
          </div>
        </div>

        {/* Feels Like Temp */}
        <div style={{ background: '#09150c', padding: '0.65rem', borderRadius: '10px', border: '1px solid #14281a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
            <Thermometer size={14} color="#ffd54f" />
            <span>{t.temperature}</span>
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#f5fbf6' }}>
            {temp}°C
          </div>
          <div style={{ fontSize: '0.7rem', color: '#889f8d' }}>
            {temp >= 38 ? 'High Heat' : temp >= 33 ? 'Warm' : 'Mild'}
          </div>
        </div>

        {/* UV Index */}
        <div style={{ background: '#09150c', padding: '0.65rem', borderRadius: '10px', border: '1px solid #14281a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
            <Sun size={14} color="#f59e0b" />
            <span>{t.uvIndex}</span>
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: '700', color: uv >= 6 ? '#f59e0b' : '#4ade80' }}>
            {uv}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#889f8d' }}>
            {uv <= 2 ? 'Low' : uv <= 5 ? 'Mod' : 'High'}
          </div>
        </div>

        {/* Rain Probability */}
        <div style={{ background: '#09150c', padding: '0.65rem', borderRadius: '10px', border: '1px solid #14281a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
            <CloudRain size={14} color="#60a5fa" />
            <span>{t.rainProbability}</span>
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: '700', color: precipProb >= 50 ? '#60a5fa' : '#f5fbf6' }}>
            {precipProb}%
          </div>
          <div style={{ fontSize: '0.7rem', color: '#889f8d' }}>
            {precipProb >= 60 ? 'Likely' : precipProb >= 25 ? 'Slight' : 'Dry'}
          </div>
        </div>
      </div>

      {/* Best Window Callout Card */}
      {bestWindow && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(27, 67, 37, 0.4) 0%, rgba(13, 31, 18, 0.6) 100%)',
            border: '1px solid #23542f',
            borderRadius: '12px',
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={20} color="#fbbf24" />
            <div>
              <div style={{ fontSize: '0.75rem', color: '#a3c2a9' }}>{t.optimalWindow}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#f5fbf6' }}>
                {bestWindow.start?.includes('T') ? bestWindow.start.split('T')[1].slice(0, 5) : bestWindow.start} – {bestWindow.end?.includes('T') ? bestWindow.end.split('T')[1].slice(0, 5) : bestWindow.end}
              </div>
            </div>
          </div>

          <span className="badge badge-optimal" style={{ fontSize: '0.8rem' }}>
            {bestWindow.score}/100
          </span>
        </div>
      )}
    </div>
  );
}
