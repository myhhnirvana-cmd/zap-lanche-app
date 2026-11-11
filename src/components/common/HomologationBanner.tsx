import React from 'react';
import { AlertTriangle, Server } from 'lucide-react';
import { getCurrentEnvironment, setEnvironment, isSupabaseConfigured } from '../../lib/supabase';

export const HomologationBanner: React.FC = () => {
  const env = getCurrentEnvironment();
  if (env !== 'homologation') return null;

  return (
    <div className="bg-amber-500 text-black px-4 py-2 text-xs font-extrabold flex flex-wrap items-center justify-between gap-2 shadow-md z-50 sticky top-0">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>{isSupabaseConfigured ? 'MODO HOMOLOGAÇÃO ATIVO — Projeto de testes: nagrxownsslyeosuqzca. Nenhum dado afeta a Produção.' : 'MODO HOMOLOGAÇÃO SELECIONADO — configuração ausente ou inválida. Nenhuma conexão foi iniciada.'}</span>
      </div>
      <button
        onClick={() => setEnvironment('production')}
        className="px-3 py-1 rounded-lg bg-black text-amber-400 hover:bg-slate-900 transition-colors text-[11px] font-bold flex items-center gap-1.5"
      >
        <Server className="w-3.5 h-3.5" />
        Retornar para Produção
      </button>
    </div>
  );
};
