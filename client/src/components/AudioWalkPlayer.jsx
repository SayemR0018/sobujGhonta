import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Download,
  CheckCircle,
  Smartphone,
  X,
  VolumeX,
  AlertTriangle,
  Info
} from 'lucide-react';
import { cacheAudioBlob, getCachedAudioBlob } from '../utils/db.js';
import { setupMediaSession, updateMediaSessionPlaybackState } from '../utils/mediaSession.js';

export function AudioWalkPlayer({ walkScript = [], language = 'en', t }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isPocketMode, setIsPocketMode] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const [hasBengaliVoice, setHasBengaliVoice] = useState(true);

  const audioRef = useRef(null);
  const speechUtteranceRef = useRef(null);

  const currentSegment = walkScript[currentIndex] || null;

  // Check available browser voices for Bengali support
  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setHasBengaliVoice(false);
      return;
    }

    const checkVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const bnVoice = voices.some(v => v.lang.startsWith('bn'));
        setHasBengaliVoice(bnVoice);
      }
    };

    checkVoices();
    window.speechSynthesis.onvoiceschanged = checkVoices;
  }, []);

  // Sync Media Session on segment change or play state change
  useEffect(() => {
    if (!currentSegment) return;

    setupMediaSession({
      title: `${currentSegment.title} (${currentIndex + 1}/${walkScript.length})`,
      artist: 'Sobuj Ghonta (সবুজ ঘণ্টা)',
      album: 'Mindful Green Hour Walk',
      onPlay: () => playCurrentSegment(),
      onPause: () => pauseAudio(),
      onNext: () => nextSegment(),
      onPrevious: () => prevSegment()
    });
  }, [currentIndex, currentSegment, walkScript.length]);

  const stopAllAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    updateMediaSessionPlaybackState('paused');
  };

  const playBrowserSpeech = (text) => {
    if (!('speechSynthesis' in window)) {
      setAudioError('Audio synthesis not supported in this browser.');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'bn' ? 'bn-BD' : 'en-US';
    utterance.rate = 0.9; // Calm, meditative walking pace

    // Find voice matching language
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find(v => v.lang.startsWith(language === 'bn' ? 'bn' : 'en'));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onstart = () => {
      setIsPlaying(true);
      updateMediaSessionPlaybackState('playing');
    };

    utterance.onend = () => {
      setIsPlaying(false);
      updateMediaSessionPlaybackState('paused');
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis error:', e);
      setIsPlaying(false);
    };

    speechUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const playCurrentSegment = async () => {
    if (!currentSegment) return;
    setAudioError(null);

    const cacheKey = `clip_${language}_${currentIndex}_${currentSegment.text.slice(0, 30)}`;

    try {
      // 1. Try local IndexedDB offline cache first (Zero signal trail mode)
      const cachedBlob = await getCachedAudioBlob(cacheKey);
      if (cachedBlob) {
        if (!audioRef.current) {
          audioRef.current = new Audio();
        }
        audioRef.current.src = URL.createObjectURL(cachedBlob);
        audioRef.current.onended = () => {
          setIsPlaying(false);
          updateMediaSessionPlaybackState('paused');
        };
        await audioRef.current.play();
        setIsPlaying(true);
        updateMediaSessionPlaybackState('playing');
        return;
      }

      // 2. Check bundled static demo audio if available
      const staticDemoUrl = `/demo-audio/${language}_${currentIndex}.wav`;
      try {
        const demoRes = await fetch(staticDemoUrl, { method: 'HEAD' });
        if (demoRes.ok) {
          if (!audioRef.current) {
            audioRef.current = new Audio();
          }
          audioRef.current.src = staticDemoUrl;
          audioRef.current.onended = () => {
            setIsPlaying(false);
            updateMediaSessionPlaybackState('paused');
          };
          await audioRef.current.play();
          setIsPlaying(true);
          updateMediaSessionPlaybackState('playing');
          return;
        }
      } catch {
        // Fall through to server API
      }

      // 3. Fetch from server free TTS proxy
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: currentSegment.text,
          language
        })
      });

      const contentType = res.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data.fallbackToBrowser) {
          playBrowserSpeech(currentSegment.text);
          return;
        }
      }

      if (!res.ok) {
        throw new Error(`TTS HTTP error ${res.status}`);
      }

      const audioBlob = await res.blob();
      await cacheAudioBlob(cacheKey, audioBlob); // Cache for subsequent plays

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      audioRef.current.src = URL.createObjectURL(audioBlob);
      audioRef.current.onended = () => {
        setIsPlaying(false);
        updateMediaSessionPlaybackState('paused');
      };
      await audioRef.current.play();
      setIsPlaying(true);
      updateMediaSessionPlaybackState('playing');
    } catch (err) {
      console.warn('[Audio] Server TTS failed, falling back to browser speech:', err.message);
      playBrowserSpeech(currentSegment.text);
    }
  };

  const pauseAudio = () => {
    stopAllAudio();
  };

  const nextSegment = () => {
    stopAllAudio();
    if (currentIndex < walkScript.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const prevSegment = () => {
    stopAllAudio();
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleDownloadAll = async () => {
    if (!walkScript || walkScript.length === 0) return;
    setIsDownloading(true);
    setAudioError(null);

    try {
      for (let i = 0; i < walkScript.length; i++) {
        const seg = walkScript[i];
        const cacheKey = `clip_${language}_${i}_${seg.text.slice(0, 30)}`;

        const existing = await getCachedAudioBlob(cacheKey);
        if (!existing) {
          // Check static demo audio first
          let blob = null;
          try {
            const staticRes = await fetch(`/demo-audio/${language}_${i}.wav`);
            if (staticRes.ok) {
              blob = await staticRes.blob();
            }
          } catch {
            // Static not found, fallback to API
          }

          if (!blob) {
            const res = await fetch('/api/tts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: seg.text, language })
            });

            const ctype = res.headers.get('content-type') || '';
            if (!ctype.includes('application/json') && res.ok) {
              blob = await res.blob();
            }
          }

          if (blob) {
            await cacheAudioBlob(cacheKey, blob);
          }
        }
      }
      setIsDownloaded(true);
    } catch (err) {
      console.warn('Pre-download error:', err);
      setIsDownloaded(true);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!walkScript || walkScript.length === 0) return null;

  return (
    <>
      {/* Standard Walk Player Card */}
      <div className="card" style={{ marginBottom: '1rem', border: '1.5px solid #285e35' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Volume2 size={20} color="#4ade80" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: 'var(--text-main)' }}>
              {t.audioWalk}
            </h3>
          </div>

          <button
            onClick={() => setIsPocketMode(true)}
            className="btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
          >
            <Smartphone size={14} />
            <span>{t.pocketModeBtn}</span>
          </button>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
          {t.audioWalkDesc}
        </p>

        {/* Browser Bengali voice advisory if missing */}
        {language === 'bn' && !hasBengaliVoice && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.45rem',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '8px',
              padding: '0.5rem 0.75rem',
              marginBottom: '0.85rem',
              fontSize: '0.78rem',
              color: '#fbbf24'
            }}
          >
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              ব্রাউজারে বাংলা ভয়েস শনাক্ত হয়নি। অফলাইনে নিরবচ্ছিন্ন শ্রবণের জন্য নিচের বাটন দিয়ে অডিও ডাউনলোড করার পরামর্শ দেওয়া হচ্ছে।
            </span>
          </div>
        )}

        {/* Current Segment Display */}
        <div
          style={{
            background: '#09150c',
            border: '1px solid #14281a',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.75rem', color: '#4ade80' }}>
            <span>{t.segment} {currentIndex + 1} / {walkScript.length}</span>
            <span>{currentSegment.title}</span>
          </div>

          <p style={{ fontSize: '1rem', color: '#f5fbf6', lineHeight: '1.4', fontStyle: 'italic', margin: 0 }}>
            "{currentSegment.text}"
          </p>
        </div>

        {/* Playback Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', marginBottom: '1rem' }}>
          <button
            onClick={prevSegment}
            disabled={currentIndex === 0}
            className="btn-secondary"
            style={{ width: '48px', height: '48px', borderRadius: '50%', padding: 0 }}
            title={t.prevSegment}
          >
            <SkipBack size={20} />
          </button>

          <button
            onClick={isPlaying ? pauseAudio : playCurrentSegment}
            className="btn-primary"
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              padding: 0,
              fontSize: '1.5rem',
              boxShadow: '0 0 20px rgba(74, 222, 128, 0.3)'
            }}
            title={isPlaying ? t.pause : t.play}
          >
            {isPlaying ? <Pause size={28} /> : <Play size={28} style={{ marginLeft: '4px' }} />}
          </button>

          <button
            onClick={nextSegment}
            disabled={currentIndex === walkScript.length - 1}
            className="btn-secondary"
            style={{ width: '48px', height: '48px', borderRadius: '50%', padding: 0 }}
            title={t.nextSegment}
          >
            <SkipForward size={20} />
          </button>
        </div>

        {/* Download for offline trail button */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button
            onClick={handleDownloadAll}
            className="btn-secondary"
            disabled={isDownloading || isDownloaded}
            style={{ width: '100%', fontSize: '0.9rem' }}
          >
            {isDownloaded ? (
              <>
                <CheckCircle size={18} color="#4ade80" />
                <span>{t.audioDownloaded}</span>
              </>
            ) : isDownloading ? (
              <span>{t.downloadingAudio}</span>
            ) : (
              <>
                <Download size={18} />
                <span>{t.downloadForOffline}</span>
              </>
            )}
          </button>

          {/* Screen lock notice */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-dim)', justifyContent: 'center' }}>
            <Info size={13} />
            <span>
              {language === 'bn'
                ? 'ডাউনলোডকৃত অডিও ফোন লক থাকলেও পকেটে অবিরত চলবে।'
                : 'Downloaded audio continues playing in pocket even when screen locks.'}
            </span>
          </div>
        </div>
      </div>

      {/* OLED Black Pocket Mode Modal */}
      {isPocketMode && (
        <div className="pocket-mode">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#6d8e74', letterSpacing: '1px' }}>
              POCKET MODE (OLED SAVER)
            </span>
            <button
              onClick={() => setIsPocketMode(false)}
              style={{
                background: '#142016',
                color: '#fff',
                border: '1px solid #233827',
                borderRadius: '8px',
                padding: '0.4rem 0.8rem',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <X size={16} />
              <span>{t.exitPocketMode}</span>
            </button>
          </div>

          <div>
            <div style={{ fontSize: '0.9rem', color: '#4ade80', marginBottom: '0.5rem' }}>
              {t.segment} {currentIndex + 1} / {walkScript.length}: {currentSegment?.title}
            </div>

            <p style={{ fontSize: '1.25rem', color: '#e0ece2', maxWidth: '400px', margin: '0 auto', lineHeight: '1.4' }}>
              "{currentSegment?.text}"
            </p>

            {/* Giant Center Play/Pause Control */}
            <button
              onClick={isPlaying ? pauseAudio : playCurrentSegment}
              className="pocket-btn-giant"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={56} /> : <Play size={56} style={{ marginLeft: '8px' }} />}
            </button>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem' }}>
              <button
                onClick={prevSegment}
                disabled={currentIndex === 0}
                style={{ background: 'transparent', color: '#a3c2a9', fontSize: '1.2rem', padding: '0.5rem 1rem' }}
              >
                ◀ {t.prevSegment}
              </button>
              <button
                onClick={nextSegment}
                disabled={currentIndex === walkScript.length - 1}
                style={{ background: 'transparent', color: '#a3c2a9', fontSize: '1.2rem', padding: '0.5rem 1rem' }}
              >
                {t.nextSegment} ▶
              </button>
            </div>
          </div>

          <div style={{ fontSize: '0.8rem', color: '#4ade80' }}>
            🔒 Lock screen or stow phone in pocket. Lock-screen controls active.
          </div>
        </div>
      )}
    </>
  );
}
