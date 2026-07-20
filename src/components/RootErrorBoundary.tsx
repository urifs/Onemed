import { Component, ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { hasError: boolean }

// Last-resort safety net: any uncaught render/effect error below this point
// (a locked-down browser throwing on storage access, an unexpected crash on
// an older WebKit, etc.) used to leave people staring at a frozen loading
// spinner forever, with no way out short of knowing to hard-refresh. This
// turns that into a visible, actionable screen instead of a silent freeze.
export class RootErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Uncaught app error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center bg-black text-white">
          <p className="font-semibold text-lg">Algo deu errado ao carregar a página</p>
          <p className="text-sm text-white/60 max-w-xs">
            Tente recarregar. Se o problema continuar, entre em contato com o suporte.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default RootErrorBoundary;
