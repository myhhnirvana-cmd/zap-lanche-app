import React, { useState } from 'react';
import { MapPin, ChevronDown, Store, Shield, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { Neighborhood, ActiveTab } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { AuthModal } from '../auth/AuthModal';
import { getAvatarUrl } from '../../data/avatars';

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
  const { user, isAdmin, isMerchant, signOut } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Extrai nome de exibição amigável
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || '';
  const userAvatarChoice =
    (user?.user_metadata?.avatar_id as string | undefined) ||
    (user?.user_metadata?.avatar_url as string | undefined) ||
    (typeof window !== 'undefined' && user?.id ? localStorage.getItem(`zap_lanche_avatar_url_${user.id}`) : null) ||
    (typeof window !== 'undefined' && user?.id ? localStorage.getItem(`zap_lanche_avatar_${user.id}`) : null);
  const avatarUrl = getAvatarUrl(userAvatarChoice);

  return (
    <header className="sticky top-0 z-30 bg-[#0f1117]/95 backdrop-blur-md border-b border-slate-800/80 px-2.5 sm:px-4 py-2.5 sm:py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Zone 1: Wordmark & Bairro */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            onClick={() => onChangeTab('explorar')}
            className="text-left group focus-visible:outline-none"
          >
            <div className="flex items-center gap-1">
              <span className="font-extrabold text-base sm:text-xl tracking-tight bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 bg-clip-text text-transparent group-hover:opacity-90 transition-opacity font-display">
                ZAP LANCHE
              </span>
            </div>
          </button>

          {/* Neighborhood Selector */}
          <button
            onClick={onOpenNeighborhoodModal}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800/80 hover:bg-slate-750 border border-slate-700/60 text-[11px] sm:text-xs text-slate-300 hover:text-white transition-colors"
            title="Alterar bairro"
          >
            <MapPin className="w-3 h-3 text-orange-400 shrink-0" />
            <span className="font-medium truncate max-w-[75px] xs:max-w-[100px] sm:max-w-[160px]">
              {currentNeighborhood.name}
            </span>
            <ChevronDown className="w-2.5 h-2.5 text-slate-400 shrink-0" />
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

        {/* Zone 3: Quick Area Switches (Comerciante / Admin / Auth) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {(isMerchant || isAdmin) && (
            <button
              onClick={() => onChangeTab(activeTab === 'lojista' ? 'explorar' : 'lojista')}
              className={`px-2 sm:px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1 ${
                activeTab === 'lojista'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-slate-850 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title="Área do Comerciante"
            >
              <Store className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xs:inline">Lojista</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => onChangeTab(activeTab === 'admin' ? 'explorar' : 'admin')}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium rounded-lg border transition-all flex items-center gap-1 ${
                activeTab === 'admin'
                  ? 'bg-orange-500/20 border-orange-400 text-orange-300'
                  : 'bg-slate-850 hover:bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title="Painel Administrativo Autorizado"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Admin</span>
            </button>
          )}

          {/* Autenticação Real */}
          {user ? (
            <div className="flex items-center gap-1 pl-1 border-l border-slate-800">
              <button
                type="button"
                onClick={() => onChangeTab('perfil')}
                className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-750 px-2 py-1 rounded-lg max-w-[150px] truncate transition-colors text-left"
                title={`Meu perfil (${user.email || ''})`}
              >
                <div className="w-4 h-4 rounded-full overflow-hidden shrink-0 border border-orange-500/40">
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="truncate">{displayName}</span>
              </button>
              <button
                onClick={() => signOut()}
                className="px-2 py-1.5 text-xs font-medium rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-700/80 text-slate-400 hover:text-rose-300 transition-colors flex items-center gap-1"
                title="Sair da conta"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-400 hover:text-rose-400" />
                <span className="hidden sm:inline text-[11px]">Sair</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg bg-orange-500 hover:bg-orange-400 text-black transition-colors flex items-center gap-1 shadow-sm shadow-orange-500/20"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Entrar</span>
            </button>
          )}
        </div>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        fitViewport
      />
    </header>
  );
};
