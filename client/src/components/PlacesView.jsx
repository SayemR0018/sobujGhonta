import React, { useState } from 'react';
import { Trees, Map, List, Compass, CheckCircle2, Navigation } from 'lucide-react';
import { SearchHeadsUp } from './SearchHeadsUp.jsx';

export function PlacesView({
  spaces = [],
  selectedSpaceId,
  onSelectSpace,
  searchHeadsUp = null,
  userCoordinates = { lat: 23.74, lon: 90.40 },
  language = 'en',
  t
}) {
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'

  return (
    <div>
      {/* Search Heads-Up Alert (Screen-minimizing delivery) */}
      {searchHeadsUp && (
        <SearchHeadsUp
          headsUp={searchHeadsUp}
          language={language}
          t={t}
        />
      )}

      {/* Places Card Header with List / Map Toggle */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Trees size={20} color="#4ade80" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>
              {t.nearbyGreenspaces}
            </h3>
          </div>

          {/* List / Map Toggle Buttons */}
          <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--bg-card-hover)', padding: '3px', borderRadius: '10px' }}>
            <button
              onClick={() => setViewMode('list')}
              className="btn-secondary"
              style={{
                padding: '0.35rem 0.65rem',
                minHeight: '36px',
                minWidth: '36px',
                fontSize: '0.8rem',
                background: viewMode === 'list' ? 'var(--green-bright)' : 'transparent',
                color: viewMode === 'list' ? '#041206' : 'var(--text-muted)',
                border: 'none'
              }}
              title="List View"
            >
              <List size={16} />
              <span>List</span>
            </button>

            <button
              onClick={() => setViewMode('map')}
              className="btn-secondary"
              style={{
                padding: '0.35rem 0.65rem',
                minHeight: '36px',
                minWidth: '36px',
                fontSize: '0.8rem',
                background: viewMode === 'map' ? 'var(--green-bright)' : 'transparent',
                color: viewMode === 'map' ? '#041206' : 'var(--text-muted)',
                border: 'none'
              }}
              title="Map View"
            >
              <Map size={16} />
              <span>Map</span>
            </button>
          </div>
        </div>

        {/* View Mode 1: List View */}
        {viewMode === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {spaces.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {t.noPlacesFound}
              </div>
            ) : (
              spaces.map(space => {
                const isSelected = selectedSpaceId === space.id;
                const displayName = language === 'bn' ? (space.nameBn || space.name) : space.name;
                const displayDesc = language === 'bn' ? (space.descriptionBn || space.description) : space.description;

                return (
                  <div
                    key={space.id}
                    onClick={() => onSelectSpace(space)}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '12px',
                      background: isSelected ? 'var(--bg-card-hover)' : 'var(--bg-primary)',
                      border: isSelected ? '1.5px solid var(--green-bright)' : '1px solid var(--border-color)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: '700', fontSize: '0.95rem', color: isSelected ? 'var(--green-bright)' : 'var(--text-main)' }}>
                          {displayName}
                        </span>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            background: 'var(--bg-card-hover)',
                            color: 'var(--text-muted)',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            textTransform: 'capitalize'
                          }}
                        >
                          {space.type || 'park'}
                        </span>
                      </div>

                      {displayDesc && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.35', marginBottom: '0.4rem' }}>
                          {displayDesc}
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
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
              })
            )}
          </div>
        )}

        {/* View Mode 2: Interactive SVG Map */}
        {viewMode === 'map' && (
          <div>
            <div
              style={{
                width: '100%',
                height: '320px',
                background: 'var(--bg-primary)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <svg viewBox="0 0 400 320" style={{ width: '100%', height: '100%' }}>
                {/* Distance range concentric circles */}
                <circle cx="200" cy="160" r="50" fill="none" stroke="var(--border-color)" strokeDasharray="3 3" opacity="0.6" />
                <circle cx="200" cy="160" r="100" fill="none" stroke="var(--border-color)" strokeDasharray="3 3" opacity="0.4" />
                <circle cx="200" cy="160" r="140" fill="none" stroke="var(--border-color)" strokeDasharray="3 3" opacity="0.2" />

                <text x="200" y="105" fill="var(--text-dim)" fontSize="9" textAnchor="middle">1 km</text>
                <text x="200" y="55" fill="var(--text-dim)" fontSize="9" textAnchor="middle">2 km</text>

                {/* User center location */}
                <circle cx="200" cy="160" r="7" fill="#60a5fa" stroke="#ffffff" strokeWidth="2" />
                <circle cx="200" cy="160" r="14" fill="none" stroke="#60a5fa" strokeOpacity="0.4" strokeWidth="2" />
                <text x="200" y="185" fill="#60a5fa" fontSize="10" fontWeight="700" textAnchor="middle">
                  You ({Number(userCoordinates.lat).toFixed(2)}°, {Number(userCoordinates.lon).toFixed(2)}°)
                </text>

                {/* Park Markers */}
                {spaces.map((sp, idx) => {
                  const angle = (idx * (360 / Math.max(1, spaces.length)) - 45) * (Math.PI / 180);
                  const distPx = Math.min(130, Math.max(45, (sp.distanceMeters / 3000) * 120 + 40));
                  const px = 200 + Math.cos(angle) * distPx;
                  const py = 160 + Math.sin(angle) * distPx;
                  const isSelected = selectedSpaceId === sp.id;

                  return (
                    <g key={sp.id} onClick={() => onSelectSpace(sp)} style={{ cursor: 'pointer' }}>
                      <circle
                        cx={px}
                        cy={py}
                        r={isSelected ? 10 : 7}
                        fill={isSelected ? '#4ade80' : '#15803d'}
                        stroke={isSelected ? '#ffffff' : '#22c55e'}
                        strokeWidth="2"
                      />
                      <text
                        x={px}
                        y={py - 12}
                        fill={isSelected ? '#4ade80' : 'var(--text-main)'}
                        fontSize={isSelected ? '10' : '9'}
                        fontWeight={isSelected ? '700' : '500'}
                        textAnchor="middle"
                      >
                        {sp.name}
                      </text>
                    </g>
                  );
                })}
              </svg>

              <div
                style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '10px',
                  background: 'rgba(7, 14, 9, 0.85)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)'
                }}
              >
                Tap park marker to select destination
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
