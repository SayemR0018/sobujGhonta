import React, { useState, useEffect } from 'react';
import {
  Home,
  Activity,
  Trees,
  Footprints,
  BookOpen,
  Settings,
  Sparkles,
  Leaf,
  Globe,
  WifiOff
} from 'lucide-react';

import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { HomeView } from './components/HomeView.jsx';
import { TimelineChart } from './components/TimelineChart.jsx';
import { HourlyScoreBar } from './components/HourlyScoreBar.jsx';
import { PlacesView } from './components/PlacesView.jsx';
import { WalkView } from './components/WalkView.jsx';
import { NatureJournal } from './components/NatureJournal.jsx';
import { SettingsView } from './components/SettingsView.jsx';
import { LocationSearch } from './components/LocationSearch.jsx';
import { translations } from './i18n/translations.js';

export function App() {
  // Navigation State (6 views: home, timeline, places, walk, journal, settings)
  const [activeView, setActiveView] = useState('home');

  // i18n & Theme State
  const [language, setLanguage] = useState(() => localStorage.getItem('sg_lang') || 'en');
  const [theme, setTheme] = useState(() => localStorage.getItem('sg_theme') || 'dark');
  const [units, setUnits] = useState({
    temperature: 'celsius',
    distance: 'km',
    timeFormat: '24h',
    aqiStandard: 'us_aqi'
  });

  // Offline & Demo State
  const [isDemoActive, setIsDemoActive] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [toastMessage, setToastMessage] = useState(null);

  // Environmental Telemetry State
  const [coordinates, setCoordinates] = useState({
    lat: 23.74,
    lon: 90.40,
    name: 'Dhaka (Ramna)'
  });
  const [weatherData, setWeatherData] = useState(null);
  const [greenSpaces, setGreenSpaces] = useState([]);
  const [selectedSpace, setSelectedSpace] = useState(null);

  // Walk Planning State
  const [minutes, setMinutes] = useState(30);
  const [goal, setGoal] = useState('calm');
  const [plan, setPlan] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const t = translations[language] || translations.en;

  // Persist language and manage HTML attributes (dir="rtl" for Arabic)
  useEffect(() => {
    localStorage.setItem('sg_lang', language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  // Persist theme to document element
  useEffect(() => {
    localStorage.setItem('sg_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Network online/offline monitor
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Back online.');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('Offline: Zero-Key Demo Cache active.');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Register PWA Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('SW registration failed:', err);
      });
    }
  }, []);

  // Fetch live environmental telemetry on coordinate change
  useEffect(() => {
    if (isDemoActive) return;
    loadEnvironmentalData(coordinates.lat, coordinates.lon);
  }, [coordinates.lat, coordinates.lon, isDemoActive]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const loadEnvironmentalData = async (lat, lon) => {
    setIsLoading(true);
    try {
      const weatherHeaders = {};
      const tabpfnKey = sessionStorage.getItem('sg_key_tabpfn');
      const serpapiKey = sessionStorage.getItem('sg_key_serpapi');
      const serperKey = sessionStorage.getItem('sg_key_serper');
      if (tabpfnKey) weatherHeaders['x-tabpfn-key'] = tabpfnKey;
      if (serpapiKey) weatherHeaders['x-serpapi-key'] = serpapiKey;
      if (serperKey) weatherHeaders['x-serper-key'] = serperKey;

      const [wRes, pRes] = await Promise.all([
        fetch(`/api/weather?lat=${lat}&lon=${lon}`, { headers: weatherHeaders }),
        fetch(`/api/places?lat=${lat}&lon=${lon}`)
      ]);

      const wData = await wRes.json();
      const pData = await pRes.json();

      if (wData.ok) {
        setWeatherData(wData);
      }

      if (pData.ok && pData.spaces?.length > 0) {
        setGreenSpaces(pData.spaces);
        setSelectedSpace(pData.spaces[0]);
      }
    } catch (err) {
      console.warn('Live fetch failed, defaulting to Dhaka demo pack:', err);
      loadCityDemoPack({ id: 'dhaka', name: 'Dhaka', country: 'Bangladesh', lat: 23.74, lon: 90.40 });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCityDemoPack = async (city) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/demo/${city.id}?lang=${language}`);
      const data = await res.json();
      if (data.ok) {
        setIsDemoActive(true);
        setCoordinates({
          lat: data.coordinates.lat,
          lon: data.coordinates.lon,
          name: `${city.name} (${city.country})`
        });
        setWeatherData({
          current: data.weather,
          timeline: data.timeline,
          bestWindow: data.bestWindow,
          tabpfn: data.tabpfn,
          anomaly: data.anomaly,
          searchHeadsUp: data.searchHeadsUp
        });
        setGreenSpaces(data.greenSpaces || []);
        if (data.greenSpaces?.length > 0) {
          setSelectedSpace(data.greenSpaces[0]);
        }
        setPlan(data.plan);
        showToast(`Loaded ${city.name} offline pack.`);
      }
    } catch (err) {
      console.warn('City pack load failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCoordinates = ({ lat, lon, name }) => {
    setIsDemoActive(false);
    setCoordinates({ lat, lon, name });
    setPlan(null);
    showToast(`Updated location: ${name}`);
  };

  const handleGeneratePlan = async () => {
    setIsGenerating(true);
    try {
      // Gather optional user API keys from sessionStorage
      const headers = { 'Content-Type': 'application/json' };
      const gemmaKey = sessionStorage.getItem('sg_key_gemma');
      if (gemmaKey) headers['x-gemma-key'] = gemmaKey;

      const res = await fetch('/api/plan', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          minutes,
          goal,
          language,
          lat: coordinates.lat,
          lon: coordinates.lon
        })
      });

      const data = await res.json();
      if (data.ok && data.plan) {
        setPlan(data.plan);
        showToast('Mindful Walk Plan created.');
      }
    } catch (err) {
      console.warn('Plan generation error, falling back to demo plan:', err);
      loadCityDemoPack({ id: 'dhaka', name: 'Dhaka', country: 'Bangladesh', lat: 23.74, lon: 90.40 });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <ErrorBoundary>
      {/* Offline Status Banner */}
      {!isOnline && (
        <div className="offline-banner">
          <WifiOff size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
          <span>{t.offlineNotice}</span>
        </div>
      )}

      {/* Accessible Toast Container (aria-live="polite") */}
      {toastMessage && (
        <div className="toast-container" aria-live="polite">
          <div className="toast">
            {toastMessage}
          </div>
        </div>
      )}

      <div className="container">
        {/* App Header */}
        <header className="card" style={{ marginBottom: '1rem', borderBottom: '2px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'var(--bg-card-hover)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--green-bright)'
                }}
              >
                <Leaf size={22} color="var(--green-bright)" />
              </div>
              <div>
                <h1 style={{ fontSize: '1.2rem', fontWeight: '800', lineHeight: '1.2' }}>
                  {language === 'bn' ? 'সবুজ ঘণ্টা' : 'Sobuj Ghonta'}
                </h1>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {language === 'bn' ? 'The Green Hour' : 'সবুজ ঘণ্টা — The Green Hour'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {/* Quick Offline Demo Pack Button */}
              <button
                onClick={() => loadCityDemoPack({ id: 'dhaka', name: 'Dhaka', country: 'Bangladesh', lat: 23.74, lon: 90.40 })}
                className="btn-secondary"
                style={{
                  padding: '0.4rem 0.65rem',
                  fontSize: '0.8rem',
                  background: isDemoActive ? 'var(--green-bright)' : 'var(--bg-card-hover)',
                  color: isDemoActive ? '#041206' : 'var(--text-main)',
                  borderColor: isDemoActive ? 'var(--green-bright)' : 'var(--border-color)'
                }}
                title="Toggle Demo"
              >
                <Sparkles size={15} color={isDemoActive ? '#041206' : '#ffd54f'} />
                <span>{language === 'bn' ? 'ঢাকা ডেমো' : 'Demo'}</span>
              </button>

              {/* Quick Language Toggle */}
              <button
                onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
                className="btn-secondary"
                style={{ padding: '0.4rem 0.65rem', fontSize: '0.8rem' }}
                title="Switch Language"
              >
                <Globe size={15} />
                <span>{language === 'en' ? 'বাংলা' : 'EN'}</span>
              </button>
            </div>
          </div>

          {/* Active Location Display */}
          <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            <span>📍 {coordinates.name}</span>
            {isDemoActive && (
              <span className="badge badge-optimal" style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>
                Zero-Key Demo Active
              </span>
            )}
          </div>
        </header>

        {/* Primary View Routing */}
        <main id="main-content" style={{ minHeight: '60vh' }}>
          {/* View 1: Home View */}
          {activeView === 'home' && (
            <>
              <HomeView
                weatherData={weatherData}
                bestWindow={weatherData?.bestWindow}
                plan={plan}
                minutes={minutes}
                setMinutes={setMinutes}
                goal={goal}
                setGoal={setGoal}
                onGeneratePlan={handleGeneratePlan}
                isGenerating={isGenerating}
                onStartWalk={() => setActiveView('walk')}
                language={language}
                t={t}
              />
              <LocationSearch
                currentLocationName={coordinates.name}
                onSelectCoordinates={handleSelectCoordinates}
                language={language}
                t={t}
              />
            </>
          )}

          {/* View 2: Timeline View */}
          {activeView === 'timeline' && (
            <div>
              <TimelineChart
                timeline={weatherData?.timeline || []}
                tabpfnMeta={weatherData?.tabpfn}
                units={units.temperature}
                language={language}
              />
              {weatherData?.timeline && (
                <HourlyScoreBar
                  timeline={weatherData.timeline}
                  bestHour={weatherData.bestWindow?.hour}
                  language={language}
                />
              )}
            </div>
          )}

          {/* View 3: Places View */}
          {activeView === 'places' && (
            <PlacesView
              spaces={greenSpaces}
              selectedSpaceId={selectedSpace?.id}
              onSelectSpace={setSelectedSpace}
              searchHeadsUp={weatherData?.searchHeadsUp}
              userCoordinates={coordinates}
              language={language}
              t={t}
            />
          )}

          {/* View 4: Walk View */}
          {activeView === 'walk' && (
            <WalkView
              plan={plan}
              selectedSpace={selectedSpace}
              language={language}
              t={t}
              onShowToast={showToast}
            />
          )}

          {/* View 5: Journal View */}
          {activeView === 'journal' && (
            <NatureJournal
              language={language}
              t={t}
            />
          )}

          {/* View 6: Settings View */}
          {activeView === 'settings' && (
            <SettingsView
              language={language}
              setLanguage={setLanguage}
              theme={theme}
              setTheme={setTheme}
              units={units}
              setUnits={setUnits}
              onSelectCityPack={loadCityDemoPack}
              t={t}
              onShowToast={showToast}
            />
          )}
        </main>
      </div>

      {/* Bottom Navigation Bar (WCAG 2.2 AA compliant, 48px touch targets) */}
      <nav className="bottom-nav" role="tablist" aria-label="Main Navigation">
        {[
          { id: 'home', label: t.views.home, icon: Home },
          { id: 'timeline', label: t.views.timeline, icon: Activity },
          { id: 'places', label: t.views.places, icon: Trees },
          { id: 'walk', label: t.views.walk, icon: Footprints },
          { id: 'journal', label: t.views.journal, icon: BookOpen },
          { id: 'settings', label: t.views.settings, icon: Settings }
        ].map(item => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
              role="tab"
              aria-selected={isActive}
              aria-label={item.label}
            >
              <Icon size={20} color={isActive ? 'var(--green-bright)' : 'var(--text-muted)'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </ErrorBoundary>
  );
}

export default App;
