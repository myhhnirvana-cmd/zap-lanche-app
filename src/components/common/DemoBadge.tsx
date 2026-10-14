import React from 'react';
import { Sparkles, Info, ShieldCheck } from 'lucide-react';

interface DemoBadgeProps {
  onOpenInfo?: () => void;
}

export const DemoBadge: React.FC<DemoBadgeProps> = ({ onOpenInfo }) => {
  return (
    <aside aria-label="Aviso de demonstração" className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-b border-amber-500/20 px-3 py-1.5 text-xs text-amber-200/90 flex items-center justify-between">
      <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
        <span className="flex items-center gap-1 font-semibold text-amber-400">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          FASE 1:
        </span>
        <span className="text-slate-300 truncate">
          Estrutura Visual e Navegação (Dados Fictícios de Demonstração)
        </span>
      </div>
      {onOpenInfo && (
        <button
          onClick={onOpenInfo}
          className="ml-2 inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 hover:text-amber-300 underline underline-offset-2 shrink-0 transition-colors"
        >
          <Info className="w-3 h-3" />
          Guia GitHub
        </button>
      )}
    </aside>
  );
};
