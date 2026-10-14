import React, { useState } from 'react';
import { X, Clock, MessageCircle, Plus, Minus, Check, Sparkles } from 'lucide-react';
import { MenuItem, Restaurant } from '../types';

interface DishDetailModalProps {
  item: MenuItem | null;
  restaurant?: Restaurant;
  onClose: () => void;
}

export const DishDetailModal: React.FC<DishDetailModalProps> = ({
  item,
  restaurant,
  onClose,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [observacoes, setObservacoes] = useState('');
  const [copiedZap, setCopiedZap] = useState(false);

  if (!item) return null;

  const total = item.price * quantity;

  const handleSimulateZap = () => {
    // Generate formatted WhatsApp message text
    const message = `🍔 Olá ${restaurant?.name || 'ZAP LANCHE'}! Vi no Zap Lanche e gostaria de pedir:\n- ${quantity}x ${item.name} (R$ ${total.toFixed(2).replace('.', ',')})\n${observacoes ? `Obs: ${observacoes}\n` : ''}Bairro: ${restaurant?.neighborhoodName || 'Meu Bairro'}\n(Modo Demonstração - Fase 1)`;
    
    // Copy simulated message or open whatsapp intent safely without window.alert
    navigator.clipboard?.writeText(message);
    setCopiedZap(true);
    setTimeout(() => setCopiedZap(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full sm:max-w-lg bg-[#141620] border border-slate-800 rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Header with image */}
        <div className="relative h-48 sm:h-56 w-full bg-slate-900 shrink-0">
          <img
            src={item.imageUrl}
            alt={item.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141620] via-black/30 to-black/50" />

          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {item.badge && (
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-amber-500 text-black text-xs font-bold tracking-tight">
              {item.badge}
            </div>
          )}

          <div className="absolute bottom-3 left-4 right-4">
            <span className="text-xs font-medium text-orange-400">
              {restaurant?.name || 'Lanchonete do Bairro'}
            </span>
            <h3 className="text-xl font-bold text-white tracking-tight">
              {item.name}
            </h3>
          </div>
        </div>

        {/* Content body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Preparo médio: {item.prepTimeMinutes || 20} min
            </span>
            <span className="text-slate-300 font-medium">
              Categoria: {item.category}
            </span>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">
            {item.description}
          </p>

          {/* Observations */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Alguma observação para a chapa? (Opcional)
            </label>
            <input
              type="text"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: sem cebola, ponto da carne bem passado, caprichar no molho..."
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          {/* Quantity selector */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-xs font-medium text-slate-300">
              Quantidade de porções
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-200 transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="font-bold text-base w-4 text-center text-white tabular-nums">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="w-8 h-8 rounded-lg bg-orange-600 hover:bg-orange-500 flex items-center justify-center text-white transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Demonstration Notice */}
          <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs text-orange-200/90 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-orange-400">
                Simulação de Pedido Direto via WhatsApp
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                No ZAP LANCHE, o pedido vai limpo e formatado direto para o WhatsApp do comerciante local, sem taxas intermediárias abusivas.
              </p>
            </div>
          </div>
        </div>

        {/* Action footer */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex items-center gap-3 shrink-0">
          <div className="shrink-0">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
              Total Calculado
            </span>
            <span className="text-lg font-extrabold text-amber-400 tabular-nums">
              R$ {total.toFixed(2).replace('.', ',')}
            </span>
          </div>

          <button
            onClick={handleSimulateZap}
            className={`flex-1 min-h-[44px] px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
              copiedZap
                ? 'bg-emerald-600 text-white'
                : 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white'
            }`}
          >
            {copiedZap ? (
              <>
                <Check className="w-4 h-4" />
                Pedido Demo Copiado!
              </>
            ) : (
              <>
                <MessageCircle className="w-4 h-4" />
                Pedir no Zap (Demonstração)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
