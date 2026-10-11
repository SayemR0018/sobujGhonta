import React from 'react';
import { AlertCircle, Calendar, ExternalLink, Sparkles } from 'lucide-react';

/**
 * SearchHeadsUp: Screen-Minimizing Live Web Search Alerts & Park Notices
 * Displays at most ONE concise line for UI/audio with domain source badge and date.
 */
export function SearchHeadsUp({ headsUp = null, items = [], provider = 'serpapi', t, language }) {
  if (!headsUp && (!items || items.length === 0)) {
    return null;
  }

  const alertItem = headsUp || (items && items[0]) || null;
  if (!alertItem) return null;

  const isClosure = alertItem.type === 'closure' || (alertItem.title && alertItem.title.toLowerCase().includes('close'));
  const isSafety = alertItem.type === 'safety' || (alertItem.title && alertItem.title.toLowerCase().includes('alert'));

  const domain = alertItem.domain || (alertItem.url ? new URL(alertItem.url).hostname.replace('www.', '') : 'local news');
  const displayText = alertItem.text || alertItem.snippet || alertItem.title;

  return (
    <div
      className="card"
      style={{
        marginBottom: '1rem',
        borderLeft: isClosure || isSafety ? '4px solid #ef4444' : '4px solid #4ade80',
        background: 'var(--bg-card)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <AlertCircle size={16} color={isClosure || isSafety ? '#ef4444' : '#4ade80'} />
          <span style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-main)' }}>
            {language === 'bn' ? 'স্থানীয় পার্ক হালনাগাদ (লাইভ সার্চ)' : 'Local Park Heads-Up'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span
            style={{
              fontSize: '0.7rem',
              padding: '0.15rem 0.45rem',
              borderRadius: '4px',
              background: 'var(--bg-card-hover)',
              color: 'var(--green-bright)',
              border: '1px solid var(--border-color)',
              fontWeight: '600'
            }}
          >
            [{domain}]
          </span>
          {alertItem.date && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <Calendar size={11} />
              <span>{alertItem.date}</span>
            </span>
          )}
        </div>
      </div>

      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
        {displayText}
      </div>

      {alertItem.url && (
        <div style={{ marginTop: '0.4rem', textAlign: 'right' }}>
          <a
            href={alertItem.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--green-bright)',
              fontSize: '0.75rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              textDecoration: 'none'
            }}
          >
            <span>{language === 'bn' ? 'উৎস দেখুন' : 'View Source'}</span>
            <ExternalLink size={12} />
          </a>
        </div>
      )}
    </div>
  );
}
