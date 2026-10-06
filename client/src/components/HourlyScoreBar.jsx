import React, { useState } from 'react';
import { Sun, Sparkles, Moon } from 'lucide-react';

export function HourlyScoreBar({ timeline = [], bestHour, language }) {
  const [selectedIdx, setSelectedIdx] = useState(null);

  if (!timeline || timeline.length === 0) return null;

  const getBarColor = (score, isGolden) => {
    if (isGolden) return '#fbbf24';
    if (score >= 80) return '#4ade80';
    if (score >= 65) return '#22c55e';
    if (score >= 45) return '#f59e0b';
    return '#ef4444';
  };

  const activeItem = selectedIdx !== null ? timeline[selectedIdx] : null;

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <h3 className="card-title" style={{ margin: 0, fontSize: '0.95rem' }}>
          <Sun size={18} color="#fbbf24" />
          <span>{language === 'bn' ? '২৪ ঘণ্টার সবুজ ঘণ্টা পূর্বাভাস' : '24-Hour Green Window Timeline'}</span>
        </h3>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {language === 'bn' ? 'ঘণ্টা বেছে নিন' : 'Tap hour for details'}
        </span>
      </div>

      {/* Horizontal Bar Chart Container */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          paddingBottom: '0.5rem',
          scrollbarWidth: 'thin'
        }}
      >
        {timeline.map((item, idx) => {
          const isSelected = selectedIdx === idx;
          const isBest = item.hour === bestHour;
          const heightPercent = Math.max(15, item.score);

          return (
            <div
              key={item.time || idx}
              onClick={() => setSelectedIdx(isSelected ? null : idx)}
              style={{
                flex: '0 0 38px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                padding: '4px 2px',
                borderRadius: '8px',
                background: isSelected ? '#16331e' : isBest ? '#0f2414' : 'transparent',
                border: isBest ? '1px dashed #fbbf24' : isSelected ? '1px solid #4ade80' : '1px solid transparent',
                transition: 'all 0.15s ease'
              }}
            >
              {/* Score Value Top */}
              <div style={{ fontSize: '0.65rem', fontWeight: '700', color: getBarColor(item.score, item.isGoldenHour) }}>
                {item.score}
              </div>

              {/* Bar Column */}
              <div
                style={{
                  width: '14px',
                  height: '65px',
                  background: '#09150c',
                  borderRadius: '7px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  margin: '4px 0',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: `${heightPercent}%`,
                    background: getBarColor(item.score, item.isGoldenHour),
                    borderRadius: '7px',
                    transition: 'height 0.3s ease'
                  }}
                />
              </div>

              {/* Icon for Golden Hour or Night */}
              <div style={{ height: '14px', display: 'flex', alignItems: 'center' }}>
                {item.isGoldenHour ? (
                  <Sparkles size={11} color="#fbbf24" />
                ) : !item.isDaylight ? (
                  <Moon size={10} color="#6d8e74" />
                ) : null}
              </div>

              {/* Hour Label */}
              <div style={{ fontSize: '0.7rem', color: isSelected ? '#4ade80' : 'var(--text-muted)' }}>
                {String(item.hour).padStart(2, '0')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Hour Details Popover */}
      {activeItem && (
        <div
          style={{
            marginTop: '0.5rem',
            padding: '0.65rem 0.85rem',
            background: '#09150c',
            border: '1px solid #1c3d22',
            borderRadius: '10px',
            fontSize: '0.85rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
            <span style={{ fontWeight: '700', color: '#f5fbf6' }}>
              {String(activeItem.hour).padStart(2, '0')}:00 — {language === 'bn' ? activeItem.categoryBn : activeItem.category.toUpperCase()} ({activeItem.score}/100)
            </span>
            <span style={{ color: 'var(--text-muted)' }}>AQI {activeItem.aqi} | {Math.round(activeItem.apparentTemp)}°C</span>
          </div>

          <div style={{ fontSize: '0.78rem', color: '#a3c2a9' }}>
            {language === 'bn'
              ? activeItem.reasonsBn?.join(' • ') || 'অনুকূল আবহাওয়া'
              : activeItem.reasonsEn?.join(' • ') || 'Favorable conditions'}
          </div>
        </div>
      )}
    </div>
  );
}
