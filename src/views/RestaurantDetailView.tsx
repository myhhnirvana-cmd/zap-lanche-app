import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Star,
  MapPin,
  Clock,
  Phone,
  MessageCircle,
  Share2,
  CheckCircle,
  Sparkles,
  Tag,
  Plus,
  Flame,
  MessageSquare,
  ThumbsUp,
  Gift,
  ShieldCheck,
  CheckCircle2,
  Info,
  Lock,
  X,
} from 'lucide-react';
import { Restaurant, MenuItem, Promotion, SocialPost, LoyaltyReward, UserProfileDemo } from '../types';
import {
  MOCK_MENU_ITEMS,
  MOCK_PROMOTIONS,
  MOCK_POSTS,
  MOCK_LOYALTY_REWARDS,
  MOCK_USER_PROFILE,
  ANTI_FRAUD_RULES,
  loadUserProfile,
  saveUserProfile,
  loadRestaurantMenu,
  loadRestaurantRewards,
  saveRestaurantRewards,
} from '../data/mockData';

interface RestaurantDetailViewProps {
  restaurant: Restaurant;
  onBack: () => void;
  onSelectMenuItem: (item: MenuItem) => void;
  initialTab?: 'cardapio' | 'promocoes' | 'fidelidade' | 'publicacoes';
}

