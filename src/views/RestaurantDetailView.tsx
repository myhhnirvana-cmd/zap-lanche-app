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
  AlertCircle,
  Loader2,
  Camera,
  Ticket,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  supabase,
  isSupabaseConfigured,
  fetchLoyaltyPoints,
  fetchUserLoyaltyBalance,
  redeemRewardInSupabase,
  fetchRewardsFromSupabase,
  fetchRestaurantMenuFromSupabase,
  fetchRestaurantPromotions,
} from '../lib/supabase';
import { Restaurant, MenuItem, Promotion, SocialPost, LoyaltyReward, UserProfileDemo } from '../types';
import {
  MOCK_MENU_ITEMS,
  MOCK_POSTS,
  MOCK_LOYALTY_REWARDS,
  MOCK_USER_PROFILE,
  ANTI_FRAUD_RULES,
  loadUserProfile,
  saveUserProfile,
  loadRestaurantMenu,
  saveRestaurantMenu,
  loadRestaurantRewards,
  saveRestaurantRewards,
} from '../data/mockData';
import { QrCodeScannerModal } from '../components/loyalty/QrCodeScannerModal';
import { UUID_REGEX, parseAndValidateRestaurantQr } from '../utils/qrCode';

interface RestaurantDetailViewProps {
  restaurant: Restaurant;
  onBack: () => void;
  onSelectMenuItem: (item: MenuItem) => void;
  initialTab?: 'cardapio' | 'promocoes' | 'fidelidade' | 'premios' | 'resgates' | 'publicacoes';
}

