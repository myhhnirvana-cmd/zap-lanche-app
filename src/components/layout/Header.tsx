import React from 'react';
import { MapPin, ChevronDown, Store, Shield } from 'lucide-react';
import { Neighborhood, ActiveTab } from '../../types';

interface HeaderProps {
  currentNeighborhood: Neighborhood;
  onOpenNeighborhoodModal: () => void;
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentNeighborhood,
  onOpenNeighborhoodModal,
  activeTab,
  onChangeTab,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#0f1117]/95 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onChangeTab('explorar')}
            className="text-left group focus-visible:outline-none"
          >
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 bg-clip-text text-transparent group-hover:opacity-90 transition-opacity font-display">
                ZAP LANCHE
              </span>
            </div>
          </button>

          {/* Neighborhood Selector */}
          <button
            onClick={onOpenNeighborhoodModal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-750 border border-slate-700/60 text-xs text-slate-300 hover:text-white transition-colors"
            title="Alterar bairro"
          >
            <MapPin className="w-3 h-3 text-orange-400 shrink-0" />
            <span className="font-medium truncate max-w-[110px] sm:max-w-[160px]">
              {currentNeighborhood.name}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
          </button>
        </div>

        {/* Zone 2: Navigation Links (desktop) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            onClick={() => onChangeTab('explorar')}
            className={`transition-colors hover:text-white ${
              activeTab === 'explorar' ? 'text-orange-400 font-semibold' : ''
            }`}
          >
            Explorar Bairro
          </button>
          <button
            onClick={() => onChangeTab('feed')}
            className={`transition-colors hover:text-white ${
              activeTab === 'feed' ? 'text-orange-400 font-semibold' : ''
            }`}
          >
            Feed Gastronômico
          </button>
          <button
            onClick={() => onChangeTab('perfil')}
            className={`transition-colors hover:text-white ${
              activeTab === 'perfil' ? 'text-orange-400 font-semibold' : ''
            }`}
          >
            Minha Conta
          </button>
        </nav>

        {/* Zone 3: Quick Area Switches (Comerciante / Admin) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onChangeTab(activeTab === 'lojista' ? 'explorar' : 'lojista')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${
              activeTab === 'lojista'
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'bg-slate-850 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <Store className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Área</span> Lojista
          </button>

          <button
            onClick={() => onChangeTab(activeTab === 'admin' ? 'explorar' : 'admin')}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium rounded-lg border transition-all flex items-center gap-1.5 ${
              activeTab === 'admin'
                ? 'bg-orange-500/20 border-orange-400 text-orange-300'
                : 'bg-slate-850 hover:bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Painel Administrativo Demo"
          >
            <Shield className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden md:inline">Admin</span>
          </button>
        </div>
      </div>
    </header>
  );
};
