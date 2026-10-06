import React from 'react';
import { Trees, Compass, CheckCircle2 } from 'lucide-react';

export function GreenSpacesList({
  spaces = [],
  selectedSpaceId,
  onSelectSpace,
  t,
  language
}) {
  if (!spaces || spaces.length === 0) {
    return (
      <div className="card" style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        {t.noPlacesFound}
      </div>
    );
  }

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <h3 className="card-title">
        <Trees size={20} color="#4ade80" />
        <span>{t.nearbyGreenspaces}</span>
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {spaces.slice(0, 5).map((space) => {
          const isSelected = selectedSpaceId === space.id;
          const displayName = language === 'bn' ? (space.nameBn || space.name) : space.name;
          const displayDesc = language === 'bn' ? (space.descriptionBn || space.description) : space.description;

          return (
            <div
              key={space.id}
              onClick={() => onSelectSpace(space)}
              style={{
                padding: '0.75rem 0.9rem',
                borderRadius: '12px',
                background: isSelected ? '#122b17' : '#0a160d',
                border: isSelected ? '1.5px solid #4ade80' : '1px solid var(--border-color)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.95rem', color: isSelected ? '#4ade80' : '#f5fbf6' }}>
                    {displayName}
                  </span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      background: '#132817',
                      color: '#a3c2a9',
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px',
                      textTransform: 'capitalize'
                    }}
                  >
                    {space.type || 'park'}
                  </span>
                </div>

                {displayDesc && (
                  <div style={{ fontSize: '0.78rem', color: '#889f8d', lineHeight: '1.3', marginBottom: '0.3rem' }}>
                    {displayDesc}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Compass size={13} color="#4ade80" />
                    <span>{space.distanceMeters}m</span>
                  </span>
                  <span>•</span>
                  <span>~{space.walkTimeMinutes} {language === 'bn' ? 'মিনিট' : 'min'} {t.walkTime}</span>
                </div>
              </div>

              <div>
                {isSelected ? (
                  <CheckCircle2 size={22} color="#4ade80" />
                ) : (
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: '2px solid var(--border-color)'
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