export const RestaurantDetailView: React.FC<RestaurantDetailViewProps> = ({
  restaurant,
  onBack,
  onSelectMenuItem,
  initialTab = 'cardapio',
}) => {
  const [activeTab, setActiveTab] = useState<'cardapio' | 'promocoes' | 'fidelidade' | 'publicacoes'>(initialTab);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedZap, setCopiedZap] = useState(false);
  const [redeemedReward, setRedeemedReward] = useState<LoyaltyReward | null>(null);
  const [showAntiFraudModal, setShowAntiFraudModal] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfileDemo>(() => loadUserProfile());
  const [rewardsList, setRewardsList] = useState<LoyaltyReward[]>(() => loadRestaurantRewards(restaurant.id));
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [checkinMessage, setCheckinMessage] = useState<string | null>(null);

  const performCheckin = () => {
    const today = new Date().toISOString().split('T')[0];
    const alreadyChecked = userProfile.checkinHistory.some(
      (c) => c.restaurantId === restaurant.id && c.date === today
    );

    if (alreadyChecked) {
      setCheckinMessage('Você já realizou o check-in neste estabelecimento hoje!');
      return;
    }

    const newCheckin = {
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      date: today,
      points: 5,
    };

    const updatedProfile = {
      ...userProfile,
      loyaltyWallet: {
        ...userProfile.loyaltyWallet,
        storePoints: {
          ...userProfile.loyaltyWallet.storePoints,
          [restaurant.id]: (userProfile.loyaltyWallet.storePoints[restaurant.id] || 0) + 5,
        },
      },
      checkinHistory: [...userProfile.checkinHistory, newCheckin],
    };

    setUserProfile(updatedProfile);
    saveUserProfile(updatedProfile);
    setCheckinMessage('Check-in realizado com sucesso! Você ganhou 5 pontos.');
  };

  useEffect(() => {
    setRewardsList(loadRestaurantRewards(restaurant.id));
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [restaurant.id, initialTab]);

  const menuItems = loadRestaurantMenu(restaurant.id);
  const promotions = MOCK_PROMOTIONS[restaurant.id] || MOCK_PROMOTIONS['rest-jorge-jpa'] || Object.values(MOCK_PROMOTIONS)[0] || [];
  const rewards = rewardsList;
  const posts = MOCK_POSTS.filter((p) => p.restaurantId === restaurant.id);

  // Group menu by categories
  const categoriesInMenu = Array.from(new Set(menuItems.map((m) => m.category)));
  const [selectedMenuCategory, setSelectedMenuCategory] = useState<string>('todos');

  // Customer Loyalty Balances from dynamic profile
  const customerStorePoints = userProfile.loyaltyWallet.storePoints[restaurant.id] || 0;
  const customerGlobalPoints = userProfile.loyaltyWallet.globalReferralPoints || 0;

  const filteredMenuItems =
    selectedMenuCategory === 'todos'
      ? menuItems
      : menuItems.filter((m) => m.category === selectedMenuCategory);

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyZap = () => {
    navigator.clipboard?.writeText(restaurant.whatsappDemo);
    setCopiedZap(true);
    setTimeout(() => setCopiedZap(false), 2500);
  };

  const handleCompleteRedemption = () => {
    if (!redeemedReward) return;

    // Atualiza estoque do prêmio desta loja
    const currentRewards = loadRestaurantRewards(restaurant.id);
    const updatedRewards = currentRewards.map((r) => {
      if (r.id === redeemedReward.id) {
        const nextStock = Math.max(0, (r.stock ?? 1) - 1);
        const nextStatus = nextStock === 0 ? ('esgotado' as const) : r.status;
        return {
          ...r,
          stock: nextStock,
          status: nextStatus,
          isAvailable: nextStock > 0 && nextStatus === 'ativo',
        };
      }
      return r;
    });
    saveRestaurantRewards(restaurant.id, updatedRewards);
    setRewardsList(updatedRewards);

    setUserProfile((prev) => {
      const currentStore = prev.loyaltyWallet.storePoints[restaurant.id] || 0;
      const storeToDeduct = Math.min(currentStore, redeemedReward.minStorePointsRequired);
      const remainder = redeemedReward.pointsCost - storeToDeduct;
      const globalToDeduct = Math.min(prev.loyaltyWallet.globalReferralPoints, remainder);

      const updated: UserProfileDemo = {
        ...prev,
        loyaltyWallet: {
          ...prev.loyaltyWallet,
          globalReferralPoints: Math.max(0, prev.loyaltyWallet.globalReferralPoints - globalToDeduct),
          storePoints: {
            ...prev.loyaltyWallet.storePoints,
            [restaurant.id]: Math.max(0, currentStore - storeToDeduct),
          },
        },
      };
      saveUserProfile(updated);
      return updated;
    });
    setRedeemedReward(null);
  };

  return (
    <div className="pb-16 animate-fade-in space-y-5">
      {/* Top back button navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-850 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Explorar
        </button>

        <button
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" />
          {copiedLink ? 'Link Copiado!' : 'Compartilhar'}
        </button>
        <button
          onClick={() => setShowCheckinModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 border border-orange-500 text-xs font-bold text-white hover:bg-orange-500 transition-colors shadow-md"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Fazer check-in
        </button>
      </div>

      {/* Active Regional Highlight Banner (if active) */}
      {restaurant.activeHighlight && restaurant.activeHighlight.status === 'ativo' && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/10 border border-amber-500/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-amber-400 text-black">
              <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
            </span>
            <div>
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wide block">
                Patrocinado · Destaque de {restaurant.neighborhoodName}
              </span>
              <span className="text-[11px] text-slate-300">
                Lanchonete em evidência regional durante a fase de lançamento
              </span>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-black/60 text-amber-300 border border-amber-400/40 font-semibold shrink-0">
            {restaurant.activeHighlight.requestedDuration}
          </span>
        </div>
      )}

      {/* Hero Banner Card */}
      <div className="rounded-3xl bg-[#13151f] border border-slate-800 overflow-hidden shadow-xl">
        <div className="relative h-48 sm:h-64 w-full bg-slate-900">
          <img
            src={restaurant.bannerUrl}
            alt={restaurant.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#13151f] via-black/40 to-black/30" />

          <div className="absolute top-4 left-4 flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-md bg-emerald-500 text-black text-xs font-extrabold uppercase">
              {restaurant.isOpen ? 'Aberto Hoje' : 'Fechado'}
            </span>
            {restaurant.verifiedNeighborhoodSpot && (
              <span className="px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md border border-amber-500/50 text-amber-300 text-xs font-semibold flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-amber-400" />
                Ponto Oficial do Bairro
              </span>
            )}
            <span className="px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-700 text-[11px] text-amber-300 font-medium">
              Lançamento Gratuito
            </span>
          </div>

          <div className="absolute bottom-4 left-4 right-4 text-white">
            <span className="text-xs font-semibold text-orange-400">
              {restaurant.categoryLabel}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display">
              {restaurant.name}
            </h1>
          </div>
        </div>

        {/* Info Grid */}
        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 border-y border-slate-800/80 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-white tabular-nums">{restaurant.rating.toFixed(1)}</span>
                <span className="text-[11px] text-slate-400 block">({restaurant.reviewCount} avaliações)</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-400 shrink-0" />
              <div>
                <span className="font-bold text-white">{restaurant.deliveryTime}</span>
                <span className="text-[11px] text-slate-400 block">{restaurant.openingHours}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-orange-400 shrink-0" />
              <div>
                <span className="font-bold text-white">{restaurant.neighborhoodName}</span>
                <span className="text-[11px] text-slate-400 block">{restaurant.distanceKm} km de você</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyZap}
              className="flex items-center gap-2 text-left group p-1 -m-1 rounded-xl hover:bg-slate-850/80 transition-colors"
              title="Toque para copiar o WhatsApp da lanchonete"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
              <div>
                <span className="font-bold text-white flex items-center gap-1.5">
                  Zap Direto
                  {copiedZap && <span className="text-[10px] text-emerald-400 font-semibold">(Copiado!)</span>}
                </span>
                <span className="text-[11px] text-slate-400 block group-hover:text-emerald-300 transition-colors">{restaurant.whatsappDemo}</span>
              </div>
            </button>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {restaurant.bio}
          </p>

          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>{restaurant.address}</span>
          </div>
        </div>
      </div>

      {/* 4 Main Tabs: Cardápio, Promoções, Clube de Fidelidade, Publicações */}
      <div>
        <div className="flex border-b border-slate-800 text-xs sm:text-sm font-semibold overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('cardapio')}
            className={`py-3 px-3 border-b-2 whitespace-nowrap transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'cardapio'
                ? 'border-orange-500 text-orange-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-4 h-4" />
            Cardápio ({menuItems.length})
          </button>

          <button
            onClick={() => setActiveTab('promocoes')}
            className={`py-3 px-3 border-b-2 whitespace-nowrap transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'promocoes'
                ? 'border-orange-500 text-orange-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tag className="w-4 h-4" />
            Promoções ({promotions.length})
          </button>

          <button
            onClick={() => setActiveTab('fidelidade')}
            className={`py-3 px-3 border-b-2 whitespace-nowrap transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'fidelidade'
                ? 'border-amber-400 text-amber-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Gift className="w-4 h-4 text-amber-400" />
            Clube Fidelidade ({rewards.length})
          </button>

          <button
            onClick={() => setActiveTab('publicacoes')}
            className={`py-3 px-3 border-b-2 whitespace-nowrap transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'publicacoes'
                ? 'border-orange-500 text-orange-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Publicações ({posts.length})
          </button>
        </div>

        {/* Tab 1: Cardápio */}
        {activeTab === 'cardapio' && (
          <div className="mt-5 space-y-4">
            {categoriesInMenu.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                <button
                  onClick={() => setSelectedMenuCategory('todos')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedMenuCategory === 'todos'
                      ? 'bg-orange-500 text-black font-bold'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  Todos
                </button>
                {categoriesInMenu.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedMenuCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      selectedMenuCategory === cat
                        ? 'bg-orange-500 text-black font-bold'
                        : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredMenuItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectMenuItem(item)}
                  className="group cursor-pointer p-3.5 rounded-2xl bg-[#13151f] border border-slate-800/80 hover:border-orange-500/40 transition-all flex gap-3.5 items-center justify-between"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-white group-hover:text-orange-400 transition-colors">
                        {item.name}
                      </h4>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {item.badge}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2">
                      {item.description}
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-sm font-extrabold text-amber-400 tabular-nums">
                        R$ {item.price.toFixed(2).replace('.', ',')}
                      </span>
                      {item.originalPrice && (
                        <span className="text-xs text-slate-400 line-through tabular-nums">
                          R$ {item.originalPrice.toFixed(2).replace('.', ',')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-slate-900 shrink-0">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                    <button
                      type="button"
                      className="absolute bottom-1 right-1 w-6 h-6 rounded-lg bg-orange-600 text-white flex items-center justify-center shadow-md hover:bg-orange-500 transition-colors"
                      title="Ver e pedir no Zap"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Promoções */}
        {activeTab === 'promocoes' && (
          <div className="mt-5 space-y-4">
            {promotions.length === 0 ? (
              <div className="text-center py-10 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-xs">
                Nenhuma promoção ativa no momento para esta lanchonete.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {promotions.map((promo) => (
                  <div
                    key={promo.id}
                    className="rounded-2xl bg-gradient-to-br from-[#141622] to-[#1a1d2d] border border-amber-500/30 p-4.5 space-y-3 relative overflow-hidden shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/40 mb-1.5">
                          {promo.badge}
                        </span>
                        <h4 className="text-base font-bold text-white">
                          {promo.title}
                        </h4>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs text-slate-400 line-through block tabular-nums">
                          R$ {promo.regularPrice.toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-base font-extrabold text-amber-400 tabular-nums">
                          R$ {promo.discountPrice.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {promo.description}
                    </p>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        {promo.validUntil}
                      </span>
                      {promo.couponCode && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 text-[11px]">Cupom:</span>
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono font-bold text-amber-400 text-xs">
                            {promo.couponCode}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Clube de Fidelidade (Programa de Pontos 70/30) */}
        {activeTab === 'fidelidade' && (
          <div className="mt-5 space-y-4">
            {/* Customer Point Balance Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-[#161824] to-orange-500/10 border border-amber-500/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Gift className="w-5 h-5 text-amber-400" />
                    <h3 className="font-bold text-sm text-white">
                      Seus Pontos de Fidelidade no Bairro
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pontos acumulados nesta lanchonete e pontos globais de convite
                  </p>
                </div>

                <button
                  onClick={() => setShowAntiFraudModal(true)}
                  className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 underline underline-offset-2 self-start sm:self-auto"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Regras Antifraude & 70/30
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-800">
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">
                    Nesta lanchonete ({restaurant.name}):
                  </span>
                  <span className="text-lg font-extrabold text-amber-400 tabular-nums">
                    {customerStorePoints} pts
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    (Válidos só aqui)
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">
                    Seus Pontos Globais de Convite:
                  </span>
                  <span className="text-lg font-extrabold text-orange-400 tabular-nums">
                    {customerGlobalPoints} pts
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    (Cobrem até 30% do prêmio)
                  </span>
                </div>
              </div>
            </div>

            {/* Explanation of 70/30 Rule */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-300 font-semibold text-xs">
                <Info className="w-3.5 h-3.5" />
                Como funciona o resgate (Regra 70/30):
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Para proteger os comerciantes de bairro e incentivar a frequência real, <strong>pelo menos 70% dos pontos</strong> devem vir de ações nesta casa (check-in ou avaliação com foto auditada). Até <strong>30%</strong> podem ser cobertos com pontos globais que você ganhou convidando amigos.
              </p>
            </div>

            {/* Rewards Grid */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Recompensas Disponíveis da Casa ({rewards.length})
              </h4>

              {rewards.length === 0 ? (
                <div className="text-center py-8 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
                  Nenhuma recompensa ativa no momento para esta lanchonete.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {rewards.map((rew) => {
                    const isOutOfStock = (rew.stock ?? 0) <= 0 || rew.status === 'esgotado';
                    const isPaused = rew.status === 'pausado' || !rew.isAvailable;
                    // Check 70/30 eligibility
                    const hasMinStorePoints = customerStorePoints >= rew.minStorePointsRequired;
                    const canAffordTotal = (customerStorePoints + customerGlobalPoints) >= rew.pointsCost;
                    const isEligible = hasMinStorePoints && canAffordTotal && !isOutOfStock && !isPaused;

                    return (
                      <div
                        key={rew.id}
                        className={`p-4 rounded-2xl bg-[#13151f] border flex flex-col justify-between space-y-3 transition-colors ${
                          isOutOfStock
                            ? 'border-slate-800/60 opacity-80'
                            : isPaused
                            ? 'border-amber-500/20'
                            : 'border-slate-800 hover:border-amber-500/40'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h5 className="font-bold text-sm text-white">
                                {rew.title}
                              </h5>
                              <div className="flex items-center gap-2 mt-1">
                                {isOutOfStock ? (
                                  <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 font-bold text-[10px] border border-rose-500/30">
                                    Esgotado (0 un.)
                                  </span>
                                ) : isPaused ? (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-bold text-[10px] border border-amber-500/30">
                                    Pausado pela Loja
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-medium text-[10px] border border-emerald-500/30">
                                    {rew.stock} un. em estoque
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30 shrink-0 tabular-nums">
                              {rew.pointsCost} pts
                            </span>
                          </div>

                          <p className="text-xs text-slate-400 mt-2">
                            {rew.description}
                          </p>

                          {/* Rule Breakdown for this reward */}
                          <div className="mt-3 p-2 rounded-lg bg-slate-900 text-[11px] space-y-1 text-slate-300">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Mínimo desta casa (70%):</span>
                              <span className="font-semibold text-amber-400 tabular-nums">{rew.minStorePointsRequired} pts</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Máx. pontos de convite (30%):</span>
                              <span className="font-semibold text-orange-400 tabular-nums">{rew.maxGlobalPointsAllowed} pts</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                          <span className="text-[11px] text-slate-400">
                            {isOutOfStock
                              ? 'Estoque esgotado no balcão'
                              : isPaused
                              ? 'Indisponível temporariamente'
                              : hasMinStorePoints
                              ? 'Você tem os pontos da loja!'
                              : `Faltam ${rew.minStorePointsRequired - customerStorePoints} pts da loja`}
                          </span>

                          <button
                            onClick={() => setRedeemedReward(rew)}
                            disabled={!isEligible}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                              isEligible
                                ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-md shadow-amber-500/20'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            {isEligible ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Resgatar Prêmio
                              </>
                            ) : isOutOfStock ? (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                Esgotado
                              </>
                            ) : isPaused ? (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                Pausado
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                Pontos Insuficientes
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Publicações & Fotos */}
        {activeTab === 'publicacoes' && (
          <div className="mt-5 space-y-4">
            {posts.length === 0 ? (
              <div className="text-center py-10 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-xs">
                Ainda não há postagens marcando este restaurante no feed da comunidade.
              </div>
            ) : (
              posts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-2xl bg-[#13151f] border border-slate-800 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-orange-400 overflow-hidden">
                        {post.authorName.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          {post.authorName}
                          <span className="text-[10px] text-amber-400 font-medium">
                            · {post.authorRole === 'morador' ? 'Morador do Bairro' : 'Comerciante'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {post.createdAt}
                        </span>
                      </div>
                    </div>
                    {post.hasPhotoValidation && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Foto Auditada (+Pontos)
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed">
                    {post.content}
                  </p>

                  {post.imageUrl && (
                    <div className="relative h-48 sm:h-56 rounded-xl overflow-hidden bg-slate-900">
                      <img
                        src={post.imageUrl}
                        alt="Foto do lanche"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <span className="flex items-center gap-1.5 text-orange-400 font-semibold">
                      <ThumbsUp className="w-3.5 h-3.5" />
                      {post.likesCount} curtiram no bairro
                    </span>
                    <span>{post.commentsCount} comentários de vizinhos</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Simulated Reward Redemption Modal */}
      {redeemedReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#13151f] border border-amber-500/40 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-400" />
                <h4 className="font-bold text-base text-white">
                  Resgate de Recompensa (Demonstração)
                </h4>
              </div>
              <button
                onClick={() => setRedeemedReward(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
              <div className="font-bold text-white text-sm">
                {redeemedReward.title}
              </div>
              <p className="text-slate-400">
                {redeemedReward.description}
              </p>
              <div className="pt-2 border-t border-slate-800 flex justify-between text-slate-300">
                <span>Custo debitado do saldo:</span>
                <span className="font-bold text-amber-400">{redeemedReward.pointsCost} pontos</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center space-y-1">
              <span className="text-[11px] text-slate-400 block uppercase tracking-wider">
                Código Demonstrativo de Resgate
              </span>
              <span className="font-mono font-extrabold text-lg text-amber-300">
                #ZAP-RESGATE-7492
              </span>
              <p className="text-[10px] text-slate-400 mt-1">
                Apresente este código ao comerciante ou informe na mensagem do WhatsApp.
              </p>
            </div>

            <p className="text-[11px] text-slate-400 text-center italic">
              * Operação simulada em modo de demonstração. Nenhum ponto real foi transferido.
            </p>

            <button
              onClick={handleCompleteRedemption}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors"
            >
              Concluir e Debitar Pontos
            </button>
          </div>
        </div>
      )}

      {/* Anti-Fraud Rules Modal */}
      {showAntiFraudModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-[#13151f] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h4 className="font-bold text-base text-white">
                  Regras de Integridade & Prevenção de Fraudes
                </h4>
              </div>
              <button
                onClick={() => setShowAntiFraudModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              O ZAP LANCHE foi projetado com regras rigorosas para que o programa de fidelidade promova o consumo e a economia real nos bairros:
            </p>

            <div className="space-y-2.5">
              {ANTI_FRAUD_RULES.map((rule) => (
                <div key={rule.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                  <span className="font-bold text-amber-300 block mb-0.5">
                    {rule.title}
                  </span>
                  <span className="text-slate-400 leading-relaxed">
                    {rule.rule}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400">
              🔒 <strong>Segurança no Backend:</strong> Na Fase 2 (Supabase), todas as validações de pontuação, restrições geográficas e limites de 70/30 serão processadas em stored procedures seguras e regras de Row Level Security (RLS).
            </div>

            <button
              onClick={() => setShowAntiFraudModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-semibold text-xs transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CHECK-IN COM QR CODE DEMONSTRATIVO                    */}
      {/* ============================================================ */}
      {showCheckinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-[#13151f] border border-orange-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Check-in na Loja</h3>
            
            {checkinMessage ? (
                <div className="text-center space-y-3">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                    <p className="text-sm text-slate-300">{checkinMessage}</p>
                    <button 
                        onClick={() => { setShowCheckinModal(false); setCheckinMessage(null); }}
                        className="w-full py-2.5 rounded-xl bg-slate-800 text-white font-semibold"
                    >
                        Fechar
                    </button>
                </div>
            ) : (
                <>
                    <p className="text-xs text-slate-400">
                        Escanear o QR Code de <strong>{restaurant.name}</strong> para ganhar 5 pontos de fidelidade.
                    </p>
                    <div className="w-48 h-48 bg-white rounded-2xl mx-auto flex items-center justify-center border-4 border-slate-900">
                        <span className="text-black font-bold text-xs p-4 text-center">QR Code Demo: {restaurant.name}</span>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setShowCheckinModal(false)}
                            className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={performCheckin}
                            className="flex-1 py-2.5 rounded-xl bg-orange-600 text-white font-bold"
                        >
                            Simular Leitura
                        </button>
                    </div>
                </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
