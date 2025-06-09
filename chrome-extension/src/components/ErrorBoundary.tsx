import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });

    // Log to Chrome extension error tracking if available
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        type: 'ERROR_BOUNDARY',
        error: {
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack
        }
      }).catch(() => {
        // Silently fail if messaging doesn't work
      });
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-bg-secondary rounded-lg shadow-lg p-6 border border-border-subtle">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-accent-error/20 rounded-full flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-accent-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.054 0 1.955-.816 2.068-1.851l.713-6.702c.069-.632-.454-1.202-1.092-1.202H4.393c-.638 0-1.161.57-1.092 1.202l.713 6.702C4.127 16.184 5.028 17 6.082 17z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-text-primary">Something went wrong</h1>
                <p className="text-sm text-text-muted">Kaggie encountered an unexpected error</p>
              </div>
            </div>
            
            <div className="bg-bg-overlay rounded-lg p-4 mb-4 border border-border-subtle">
              <h3 className="text-sm font-medium text-text-primary mb-2">Error Details</h3>
              <p className="text-xs text-text-muted font-mono break-all">
                {this.state.error?.message || 'Unknown error occurred'}
              </p>
            </div>

            <div className="flex flex-col space-y-2">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: undefined, errorInfo: undefined });
                }}
                className="w-full px-4 py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-bg-overlay hover:bg-bg-secondary text-text-primary font-medium rounded-lg transition-colors border border-border-subtle"
              >
                Reload Extension
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4">
                <summary className="text-xs text-text-muted cursor-pointer hover:text-text-primary">
                  Developer Details
                </summary>
                <pre className="mt-2 text-xs bg-bg-overlay p-2 rounded overflow-auto max-h-32 border border-border-subtle text-text-primary">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
