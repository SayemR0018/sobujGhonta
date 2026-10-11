import React, { useRef, useEffect } from 'react';
import { Share2, Download, X, Award, CheckCircle } from 'lucide-react';

/**
 * WalkReceiptModal: Canvas-Rendered Tactile Share Card
 * Renders a crisp shareable card summarizing:
 * - Outdoor walk duration
 * - Screen-to-walk ratio (e.g., "Screen 2.5% of 34-min walk")
 * - Green score & Park location
 * - Low-screen nature badge
 */
export function WalkReceiptModal({
  isOpen,
  onClose,
  walkData = {
    park: 'Ramna Park',
    durationMinutes: 30,
    screenRatioPercent: '2.5%',
    greenScore: 84,
    date: new Date().toISOString().split('T')[0]
  },
  language = 'en',
  t
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // Set display and internal canvas size
    const width = 480;
    const height = 480;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Background gradient (Deep forest calm)
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#061309');
    bgGrad.addColorStop(1, '#0e2314');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Card border
    ctx.strokeStyle = '#275834';
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, width - 32, height - 32);

    // Inner subtle border
    ctx.strokeStyle = '#183821';
    ctx.lineWidth = 1;
    ctx.strokeRect(24, 24, width - 48, height - 48);

    // Header Title
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 24px "Noto Sans Bengali", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SOBUJ GHONTA • সবুজ ঘণ্টা', width / 2, 70);

    ctx.fillStyle = '#8bb394';
    ctx.font = '14px sans-serif';
    ctx.fillText('Mindful Outdoor Walk Receipt', width / 2, 95);

    // Divider
    ctx.strokeStyle = '#275834';
    ctx.beginPath();
    ctx.moveTo(50, 115);
    ctx.lineTo(width - 50, 115);
    ctx.stroke();

    // Hero Metric: Screen-to-Walk Ratio
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText(walkData.screenRatioPercent, width / 2, 175);

    ctx.fillStyle = '#ffd54f';
    ctx.font = '600 16px sans-serif';
    ctx.fillText(`Screen Time of ${walkData.durationMinutes}-Min Walk`, width / 2, 205);

    // Location & Date
    ctx.fillStyle = '#e2ede4';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(walkData.park || 'Urban Sanctuary', width / 2, 260);

    ctx.fillStyle = '#8bb394';
    ctx.font = '14px sans-serif';
    ctx.fillText(`Green Score: ${walkData.greenScore}/100 • ${walkData.date}`, width / 2, 285);

    // Streak / Achievement Badge Box
    const isStreak = parseFloat(walkData.screenRatioPercent) < 5.0;
    ctx.fillStyle = isStreak ? '#12301a' : '#1a221a';
    ctx.strokeStyle = isStreak ? '#4ade80' : '#45604b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(60, 320, width - 120, 65, 12);
    } else {
      ctx.rect(60, 320, width - 120, 65);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isStreak ? '#4ade80' : '#cbd5e1';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(
      isStreak ? '🌿 VERIFIED LOW-SCREEN WALK (<5%)' : 'OUTDOOR TOUCH GRASS SESSION',
      width / 2,
      350
    );

    ctx.fillStyle = '#8bb394';
    ctx.font = '12px sans-serif';
    ctx.fillText(
      isStreak ? 'Your senses guided the journey, not the screen.' : 'Every minute outdoors rejuvenates.',
      width / 2,
      370
    );

    // Footer tag
    ctx.fillStyle = '#56755d';
    ctx.font = '12px sans-serif';
    ctx.fillText('DEV Hacktoberfest 2026 • Touch Grass Challenge', width / 2, 435);
  }, [isOpen, walkData]);

  if (!isOpen) return null;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Green Hour Walk',
          text: `Completed a ${walkData.durationMinutes}-min outdoor walk at ${walkData.park} with only ${walkData.screenRatioPercent} screen time! 🌿`,
          url: window.location.origin
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Share error:', err);
        }
      }
    } else {
      handleDownload();
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `sobuj-ghonta-receipt-${walkData.date}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        zIndex: 10001,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '440px',
          width: '100%',
          padding: '1.25rem',
          background: 'var(--bg-card)',
          borderRadius: '20px',
          border: '1.5px solid var(--border-color)',
          textAlign: 'center'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--green-bright)', fontWeight: '700' }}>
            <Award size={20} />
            <span>{language === 'bn' ? 'হাঁটার ডিজিটাল রসিদ' : 'Walk Receipt'}</span>
          </div>

          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ width: '36px', height: '36px', minWidth: '36px', minHeight: '36px', borderRadius: '50%', padding: 0 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Canvas Display */}
        <div style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '1rem', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleShare}
            className="btn-primary"
            style={{ flex: 1, fontSize: '0.95rem' }}
          >
            <Share2 size={16} />
            <span>{language === 'bn' ? 'শেয়ার করুন' : 'Share Receipt'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="btn-secondary"
            style={{ flex: 1, fontSize: '0.95rem' }}
          >
            <Download size={16} />
            <span>{language === 'bn' ? 'ডাউনলোড' : 'Download PNG'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
