import React from 'react';
import { Compass, Flame, User, Store, Shield } from 'lucide-react';
import { ActiveTab } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface BottomNavProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab }) => {
  const { isAdmin, isMerchant } = useAuth();
  const showMerchantTab = isMerchant || isAdmin;

  const tabs = [
    {
      id: 'explorar' as ActiveTab,
      label: 'Explorar',
      icon: Compass,
    },
    {
      id: 'feed' as ActiveTab,
      label: 'Feed Social',
      icon: Flame,
    },
    {
      id: 'perfil' as ActiveTab,
      label: 'Meu Perfil',
      icon: User,
    },
    ...(showMerchantTab
      ? [
          {
            id: 'lojista' as ActiveTab,
            label: 'Comerciante',
            icon: Store,
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            id: 'admin' as ActiveTab,
            label: 'Painel Admin',
            icon: Shield,
          },
        ]
      : []),
  ];

  const gridColsClass =
    tabs.length === 5
      ? 'grid-cols-5'
      : tabs.length === 4
      ? 'grid-cols-4'
      : 'grid-cols-3';

  return (
    <nav aria-label="Navegação móvel principal" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d0e14]/95 backdrop-blur-lg border-t border-slate-850 px-2 py-1 safe-bottom shadow-2xl">
      <div className={`grid ${gridColsClass} items-center max-w-lg mx-auto`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            activeTab === tab.id ||
            (tab.id === 'explorar' && activeTab === 'restaurante');

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`min-h-[48px] py-1 flex flex-col items-center justify-center transition-all relative ${
                isActive
                  ? 'text-orange-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 text-orange-400' : ''
                  }`}
                />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-400" />
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-1 truncate max-w-[64px]">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