export const RestaurantDetailView: React.FC<RestaurantDetailViewProps> = ({
  restaurant,
  onBack,
  onSelectMenuItem,
  initialTab = 'cardapio',
}) => {
  const [activeTab, setActiveTab] = useState<'cardapio' | 'promocoes' | 'fidelidade' | 'premios' | 'resgates' | 'publicacoes'>(initialTab);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedZap, setCopiedZap] = useState(false);
  const [redeemedReward, setRedeemedReward] = useState<LoyaltyReward | null>(null);
  const [redemptionVoucherResult, setRedemptionVoucherResult] = useState<{
    voucherCode: string;
    pointsDeducted: number;
    rewardTitle: string;
  } | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redemptionError, setRedemptionError] = useState<string | null>(null);
  const [showAntiFraudModal, setShowAntiFraudModal] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfileDemo>(() => loadUserProfile());
  const [rewardsList, setRewardsList] = useState<LoyaltyReward[]>(() => loadRestaurantRewards(restaurant.id));
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => loadRestaurantMenu(restaurant.id));
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [promotionsError, setPromotionsError] = useState<string | null>(null);
  const [myRedemptions, setMyRedemptions] = useState<Array<{id:string; voucher_code:string; status:string; points_cost:number; created_at:string; expires_at:string; used_at:string|null; reward_title:string|null}>>([]);
  const [isLoadingRedemptions, setIsLoadingRedemptions] = useState(false);
  const [redemptionHistoryError, setRedemptionHistoryError] = useState<string | null>(null);

  // Estados do Leitor Real de QR Code e Feedback
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [resultModal, setResultModal] = useState<{
    status: 'success' | 'error' | 'warning';
    message: string;
    pointsAwarded?: number;
  } | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [realTotalPoints, setRealTotalPoints] = useState<number | null>(null);
  const [realStorePoints, setRealStorePoints] = useState<number | null>(null);

  const { user } = useAuth();

  // Consulta saldo de pontos real no Supabase
  const loadRealPoints = async () => {
    if (!isSupabaseConfigured || !user?.id || !supabase) return;
    try {
      const targetUuid =
        (restaurant.supabaseId && UUID_REGEX.test(restaurant.supabaseId) && restaurant.supabaseId) ||
        (restaurant.id && UUID_REGEX.test(restaurant.id) && restaurant.id) ||
        null;

      if (targetUuid) {
        const balanceRes = await fetchUserLoyaltyBalance(targetUuid);
        if (balanceRes?.data) {
          setRealTotalPoints(balanceRes.data.total_available_points);
          setRealStorePoints(balanceRes.data.store_available_points);
          return;
        }
      }

      const total = await fetchLoyaltyPoints(user.id);
      setRealTotalPoints(total);

      if (targetUuid) {
        const { data: credits } = await supabase
          .from('loyalty_transactions')
          .select('id, points, expires_at')
          .eq('profile_id', user.id)
          .eq('restaurant_id', targetUuid)
          .gt('points', 0);

        if (credits) {
          const nowIso = new Date().toISOString();
          const validCredits = credits.filter((c) => !c.expires_at || c.expires_at > nowIso);
          const storeSum = validCredits.reduce((sum, item) => sum + (Number(item.points) || 0), 0);
          setRealStorePoints(storeSum);
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar saldo real de fidelidade:', err);
    }
  };

  useEffect(() => {
    loadRealPoints();
  }, [user?.id, restaurant.id, restaurant.supabaseId]);

  const handleStartCheckin = () => {
    if (isSupabaseConfigured && !user) {
      setResultModal({
        status: 'warning',
        message: 'Você precisa estar conectado como cliente para registrar seu check-in e acumular pontos reais. Faça login no sistema.',
      });
      return;
    }
    setIsScannerOpen(true);
  };

  const handleScanQr = async (scannedText: string) => {
    // 1. Interrompe o scanner e libera a câmera imediatamente
    setIsScannerOpen(false);

    // 2. Validação rigorosa do QR Code (formato ZAPLANche://restaurant/<UUID>)
    const parsed = parseAndValidateRestaurantQr(scannedText);
    if (!parsed.isValid || !parsed.restaurantId) {
      setResultModal({
        status: 'error',
        message: 'QR Code inválido. Aponte a câmera para o QR Code oficial do ZAP LANCHE.',
      });
      return;
    }

    // 3. Confirmar que o QR corresponde à loja que está sendo visualizada (quando o UUID estiver disponível)
    const currentRestaurantUuid =
      (restaurant.supabaseId && UUID_REGEX.test(restaurant.supabaseId) && restaurant.supabaseId) ||
      (restaurant.id && UUID_REGEX.test(restaurant.id) && restaurant.id) ||
      null;

    if (currentRestaurantUuid && parsed.restaurantId.toLowerCase() !== currentRestaurantUuid.toLowerCase()) {
      setResultModal({
        status: 'error',
        message: `Este QR Code pertence a outro estabelecimento. Aponte a câmera para o QR Code oficial de ${restaurant.name}.`,
      });
      return;
    }

    // 4. Execução real no Supabase quando configurado
    if (isSupabaseConfigured && supabase) {
      if (!user) {
        setResultModal({
          status: 'warning',
          message: 'Você precisa estar conectado como cliente para registrar seu check-in e acumular pontos reais. Faça login no sistema.',
        });
        return;
      }

      setIsCheckingIn(true);
      try {
        const { data, error } = await supabase.rpc('register_restaurant_checkin', {
          p_restaurant_id: parsed.restaurantId,
        });

        if (error) {
          console.error('Erro na RPC register_restaurant_checkin:', error);
          setResultModal({
            status: 'error',
            message: 'Não foi possível registrar o check-in. Tente novamente.',
          });
          return;
        }

        let result = data;
        if (typeof result === 'string') {
          try {
            result = JSON.parse(result);
          } catch {
            // mantém resultado original se não for JSON string
          }
        }

        if (result && result.success === true) {
          const awarded = typeof result.points_awarded === 'number' ? result.points_awarded : 5;
          setResultModal({
            status: 'success',
            message: result.message || `Check-in realizado com sucesso! 🎉\nVocê ganhou ${awarded} pontos.`,
            pointsAwarded: awarded,
          });
          // Atualiza saldo real através da função de consulta oficial
          await loadRealPoints();
        } else {
          setResultModal({
            status: 'error',
            message: result?.message || result?.reason || 'Check-in não autorizado pelo estabelecimento.',
          });
        }
      } catch (err: any) {
        console.error('Exceção ao executar check-in real:', err);
        setResultModal({
          status: 'error',
          message: err?.message || 'Erro inesperado ao conectar ao servidor de fidelidade.',
        });
      } finally {
        setIsCheckingIn(false);
      }
      return;
    }

    // 5. Fluxo demonstrativo offline (somente quando Supabase não estiver configurado)
    const today = new Date().toISOString().split('T')[0];
    const alreadyChecked = userProfile.checkinHistory.some(
      (c) => c.restaurantId === restaurant.id && c.date === today
    );

    if (alreadyChecked) {
      setResultModal({
        status: 'warning',
        message: 'Você já realizou o check-in neste estabelecimento hoje!',
      });
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
    setResultModal({
      status: 'success',
      message: 'Check-in realizado com sucesso! 🎉 Você ganhou 5 pontos. (Modo demonstrativo - offline)',
      pointsAwarded: 5,
    });
  };

  useEffect(() => {
    let isMounted = true;
    const initialRewards = loadRestaurantRewards(restaurant.id);
    setRewardsList(initialRewards);

    const targetUuid =
      (restaurant.supabaseId && UUID_REGEX.test(restaurant.supabaseId) && restaurant.supabaseId) ||
      (restaurant.id && UUID_REGEX.test(restaurant.id) && restaurant.id) ||
      null;

    if (isSupabaseConfigured && targetUuid) {
      fetchRewardsFromSupabase(targetUuid).then((dbRewards) => {
        if (isMounted && dbRewards && dbRewards.length > 0) {
          setRewardsList(dbRewards);
        }
      });
    }

    if (initialTab) {
      setActiveTab(initialTab);
    }

    return () => {
      isMounted = false;
    };
  }, [restaurant.id, restaurant.supabaseId, initialTab]);

  useEffect(() => {
    let isMounted = true;
    const loadRedemptions = async () => {
      if (activeTab !== 'resgates') return;
      if (!user?.id) {
        setMyRedemptions([]);
        setRedemptionHistoryError(null);
        setIsLoadingRedemptions(false);
        return;
      }
      if (!isSupabaseConfigured || !supabase) {
        setMyRedemptions([]);
        setRedemptionHistoryError('Não foi possível consultar seus resgates porque a conexão com o sistema está indisponível. Tente novamente mais tarde.');
        setIsLoadingRedemptions(false);
        return;
      }
      const restaurantUuid = (restaurant.supabaseId && UUID_REGEX.test(restaurant.supabaseId) && restaurant.supabaseId) || (UUID_REGEX.test(restaurant.id) ? restaurant.id : null);
      if (!restaurantUuid) {
        setMyRedemptions([]);
        setRedemptionHistoryError('O histórico estará disponível quando este estabelecimento estiver conectado ao sistema.');
        setIsLoadingRedemptions(false);
        return;
      }
      setIsLoadingRedemptions(true);
      setRedemptionHistoryError(null);
      const { data, error } = await supabase.from('loyalty_redemptions').select('id, voucher_code, status, points_cost, created_at, expires_at, used_at, loyalty_rewards(title)').eq('profile_id', user.id).eq('restaurant_id', restaurantUuid).order('created_at', { ascending: false });
      if (!isMounted) return;
      if (error) {
        setRedemptionHistoryError('Não foi possível carregar seus resgates agora. Tente novamente em instantes.');
        setMyRedemptions([]);
      } else {
        setMyRedemptions((data || []).map((row: any) => ({ ...row, reward_title: row.loyalty_rewards?.title || null })));
      }
      setIsLoadingRedemptions(false);
    };
    loadRedemptions();
    return () => { isMounted = false; };
  }, [activeTab, user?.id, restaurant.id, restaurant.supabaseId]);

  const rewards = rewardsList;

  // Cardápio, promoções e prêmios vêm da loja atual no Supabase.
  // Array vazio é uma resposta válida e substitui o cache antigo; erro mantém o cache local.
  useEffect(() => {
    let isMounted = true;
    const loadRestaurantContent = async () => {
      if (!isSupabaseConfigured) {
        setMenuItems(loadRestaurantMenu(restaurant.id));
        setPromotions([]);
        setPromotionsError(null);
        return;
      }

      const [dbMenu, dbPromotions, dbRewards] = await Promise.all([
        fetchRestaurantMenuFromSupabase(restaurant),
        fetchRestaurantPromotions(restaurant.supabaseId || restaurant.id, restaurant.name),
        fetchRewardsFromSupabase(restaurant.supabaseId || restaurant.id),
      ]);

      if (!isMounted) return;
      if (dbMenu !== null) {
        setMenuItems(dbMenu);
        saveRestaurantMenu(restaurant.id, dbMenu);
      } else {
        setMenuItems(loadRestaurantMenu(restaurant.id));
      }
      if (dbPromotions === null) {
        setPromotions([]);
        setPromotionsError('Não foi possível carregar as promoções desta loja agora. Tente novamente mais tarde.');
      } else {
        setPromotions(dbPromotions.filter((promotion) => promotion.isActive !== false && (!promotion.validUntil || new Date(promotion.validUntil).getTime() >= Date.now())));
        setPromotionsError(null);
      }
      if (dbRewards !== null) setRewardsList(dbRewards);
    };

    loadRestaurantContent();
    return () => { isMounted = false; };
  }, [restaurant.id, restaurant.supabaseId, restaurant.name]);


  const posts = MOCK_POSTS.filter((p) => p.restaurantId === restaurant.id);

  // Group menu by categories
  const categoriesInMenu = Array.from(new Set(menuItems.map((m) => m.category)));
  const [selectedMenuCategory, setSelectedMenuCategory] = useState<string>('todos');

  // Customer Loyalty Balances (usa saldo real do Supabase quando logado e conectado)
  const customerStorePoints = (isSupabaseConfigured && user && realStorePoints !== null)
    ? realStorePoints
    : (userProfile.loyaltyWallet.storePoints[restaurant.id] || 0);
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

  const handleCompleteRedemption = async () => {
    if (!redeemedReward) return;
    setIsRedeeming(true);
    setRedemptionError(null);

    // Se estiver conectado no Supabase e o prêmio tiver UUID real
    if (isSupabaseConfigured && user && UUID_REGEX.test(redeemedReward.id)) {
      const res = await redeemRewardInSupabase(redeemedReward.id);
      setIsRedeeming(false);
      if (!res.success) {
        setRedemptionError(res.message);
        return;
      }

      setRedemptionVoucherResult({
        voucherCode: res.voucherCode || `ZAP-VOUCH-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        pointsDeducted: res.pointsDeducted || redeemedReward.pointsCost,
        rewardTitle: redeemedReward.title,
      });
      setRedeemedReward(null);
      await loadRealPoints();
      return;
    }

    // Modo demonstrativo offline / fallback
    const mockVoucher = `ZAP-RESGATE-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;

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

    setIsRedeeming(false);
    setRedemptionVoucherResult({
      voucherCode: mockVoucher,
      pointsDeducted: redeemedReward.pointsCost,
      rewardTitle: redeemedReward.title,
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
          onClick={handleStartCheckin}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 border border-orange-500 text-xs font-bold text-white transition-colors shadow-md"
        >
          <Camera className="w-3.5 h-3.5" />
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
            Clube Fidelidade
          </button>

          <button
            onClick={() => setActiveTab('premios')}
            className={`py-3 px-3 border-b-2 whitespace-nowrap transition-colors flex items-center justify-center gap-1.5 ${activeTab === 'premios' ? 'border-amber-400 text-amber-300 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <Gift className="w-4 h-4 text-amber-400" />
            Prêmios da Casa ({rewards.length})
          </button>

          <button
            onClick={() => setActiveTab('resgates')}
            className={`py-3 px-3 border-b-2 whitespace-nowrap transition-colors flex items-center justify-center gap-1.5 ${activeTab === 'resgates' ? 'border-orange-400 text-orange-300 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <Ticket className="w-4 h-4" />
            Meus Resgates
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
            {promotionsError && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">{promotionsError}</div>
            )}
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
              <span className="font-semibold">Ofertas e Combos Especiais</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 font-bold border border-amber-500/30">
                Ofertas da loja
              </span>
            </div>

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

              {/* Ação rápida de Check-in com Câmera */}
              <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-slate-300">
                  <span className="font-bold text-white block">Está no estabelecimento agora?</span>
                  <span className="text-[11px] text-slate-400">Escaneie o QR Code oficial no balcão e ganhe 5 pontos por check-in validado (novo check-in a cada 2 horas).</span>
                </div>
                <button
                  onClick={handleStartCheckin}
                  className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md shrink-0"
                >
                  <Camera className="w-4 h-4" />
                  Escanear QR Code da Loja
                </button>
              </div>
            </div>

            {/* Explanation of 70/30 Rule */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-300 font-semibold text-xs">
                <Info className="w-3.5 h-3.5" />
                Como funciona o resgate (Regra 70/30):
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Os pontos locais pertencem exclusivamente à lanchonete onde foram conquistados. O resgate exige <strong>no mínimo 70% em pontos locais desta loja</strong> e até <strong>30% em pontos globais da rede</strong> (conquistados em indicações). Pontos acumulados em outras lanchonetes nunca participam deste resgate.
              </p>
            </div>

          </div>
        )}

        {/* Tab 4: Prêmios da Casa */}
        {activeTab === 'premios' && (
          <div className="mt-5 space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-[#161824] to-orange-500/10 border border-amber-500/25">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm text-white">Prêmios da Casa</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">Troque seus pontos por recompensas oferecidas por esta lanchonete. Consulte o custo, estoque e os pontos necessários antes de resgatar.</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700 text-[11px] text-amber-300">{rewards.length} recompensa(s) cadastrada(s)</span>
                <button onClick={() => setActiveTab('resgates')} className="px-2.5 py-1 rounded-lg bg-orange-500/15 border border-orange-500/30 text-[11px] font-semibold text-orange-300 hover:bg-orange-500/25">Ver meus resgates</button>
              </div>
            </div>
                        {/* Catálogo de recompensas da loja */}
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

        {/* Tab 5: Meus Resgates */}
        {activeTab === 'resgates' && (
          <div className="mt-5 space-y-4">
            <div className="p-4 rounded-2xl bg-[#13151f] border border-slate-800">
              <div className="flex items-center gap-2"><Ticket className="w-5 h-5 text-orange-400" /><h3 className="font-bold text-sm text-white">Meus Resgates</h3></div>
              <p className="text-xs text-slate-400 mt-1">Seus vouchers desta lanchonete, com código, validade e situação atual.</p>
            </div>
            {!user ? (
              <div className="text-center py-9 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400">Entre na sua conta para consultar seus vouchers.</div>
            ) : isLoadingRedemptions ? (
              <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-400"><Loader2 className="w-4 h-4 animate-spin" />Carregando seus resgates...</div>
            ) : redemptionHistoryError ? (
              <div className="text-center py-8 rounded-2xl bg-slate-900 border border-rose-500/20 text-xs text-slate-400">{redemptionHistoryError}</div>
            ) : myRedemptions.length === 0 ? (
              <div className="text-center py-9 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400">Você ainda não tem resgates nesta lanchonete. Quando trocar pontos por um prêmio, seu voucher aparecerá aqui.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {myRedemptions.map((item) => {
                  const expired = item.status === 'pendente' && new Date(item.expires_at).getTime() <= Date.now();
                  const status = expired ? 'Expirado' : item.status === 'utilizado' ? 'Utilizado' : item.status === 'cancelado' ? 'Cancelado' : 'Pendente';
                  const statusClass = expired || item.status === 'cancelado' ? 'text-rose-300 bg-rose-500/10 border-rose-500/20' : item.status === 'utilizado' ? 'text-slate-300 bg-slate-700/40 border-slate-600' : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20';
                  return (
                    <article key={item.id} className="p-4 rounded-2xl bg-[#13151f] border border-slate-800 space-y-3">
                      <div className="flex items-start justify-between gap-3"><div><h4 className="font-bold text-sm text-white">{item.reward_title || 'Prêmio resgatado'}</h4><p className="text-[11px] text-slate-400 mt-1">{item.points_cost} pontos utilizados</p></div><span className={`px-2 py-1 rounded-full border text-[10px] font-bold ${statusClass}`}>{status}</span></div>
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800"><span className="text-[10px] uppercase tracking-wider text-slate-500 block">Código do voucher</span><div className="font-mono font-bold text-lg tracking-wider text-orange-300 select-all mt-1">{item.voucher_code}</div><button onClick={() => navigator.clipboard?.writeText(item.voucher_code)} className="text-[11px] text-orange-300 hover:text-orange-200 mt-1">Copiar código</button></div>
                      <div className="flex flex-wrap justify-between gap-2 text-[10px] text-slate-400"><span>Resgatado: {new Date(item.created_at).toLocaleDateString('pt-BR')}</span><span>Validade: {new Date(item.expires_at).toLocaleDateString('pt-BR')}</span></div>
                      {item.used_at && <p className="text-[10px] text-slate-500">Utilizado em {new Date(item.used_at).toLocaleString('pt-BR')}</p>}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Publicações & Fotos */}
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
                        className="w-full h-full object-contain"
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

      {/* Modal de Confirmação do Resgate */}
      {redeemedReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#13151f] border border-amber-500/40 rounded-3xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-400" />
                <h4 className="font-bold text-base text-white">
                  Confirmar Resgate de Recompensa
                </h4>
              </div>
              <button
                onClick={() => {
                  setRedeemedReward(null);
                  setRedemptionError(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
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

            {/* Regra 70/30 Info */}
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300/90 space-y-1">
              <span className="font-bold block">Regra de Segurança 70/30:</span>
              <p className="text-[11px] text-slate-300">
                Mínimo de {redeemedReward.minStorePointsRequired} pontos locais desta loja (70%) e até {redeemedReward.maxGlobalPointsAllowed} pontos globais de indicação (30%). Pontos de outras lojas não podem ser usados.
              </p>
            </div>

            {redemptionError && (
              <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{redemptionError}</span>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  setRedeemedReward(null);
                  setRedemptionError(null);
                }}
                disabled={isRedeeming}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>

              <button
                onClick={handleCompleteRedemption}
                disabled={isRedeeming}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md"
              >
                {isRedeeming ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confirmar Resgate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Voucher Gerado com Sucesso */}
      {redemptionVoucherResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#13151f] border border-emerald-500/50 rounded-3xl p-6 space-y-4 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h4 className="font-extrabold text-lg text-white font-display">
                Voucher de Resgate Gerado! 🎉
              </h4>
              <p className="text-xs text-slate-300">
                {redemptionVoucherResult.rewardTitle} ({redemptionVoucherResult.pointsDeducted} pontos debitados)
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 space-y-2">
              <span className="text-[10px] text-emerald-300 uppercase font-bold tracking-wider block">
                Seu Código de Validação no Balcão
              </span>
              <div className="text-xl font-mono font-black text-emerald-400 tracking-wider select-all py-1">
                {redemptionVoucherResult.voucherCode}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Apresente este código presencialmente no balcão da lanchonete ou informe na mensagem do seu pedido no WhatsApp. O comerciante deve obrigatoriamente validar o voucher no painel antes de entregar a sua cortesia!
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(redemptionVoucherResult.voucherCode);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold transition-colors"
              >
                {copiedLink ? 'Código Copiado!' : 'Copiar Código'}
              </button>

              <button
                type="button"
                onClick={() => setRedemptionVoucherResult(null)}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
              >
                Concluir
              </button>
            </div>
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
      {/* LEITOR REAL DE QR CODE DA CÂMERA                             */}
      {/* ============================================================ */}
      <QrCodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanQr}
        targetRestaurantName={restaurant.name}
        isProcessing={isCheckingIn}
      />

      {/* ============================================================ */}
      {/* MODAL DE RESULTADO / FEEDBACK DO CHECK-IN                    */}
      {/* ============================================================ */}
      {resultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-[#13151f] border border-orange-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="text-center space-y-3">
              {resultModal.status === 'success' && (
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
              )}
              {resultModal.status === 'warning' && (
                <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                  <Info className="w-10 h-10" />
                </div>
              )}
              {resultModal.status === 'error' && (
                <div className="w-16 h-16 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
                  <AlertCircle className="w-10 h-10" />
                </div>
              )}

              <h3 className="text-lg font-bold text-white font-display">
                {resultModal.status === 'success'
                  ? 'Check-in Confirmado!'
                  : resultModal.status === 'warning'
                  ? 'Atenção'
                  : 'Check-in Não Realizado'}
              </h3>

              {resultModal.pointsAwarded && (
                <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold text-xs border border-emerald-500/30">
                  +{resultModal.pointsAwarded} pontos adicionados à sua carteira
                </div>
              )}

              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {resultModal.message}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              {resultModal.status === 'error' && (
                <button
                  onClick={() => {
                    setResultModal(null);
                    handleStartCheckin();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Escanear Novamente
                </button>
              )}
              <button
                onClick={() => setResultModal(null)}
                className={`py-2.5 rounded-xl font-semibold text-xs transition-colors ${
                  resultModal.status === 'error'
                    ? 'flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300'
                    : 'w-full bg-slate-800 hover:bg-slate-700 text-white'
                }`}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
