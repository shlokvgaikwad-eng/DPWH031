import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-[#0B0F19]">
          <div className="panel-border rounded-sm p-8 max-w-md text-center">
            <div className="w-12 h-12 rounded-full bg-[#EF444420] border border-[#EF444440] flex items-center justify-center mx-auto mb-4">
              <span className="text-[#EF4444] text-xl font-bold">!</span>
            </div>
            <h2 className="text-lg font-bold text-[#F8FAFC] mb-2">Something went wrong</h2>
            <p className="text-sm text-[#B0B8C4] mb-6">An unexpected error occurred. Please reload the page to continue.</p>
            <button
              data-testid="error-boundary-reload"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#3B82F6] text-white text-sm font-bold rounded-sm hover:bg-[#2563EB] transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
