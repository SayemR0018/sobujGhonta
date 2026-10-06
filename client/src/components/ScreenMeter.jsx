import React, { useState, useEffect } from 'react';
import { Smartphone, Footprints, ShieldCheck } from 'lucide-react';

export function ScreenMeter({ isWalkActive = true, walkDurationMinutes = 30, t, language }) {
  const [screenSeconds, setScreenSeconds] = useState(0);
  const [walkElapsedSeconds, setWalkElapsedSeconds] = useState(0);

  useEffect(() => {
    let lastVisibleTime = Date.now();
    let isVisible = !document.hidden;

    // 1-second interval ticker
    const timer = setInterval(() => {
      setWalkElapsedSeconds(prev => prev + 1);

      if (isVisible) {
        setScreenSeconds(prev => prev + 1);
      }
    }, 1000);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isVisible = false;
      } else {
        isVisible = true;
        lastVisibleTime = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const totalSeconds = Math.max(walkElapsedSeconds, 60);
  const ratio = ((screenSeconds / totalSeconds) * 100).toFixed(1);

  return (
    <div className="card" style={{ background: '#0a170d', border: '1px solid #1c3d22' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <h3 className="card-title" style={{ margin: 0, fontSize: '0.95rem' }}>
          <Smartphone size={18} color="#4ade80" />
          <span>{t.screenMeterTitle}</span>
        </h3>
        <span className="badge badge-optimal" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
          {ratio}% {t.screenRatio}
        </span>
      </div>

      <div className="grid-2" style={{ gap: '0.5rem', marginBottom: '0.65rem' }}>
        <div style={{ background: '#071008', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.screenTime}</div>
          <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffd54f' }}>
            {screenSeconds < 60 ? `${screenSeconds}s` : `${Math.floor(screenSeconds / 60)}m ${screenSeconds % 60}s`}
          </div>
        </div>

        <div style={{ background: '#071008', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.walkTimeTotal}</div>
          <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#4ade80' }}>
            {walkElapsedSeconds < 60
              ? `${walkElapsedSeconds}s`
              : `${Math.floor(walkElapsedSeconds / 60)}m ${walkElapsedSeconds % 60}s`}
          </div>
        </div>
      </div>

      {/* Progress bar visual */}
      <div style={{ width: '100%', height: '8px', background: '#132817', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.4rem' }}>
        <div
          style={{
            width: `${Math.min(100, Math.max(2, ratio))}%`,
            height: '100%',
            background: Number(ratio) < 15 ? '#4ade80' : Number(ratio) < 30 ? '#f59e0b' : '#ef4444',
            transition: 'width 0.5s ease'
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: '#a3c2a9' }}>
        <ShieldCheck size={14} color="#4ade80" />
        <span>{t.ratioProof}</span>
      </div>
    </div>
  );
}
