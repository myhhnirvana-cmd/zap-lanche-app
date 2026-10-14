import React, { useState } from 'react';
import {
  User,
  MapPin,
  Award,
  Clock,
  Heart,
  Bookmark,
  ChevronRight,
  ShieldCheck,
  ShoppingBag,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { UserProfileDemo, Restaurant } from '../types';
import { MOCK_USER_PROFILE } from '../data/mockData';

interface ProfileViewProps {
  onSelectRestaurantById: (id: string) => void;
  onOpenGitHubGuide: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  onSelectRestaurantById,
  onOpenGitHubGuide,
}) => {
  const [user] = useState<UserProfileDemo>(MOCK_USER_PROFILE);
  const [activeTab, setActiveTab] = useState<'pedidos' | 'medalhas' | 'salvos'>('pedidos');

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-16 animate-fade-in">
      {/* Profile Header Card */}
      <div className="rounded-3xl bg-[#13151f] border border-slate-800 p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl -mr-10 -mt-10" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 p-0.5 shadow-lg">
              <div className="w-full h-full rounded-2xl bg-slate-900 overflow-hidden flex items-center justify-center">
                <span className="font-extrabold text-2xl text-orange-400">
                  {user.name.charAt(0)}
                </span>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-[10px] text-black font-bold">
              ✓
            </div>
          </div>

          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white font-display">
                {user.name}
              </h2>
              <span className="text-xs text-orange-400 font-medium">
                {user.username}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {user.bio}
            </p>

            <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
              <span className="flex items-center gap-1 text-slate-300">
                <MapPin className="w-3 h-3 text-orange-400" />
                {user.neighborhood}
              </span>
              <span>·</span>
              <span>Membro desde {user.memberSince}</span>
            </div>
          </div>
        </div>

        {/* Counter Stats */}
        <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-slate-800/80 text-center">
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-base font-extrabold text-amber-400 block tabular-nums">
              {user.recentOrders.length}
            </span>
            <span className="text-[10px] text-slate-400">Pedidos no Bairro</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-base font-extrabold text-orange-400 block tabular-nums">
              {user.reviewsCount}
            </span>
            <span className="text-[10px] text-slate-400">Avaliações Feitas</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-base font-extrabold text-emerald-400 block tabular-nums">
              {user.foodieBadges.length}
            </span>
            <span className="text-[10px] text-slate-400">Selos de Gastronomia</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 text-xs sm:text-sm font-semibold">
        <button
          onClick={() => setActiveTab('pedidos')}
          className={`flex-1 py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'pedidos'
              ? 'border-orange-500 text-orange-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Histórico Demo ({user.recentOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('medalhas')}
          className={`flex-1 py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'medalhas'
              ? 'border-orange-500 text-orange-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Award className="w-4 h-4" />
          Selos de Morador ({user.foodieBadges.length})
        </button>
      </div>

      {/* Tab: Pedidos Recentes */}
      {activeTab === 'pedidos' && (
        <div className="space-y-3">
          <div className="text-xs text-slate-400 flex items-center justify-between px-1">
            <span>Últimos lanches solicitados via Zap da vizinhança</span>
            <span className="text-amber-400 font-medium">Demonstração</span>
          </div>

          {user.recentOrders.map((order) => (
            <div
              key={order.id}
              className="p-4 rounded-2xl bg-[#13151f] border border-slate-800 flex items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-white">
                    {order.restaurantName}
                  </h4>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    {order.status}
                  </span>
                </div>

                <p className="text-xs text-slate-300">
                  {order.itemsSummary}
                </p>

                <div className="text-[11px] text-slate-400">
                  {order.date} · <strong className="text-amber-400 tabular-nums">R$ {order.total.toFixed(2).replace('.', ',')}</strong>
                </div>
              </div>

              <button
                onClick={() => onSelectRestaurantById('rest-jorge-mooca')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-xs font-semibold text-orange-400 transition-colors shrink-0"
              >
                Pedir de Novo
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Selos */}
      {activeTab === 'medalhas' && (
        <div className="space-y-3">
          {user.foodieBadges.map((badge) => (
            <div
              key={badge.id}
              className="p-4 rounded-2xl bg-[#13151f] border border-slate-800 flex items-center gap-3.5"
            >
              <div className="w-12 h-12 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-white">
                  {badge.label}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {badge.description}
                </p>
              </div>
              <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Ativo
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Phase 1 Explanatory Card */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs space-y-2 text-slate-300">
        <div className="flex items-center gap-2 text-amber-400 font-bold">
          <ShieldCheck className="w-4 h-4" />
          Sobre a Fase 1 (Visual & Navegação)
        </div>
        <p className="text-slate-400 leading-relaxed">
          Nesta etapa, toda a interface simula o fluxo do cliente sem requisições reais de autenticação ou banco de dados. Na Fase 2, esta tela se conectará diretamente ao <strong>Supabase Auth</strong> com login social ou número de WhatsApp.
        </p>
        <button
          onClick={onOpenGitHubGuide}
          className="text-xs font-semibold text-orange-400 hover:text-orange-300 underline underline-offset-2"
        >
          Ver arquitetura do Supabase e instruções do GitHub
        </button>
      </div>
    </div>
  );
};
