import { Component } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error('[DTKS ErrorBoundary]', error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.assign('/');
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen bg-[#F7FAF7] flex items-center justify-center p-6">
          <div className="w-full max-w-lg rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-8 text-center space-y-5">
            <div className="w-12 h-12 rounded-xl bg-[#E8F5EC] text-[#16834A] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#16834A]">
                DreamTech Kashmir Solutions (DTKS)
              </p>
              <h1 className="font-display text-2xl font-bold text-[#17231C]">
                Something went wrong while displaying this page
              </h1>
              <p className="text-sm text-[#64756B] leading-relaxed">
                An unexpected rendering error occurred. Reload the page or return to the homepage to continue.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg border border-[#E3EBE5] bg-white hover:bg-[#F7FAF7] text-[#17231C] transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>Return Home</span>
              </button>
            </div>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
