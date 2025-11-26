import React from 'react';
import './ErrorBoundary.css';

/**
 * ErrorBoundary - Catches and handles React component errors
 * Prevents entire app from crashing when a component fails
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so next render shows fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error: error,
      errorInfo: errorInfo,
    });

    // You could also log to an error reporting service here
    // e.g., Sentry, LogRocket, etc.
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <div className="error-boundary-container">
          <div className="error-boundary-content">
            <div className="error-icon">⚠️</div>
            <h2 className="error-title">Coś poszło nie tak</h2>
            <p className="error-description">
              Wystąpił niespodziewany błąd. Spróbuj odświeżyć stronę lub skontaktuj się z administratorem.
            </p>

            <div className="error-actions">
              <button
                onClick={this.handleReset}
                className="error-button error-button-primary"
              >
                Spróbuj ponownie
              </button>
              <button
                onClick={() => window.location.reload()}
                className="error-button error-button-secondary"
              >
                Odśwież stronę
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary className="error-details-summary">
                  Szczegóły błędu (tylko w trybie deweloperskim)
                </summary>
                <div className="error-details-content">
                  <p className="error-message">
                    <strong>Błąd:</strong> {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <pre className="error-stack">
                      <strong>Stack trace:</strong>
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
