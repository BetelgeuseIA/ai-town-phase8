import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: '#1a1a2e',
          color: '#e94560',
          padding: 40,
          fontFamily: 'system-ui, sans-serif',
          zIndex: 999999,
          overflow: 'auto',
        }}>
          <h1 style={{ fontSize: 24, marginBottom: 16 }}>💥 App Crashed</h1>
          <p style={{ color: '#fff', marginBottom: 16 }}>
            The application failed to render. This is a debugging page.
          </p>
          <pre style={{
            background: '#16213e',
            padding: 16,
            borderRadius: 8,
            fontSize: 13,
            overflow: 'auto',
            color: '#eaeaea',
          }}>
            {this.state.error?.message || 'Unknown error'}
            {'\n\n'}
            {this.state.error?.stack || ''}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 24,
              padding: '12px 24px',
              background: '#e94560',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 16,
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
