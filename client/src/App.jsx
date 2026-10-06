import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.jsx';
import { ScreenMeter } from './components/ScreenMeter.jsx';
import { LocationSearch } from './components/LocationSearch.jsx';
import { EnvironmentalOverview } from './components/EnvironmentalOverview.jsx';
import { HourlyScoreBar } from './components/HourlyScoreBar.jsx';
import { GreenSpacesList } from './components/GreenSpacesList.jsx';
import { PlanGenerator } from './components/PlanGenerator.jsx';
import { PlanView } from './components/PlanView.jsx';
import { AudioWalkPlayer } from './components/AudioWalkPlayer.jsx';
import { NatureJournal } from './components/NatureJournal.jsx';
import { translations } from './i18n/translations.js';

export function App() {
  const [language, setLanguage] = useState(() => localStorage.getItem('sg_lang') || 'en');
  const [isDemoActive, setIsDemoActive] = useState(false);
  const [coordinates, setCoordinates] = useState({
    lat: 23.7388,
    lon: 90.3995,
    name: 'Dhaka (Ramna)'
  });

  const [weatherData, setWeatherData] = useState(null);
  const [greenSpaces, setGreenSpaces] = useState([]);
  const [selectedSpace, setSelectedSpace] = useState(null);

  const [minutes, setMinutes] = useState(30);
  const [goal, setGoal] = useState('calm');
  const [plan, setPlan] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const t = translations[language] || translations.en;

  // Persist language
  useEffect(() => {
    localStorage.setItem('sg_lang', language);
  }, [language]);

  // Register Service Worker for PWA & offline trail playback
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('SW registration failed:', err);
      });
    }
  }, []);

  // Fetch initial environmental data for coordinates
  useEffect(() => {
    if (isDemoActive) return;
    loadEnvironmentalData(coordinates.lat, coordinates.lon);
  }, [coordinates.lat, coordinates.lon, isDemoActive]);

  const loadEnvironmentalData = async (lat, lon) => {
    setIsLoading(true);
    try {
      const [wRes, pRes] = await Promise.all([
        fetch(`/api/weather?lat=${lat}&lon=${lon}`),
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
      console.warn('Failed to load live environmental data:', err);
      // Fall back to Dhaka demo on connection error
      triggerDhakaDemo();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCoordinates = ({ lat, lon, name }) => {
    setIsDemoActive(false);
    setCoordinates({ lat, lon, name });
    setPlan(null);
  };

  const triggerDhakaDemo = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/demo/dhaka?lang=${language}`);
      const data = await res.json();
      if (data.ok) {
        setIsDemoActive(true);
        setCoordinates({
          lat: data.coordinates.lat,
          lon: data.coordinates.lon,
          name: `${data.coordinates.name} (${language === 'bn' ? data.coordinates.nameBn : 'Central'})`
        });
        setWeatherData({
          current: data.weather,
          timeline: data.timeline,
          bestWindow: data.bestWindow
        });
        setGreenSpaces(data.greenSpaces);
        setSelectedSpace(data.greenSpaces[0]);
        setPlan(data.plan);
      }
    } catch (err) {
      console.warn('Dhaka demo load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      }
    } catch (err) {
      console.warn('Plan generation error:', err);
      // Fallback to demo plan
      triggerDhakaDemo();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container">
      {/* App Header */}
      <Header
        language={language}
        setLanguage={setLanguage}
        t={t}
        onTriggerDhakaDemo={triggerDhakaDemo}
        isDemoActive={isDemoActive}
      />

      {/* Screen-vs-Outside Meter (Page Visibility API Proof) */}
      <ScreenMeter
        walkDurationMinutes={minutes}
        t={t}
        language={language}
      />

      {/* Location Picker */}
      <LocationSearch
        currentLocationName={coordinates.name}
        onSelectCoordinates={handleSelectCoordinates}
        t={t}
        language={language}
      />

      {/* Environmental & Air Quality Overview */}
      {weatherData && (
        <>
          <EnvironmentalOverview
            weather={weatherData.current}
            bestWindow={weatherData.bestWindow}
            t={t}
            language={language}
          />

          {/* 24-Hour Timeline */}
          <HourlyScoreBar
            timeline={weatherData.timeline}
            bestHour={weatherData.bestWindow?.hour}
            language={language}
          />
        </>
      )}

      {/* Discovered Nearby Green Spaces */}
      <GreenSpacesList
        spaces={greenSpaces}
        selectedSpaceId={selectedSpace?.id}
        onSelectSpace={setSelectedSpace}
        t={t}
        language={language}
      />

      {/* Mindful Walk Plan Generator */}
      <PlanGenerator
        minutes={minutes}
        setMinutes={setMinutes}
        goal={goal}
        setGoal={setGoal}
        onGeneratePlan={handleGeneratePlan}
        isGenerating={isGenerating}
        t={t}
        language={language}
      />

      {/* Generated Mindful Walk Plan */}
      {plan && (
        <>
          <PlanView
            plan={plan}
            t={t}
            language={language}
          />

          {/* Spoken Audio Walk Player */}
          {plan.walk_script && plan.walk_script.length > 0 && (
            <AudioWalkPlayer
              walkScript={plan.walk_script}
              language={language}
              t={t}
            />
          )}
        </>
      )}

      {/* On-Device Nature Journal */}
      <NatureJournal
        t={t}
        language={language}
      />

      {/* Footer */}
      <footer style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
        <p>
          Sobuj Ghonta (সবুজ ঘণ্টা) • Built for DEV Hacktoberfest Week 1: "Touch Grass"
        </p>
        <p style={{ marginTop: '0.25rem' }}>
          Open Weights (Gemma) • Open Data (Open-Meteo, OpenStreetMap) • MIT License
        </p>
      </footer>
    </div>
  );
}
export default App;
