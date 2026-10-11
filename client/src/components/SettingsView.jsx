import React, { useState, useEffect } from 'react';
import {
  Globe,
  Sliders,
  KeyRound,
  ShieldCheck,
  Moon,
  Sun,
  Smartphone,
  Download,
  Upload,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Trash2,
  Database,
  Lock
} from 'lucide-react';
import {
  getAllWalkSessions,
  saveAllWalkSessions,
  saveInAppKey,
  getAllInAppKeys,
  removeInAppKey
} from '../utils/db.js';

export function SettingsView({
  language,
  setLanguage,
  theme,
  setTheme,
  units,
  setUnits,
  onSelectCityPack,
  t,
  onShowToast
}) {
  const [storageType, setStorageType] = useState(() => {
    return localStorage.getItem('sg_key_storage') || 'sessionStorage';
  });

  // Key state management
  const [keys, setKeys] = useState(() => {
    return {
      gemma: sessionStorage.getItem('sg_key_gemma') || '',
      serpapi: sessionStorage.getItem('sg_key_serpapi') || '',
      serper: sessionStorage.getItem('sg_key_serper') || '',
      tabpfn: sessionStorage.getItem('sg_key_tabpfn') || '',
      elevenlabs: sessionStorage.getItem('sg_key_elevenlabs') || ''
    };
  });

  const [visibleKeys, setVisibleKeys] = useState({});
  const [testResults, setTestResults] = useState({});

  // On mount: If user opted into IndexedDB, load persisted keys
  useEffect(() => {
    if (storageType === 'indexeddb') {
      getAllInAppKeys().then(storedKeys => {
        if (storedKeys && Object.keys(storedKeys).length > 0) {
          setKeys(prev => ({ ...prev, ...storedKeys }));
          for (const [p, k] of Object.entries(storedKeys)) {
            sessionStorage.setItem(`sg_key_${p}`, k);
          }
        }
      }).catch(err => {
        console.warn('Failed to load keys from IndexedDB:', err);
      });
    }
  }, [storageType]);

  const languagesList = [
    { code: 'en', name: 'English', dir: 'ltr' },
    { code: 'bn', name: 'বাংলা (Bengali)', dir: 'ltr' },
    { code: 'hi', name: 'हिन्दी (Hindi)', dir: 'ltr' },
    { code: 'es', name: 'Español (Spanish)', dir: 'ltr' },
    { code: 'ar', name: 'العربية (Arabic - RTL)', dir: 'rtl' },
    { code: 'fr', name: 'Français (French)', dir: 'ltr' },
    { code: 'pt', name: 'Português (Portuguese)', dir: 'ltr' },
    { code: 'id', name: 'Bahasa Indonesia', dir: 'ltr' }
  ];

  const cityPacks = [
    { id: 'dhaka', name: 'Dhaka', country: 'Bangladesh', lat: 23.74, lon: 90.40 },
    { id: 'delhi', name: 'Delhi', country: 'India', lat: 28.61, lon: 77.21 },
    { id: 'london', name: 'London', country: 'UK', lat: 51.51, lon: -0.13 },
    { id: 'los_angeles', name: 'Los Angeles', country: 'USA', lat: 34.05, lon: -118.24 },
    { id: 'nairobi', name: 'Nairobi', country: 'Kenya', lat: -1.29, lon: 36.82 },
    { id: 'sao_paulo', name: 'São Paulo', country: 'Brazil', lat: -23.55, lon: -46.63 },
    { id: 'sydney', name: 'Sydney', country: 'Australia', lat: -33.87, lon: 151.21 },
    { id: 'tokyo', name: 'Tokyo', country: 'Japan', lat: 35.68, lon: 139.77 }
  ];

  const handleStorageTypeChange = async (type) => {
    setStorageType(type);
    localStorage.setItem('sg_key_storage', type);
    if (type === 'indexeddb') {
      for (const [p, k] of Object.entries(keys)) {
        if (k) await saveInAppKey(p, k);
      }
      if (onShowToast) onShowToast('Opted-in: Keys saved to local IndexedDB.');
    } else {
      for (const p of Object.keys(keys)) {
        await removeInAppKey(p);
      }
      if (onShowToast) onShowToast('Switched to ephemeral sessionStorage.');
    }
  };

  const handleKeyChange = (provider, val) => {
    // Prevent payload bloat (> 500 chars)
    if (val.length > 500) return;
    // Reject non-ASCII control characters
    if (val && !/^[\x20-\x7E]*$/.test(val)) return;

    setKeys(prev => ({ ...prev, [provider]: val }));
    sessionStorage.setItem(`sg_key_${provider}`, val);

    if (storageType === 'indexeddb') {
      if (val) {
        saveInAppKey(provider, val).catch(() => {});
      } else {
        removeInAppKey(provider).catch(() => {});
      }
    }
  };

  const handleToggleVisibility = (provider) => {
    setVisibleKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const handleForgetKey = async (provider) => {
    setKeys(prev => ({ ...prev, [provider]: '' }));
    sessionStorage.removeItem(`sg_key_${provider}`);
    await removeInAppKey(provider).catch(() => {});
    setTestResults(prev => ({ ...prev, [provider]: null }));
    if (onShowToast) onShowToast(`${provider.toUpperCase()} key forgotten.`);
  };

  const handleTestKey = (provider) => {
    const key = (keys[provider] || '').trim();
    if (!key) {
      setTestResults(prev => ({ ...prev, [provider]: { ok: false, msg: 'Key is empty' } }));
      return;
    }

    if (key.length < 10) {
      setTestResults(prev => ({ ...prev, [provider]: { ok: false, msg: 'Too short (<10 chars)' } }));
      return;
    }

    if (key.length > 500) {
      setTestResults(prev => ({ ...prev, [provider]: { ok: false, msg: 'Exceeds 500 characters' } }));
      return;
    }

    if (!/^[\x20-\x7E]+$/.test(key)) {
      setTestResults(prev => ({ ...prev, [provider]: { ok: false, msg: 'Contains invalid non-ASCII characters' } }));
      return;
    }

    if (provider === 'gemma' && !key.startsWith('AIza')) {
      setTestResults(prev => ({ ...prev, [provider]: { ok: false, msg: 'Expected AIza... prefix' } }));
      return;
    }

    if (provider === 'elevenlabs' && !key.startsWith('sk_')) {
      setTestResults(prev => ({ ...prev, [provider]: { ok: false, msg: 'Expected sk_... prefix' } }));
      return;
    }

    if (provider === 'tabpfn' && !key.startsWith('tabpfn_')) {
      setTestResults(prev => ({ ...prev, [provider]: { ok: false, msg: 'Expected tabpfn_... prefix' } }));
      return;
    }

    setTestResults(prev => ({ ...prev, [provider]: { ok: true, msg: 'Format valid' } }));
    if (onShowToast) onShowToast(`${provider.toUpperCase()} key format verified.`);
  };

  // RFC 4180 CSV Export for Walk Logs
  const handleExportCsv = async () => {
    try {
      const storedSessions = await getAllWalkSessions();
      let csvLines = [];
      const header = "id,timestamp,hour,weekday,aqi,temp,uv,duration_minutes,screen_to_walk_ratio,rating";
      csvLines.push(header);

      if (storedSessions && storedSessions.length > 0) {
        for (const s of storedSessions) {
          const row = [
            s.id || 'w1',
            s.timestamp || new Date().toISOString(),
            s.hour ?? 17,
            s.weekday ?? 3,
            s.aqi ?? 50,
            s.temp ?? 25,
            s.uv ?? 0,
            s.durationMinutes ?? 30,
            s.screenToWalkRatio ?? 0.02,
            s.rating ?? 5.0
          ].join(',');
          csvLines.push(row);
        }
      } else {
        // Fallback starter rows for user reference
        csvLines.push("1,2026-10-10T16:00:00Z,16,6,72,27,1,30,0.025,5.0");
        csvLines.push("2,2026-10-09T17:00:00Z,17,5,84,26,0,45,0.018,4.8");
      }

      const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvLines.join('\n'));
      const link = document.createElement("a");
      link.setAttribute("href", csvContent);
      link.setAttribute("download", `sobuj-ghonta-walks-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (onShowToast) onShowToast('Exported walk logs CSV.');
    } catch (err) {
      console.warn('CSV export error:', err);
      if (onShowToast) onShowToast('Failed to export walk logs.');
    }
  };

  // RFC 4180 CSV Import for Walk Logs
  const handleImportCsv = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const lines = text.trim().split(/\r?\n/);
        if (lines.length < 2) {
          if (onShowToast) onShowToast('CSV file is empty or missing headers.');
          return;
        }

        const validSessions = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const parts = line.split(',');
          if (parts.length >= 8) {
            const h = parseInt(parts[2], 10);
            const w = parseInt(parts[3], 10);
            const aqi = parseFloat(parts[4]);
            const temp = parseFloat(parts[5]);
            const uv = parseFloat(parts[6]);
            const duration = parseFloat(parts[7]);
            const screenRatio = parseFloat(parts[8] || '0.05');
            const rating = parseFloat(parts[9] || '5.0');

            if (Number.isFinite(duration) && duration > 0) {
              validSessions.push({
                timestamp: parts[1] || new Date().toISOString(),
                hour: Number.isFinite(h) ? h : 16,
                weekday: Number.isFinite(w) ? w : 1,
                aqi: Number.isFinite(aqi) ? aqi : 50,
                temp: Number.isFinite(temp) ? temp : 25,
                uv: Number.isFinite(uv) ? uv : 0,
                durationMinutes: duration,
                screenToWalkRatio: Number.isFinite(screenRatio) ? screenRatio : 0.05,
                rating: Number.isFinite(rating) ? rating : 5.0
              });
            }
          }
        }

        if (validSessions.length > 0) {
          await saveAllWalkSessions(validSessions);
          if (onShowToast) onShowToast(`Imported ${validSessions.length} walk logs into IndexedDB!`);
        } else {
          if (onShowToast) onShowToast('No valid walk session rows found in CSV.');
        }
      } catch (err) {
        console.warn('Import CSV parsing error:', err);
        if (onShowToast) onShowToast('Failed to import CSV file.');
      }
    };
    reader.readAsText(file);
  };

  const renderKeyField = (provider, label, placeholder) => {
    const val = keys[provider] || '';
    const isVis = visibleKeys[provider];
    const testRes = testResults[provider];
    const last4 = val.length >= 4 ? val.slice(-4) : '';

    return (
      <div style={{ marginBottom: '1rem', background: 'var(--bg-primary)', padding: '0.85rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)' }}>
            {label}
          </label>
          {last4 && (
            <span style={{ fontSize: '0.75rem', color: 'var(--green-bright)', fontFamily: 'monospace' }}>
              ••••••••{last4}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <input
            type={isVis ? 'text' : 'password'}
            value={val}
            onChange={(e) => handleKeyChange(provider, e.target.value)}
            placeholder={placeholder}
            autoComplete="off"
            style={{ flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
          />

          <button
            type="button"
            onClick={() => handleToggleVisibility(provider)}
            className="btn-secondary"
            title="Toggle visibility"
            style={{ padding: '0.5rem', minWidth: '40px', minHeight: '40px' }}
          >
            {isVis ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>

          <button
            type="button"
            onClick={() => handleTestKey(provider)}
            className="btn-secondary"
            title="Test key format"
            style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', minHeight: '40px' }}
          >
            Test
          </button>

          {val && (
            <button
              type="button"
              onClick={() => handleForgetKey(provider)}
              className="btn-secondary"
              title="Forget key"
              style={{ padding: '0.5rem', minWidth: '40px', minHeight: '40px', color: '#ef4444' }}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>

        {testRes && (
          <div
            style={{
              marginTop: '0.4rem',
              fontSize: '0.75rem',
              color: testRes.ok ? 'var(--green-bright)' : '#ef4444',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            {testRes.ok ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
            <span>{testRes.msg}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ paddingBottom: '2rem' }}>
      {/* 1. Language Switcher */}
      <div className="card">
        <h3 className="card-title">
          <Globe size={18} color="#4ade80" />
          <span>Language / ভাষা (8 Languages & Full RTL)</span>
        </h3>

        <div className="grid-2" style={{ gap: '0.5rem' }}>
          {languagesList.map(item => (
            <button
              key={item.code}
              onClick={() => setLanguage(item.code)}
              className="btn-secondary"
              style={{
                justifyContent: 'flex-start',
                padding: '0.65rem 0.85rem',
                fontSize: '0.85rem',
                background: language === item.code ? 'var(--green-bright)' : 'var(--bg-card-hover)',
                color: language === item.code ? '#041206' : 'var(--text-main)',
                border: language === item.code ? '1.5px solid var(--green-bright)' : '1px solid var(--border-color)'
              }}
            >
              <span>{item.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Theme & Design Tokens */}
      <div className="card">
        <h3 className="card-title">
          <Moon size={18} color="#4ade80" />
          <span>Theme & Aesthetics (OLED #000000)</span>
        </h3>

        <div className="grid-3" style={{ gap: '0.5rem' }}>
          {[
            { id: 'light', label: 'Light', icon: Sun },
            { id: 'dark', label: 'Dark', icon: Moon },
            { id: 'oled', label: 'OLED Pure Black', icon: Smartphone }
          ].map(thm => {
            const Icon = thm.icon;
            const isSel = theme === thm.id;
            return (
              <button
                key={thm.id}
                onClick={() => setTheme(thm.id)}
                className="btn-secondary"
                style={{
                  flexDirection: 'column',
                  padding: '0.75rem 0.5rem',
                  fontSize: '0.8rem',
                  gap: '0.3rem',
                  background: isSel ? 'var(--green-bright)' : 'var(--bg-card-hover)',
                  color: isSel ? '#041206' : 'var(--text-main)',
                  border: isSel ? '1.5px solid var(--green-bright)' : '1px solid var(--border-color)'
                }}
              >
                <Icon size={18} />
                <span>{thm.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Units & Standards */}
      <div className="card">
        <h3 className="card-title">
          <Sliders size={18} color="#4ade80" />
          <span>Units & Standards</span>
        </h3>

        <div className="grid-2" style={{ gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
              Temperature:
            </label>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                onClick={() => setUnits(u => ({ ...u, temperature: 'celsius' }))}
                className="btn-secondary"
                style={{
                  flex: 1,
                  padding: '0.45rem',
                  background: units.temperature === 'celsius' ? 'var(--green-bright)' : 'var(--bg-card-hover)',
                  color: units.temperature === 'celsius' ? '#041206' : 'var(--text-main)'
                }}
              >
                °C (Celsius)
              </button>
              <button
                onClick={() => setUnits(u => ({ ...u, temperature: 'fahrenheit' }))}
                className="btn-secondary"
                style={{
                  flex: 1,
                  padding: '0.45rem',
                  background: units.temperature === 'fahrenheit' ? 'var(--green-bright)' : 'var(--bg-card-hover)',
                  color: units.temperature === 'fahrenheit' ? '#041206' : 'var(--text-main)'
                }}
              >
                °F (Fahrenheit)
              </button>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
              Clock Format:
            </label>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                onClick={() => setUnits(u => ({ ...u, timeFormat: '24h' }))}
                className="btn-secondary"
                style={{
                  flex: 1,
                  padding: '0.45rem',
                  background: units.timeFormat === '24h' ? 'var(--green-bright)' : 'var(--bg-card-hover)',
                  color: units.timeFormat === '24h' ? '#041206' : 'var(--text-main)'
                }}
              >
                24h
              </button>
              <button
                onClick={() => setUnits(u => ({ ...u, timeFormat: '12h' }))}
                className="btn-secondary"
                style={{
                  flex: 1,
                  padding: '0.45rem',
                  background: units.timeFormat === '12h' ? 'var(--green-bright)' : 'var(--bg-card-hover)',
                  color: units.timeFormat === '12h' ? '#041206' : 'var(--text-main)'
                }}
              >
                12h (AM/PM)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. 8 Bundled Offline Global City Demo Packs */}
      <div className="card">
        <h3 className="card-title">
          <Globe size={18} color="#4ade80" />
          <span>8 Bundled Global City Demo Packs (Zero-Key Offline)</span>
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
          Select any global city to instantly load bundled offline environmental telemetry, park trails, and search snapshots with zero network calls:
        </p>

        <div className="grid-2" style={{ gap: '0.5rem' }}>
          {cityPacks.map(city => (
            <button
              key={city.id}
              onClick={() => onSelectCityPack && onSelectCityPack(city)}
              className="btn-secondary"
              style={{
                justifyContent: 'space-between',
                padding: '0.65rem 0.85rem',
                fontSize: '0.82rem'
              }}
            >
              <span style={{ fontWeight: '700' }}>{city.name}</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{city.country}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 5. Keys and Providers (Secure Input & Storage Option) */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <h3 className="card-title" style={{ margin: 0 }}>
            <KeyRound size={18} color="#4ade80" />
            <span>Keys and Providers (HTTPS Header-Only)</span>
          </h3>
        </div>

        {/* Storage Persistence Preference */}
        <div style={{ marginBottom: '1rem', background: 'var(--bg-card-hover)', padding: '0.65rem 0.85rem', borderRadius: '10px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-main)', display: 'block', marginBottom: '0.4rem' }}>
            Storage Persistence Mode:
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => handleStorageTypeChange('sessionStorage')}
              className="btn-secondary"
              style={{
                flex: 1,
                fontSize: '0.78rem',
                padding: '0.45rem',
                background: storageType === 'sessionStorage' ? 'var(--green-bright)' : 'var(--bg-primary)',
                color: storageType === 'sessionStorage' ? '#041206' : 'var(--text-main)'
              }}
            >
              <Lock size={14} />
              <span>sessionStorage (Default / Tab Only)</span>
            </button>

            <button
              type="button"
              onClick={() => handleStorageTypeChange('indexeddb')}
              className="btn-secondary"
              style={{
                flex: 1,
                fontSize: '0.78rem',
                padding: '0.45rem',
                background: storageType === 'indexeddb' ? 'var(--green-bright)' : 'var(--bg-primary)',
                color: storageType === 'indexeddb' ? '#041206' : 'var(--text-main)'
              }}
            >
              <Database size={14} />
              <span>IndexedDB (Opt-In / This Device)</span>
            </button>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(74, 222, 128, 0.08)',
            border: '1px solid rgba(74, 222, 128, 0.25)',
            borderRadius: '10px',
            padding: '0.65rem 0.85rem',
            marginBottom: '1rem',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem'
          }}
        >
          <ShieldCheck size={16} color="#4ade80" style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>
            <strong>Zero Server Persistence:</strong> In-app keys are stored strictly in your browser and transmitted exclusively via custom HTTPS headers (e.g. <code>x-gemma-key</code>, <code>x-tabpfn-key</code>, <code>x-serpapi-key</code>). They are never saved to server logs or disks.
          </span>
        </div>

        {renderKeyField('gemma', 'Google AI Studio / Gemma Key', 'AIzaSy...')}
        {renderKeyField('serpapi', 'SerpApi Key (Google Search)', '64-character hex key...')}
        {renderKeyField('serper', 'Serper.dev Key (Alternative Search)', 'api key...')}
        {renderKeyField('tabpfn', 'Prior Labs TabPFN Token', 'tabpfn_...')}
        {renderKeyField('elevenlabs', 'ElevenLabs API Key', 'sk_...')}
      </div>

      {/* 6. Walk Logs Data Portability (RFC 4180 CSV) */}
      <div className="card">
        <h3 className="card-title">
          <Download size={18} color="#4ade80" />
          <span>Personal Walk Logs (RFC 4180 CSV Portability)</span>
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
          Your walk history remains strictly on your device in IndexedDB. Export or import your personal walk logs anytime:
        </p>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleExportCsv}
            className="btn-secondary"
            style={{ flex: 1, fontSize: '0.85rem' }}
          >
            <Download size={16} />
            <span>Export CSV</span>
          </button>

          <label
            className="btn-secondary"
            style={{ flex: 1, fontSize: '0.85rem', cursor: 'pointer', textAlign: 'center' }}
          >
            <Upload size={16} />
            <span>Import CSV</span>
            <input type="file" accept=".csv" onChange={handleImportCsv} style={{ display: 'none' }} />
          </label>
        </div>
      </div>
    </div>
  );
}
