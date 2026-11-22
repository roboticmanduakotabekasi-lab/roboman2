import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Copy, Check } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[roboman2 ErrorBoundary caught render error]:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetStorage = () => {
    if (window.confirm('Reset application cache? This will clear temporary cached UI state and reload.')) {
      try {
        const keysToKeep = ['robotics_supabase_url', 'robotics_supabase_anon_key'];
        const saved: Record<string, string | null> = {};
        for (const k of keysToKeep) {
          saved[k] = localStorage.getItem(k);
        }
        localStorage.clear();
        sessionStorage.clear();
        for (const k of keysToKeep) {
          if (saved[k]) localStorage.setItem(k, saved[k]!);
        }
      } catch {}
      window.location.href = '/';
    }
  };

  handleCopyError = () => {
    const details = `Error: ${this.state.error?.message}\n\nStack:\n${this.state.error?.stack}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack}`;
    navigator.clipboard.writeText(details).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-sky-950 to-indigo-950 text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-5 shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h1 className="text-xl font-black text-white tracking-tight">
              Oops! Terjadi Masalah Tampilan
            </h1>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Aplikasi mendeteksi error tak terduga pada komponen tampilan. Anda dapat memuat ulang halaman atau membersihkan cache aplikasi.
            </p>

            {this.state.error && (
              <div className="mt-4 p-3 rounded-xl bg-slate-900/80 border border-slate-700/60 text-left overflow-hidden">
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block mb-1">
                  Pesan Error:
                </span>
                <p className="text-xs font-mono text-slate-300 break-words line-clamp-3">
                  {this.state.error.message || 'Unknown render error'}
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                onClick={this.handleReload}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-[0.99] text-white font-bold text-xs shadow-lg shadow-sky-500/25 transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Muat Ulang Halaman (Reload)
              </button>

              <button
                onClick={this.handleResetStorage}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700/70 hover:bg-slate-700 active:scale-[0.99] text-slate-200 font-semibold text-xs border border-slate-600 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-amber-400" />
                Bersihkan Cache &amp; Reset
              </button>

              <button
                onClick={this.handleCopyError}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 text-[11px] font-medium transition cursor-pointer"
              >
                {this.state.copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Tersalin ke Clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Salin Log Error Teknis
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}