import React, { useState } from 'react';
import { Eye, Headphones, Hand, Clock, AlertTriangle, ShieldCheck, CheckSquare, Square, Info } from 'lucide-react';

export function PlanView({ plan, t, language }) {
  const [completedMissions, setCompletedMissions] = useState({});

  if (!plan) return null;

  const toggleMission = (idx) => {
    setCompletedMissions((prev) => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const getMissionIcon = (type) => {
    switch (type) {
      case 'look':
        return <Eye size={18} color="#4ade80" />;
      case 'listen':
        return <Headphones size={18} color="#60a5fa" />;
      case 'touch':
        return <Hand size={18} color="#fbbf24" />;
      default:
        return <Eye size={18} color="#4ade80" />;
    }
  };

  return (
    <div className="card" style={{ marginBottom: '1rem', border: '1.5px solid #23542f' }}>
      {/* Plan Header */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.35rem' }}>
          <span className="badge badge-optimal" style={{ fontSize: '0.75rem' }}>
            {plan.destination_name || 'Destination'}
          </span>
          <span
            style={{
              fontSize: '0.75rem',
              color: '#ffd54f',
              textTransform: 'uppercase',
              fontWeight: '700',
              background: '#1a2b16',
              padding: '0.2rem 0.5rem',
              borderRadius: '6px'
            }}
          >
            Effort: {plan.effort_level}
          </span>
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#f5fbf6', lineHeight: '1.25' }}>
          {plan.headline}
        </h2>

        {plan.window && (
          <div
            style={{
              marginTop: '0.5rem',
              padding: '0.5rem 0.75rem',
              background: '#09150c',
              borderRadius: '8px',
              border: '1px solid #14281a',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem'
            }}
          >
            <Clock size={16} color="#4ade80" />
            <div>
              <span style={{ fontWeight: '700', color: '#4ade80' }}>
                {plan.window.start} – {plan.window.end}
              </span>
              <span style={{ color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                ({plan.window.why})
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Safety & Health Notes */}
      {plan.health_notes && plan.health_notes.length > 0 && (
        <div style={{ marginBottom: '1rem', background: '#0a170d', padding: '0.75rem', borderRadius: '10px', border: '1px solid #1c3d22' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '700', fontSize: '0.85rem', color: '#fbbf24', marginBottom: '0.4rem' }}>
            <AlertTriangle size={15} color="#fbbf24" />
            <span>{t.healthAndSafety}</span>
          </div>
          <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.8rem', color: '#c3dac8', lineHeight: '1.4' }}>
            {plan.health_notes.map((note, idx) => (
              <li key={idx} style={{ marginBottom: '0.25rem' }}>
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sensory Trail Missions */}
      {plan.missions && plan.missions.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: 0, color: 'var(--text-main)' }}>
              {t.missionsTitle}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {t.missionsSubtext}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {plan.missions.map((mission, idx) => {
              const done = !!completedMissions[idx];
              return (
                <div
                  key={idx}
                  onClick={() => toggleMission(idx)}
                  style={{
                    background: done ? '#0c2212' : '#09150c',
                    border: done ? '1px solid #4ade80' : '1px solid #14281a',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.65rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ marginTop: '2px' }}>
                    {done ? (
                      <CheckSquare size={18} color="#4ade80" />
                    ) : (
                      <Square size={18} color="#6d8e74" />
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.15rem' }}>
                      {getMissionIcon(mission.type)}
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: '800',
                          color: '#4ade80',
                          letterSpacing: '0.5px'
                        }}
                      >
                        {t.missionTypes[mission.type] || mission.type?.toUpperCase()}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '0.85rem',
                        color: done ? '#a3c2a9' : '#f5fbf6',
                        textDecoration: done ? 'line-through' : 'none',
                        lineHeight: '1.3'
                      }}
                    >
                      {mission.prompt}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
