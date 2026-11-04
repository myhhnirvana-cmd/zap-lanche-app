import React from 'react';
import { getActiveEnvironment } from '../../lib/environment';
import { isHomologationConfigured, switchSupabaseEnvironment } from '../../lib/supabase';

export const EnvironmentModeControl: React.FC = () => {
  const environment = getActiveEnvironment();
  const isHomologation = environment === 'homologation';

  const handleSwitch = (target: 'production' | 'homologation') => {
    const message = target === 'homologation'
      ? 'Entrar no Modo Homologação? O aplicativo será recarregado e passará a consultar exclusivamente o banco de testes. Será necessário entrar com uma conta administradora cadastrada nesse banco.'
      : 'Voltar para Produção? O aplicativo será recarregado e voltará a consultar o banco oficial.';
    if (window.confirm(message)) {
      switchSupabaseEnvironment(target);
    }
  };

  return (
    <section className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
      isHomologation
        ? 'border-amber-400/50 bg-amber-500/10'
        : 'border-slate-700 bg-slate-900/60'
    }`} aria-label="Ambiente do aplicativo">
      <div>
        <p className={`text-xs font-extrabold tracking-wide ${
          isHomologation ? 'text-amber-300' : 'text-slate-200'
        }`}>
          {isHomologation ? 'MODO HOMOLOGAÇÃO ATIVO' : 'AMBIENTE DE PRODUÇÃO'}
        </p>
        <p className="text-[11px] text-slate-400 mt-1">
          {isHomologation
            ? 'As consultas e alterações deste modo usam o banco de testes.'
            : 'O aplicativo está conectado ao banco oficial.'}
        </p>
      </div>

      {isHomologation ? (
        <button
          type="button"
          onClick={() => handleSwitch('production')}
          className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold"
        >
          Voltar à Produção
        </button>
      ) : isHomologationConfigured ? (
        <button
          type="button"
          onClick={() => handleSwitch('homologation')}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold"
        >
          Entrar na Homologação
        </button>
      ) : (
        <p className="text-[11px] text-amber-300 max-w-xs">
          Homologação ainda não configurada. Adicione as duas variáveis VITE_SUPABASE_HOMOLOGACAO no painel Secrets do AI Studio.
        </p>
      )}
    </section>
  );
};
