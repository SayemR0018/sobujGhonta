import React from 'react';
import { Leaf, Globe, Sparkles } from 'lucide-react';

export function Header({ language, setLanguage, t, onTriggerDhakaDemo, isDemoActive }) {
  return (
    <header className="card" style={{ borderBottom: '2px solid var(--border-color)', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#122516',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--green-bright)'
            }}
          >
            <Leaf size={24} color="#4ade80" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '800', lineHeight: '1.2' }}>
              {language === 'bn' ? 'সবুজ ঘণ্টা' : 'Sobuj Ghonta'}
            </h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {language === 'bn' ? 'The Green Hour' : 'সবুজ ঘণ্টা — The Green Hour'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Language Toggle বাংলা / English */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
            className="btn-secondary"
            title="Switch Language / ভাষা পরিবর্তন"
            style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
          >
            <Globe size={16} />
            <span>{language === 'en' ? 'বাংলা' : 'EN'}</span>
          </button>

          {/* Dhaka Demo Button */}
          <button
            onClick={onTriggerDhakaDemo}
            className="btn-secondary"
            style={{
              padding: '0.45rem 0.75rem',
              fontSize: '0.85rem',
              background: isDemoActive ? '#1b4325' : '#14291a',
              borderColor: isDemoActive ? 'var(--green-bright)' : 'var(--border-color)'
            }}
          >
            <Sparkles size={16} color={isDemoActive ? '#4ade80' : '#ffd54f'} />
            <span>{t.demoDhakaBtn}</span>
          </button>
        </div>
      </div>

      {isDemoActive && (
        <div
          style={{
            marginTop: '0.75rem',
            padding: '0.4rem 0.75rem',
            background: 'rgba(74, 222, 128, 0.1)',
            border: '1px solid rgba(74, 222, 128, 0.3)',
            borderRadius: '8px',
            fontSize: '0.8rem',
            color: 'var(--green-bright)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80' }} />
          <span>
            {language === 'bn'
              ? 'ঢাকা ডেমো সক্রিয়: ক্যাশ করা আবহাওয়া ও অডিও ব্যবহার করা হচ্ছে (০-কি, শূন্য নেটওয়ার্ক বিলম্ব)'
              : 'Dhaka Demo active: running entirely on bundled cached data & pre-generated audio (0-key, zero-latency).'}
          </span>
        </div>
      )}
    </header>
  );
}
