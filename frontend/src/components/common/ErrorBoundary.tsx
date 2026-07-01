import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * App-level error boundary. Catches render-time errors anywhere in the tree
 * and shows a recoverable fallback instead of a white screen.
 */
export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Surface to console; analytics hook can be added here later.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          padding: '2rem',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#1f2937',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
          Đã xảy ra lỗi hiển thị
        </h1>
        <p style={{ maxWidth: 480, margin: 0, color: '#4b5563' }}>
          Trang gặp sự cố ngoài dự kiến. Vui lòng tải lại trang. Nếu vẫn lỗi, hãy thử lại sau ít phút.
        </p>
        <button
          type="button"
          onClick={this.handleReload}
          style={{
            padding: '0.625rem 1.25rem',
            borderRadius: 8,
            border: 'none',
            background: '#1d4ed8',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Tải lại trang
        </button>
      </div>
    );
  }
}
