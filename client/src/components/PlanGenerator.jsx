import React from 'react';
import { Sparkles, Compass } from 'lucide-react';

export function PlanGenerator({
  minutes,
  setMinutes,
  goal,
  setGoal,
  onGeneratePlan,
  isGenerating,
  t,
  language
}) {
  const durationOptions = [15, 30, 45, 60];
  const goalOptions = [
    { key: 'calm', icon: '🍃' },
    { key: 'exercise', icon: '👟' },
    { key: 'birding', icon: '🐦' },
    { key: 'kids', icon: '🎈' },
    { key: 'elders', icon: '🌿' }
  ];

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <h3 className="card-title">
        <Compass size={20} color="#4ade80" />
        <span>{t.planYourWalk}</span>
      </h3>

      {/* Duration Selector */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
          {t.duration}
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
          {durationOptions.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMinutes(m)}
              style={{
                background: minutes === m ? '#1b4325' : '#09150c',
                border: minutes === m ? '2px solid #4ade80' : '1px solid var(--border-color)',
                color: minutes === m ? '#4ade80' : '#f5fbf6',
                padding: '0.5rem 0',
                fontSize: '0.9rem',
                borderRadius: '8px'
              }}
            >
              {m} {t.minutes}
            </button>
          ))}
        </div>
      </div>

      {/* Goal Selector */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
          {t.goal}
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {goalOptions.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => setGoal(g.key)}
              style={{
                background: goal === g.key ? '#1b4325' : '#09150c',
                border: goal === g.key ? '1.5px solid #4ade80' : '1px solid var(--border-color)',
                color: goal === g.key ? '#4ade80' : '#f5fbf6',
                padding: '0.65rem 0.85rem',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                fontSize: '0.9rem',
                borderRadius: '10px'
              }}
            >
              <span style={{ fontSize: '1.15rem' }}>{g.icon}</span>
              <span style={{ fontWeight: goal === g.key ? '700' : '500' }}>
                {t.goals[g.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Big Action Button */}
      <button
        type="button"
        onClick={onGeneratePlan}
        className="btn-primary"
        disabled={isGenerating}
      >
        <Sparkles size={20} />
        <span>{isGenerating ? t.generating : t.generateBtn}</span>
      </button>
    </div>
  );
}
