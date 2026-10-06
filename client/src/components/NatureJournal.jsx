import React, { useState, useEffect } from 'react';
import { Camera, Image, Sparkles, AlertCircle, Save, BookOpen, Trash2 } from 'lucide-react';
import { saveJournalEntry, getAllJournalEntries } from '../utils/db.js';

export function NatureJournal({ t, language }) {
  const [entries, setEntries] = useState([]);
  const [photoBase64, setPhotoBase64] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [aiDescription, setAiDescription] = useState(null);
  const [disclaimer, setDisclaimer] = useState(null);
  const [isDescribing, setIsDescribing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const data = await getAllJournalEntries();
      setEntries(data || []);
    } catch (err) {
      console.warn('Error loading journal entries:', err);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      // Resize down to max 1000px for speed and local storage efficiency
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 900;
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        setPhotoBase64(dataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleDescribeWithAi = async () => {
    if (!photoBase64 && !noteText.trim()) return;
    setIsDescribing(true);

    try {
      const res = await fetch('/api/journal/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: photoBase64,
          mimeType: 'image/jpeg',
          noteText,
          language
        })
      });

      const data = await res.json();
      if (data.ok) {
        setAiDescription(data.description);
        setDisclaimer(data.disclaimer);
      }
    } catch (err) {
      console.warn('AI description error:', err);
    } finally {
      setIsDescribing(false);
    }
  };

  const handleSaveEntry = async () => {
    if (!photoBase64 && !noteText.trim() && !aiDescription) return;
    setIsSaving(true);

    try {
      await saveJournalEntry({
        photo: photoBase64,
        note: noteText,
        aiDescription,
        disclaimer,
        timestamp: new Date().toISOString()
      });

      // Clear input fields
      setPhotoBase64(null);
      setNoteText('');
      setAiDescription(null);
      setDisclaimer(null);

      await loadEntries();
    } catch (err) {
      console.warn('Failed to save journal entry:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid #1a3c22' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
        <BookOpen size={20} color="#4ade80" />
        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: 'var(--text-main)' }}>
          {t.natureJournal}
        </h3>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
        {t.journalDesc}
      </p>

      {/* Photo Picker */}
      <div style={{ marginBottom: '0.85rem' }}>
        {photoBase64 ? (
          <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', maxHeight: '240px' }}>
            <img
              src={photoBase64}
              alt="Nature observation"
              style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
            />
            <button
              onClick={() => setPhotoBase64(null)}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: 'rgba(0, 0, 0, 0.7)',
                color: '#fff',
                padding: '0.3rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.75rem'
              }}
            >
              Remove
            </button>
          </div>
        ) : (
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.25rem',
              border: '2px dashed var(--border-color)',
              borderRadius: '12px',
              cursor: 'pointer',
              background: '#09150c'
            }}
          >
            <Camera size={28} color="#4ade80" style={{ marginBottom: '0.4rem' }} />
            <span style={{ fontSize: '0.9rem', color: '#f5fbf6', fontWeight: '600' }}>{t.capturePhoto}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Leaves, bark, flowers, clouds, wildlife
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </label>
        )}
      </div>

      {/* User Field Note Input */}
      <div style={{ marginBottom: '0.85rem' }}>
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder={t.yourNotePlaceholder}
          rows={3}
          style={{ width: '100%', resize: 'vertical' }}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          type="button"
          onClick={handleDescribeWithAi}
          className="btn-secondary"
          disabled={isDescribing || (!photoBase64 && !noteText.trim())}
          style={{ flex: 1, fontSize: '0.85rem' }}
        >
          <Sparkles size={16} />
          <span>{isDescribing ? t.describing : t.describeWithAI}</span>
        </button>

        <button
          type="button"
          onClick={handleSaveEntry}
          className="btn-primary"
          disabled={isSaving || (!photoBase64 && !noteText.trim())}
          style={{ flex: 1, fontSize: '0.85rem' }}
        >
          <Save size={16} />
          <span>{t.saveEntry}</span>
        </button>
      </div>

      {/* AI Description & Disclaimer Card */}
      {aiDescription && (
        <div
          style={{
            background: '#09150c',
            border: '1px solid #23542f',
            borderRadius: '10px',
            padding: '0.85rem',
            marginBottom: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#4ade80', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.35rem' }}>
            <Sparkles size={14} />
            <span>AI Naturalist Reflection</span>
          </div>
          <p style={{ fontSize: '0.9rem', color: '#f5fbf6', lineHeight: '1.4', margin: '0 0 0.5rem 0' }}>
            {aiDescription}
          </p>
          {disclaimer && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', fontSize: '0.72rem', color: '#fbbf24', background: 'rgba(251, 191, 36, 0.1)', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{disclaimer}</span>
            </div>
          )}
        </div>
      )}

      {/* Past Entries on Device */}
      {entries.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
            {t.savedEntries} ({entries.length})
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {entries.map((item) => (
              <div
                key={item.id}
                style={{
                  background: '#071008',
                  border: '1px solid #14281a',
                  borderRadius: '10px',
                  padding: '0.65rem',
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'center'
                }}
              >
                {item.photo && (
                  <img
                    src={item.photo}
                    alt="Observation"
                    style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.2rem' }}>
                    {new Date(item.timestamp || item.createdAt).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  {item.note && (
                    <div style={{ fontSize: '0.85rem', color: '#f5fbf6', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      "{item.note}"
                    </div>
                  )}
                  {item.aiDescription && (
                    <div style={{ fontSize: '0.75rem', color: '#889f8d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.aiDescription}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
