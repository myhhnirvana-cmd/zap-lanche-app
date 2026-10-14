import React, { useState } from 'react';
import {
  Store,
  TrendingUp,
  MessageCircle,
  Eye,
  Flame,
  Clock,
  CheckCircle,
  Power,
  Plus,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Send,
  AlertCircle,
} from 'lucide-react';
import { MerchantDemoStats, MenuItem } from '../types';
import { MOCK_MERCHANT_STATS, MOCK_MENU_ITEMS, ASSET_BURGER } from '../data/mockData';

interface MerchantViewProps {
  onOpenFeedWithNewPost: () => void;
}

export const MerchantView: React.FC<MerchantViewProps> = ({ onOpenFeedWithNewPost }) => {
  const [stats] = useState<MerchantDemoStats>(MOCK_MERCHANT_STATS);
  const [isOpenToday, setIsOpenToday] = useState(true);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(MOCK_MENU_ITEMS['rest-jorge-mooca']);
  const [confirmedOrders, setConfirmedOrders] = useState<Record<string, boolean>>({});

  const toggleItemAvailability = (id: string) => {
    setMenuItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isAvailable: !item.isAvailable } : item
      )
    );
  };

  const handleConfirmOrder = (orderId: string) => {
    setConfirmedOrders((prev) => ({ ...prev, [orderId]: true }));
  };

  const mockIncomingOrders = [
    {
      id: 'ord-in-1',
      clientName: 'Thiago da Silva (Mooca)',
      items: '1x Smash Mooca Monstro + 1x Batata Rústica',
      time: 'Há 4 minutos',
      total: 58.9,
      obs: 'Carne ao ponto, sem picles',
    },
    {
      id: 'ord-in-2',
      clientName: 'Juliana Mendes (Mooca)',
      items: '2x X-Salada Tradicional + 1x Pudim de Leite',
      time: 'Há 12 minutos',
      total: 73.0,
      obs: 'Caprichar na maionese verde caseira',
    },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-16 animate-fade-in">
      {/* Merchant Header */}
      <div className="p-5 rounded-3xl bg-[#131520] border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white font-display">
                {stats.restaurantName}
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                Lojista Parceiro
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Responsável: <strong className="text-slate-300">{stats.ownerName}</strong> · Bairro {stats.neighborhood}
            </p>
          </div>
        </div>

        {/* Chapa Open/Closed switch */}
        <div className="flex items-center gap-3 p-2 rounded-2xl bg-slate-900 border border-slate-800 self-stretch sm:self-auto justify-between">
          <div className="text-left text-xs">
            <span className="text-[10px] text-slate-400 block">Status do Balcão</span>
            <span className={`font-bold ${isOpenToday ? 'text-emerald-400' : 'text-slate-400'}`}>
              {isOpenToday ? 'Recebendo Pedidos' : 'Balcão Fechado'}
            </span>
          </div>

          <button
            onClick={() => setIsOpenToday(!isOpenToday)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              isOpenToday
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {isOpenToday ? 'Aberto' : 'Pausar'}
          </button>
        </div>
      </div>

      {/* Analytics KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[#13151f] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Visitas no Cardápio</span>
            <Eye className="w-4 h-4 text-orange-400" />
          </div>
          <span className="text-xl font-extrabold text-white tabular-nums">
            {stats.viewsThisWeek}
          </span>
          <span className="text-[10px] text-emerald-400 block mt-0.5">
            +18% nesta semana
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#13151f] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Cliques p/ WhatsApp</span>
            <MessageCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-xl font-extrabold text-emerald-400 tabular-nums">
            {stats.zapClicksThisWeek}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Pedidos direcionados
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#13151f] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Interações no Feed</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-xl font-extrabold text-amber-400 tabular-nums">
            {stats.feedInteractions}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Curtidas e comentários
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#13151f] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Prato Campeão</span>
            <Sparkles className="w-4 h-4 text-yellow-400" />
          </div>
          <span className="text-sm font-bold text-white truncate block">
            {stats.topDishName}
          </span>
          <span className="text-[10px] text-orange-400 font-semibold block mt-0.5">
            {stats.topDishOrders} pedidos no mês
          </span>
        </div>
      </div>

      {/* Simulated Live Zap Orders Queue */}
      <div className="rounded-3xl bg-[#13151f] border border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              Pedidos Chegando no WhatsApp (Simulação)
            </h3>
            <p className="text-xs text-slate-400">
              Notificação direta para o comerciante sem intermediários
            </p>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 font-bold border border-orange-500/30">
            {mockIncomingOrders.length} novos
          </span>
        </div>

        <div className="space-y-3">
          {mockIncomingOrders.map((ord) => {
            const isConfirmed = confirmedOrders[ord.id];
            return (
              <div
                key={ord.id}
                className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs sm:text-sm text-white">
                      {ord.clientName}
                    </span>
                    <span className="text-[11px] text-slate-400">· {ord.time}</span>
                  </div>

                  <p className="text-xs text-slate-300 font-medium">
                    {ord.items}
                  </p>

                  <p className="text-[11px] text-amber-300/90 italic">
                    Obs: "{ord.obs}"
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-0 border-slate-800">
                  <span className="text-sm font-extrabold text-amber-400 tabular-nums">
                    R$ {ord.total.toFixed(2).replace('.', ',')}
                  </span>

                  <button
                    onClick={() => handleConfirmOrder(ord.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      isConfirmed
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    {isConfirmed ? 'Confirmado no Zap' : 'Responder no Zap'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fast Menu Management */}
      <div className="rounded-3xl bg-[#13151f] border border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              Gestão Rápida da Chapa & Cardápio
            </h3>
            <p className="text-xs text-slate-400">
              Pausar ou ativar itens instantaneamente para a vizinhança
            </p>
          </div>

          <button
            onClick={onOpenFeedWithNewPost}
            className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-orange-600/20"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Postar Especial do Dia
          </button>
        </div>

        <div className="divide-y divide-slate-800/80">
          {menuItems.map((item) => (
            <div
              key={item.id}
              className="py-3 flex items-center justify-between gap-3 text-xs"
            >
              <div>
                <h4 className={`font-bold ${item.isAvailable ? 'text-white' : 'text-slate-500 line-through'}`}>
                  {item.name}
                </h4>
                <span className="text-[11px] text-amber-400 tabular-nums">
                  R$ {item.price.toFixed(2).replace('.', ',')}
                </span>
              </div>

              <button
                onClick={() => toggleItemAvailability(item.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  item.isAvailable
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                }`}
              >
                {item.isAvailable ? (
                  <>
                    <ToggleRight className="w-4 h-4" />
                    Disponível
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-4 h-4" />
                    Pausado na Chapa
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
