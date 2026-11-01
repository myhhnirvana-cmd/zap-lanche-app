import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Falha ao inicializar a interface do ZapLanche:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main role="alert" className="min-h-screen bg-[#0c0d12] text-slate-100 flex items-center justify-center p-6">
          <section className="max-w-md text-center">
            <h1 className="text-xl font-bold mb-3">Não foi possível abrir o ZapLanche</h1>
            <p className="text-slate-300 mb-5">Ocorreu um erro ao carregar a interface. Atualize a visualização para tentar novamente.</p>
            <button
              type="button"
              className="rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white"
              onClick={() => window.location.reload()}
            >
              Tentar novamente
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
