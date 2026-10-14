import React from 'react';
import { X, MapPin, Check } from 'lucide-react';
import { Neighborhood } from '../../types';
import { NEIGHBORHOODS } from '../../data/mockData';

interface NeighborhoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentNeighborhood: Neighborhood;
  onSelectNeighborhood: (neighborhood: Neighborhood) => void;
}

export const NeighborhoodModal: React.FC<NeighborhoodModalProps> = ({
  isOpen,
  onClose,
  currentNeighborhood,
  onSelectNeighborhood,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full sm:max-w-md bg-[#13151f] border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl animate-slide-up max-h-[85vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        {/* Handle for mobile */}
        <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />

        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-orange-400" />
              Escolha seu Bairro
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Descubra lanchonetes e promoções perto de você
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {NEIGHBORHOODS.map((item) => {
            const isSelected = item.id === currentNeighborhood.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectNeighborhood(item);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-orange-500/15 border-orange-500/50 text-white'
                    : 'bg-slate-850/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{item.name}</span>
                    <span className="text-[11px] text-slate-400">
                      {item.city} - {item.state}
                    </span>
                  </div>
                  <span className="text-xs text-orange-400/90 font-medium">
                    {item.activeSpotsCount} lanches cadastrados
                  </span>
                </div>

                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-black">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-5 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 text-center">
          💡 <span className="font-medium text-slate-300">Quer o ZAP LANCHE no seu bairro?</span> Novos locais e bairros são adicionados a cada semana!
        </div>
      </div>
    </div>
  );
};
