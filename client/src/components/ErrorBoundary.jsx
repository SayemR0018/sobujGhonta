import React from 'react';
import { RefreshCw, HeartHandshake } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('[ErrorBoundary] Caught runtime exception:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="container" style={{ paddingTop: '4rem', textAlign: 'center' }}>
          <div className="card" style={{ padding: '2rem 1.5rem', border: '1.5px solid var(--border-color)' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(74, 222, 128, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
                border: '1px solid var(--green-bright)'
              }}
            >
              <HeartHandshake size={32} color="#4ade80" />
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.75rem', color: 'var(--text-main)' }}>
              Take a breath.
            </h2>

            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Something went wrong, but your walk is safe. The nature outside remains unchanged.
            </p>

            <button
              onClick={this.handleReset}
              className="btn-primary"
              style={{ maxWidth: '280px', margin: '0 auto' }}
            >
              <RefreshCw size={18} />
              <span>Reload App</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
