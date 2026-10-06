import React, { useState } from 'react';
import { MapPin, Navigation, Search } from 'lucide-react';

export function LocationSearch({
  currentLocationName,
  onSelectCoordinates,
  t,
  language
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(`/api/cities?query=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.ok) {
        setSearchResults(data.cities || []);
      }
    } catch (err) {
      console.warn('City search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        onSelectCoordinates({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          name: language === 'bn' ? 'বর্তমান অবস্থান' : 'GPS Location'
        });
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err.message);
        alert(language === 'bn' ? 'অবস্থান শনাক্ত করা যায়নি।' : 'Unable to retrieve location.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MapPin size={20} color="#4ade80" />
          <span style={{ fontWeight: '700', fontSize: '1rem' }}>{currentLocationName}</span>
        </div>

        <button
          onClick={handleGetCurrentLocation}
          className="btn-secondary"
          style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
          disabled={isLocating}
        >
          <Navigation size={14} />
          <span>{isLocating ? 'Locating...' : t.useCurrentLocation}</span>
        </button>
      </div>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.searchCityPlaceholder}
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn-secondary" style={{ padding: '0 1rem' }}>
          <Search size={18} />
        </button>
      </form>

      {isSearching && (
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          {t.searching}
        </div>
      )}

      {searchResults.length > 0 && (
        <div
          style={{
            marginTop: '0.5rem',
            background: '#071008',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            overflow: 'hidden'
          }}
        >
          {searchResults.map((city) => (
            <div
              key={city.id}
              onClick={() => {
                onSelectCoordinates({
                  lat: city.latitude,
                  lon: city.longitude,
                  name: `${city.name}, ${city.country}`
                });
                setSearchResults([]);
                setSearchQuery('');
              }}
              style={{
                padding: '0.6rem 0.85rem',
                borderBottom: '1px solid #14281a',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.9rem'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#112516')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span>{city.name}, {city.admin1 ? `${city.admin1}, ` : ''}{city.country}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {Number(city.latitude).toFixed(2)}°, {Number(city.longitude).toFixed(2)}°
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
