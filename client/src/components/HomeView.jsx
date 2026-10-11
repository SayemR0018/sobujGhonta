import React from 'react';
import {
  Sparkles,
  Footprints,
  Clock,
  ShieldAlert,
  Compass,
  ArrowRight,
  Sun
} from 'lucide-react';
import { EnvironmentalOverview } from './EnvironmentalOverview.jsx';
import { PlanGenerator } from './PlanGenerator.jsx';
import { PlanView } from './PlanView.jsx';

export function HomeView({
  weatherData,
  bestWindow,
  plan,
  minutes,
  setMinutes,
  goal,
  setGoal,
  onGeneratePlan,
  isGenerating,
  onStartWalk,
  language = 'en',
  t
}) {
  const score = weatherData?.current?.score ?? 78;
  const isHazardousOrPoor = score < 50;

  // Plan B Hazard Options
  const planBOptions = [
    { type: 'conservatory', title: 'Visit Covered Botanical Conservatory', desc: 'Protected flora and filtered air' },
    { type: 'balcony', title: 'Balcony & Potted Flora Observation', desc: 'Mindful observation of potted greens' },
    { type: 'mindful_breathing', title: 'Protected Indoor Nature Breathwork', desc: 'Calming mindful breathing indoors' }
  ];

  // Micro-Green 10-Minute window calculation
  const microGreenWindow = (() => {
    if (!weatherData?.timeline) return null;
    const bestHourStep = weatherData.timeline.find(step => step.score >= 60);
    if (bestHourStep) {
      return {
        start: `${String(bestHourStep.hour).padStart(2, '0')}:00`,
        end: `${String(bestHourStep.hour).padStart(2, '0')}:10`,
        score: bestHourStep.score,
        durationMinutes: 10
      };
    }
    return null;
  })();

  return (
    <div>
      {/* Hero "Your Green Hour" Score Ring */}
      <div
        className="card"
        style={{
          textAlign: 'center',
          padding: '2rem 1.5rem',
          background: 'radial-gradient(circle at 50% 20%, rgba(20, 48, 28, 0.7) 0%, var(--bg-card) 75%)',
          border: '1.5px solid var(--border-color)',
          marginBottom: '1.25rem'
        }}
      >
        <span style={{ fontSize: '0.85rem', color: 'var(--green-bright)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>
          {language === 'bn' ? 'আজকের সবুজ ঘণ্টা' : 'YOUR GREEN HOUR'}
        </span>

        {/* Circular SVG Gauge / Score Ring */}
        <div style={{ position: 'relative', width: '160px', height: '160px', margin: '1rem auto' }}>
          <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
            {/* Background ring */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              stroke="var(--bg-card-hover)"
              strokeWidth="8"
            />
            {/* Value ring */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              stroke={score >= 80 ? '#4ade80' : score >= 65 ? '#22c55e' : score >= 45 ? '#f59e0b' : '#ef4444'}
              strokeWidth="8"
              strokeDasharray="251.2"
              strokeDashoffset={251.2 - (251.2 * score) / 100}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>

          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <span style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--text-main)', lineHeight: 1 }}>
              {score}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              / 100
            </span>
          </div>
        </div>

        {/* One-Line Why */}
        <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 1.25rem', lineHeight: '1.4' }}>
          {language === 'bn'
            ? weatherData?.current?.weatherDescBn || 'পরিচ্ছন্ন বাতাস ও অনুকূল সূর্যের মৃদু আলো।'
            : weatherData?.current?.weatherDesc || 'Optimal daylight and calm thermal conditions for mindful walking.'}
        </p>

        {/* Start Walk CTA Button */}
        <button
          onClick={onStartWalk}
          className="btn-primary"
          style={{
            maxWidth: '320px',
            margin: '0 auto',
            fontSize: '1.1rem',
            padding: '0.9rem 1.5rem',
            boxShadow: '0 4px 20px rgba(74, 222, 128, 0.35)'
          }}
        >
          <Footprints size={20} />
          <span>{t.startWalk}</span>
          <ArrowRight size={18} />
        </button>
      </div>

      {/* Environmental 4-metric Overview */}
      {weatherData && (
        <EnvironmentalOverview
          weather={weatherData.current}
          bestWindow={weatherData.bestWindow}
          language={language}
          t={t}
        />
      )}

      {/* Micro-Green 10-Minute Window Card */}
      {microGreenWindow && (
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, rgba(20, 48, 28, 0.4) 0%, rgba(10, 24, 15, 0.6) 100%)',
            border: '1px solid var(--border-color)',
            marginBottom: '1.25rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--green-bright)', fontWeight: '700', fontSize: '0.9rem' }}>
              <Clock size={16} />
              <span>{t.microGreenTitle}</span>
            </div>
            <span className="badge badge-optimal" style={{ fontSize: '0.75rem' }}>
              10 {t.minutes}
            </span>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            {t.microGreenSubtext}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '600' }}>
            <span>{microGreenWindow.start} – {microGreenWindow.end}</span>
            <span style={{ color: 'var(--text-dim)' }}>•</span>
            <span style={{ color: 'var(--green-bright)' }}>Score: {microGreenWindow.score}/100</span>
          </div>
        </div>
      )}

      {/* Plan B Hazard Guide (when score < 50) */}
      {isHazardousOrPoor && (
        <div
          className="card"
          style={{
            borderLeft: '4px solid #f59e0b',
            background: 'var(--bg-card)',
            marginBottom: '1.25rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f59e0b', fontWeight: '700', fontSize: '0.95rem', marginBottom: '0.4rem' }}>
            <ShieldAlert size={18} />
            <span>{t.planBTitle}</span>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            {t.planBSubtext}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {planBOptions.map(opt => (
              <div
                key={opt.type}
                style={{
                  background: 'var(--bg-primary)',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                  {opt.title}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  {opt.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mindful Walk Plan Generator */}
      <PlanGenerator
        minutes={minutes}
        setMinutes={setMinutes}
        goal={goal}
        setGoal={setGoal}
        onGeneratePlan={onGeneratePlan}
        isGenerating={isGenerating}
        language={language}
        t={t}
      />

      {/* Generated Mindful Walk Plan View */}
      {plan && (
        <PlanView
          plan={plan}
          language={language}
          t={t}
        />
      )}
    </div>
  );
}
