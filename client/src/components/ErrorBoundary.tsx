import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled React Error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f5f8f3] text-slate-800 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center space-y-5 animate-fadeIn">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-100 text-rose-600">
              <AlertCircle size={28} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">Une erreur inattendue est survenue</h1>
              <p className="text-sm text-slate-600 mt-2">
                L’application a rencontré un problème temporaire. Veuillez recharger la page pour reprendre votre navigation.
              </p>
            </div>
            {this.state.error && (
              <pre className="text-xs text-left bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-600 overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-[#1f5943] hover:bg-[#164332] text-white font-bold rounded-xl transition cursor-pointer shadow-sm text-sm"
            >
              <RefreshCw size={16} />
              Recharger l’application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
