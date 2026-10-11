import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Flame,
  Award,
  Volume2,
  BellRing,
  CheckCircle2,
  Play,
  Share2
} from 'lucide-react';
import { ScreenMeter } from './ScreenMeter.jsx';
import { AudioWalkPlayer } from './AudioWalkPlayer.jsx';
import { WalkReceiptModal } from './WalkReceiptModal.jsx';
import { saveWalkSession } from '../utils/db.js';

export function WalkView({
  plan,
  selectedSpace,
  language = 'en',
  t,
  onShowToast
}) {
  const [streak, setStreak] = useState(() => {
    return parseInt(localStorage.getItem('sg_streak') || '3', 10);
  });
  const [showReceipt, setShowReceipt] = useState(false);
  const [hasPromptedLeavePhone, setHasPromptedLeavePhone] = useState(false);
  const [walkSeconds, setWalkSeconds] = useState(0);
  const [screenSeconds, setScreenSeconds] = useState(0);

  // Leave-the-phone walk start chime / sound prompt
  useEffect(() => {
    if (!hasPromptedLeavePhone) {
      // Play brief ambient chime via Web Audio API
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(528, audioCtx.currentTime); // Solfeggio 528Hz calming tone
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 1.2);
      } catch {
        // Fallback if audio context unavailable
      }
      setHasPromptedLeavePhone(true);
    }
  }, [hasPromptedLeavePhone]);

  const handleMeterUpdate = ({ walkSeconds: ws, screenSeconds: ss }) => {
    setWalkSeconds(ws);
    setScreenSeconds(ss);
  };

  const handleFinishWalk = async () => {
    // Check if low-screen streak achieved (<5%)
    const totalSecs = Math.max(walkSeconds, 60);
    const ratio = screenSeconds / totalSecs;
    if (ratio < 0.05) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      localStorage.setItem('sg_streak', String(nextStreak));
      if (onShowToast) onShowToast(`🌿 Low-screen streak increased! Now ${nextStreak} walks!`);
    } else {
      if (onShowToast) onShowToast('Walk completed. Try to keep screen time under 5% next time!');
    }

    // Persist completed walk to IndexedDB (walkSessions store)
    try {
      await saveWalkSession({
        timestamp: new Date().toISOString(),
        hour: new Date().getHours(),
        weekday: new Date().getDay(),
        park: selectedSpace?.name || 'Ramna Park',
        durationMinutes: Math.max(1, Math.round(walkSeconds / 60)) || (plan?.minutes || 30),
        screenToWalkRatio: Math.round(ratio * 10000) / 10000,
        aqi: plan?.weatherSummary?.aqi || 50,
        temp: plan?.weatherSummary?.apparentTemp || 25,
        uv: plan?.weatherSummary?.uv || 0,
        rating: ratio < 0.05 ? 5.0 : 4.0
      });
    } catch (err) {
      console.warn('Could not save walk session:', err);
    }

    setShowReceipt(true);
  };

  const currentRatioPercent = ((screenSeconds / Math.max(walkSeconds, 1)) * 100).toFixed(1);

  return (
    <div>
      {/* 1. Leave the phone gentle reminder banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(20, 40, 26, 0.6) 0%, rgba(9, 21, 12, 0.8) 100%)',
          border: '1.5px solid var(--green-bright)',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'rgba(74, 222, 128, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <BellRing size={22} color="#4ade80" />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '0.2rem' }}>
            {t.leavePhoneTitle}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {t.leavePhoneText}
          </div>
        </div>
      </div>

      {/* 2. Low-Screen Streak Tracker */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Flame size={20} color="#f59e0b" />
            <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: 0 }}>
              {t.streakTitle}
            </h3>
          </div>

          <div
            className="badge"
            style={{
              background: 'rgba(245, 158, 11, 0.15)',
              borderColor: '#f59e0b',
              color: '#f59e0b',
              fontSize: '0.85rem'
            }}
          >
            🔥 {streak} {language === 'bn' ? 'পদচারণা' : 'Walks'}
          </div>
        </div>

        <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.4rem', margin: 0 }}>
          {t.streakSubtext}
        </p>
      </div>

      {/* 3. ScreenMeter Hero Metric */}
      <ScreenMeter
        walkDurationMinutes={plan?.minutes || 30}
        language={language}
        t={t}
        onUpdate={handleMeterUpdate}
      />

      {/* 4. Spoken Audio Walk Guide */}
      {plan?.walk_script && plan.walk_script.length > 0 && (
        <AudioWalkPlayer
          walkScript={plan.walk_script}
          language={language}
          t={t}
        />
      )}

      {/* 5. Complete Walk & Generate Receipt Button */}
      <div style={{ marginTop: '1.25rem', marginBottom: '1.5rem' }}>
        <button
          onClick={handleFinishWalk}
          className="btn-primary"
          style={{ fontSize: '1.1rem', padding: '1rem', boxShadow: '0 4px 20px rgba(74, 222, 128, 0.3)' }}
        >
          <Award size={20} />
          <span>{language === 'bn' ? 'হাঁটা শেষ করুন ও ডিজিটাল রসিদ নিন' : 'Complete Walk & Get Receipt Card'}</span>
        </button>
      </div>

      {/* Walk Receipt Modal */}
      <WalkReceiptModal
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        walkData={{
          park: selectedSpace?.name || 'Ramna Park',
          durationMinutes: plan?.minutes || 30,
          screenRatioPercent: `${currentRatioPercent}%`,
          greenScore: plan?.weatherSummary?.score || 84,
          date: new Date().toISOString().split('T')[0]
        }}
        language={language}
        t={t}
      />
    </div>
  );
}
