import React, { useState, useRef, useEffect } from 'react';
import {
  Store,
  TrendingUp,
  MessageCircle,
  Eye,
  Flame,
  Clock,
  Power,
  Plus,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Send,
  AlertCircle,
  Gift,
  ShieldCheck,
  MapPin,
  Calendar,
  X,
  CheckCircle2,
  Info,
  ChevronRight,
  AlertTriangle,
  Pencil,
  Trash2,
  Camera,
  Image as ImageIcon,
  Check,
  Phone,
  Ticket,
} from 'lucide-react';
import {
  Restaurant,
  MerchantDemoStats,
  MenuItem,
  HighlightStatus,
  RegionalHighlight,
  LoyaltyReward,
  Promotion,
  RewardStatus,
} from '../types';
import {
  MOCK_MERCHANT_STATS,
  MOCK_MENU_ITEMS,
  MOCK_RESTAURANTS,
  MOCK_LOYALTY_REWARDS,
  NEIGHBORHOODS,
  CATEGORIES,
  ANTI_FRAUD_RULES,
  loadMerchantStats,
  saveMerchantStats,
  loadRegionalHighlights,
  saveRegionalHighlights,
  loadRestaurants,
  saveRestaurants,
  updateSingleRestaurant,
  loadRestaurantMenu,
  saveRestaurantMenu,
  loadRestaurantRewards,
  saveRestaurantRewards,
} from '../data/mockData';
import { optimizeImage, formatBytes } from '../utils/imageOptimizer';
import { useAuth } from '../contexts/AuthContext';
import { RestaurantQrCodeCard } from '../components/loyalty/RestaurantQrCodeCard';
import { GuideSection } from '../components/common/GuideSection';
import { CheckInQrSection } from '../components/merchant/CheckInQrSection';
import {
  insertMenuItem,
  updateMenuItem,
  deleteMenuItem,
  updateRestaurantInSupabase,
  uploadRestaurantImage,
  fetchRewardsFromSupabase,
  insertRewardToSupabase,
  updateRewardInSupabase,
  fetchRestaurantMenuFromSupabase,
  fetchRestaurantPromotions,
  insertRestaurantPromotion,
  updateRestaurantPromotion,
  deleteRestaurantPromotion,
  updateRestaurantOperationalStatus,
  deleteRewardFromSupabase,
  markLoyaltyRedemptionUsed,
  isSupabaseConfigured,
} from '../lib/supabase';
import { UUID_REGEX } from '../utils/qrCode';

interface MerchantViewProps {
  restaurants?: Restaurant[];
  onUpdateRestaurant?: (restaurant: Restaurant) => void;
  onOpenFeedWithNewPost: () => void;
}

export const MerchantView: React.FC<MerchantViewProps> = ({
  restaurants: propRestaurants,
  onUpdateRestaurant,
  onOpenFeedWithNewPost,
}) => {
  const {
    user,
    isAdmin,
    isMerchant,
    merchantRestaurant,
    profile,
    updateOwnerProfile,
    refreshMerchantStore,
  } = useAuth();

  // Comerciante real autenticado gerencia exclusivamente a sua própria loja vinculada
  const isRealMerchant = Boolean(isMerchant && !isAdmin && merchantRestaurant);
  const allRestaurants = isRealMerchant && merchantRestaurant
    ? [merchantRestaurant]
    : (propRestaurants || loadRestaurants());

  const initialStoreId = isRealMerchant && merchantRestaurant
    ? merchantRestaurant.id
    : (allRestaurants[0]?.id || 'rest-jorge-jpa');

  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>(initialStoreId);

  const [stats, setStats] = useState<MerchantDemoStats>(() => loadMerchantStats(selectedRestaurantId));

  const currentRestaurant =
    allRestaurants.find((r) => r.id === selectedRestaurantId) || allRestaurants[0];

  const [isOpenToday, setIsOpenToday] = useState(currentRestaurant.isOpen);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() =>
    loadRestaurantMenu(selectedRestaurantId)
  );
  const [rewardsList, setRewardsList] = useState<LoyaltyReward[]>(() =>
    loadRestaurantRewards(selectedRestaurantId)
  );
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isPromotionFormOpen, setIsPromotionFormOpen] = useState(false);
  const [editingPromotionId, setEditingPromotionId] = useState<string | null>(null);
  const [promotionTitle, setPromotionTitle] = useState('');
  const [promotionDescription, setPromotionDescription] = useState('');
  const [promotionDiscountPrice, setPromotionDiscountPrice] = useState('');
  const [promotionRegularPrice, setPromotionRegularPrice] = useState('');
  const [promotionCouponCode, setPromotionCouponCode] = useState('');
  const [promotionValidUntil, setPromotionValidUntil] = useState('');
  const [promotionError, setPromotionError] = useState<string | null>(null);
  const [isSavingPromotion, setIsSavingPromotion] = useState(false);
  const [isUpdatingOpenStatus, setIsUpdatingOpenStatus] = useState(false);

  // Mensagens de feedback
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Orçamento Promocional de Fidelidade (3.000 pontos)
  const [promotionalBudget] = useState(3000);
  const [pointsDistributed, setPointsDistributed] = useState(
    stats.promotionalPointsDistributed
  );
  const [distributionFeedback, setDistributionFeedback] = useState<string | null>(null);

  // Destaque Regional (5 Estados) sincronizado
  const existingHighlights = loadRegionalHighlights();
  const activeHl = existingHighlights.find((h) => h.restaurantId === selectedRestaurantId);
  const [currentHighlightStatus, setCurrentHighlightStatus] = useState<HighlightStatus>(
    (activeHl?.status || stats.highlightStatus) as HighlightStatus
  );
  const [highlightHistory, setHighlightHistory] = useState(stats.highlightHistory);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('freguesia');

  // Quando o lojista troca de restaurante no seletor de testes
  const handleSelectStore = async (storeId: string) => {
    setSelectedRestaurantId(storeId);
    const store = allRestaurants.find((r) => r.id === storeId) || allRestaurants[0];
    if (!store) return;

    setMenuItems(loadRestaurantMenu(storeId));
    setPromotions([]);
    setIsOpenToday(store.isOpen);

    const storeRewards = loadRestaurantRewards(storeId);
    setRewardsList(storeRewards);

    const targetUuid =
      (store.supabaseId && UUID_REGEX.test(store.supabaseId) && store.supabaseId) ||
      (store.id && UUID_REGEX.test(store.id) && store.id) ||
      null;

    if (isSupabaseConfigured && targetUuid) {
      const [dbMenu, dbRewards, dbPromotions] = await Promise.all([
        fetchRestaurantMenuFromSupabase(store),
        fetchRewardsFromSupabase(targetUuid),
        fetchRestaurantPromotions(targetUuid, store.name),
      ]);
      if (dbMenu !== null) {
        setMenuItems(dbMenu);
        saveRestaurantMenu(storeId, dbMenu);
      }
      if (dbRewards !== null) {
        setRewardsList(dbRewards);
        saveRestaurantRewards(storeId, dbRewards);
      }
      setPromotions(dbPromotions ?? []);
    }

    const storeStats = loadMerchantStats(storeId);
    setStats(storeStats);
    setPointsDistributed(storeStats.promotionalPointsDistributed);

    const storeHl = existingHighlights.find((h) => h.restaurantId === storeId);
    setCurrentHighlightStatus((storeHl?.status || storeStats.highlightStatus) as HighlightStatus);
    setHighlightHistory(storeStats.highlightHistory);
  };

  // Carrega dados persistentes também para o painel administrativo e na primeira abertura.
  useEffect(() => {
    if (selectedRestaurantId) void handleSelectStore(selectedRestaurantId);
  }, [selectedRestaurantId]);

  // Garante que o comerciante permaneça sempre sincronizado com a sua própria loja
  useEffect(() => {
    if (isRealMerchant && merchantRestaurant) {
      handleSelectStore(merchantRestaurant.id);
    }
  }, [isRealMerchant, merchantRestaurant?.id]);

  const [selectedDuration, setSelectedDuration] = useState('2 Horas (Exemplo: R$ 10)');

  // -------------------------------------------------------------
  // ESTADOS DO MODAL: EDITAR MINHA LOJA
  // -------------------------------------------------------------
  const [isEditStoreModalOpen, setIsEditStoreModalOpen] = useState(false);
  const [storeFormName, setStoreFormName] = useState(currentRestaurant.name);
  const [storeFormOwner, setStoreFormOwner] = useState(
    profile?.full_name || currentRestaurant.ownerName || stats.ownerName
  );

  useEffect(() => {
    if (profile?.full_name) {
      setStoreFormOwner(profile.full_name);
    }
  }, [profile?.full_name]);
  const [storeFormBio, setStoreFormBio] = useState(currentRestaurant.bio);
  const [storeFormNeighborhoodId, setStoreFormNeighborhoodId] = useState(currentRestaurant.neighborhoodId);
  const [storeFormAddress, setStoreFormAddress] = useState(currentRestaurant.address);
  const [storeFormWhatsapp, setStoreFormWhatsapp] = useState(currentRestaurant.whatsappDemo);
  const [storeFormBannerUrl, setStoreFormBannerUrl] = useState(currentRestaurant.bannerUrl);
  const [storeFormLogoUrl, setStoreFormLogoUrl] = useState(currentRestaurant.logoUrl || '');
  const [isOptimizingBanner, setIsOptimizingBanner] = useState(false);
  const [isOptimizingLogo, setIsOptimizingLogo] = useState(false);
  const [bannerOptimizationInfo, setBannerOptimizationInfo] = useState<string | null>(null);
  const [logoOptimizationInfo, setLogoOptimizationInfo] = useState<string | null>(null);
  const [storeFormError, setStoreFormError] = useState<string | null>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // -------------------------------------------------------------
  // ESTADOS DO MODAL: GESTÃO DO CARDÁPIO (ADICIONAR / EDITAR)
  // -------------------------------------------------------------
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MenuItem | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodDescription, setProdDescription] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodOriginalPrice, setProdOriginalPrice] = useState('');
  const [prodCategory, setProdCategory] = useState('Hambúrgueres');
  const [prodBadge, setProdBadge] = useState('');
  const [prodPrepTime, setProdPrepTime] = useState('20');
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [isOptimizingProdImage, setIsOptimizingProdImage] = useState(false);
  const [prodOptimizationInfo, setProdOptimizationInfo] = useState<string | null>(null);
  const [prodFormError, setProdFormError] = useState<string | null>(null);
  const prodImageInputRef = useRef<HTMLInputElement>(null);

  // Confirmação de exclusão de produto
  const [deletingProduct, setDeletingProduct] = useState<MenuItem | null>(null);

  // -------------------------------------------------------------
  // ESTADOS DO MODAL: GESTÃO DE PRÊMIOS E FIDELIDADE (CRIAR / EDITAR)
  // -------------------------------------------------------------
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<LoyaltyReward | null>(null);
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardDescription, setRewardDescription] = useState('');
  const [rewardPointsCost, setRewardPointsCost] = useState('300');
  const [rewardStock, setRewardStock] = useState('20');
  const [rewardStatus, setRewardStatus] = useState<RewardStatus>('ativo');
  const [rewardMaxPerUser, setRewardMaxPerUser] = useState('1');
  const [rewardImageUrl, setRewardImageUrl] = useState('');
  const [isOptimizingRewardImage, setIsOptimizingRewardImage] = useState(false);
  const [rewardOptimizationInfo, setRewardOptimizationInfo] = useState<string | null>(null);
  const [rewardFormError, setRewardFormError] = useState<string | null>(null);
  const rewardImageInputRef = useRef<HTMLInputElement>(null);

  // Confirmação de exclusão de prêmio
  const [deletingReward, setDeletingReward] = useState<LoyaltyReward | null>(null);

  // -------------------------------------------------------------
  // VALIDAÇÃO REAL DE VOUCHERS DE CLIENTES NO BALCÃO (RPC mark_loyalty_redemption_used)
  // -------------------------------------------------------------
  const [voucherInput, setVoucherInput] = useState('');
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);
  const [voucherValidationResult, setVoucherValidationResult] = useState<{
    status: 'success' | 'error';
    message: string;
    rewardTitle?: string;
    customerName?: string;
    pointsCost?: number;
    usedAt?: string;
    voucherCode?: string;
  } | null>(null);

  const handleValidateVoucher = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = voucherInput.trim().toUpperCase();
    if (!cleanCode) return;

    setIsValidatingVoucher(true);
    setVoucherValidationResult(null);

    const res = await markLoyaltyRedemptionUsed(cleanCode);
    setIsValidatingVoucher(false);

    if (res.success && res.data) {
      setVoucherValidationResult({
        status: 'success',
        message: res.message,
        rewardTitle: res.data.reward_title,
        customerName: res.data.customer_name,
        pointsCost: res.data.points_cost,
        usedAt: res.data.used_at,
        voucherCode: res.data.voucher_code,
      });
      setVoucherInput('');
      showToast('Voucher validado com sucesso! Entregue o prêmio ao cliente.', 'success');
    } else {
      setVoucherValidationResult({
        status: 'error',
        message: res.message || 'Código de voucher inválido ou não pertencente a esta loja.',
      });
      showToast(res.message || 'Falha ao validar voucher.', 'error');
    }
  };

  const remainingBudget = Math.max(0, promotionalBudget - pointsDistributed);
  const budgetUsagePercent = Math.min(100, Math.round((pointsDistributed / promotionalBudget) * 100));

  // Abertura do Modal de Edição da Loja
  const handleOpenEditStore = () => {
    const activeOwner = profile?.full_name || currentRestaurant.ownerName || stats.ownerName;
    setStoreFormName(currentRestaurant.name);
    setStoreFormOwner(activeOwner);
    setStoreFormBio(currentRestaurant.bio);
    setStoreFormNeighborhoodId(currentRestaurant.neighborhoodId);
    setStoreFormAddress(currentRestaurant.address);
    setStoreFormWhatsapp(currentRestaurant.whatsappDemo);
    setStoreFormBannerUrl(currentRestaurant.bannerUrl);
    setStoreFormLogoUrl(currentRestaurant.logoUrl || '');
    setBannerOptimizationInfo(null);
    setLogoOptimizationInfo(null);
    setStoreFormError(null);
    setIsEditStoreModalOpen(true);
  };

  // Upload e Otimização do Banner no Supabase Storage
  const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsOptimizingBanner(true);
      setStoreFormError(null);
      const result = await optimizeImage(file, 1600, 0.8);
      setStoreFormBannerUrl(result.dataUrl);

      const restUuid = currentRestaurant.supabaseId || currentRestaurant.id;
      const { publicUrl, error: uploadErr } = await uploadRestaurantImage(restUuid, result.dataUrl, 'banner');
      if (uploadErr || !publicUrl) {
        const errorMsg = uploadErr?.message || 'Falha ao enviar capa para o Storage.';
        setStoreFormError(errorMsg);
        showToast(errorMsg, 'error');
        return;
      }

      setStoreFormBannerUrl(publicUrl);

      // Persiste imediatamente a URL da capa no Supabase (public.restaurants.image_url)
      const { data: updatedRest, error: dbErr } = await updateRestaurantInSupabase({
        id: restUuid,
        image_url: publicUrl,
      });

      if (dbErr || !updatedRest) {
        const errorMsg = dbErr?.message || 'Falha ao gravar a capa no banco de dados Supabase (nenhuma linha atualizada).';
        setStoreFormError(errorMsg);
        showToast(errorMsg, 'error');
        return;
      }

      const updatedRestaurant: Restaurant = {
        ...currentRestaurant,
        bannerUrl: publicUrl,
      };
      updateSingleRestaurant(updatedRestaurant);
      onUpdateRestaurant?.(updatedRestaurant);
      try {
        await refreshMerchantStore();
      } catch {
        // Ignora erro eventual de refresh
      }

      setBannerOptimizationInfo(
        `Capa salva no Storage e banco: ${formatBytes(result.originalSize)} → ${formatBytes(result.optimizedSize)} (${result.reductionPercentage}% menor)`
      );
      showToast('Capa atualizada e gravada com sucesso!');
    } catch (err: any) {
      setStoreFormError(err.message || 'Erro ao processar imagem de capa.');
      showToast(err.message || 'Erro ao processar imagem de capa.', 'error');
    } finally {
      setIsOptimizingBanner(false);
    }
  };

  // Upload e Otimização da Logo no Supabase Storage
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsOptimizingLogo(true);
      setStoreFormError(null);
      const result = await optimizeImage(file, 800, 0.8);
      setStoreFormLogoUrl(result.dataUrl);

      const restUuid = currentRestaurant.supabaseId || currentRestaurant.id;
      const { publicUrl, error: uploadErr } = await uploadRestaurantImage(restUuid, result.dataUrl, 'logo');
      if (uploadErr || !publicUrl) {
        const errorMsg = uploadErr?.message || 'Falha ao enviar logo para o Storage.';
        setStoreFormError(errorMsg);
        showToast(errorMsg, 'error');
        return;
      }

      setStoreFormLogoUrl(publicUrl);

      // Persiste imediatamente a URL do logo no Supabase (public.restaurants.logo_url)
      const { data: updatedRest, error: dbErr } = await updateRestaurantInSupabase({
        id: restUuid,
        logo_url: publicUrl,
      });

      if (dbErr || !updatedRest) {
        const errorMsg = dbErr?.message || 'Falha ao gravar o logo no banco de dados Supabase (nenhuma linha atualizada).';
        setStoreFormError(errorMsg);
        showToast(errorMsg, 'error');
        return;
      }

      const updatedRestaurant: Restaurant = {
        ...currentRestaurant,
        logoUrl: publicUrl,
      };
      updateSingleRestaurant(updatedRestaurant);
      onUpdateRestaurant?.(updatedRestaurant);
      try {
        await refreshMerchantStore();
      } catch {
        // Ignora erro eventual de refresh
      }

      setLogoOptimizationInfo(
        `Logo salva no Storage e banco: ${formatBytes(result.originalSize)} → ${formatBytes(result.optimizedSize)} (${result.reductionPercentage}% menor)`
      );
      showToast('Logo atualizado e gravado com sucesso!');
    } catch (err: any) {
      setStoreFormError(err.message || 'Erro ao processar logo da loja.');
      showToast(err.message || 'Erro ao processar logo da loja.', 'error');
    } finally {
      setIsOptimizingLogo(false);
    }
  };

  // Salvar Edição da Loja com persistência no Supabase e Storage
  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!storeFormName.trim()) {
      setStoreFormError('O nome do estabelecimento é obrigatório.');
      return;
    }
    if (!storeFormOwner.trim()) {
      setStoreFormError('O nome do responsável é obrigatório.');
      return;
    }
    if (!storeFormAddress.trim()) {
      setStoreFormError('O endereço ou ponto de referência comercial é obrigatório.');
      return;
    }
    if (!storeFormWhatsapp.trim() || storeFormWhatsapp.replace(/\D/g, '').length < 10) {
      setStoreFormError('Informe um número de WhatsApp comercial válido com DDD (mínimo 10 dígitos).');
      return;
    }

    const restUuid = currentRestaurant.supabaseId || currentRestaurant.id;
    let persistentBannerUrl = storeFormBannerUrl;
    let persistentLogoUrl = storeFormLogoUrl.trim();

    // Se ainda estiver em base64 (DataURL), realiza o upload para o Supabase Storage
    if (persistentBannerUrl.startsWith('data:')) {
      const { publicUrl, error: uploadErr } = await uploadRestaurantImage(restUuid, persistentBannerUrl, 'banner');
      if (uploadErr || !publicUrl) {
        const errorMsg = uploadErr?.message || 'Falha ao enviar capa para o Storage.';
        setStoreFormError(errorMsg);
        showToast(errorMsg, 'error');
        return;
      }
      persistentBannerUrl = publicUrl;
      setStoreFormBannerUrl(publicUrl);
    }

    if (persistentLogoUrl.startsWith('data:')) {
      const { publicUrl, error: uploadErr } = await uploadRestaurantImage(restUuid, persistentLogoUrl, 'logo');
      if (uploadErr || !publicUrl) {
        const errorMsg = uploadErr?.message || 'Falha ao enviar logo para o Storage.';
        setStoreFormError(errorMsg);
        showToast(errorMsg, 'error');
        return;
      }
      persistentLogoUrl = publicUrl;
      setStoreFormLogoUrl(publicUrl);
    }

    const nbObj = NEIGHBORHOODS.find((n) => n.id === storeFormNeighborhoodId) || NEIGHBORHOODS[1] || NEIGHBORHOODS[0];
    const trimmedOwnerName = storeFormOwner.trim();

    // 1. Persistência do nome do proprietário no Supabase (public.profiles)
    if (updateOwnerProfile && trimmedOwnerName) {
      const { error: profileSaveError } = await updateOwnerProfile(trimmedOwnerName);
      if (profileSaveError) {
        console.warn('Aviso ao persistir nome no perfil do Supabase:', profileSaveError);
      }
    }

    // 2. Persistência dos dados da loja no Supabase (public.restaurants)
    if (restUuid) {
      const { data: updatedRest, error: restUpdateErr } = await updateRestaurantInSupabase({
        id: restUuid,
        name: storeFormName.trim(),
        description: storeFormBio.trim(),
        address: storeFormAddress.trim(),
        whatsapp: storeFormWhatsapp.trim(),
        neighborhood: nbObj.name,
        image_url: persistentBannerUrl,
        logo_url: persistentLogoUrl || undefined,
      });
      if (restUpdateErr || !updatedRest) {
        const errorMsg = restUpdateErr?.message || 'Falha ao salvar dados da loja no Supabase (nenhuma linha atualizada).';
        setStoreFormError(errorMsg);
        showToast(errorMsg, 'error');
        return;
      }
    }

    const updatedRestaurant: Restaurant = {
      ...currentRestaurant,
      name: storeFormName.trim(),
      ownerName: trimmedOwnerName,
      bio: storeFormBio.trim(),
      neighborhoodId: storeFormNeighborhoodId,
      neighborhoodName: nbObj.name,
      address: storeFormAddress.trim(),
      whatsappDemo: storeFormWhatsapp.trim(),
      bannerUrl: persistentBannerUrl,
      logoUrl: persistentLogoUrl || undefined,
    };

    updateSingleRestaurant(updatedRestaurant);
    onUpdateRestaurant?.(updatedRestaurant);
    try {
      await refreshMerchantStore();
    } catch {
      // Ignora erro eventual de refresh
    }

    const updatedStats: MerchantDemoStats = {
      ...stats,
      restaurantName: updatedRestaurant.name,
      ownerName: trimmedOwnerName,
      neighborhood: updatedRestaurant.neighborhoodName,
    };
    setStats(updatedStats);
    saveMerchantStats(updatedStats);

    setIsEditStoreModalOpen(false);
    showToast(`Loja "${updatedRestaurant.name}" e responsável salvos com sucesso!`);
  };

  // Abertura do Modal de Adicionar Produto
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProdName('');
    setProdDescription('');
    setProdPrice('');
    setProdOriginalPrice('');
    setProdCategory('Hambúrgueres');
    setProdBadge('');
    setProdPrepTime('20');
    setProdImageUrl(currentRestaurant.bannerUrl);
    setProdOptimizationInfo(null);
    setProdFormError(null);
    setIsProductModalOpen(true);
  };

  // Abertura do Modal de Edição de Produto Existente
  const handleOpenEditProduct = (item: MenuItem) => {
    setEditingProduct(item);
    setProdName(item.name);
    setProdDescription(item.description);
    setProdPrice(item.price.toString());
    setProdOriginalPrice(item.originalPrice ? item.originalPrice.toString() : '');
    setProdCategory(item.category);
    setProdBadge(item.badge || '');
    setProdPrepTime(item.prepTimeMinutes ? item.prepTimeMinutes.toString() : '20');
    setProdImageUrl(item.imageUrl);
    setProdOptimizationInfo(null);
    setProdFormError(null);
    setIsProductModalOpen(true);
  };

  // Upload e Otimização da Foto do Produto
  const handleProdImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsOptimizingProdImage(true);
      setProdFormError(null);
      const result = await optimizeImage(file, 1200, 0.8);
      setProdImageUrl(result.dataUrl);
      setProdOptimizationInfo(
        `Foto do prato otimizada: ${formatBytes(result.originalSize)} → ${formatBytes(result.optimizedSize)} (${result.reductionPercentage}% menor, ${result.format.toUpperCase()})`
      );
    } catch (err: any) {
      setProdFormError(err.message || 'Erro ao processar foto do produto.');
    } finally {
      setIsOptimizingProdImage(false);
    }
  };

  // Salvar Produto (Criar ou Editar)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!prodName.trim()) {
      setProdFormError('O nome do produto é obrigatório.');
      return;
    }
    const parsedPrice = parseFloat(prodPrice.replace(',', '.'));
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setProdFormError('Informe um preço válido maior que zero (Ex: 24,90).');
      return;
    }

    const parsedOrig = prodOriginalPrice ? parseFloat(prodOriginalPrice.replace(',', '.')) : undefined;

    if (editingProduct) {
      const updatedItem: MenuItem = {
        ...editingProduct,
        name: prodName.trim(),
        description: prodDescription.trim(),
        price: parsedPrice,
        originalPrice: parsedOrig && parsedOrig > parsedPrice ? parsedOrig : undefined,
        category: prodCategory,
        badge: prodBadge.trim() || undefined,
        prepTimeMinutes: parseInt(prodPrepTime) || 20,
        isAvailable: editingProduct.isAvailable ?? true,
        imageUrl: prodImageUrl || editingProduct.imageUrl,
      };

      const { data, error } = await updateMenuItem(updatedItem);
      if (error || !data) {
        setProdFormError('Erro ao atualizar produto: ' + (error?.message || 'Falha ao atualizar'));
        return;
      }
      
      const updatedList = menuItems.map((item) => (item.id === editingProduct.id ? data : item));
      setMenuItems(updatedList);
      saveRestaurantMenu(selectedRestaurantId, updatedList);
      if (currentRestaurant.supabaseId && currentRestaurant.supabaseId !== selectedRestaurantId) {
        saveRestaurantMenu(currentRestaurant.supabaseId, updatedList);
      }
      showToast(`Produto "${prodName.trim()}" atualizado no cardápio!`);
    } else {
      const newItem = {
        restaurantId: currentRestaurant.supabaseId || selectedRestaurantId,
        name: prodName.trim(),
        description: prodDescription.trim(),
        price: parsedPrice,
        originalPrice: parsedOrig && parsedOrig > parsedPrice ? parsedOrig : undefined,
        category: prodCategory,
        badge: prodBadge.trim() || undefined,
        prepTimeMinutes: parseInt(prodPrepTime) || 20,
        isAvailable: true,
        imageUrl: prodImageUrl || currentRestaurant.bannerUrl,
      };

      const { data, error } = await insertMenuItem(newItem);
      if (error || !data) {
        setProdFormError('Erro ao adicionar produto: ' + (error?.message || 'Falha ao adicionar'));
        return;
      }
      
      const updatedList = [data, ...menuItems];
      setMenuItems(updatedList);
      saveRestaurantMenu(selectedRestaurantId, updatedList);
      if (currentRestaurant.supabaseId && currentRestaurant.supabaseId !== selectedRestaurantId) {
        saveRestaurantMenu(currentRestaurant.supabaseId, updatedList);
      }
      showToast(`Novo produto "${prodName.trim()}" adicionado com sucesso!`);
    }

    setIsProductModalOpen(false);
  };

  // Excluir Produto do Cardápio
  const handleConfirmDeleteProduct = async () => {
    if (!deletingProduct) return;
    
    const { error } = await deleteMenuItem(deletingProduct.supabaseId || deletingProduct.id);
    if (error) {
      showToast('Erro ao excluir produto: ' + error.message, 'error');
      setDeletingProduct(null);
      return;
    }
    
    const remaining = menuItems.filter((i) => i.id !== deletingProduct.id);
    setMenuItems(remaining);
    saveRestaurantMenu(selectedRestaurantId, remaining);
    if (currentRestaurant.supabaseId && currentRestaurant.supabaseId !== selectedRestaurantId) {
      saveRestaurantMenu(currentRestaurant.supabaseId, remaining);
    }
    showToast(`Item "${deletingProduct.name}" excluído do cardápio.`);
    setDeletingProduct(null);
  };

  // Toggle Rápido de Disponibilidade na Chapa
  const toggleItemAvailability = async (id: string) => {
    const itemToToggle = menuItems.find(i => i.id === id);
    if (!itemToToggle) return;

    const updatedItem = { ...itemToToggle, isAvailable: !itemToToggle.isAvailable };
    
    const { data, error } = await updateMenuItem(updatedItem);
    if (error || !data) {
      showToast('Erro ao atualizar disponibilidade: ' + (error?.message || 'Falha ao atualizar'), 'error');
      return;
    }
    
    const updated = menuItems.map((item) =>
      item.id === id ? data : item
    );
    setMenuItems(updated);
    saveRestaurantMenu(selectedRestaurantId, updated);
    if (currentRestaurant.supabaseId && currentRestaurant.supabaseId !== selectedRestaurantId) {
      saveRestaurantMenu(currentRestaurant.supabaseId, updated);
    }
    showToast(`"${data.name}" ${data.isAvailable ? 'ativado para pedidos' : 'pausado na chapa'}.`);
  };

  // -------------------------------------------------------------
  // HANDLERS: GESTÃO DE PRÊMIOS E FIDELIDADE
  // -------------------------------------------------------------

  const resetPromotionForm = () => {
    setEditingPromotionId(null);
    setPromotionTitle('');
    setPromotionDescription('');
    setPromotionDiscountPrice('');
    setPromotionRegularPrice('');
    setPromotionCouponCode('');
    setPromotionValidUntil('');
    setPromotionError(null);
  };

  const openPromotionEditor = (promotion?: Promotion) => {
    if (!promotion) {
      resetPromotionForm();
    } else {
      setEditingPromotionId(promotion.id);
      setPromotionTitle(promotion.title);
      setPromotionDescription(promotion.description);
      setPromotionDiscountPrice(String(promotion.discountPrice));
      setPromotionRegularPrice(String(promotion.regularPrice));
      setPromotionCouponCode(promotion.couponCode || '');
      setPromotionValidUntil(promotion.validUntil ? new Date(promotion.validUntil).toISOString().slice(0, 10) : '');
      setPromotionError(null);
    }
    setIsPromotionFormOpen(true);
  };

  const handleSavePromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    const discountPrice = Number(promotionDiscountPrice.replace(',', '.'));
    const regularPrice = Number(promotionRegularPrice.replace(',', '.'));
    if (!promotionTitle.trim()) return setPromotionError('Informe o título da promoção.');
    if (!Number.isFinite(discountPrice) || discountPrice < 0) return setPromotionError('Informe um preço promocional válido.');
    if (!Number.isFinite(regularPrice) || regularPrice <= discountPrice) return setPromotionError('O preço original deve ser maior que o preço promocional.');
    if (!isSupabaseConfigured) return setPromotionError('Conecte o Supabase para salvar promoções de forma persistente.');
    setIsSavingPromotion(true);
    setPromotionError(null);
    const validUntil = promotionValidUntil ? new Date(`${promotionValidUntil}T23:59:59`).toISOString() : '';
    const changes = {
      title: promotionTitle.trim(),
      description: promotionDescription.trim(),
      badge: 'Oferta',
      discountPrice,
      regularPrice,
      couponCode: promotionCouponCode.trim(),
      validUntil,
      imageUrl: '',
    };
    if (editingPromotionId) {
      const result = await updateRestaurantPromotion(editingPromotionId, changes);
      if (result.error || !result.data) {
        setPromotionError(result.error?.message || 'Não foi possível atualizar a promoção.');
        setIsSavingPromotion(false);
        return;
      }
      setPromotions((current) => current.map((item) => item.id === editingPromotionId ? { ...result.data!, restaurantName: currentRestaurant.name } : item));
      showToast('Promoção atualizada com sucesso!');
    } else {
      const result = await insertRestaurantPromotion({ ...changes, restaurantId: currentRestaurant.supabaseId || currentRestaurant.id });
      if (result.error || !result.data) {
        setPromotionError(result.error?.message || 'Não foi possível cadastrar a promoção.');
        setIsSavingPromotion(false);
        return;
      }
      setPromotions((current) => [{ ...result.data!, restaurantName: currentRestaurant.name }, ...current]);
      showToast('Promoção cadastrada com sucesso!');
    }
    setIsSavingPromotion(false);
    setIsPromotionFormOpen(false);
    resetPromotionForm();
  };

  const togglePromotionStatus = async (promotion: Promotion) => {
    const result = await updateRestaurantPromotion(promotion.id, { isActive: promotion.isActive === false });
    if (result.error || !result.data) {
      showToast(result.error?.message || 'Não foi possível alterar a promoção.', 'error');
      return;
    }
    setPromotions((current) => current.map((item) => item.id === promotion.id ? { ...item, isActive: result.data!.isActive } : item));
    showToast(promotion.isActive === false ? 'Promoção ativada.' : 'Promoção pausada.');
  };

  const handleDeletePromotion = async (promotion: Promotion) => {
    const result = await deleteRestaurantPromotion(promotion.id);
    if (result.error) {
      showToast(result.error.message, 'error');
      return;
    }
    setPromotions((current) => current.filter((item) => item.id !== promotion.id));
    showToast('Promoção excluída.');
  };

  const handleOpenAddReward = () => {
    setEditingReward(null);
    setRewardTitle('');
    setRewardDescription('');
    setRewardPointsCost('300');
    setRewardStock('20');
    setRewardStatus('ativo');
    setRewardMaxPerUser('1');
    setRewardImageUrl('');
    setRewardOptimizationInfo(null);
    setRewardFormError(null);
    setIsRewardModalOpen(true);
  };

  const handleOpenEditReward = (reward: LoyaltyReward) => {
    setEditingReward(reward);
    setRewardTitle(reward.title);
    setRewardDescription(reward.description);
    setRewardPointsCost(reward.pointsCost.toString());
    setRewardStock(reward.stock.toString());
    setRewardStatus(reward.status);
    setRewardMaxPerUser(reward.maxRedemptionsPerUser ? reward.maxRedemptionsPerUser.toString() : '1');
    setRewardImageUrl(reward.imageUrl || '');
    setRewardOptimizationInfo(null);
    setRewardFormError(null);
    setIsRewardModalOpen(true);
  };

  const handleRewardImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsOptimizingRewardImage(true);
      setRewardFormError(null);
      const result = await optimizeImage(file, 1200, 0.8);
      setRewardImageUrl(result.dataUrl);
      setRewardOptimizationInfo(
        `Foto do prêmio otimizada: ${formatBytes(result.originalSize)} → ${formatBytes(result.optimizedSize)} (${result.reductionPercentage}% menor, ${result.format.toUpperCase()})`
      );
    } catch (err: any) {
      setRewardFormError(err.message || 'Erro ao processar foto do prêmio.');
    } finally {
      setIsOptimizingRewardImage(false);
    }
  };

  const handleSaveReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardTitle.trim()) {
      setRewardFormError('O nome do prêmio é obrigatório.');
      return;
    }
    if (!rewardDescription.trim()) {
      setRewardFormError('A descrição do prêmio é obrigatória.');
      return;
    }
    const points = parseInt(rewardPointsCost);
    if (isNaN(points) || points <= 0) {
      setRewardFormError('A quantidade de pontos deve ser maior que zero (Ex: 250).');
      return;
    }
    const stock = parseInt(rewardStock);
    if (isNaN(stock) || stock < 0) {
      setRewardFormError('A quantidade em estoque deve ser um número inteiro não negativo (>= 0).');
      return;
    }

    const finalStatus: RewardStatus = stock === 0 ? 'esgotado' : rewardStatus;
    const isAvail = finalStatus === 'ativo' && stock > 0;
    const maxGlobal = Math.round(points * 0.3);
    const minStore = points - maxGlobal;
    const maxPerUser = parseInt(rewardMaxPerUser) || 1;

    let persistentRewardImg = rewardImageUrl || '';

    const targetRestUuid =
      (currentRestaurant.supabaseId && UUID_REGEX.test(currentRestaurant.supabaseId) && currentRestaurant.supabaseId) ||
      (selectedRestaurantId && UUID_REGEX.test(selectedRestaurantId) && selectedRestaurantId) ||
      null;

    if (targetRestUuid && persistentRewardImg.startsWith('data:')) {
      const { publicUrl } = await uploadRestaurantImage(targetRestUuid, persistentRewardImg, 'reward');
      if (publicUrl) {
        persistentRewardImg = publicUrl;
      }
    }

    let updatedList: LoyaltyReward[];
    if (editingReward) {
      if (isSupabaseConfigured && UUID_REGEX.test(editingReward.id)) {
        await updateRewardInSupabase({
          id: editingReward.id,
          title: rewardTitle.trim(),
          description: rewardDescription.trim(),
          points_cost: points,
          stock,
          status: finalStatus,
          is_available: isAvail,
          max_global_points_allowed: maxGlobal,
          min_store_points_required: minStore,
          max_redemptions_per_user: maxPerUser,
          image_url: persistentRewardImg,
        });
      }

      updatedList = rewardsList.map((r) =>
        r.id === editingReward.id
          ? {
              ...r,
              title: rewardTitle.trim(),
              description: rewardDescription.trim(),
              pointsCost: points,
              stock,
              status: finalStatus,
              isAvailable: isAvail,
              maxGlobalPointsAllowed: maxGlobal,
              minStorePointsRequired: minStore,
              maxRedemptionsPerUser: maxPerUser,
              imageUrl: persistentRewardImg,
            }
          : r
      );
      showToast(`Prêmio "${rewardTitle.trim()}" atualizado com sucesso!`);
    } else {
      let createdId = `rew-${Date.now()}`;
      if (isSupabaseConfigured && targetRestUuid) {
        const { data: dbReward } = await insertRewardToSupabase({
          restaurant_id: targetRestUuid,
          title: rewardTitle.trim(),
          description: rewardDescription.trim(),
          points_cost: points,
          stock,
          status: finalStatus,
          is_available: isAvail,
          max_global_points_allowed: maxGlobal,
          min_store_points_required: minStore,
          max_redemptions_per_user: maxPerUser,
          image_url: persistentRewardImg,
        });
        if (dbReward?.id) {
          createdId = dbReward.id;
        }
      }

      const newReward: LoyaltyReward = {
        id: createdId,
        restaurantId: selectedRestaurantId,
        restaurantName: currentRestaurant.name,
        title: rewardTitle.trim(),
        description: rewardDescription.trim(),
        pointsCost: points,
        stock,
        status: finalStatus,
        isAvailable: isAvail,
        maxGlobalPointsAllowed: maxGlobal,
        minStorePointsRequired: minStore,
        maxRedemptionsPerUser: maxPerUser,
        imageUrl: persistentRewardImg,
      };
      updatedList = [newReward, ...rewardsList];
      showToast(`Novo prêmio "${rewardTitle.trim()}" cadastrado com sucesso!`);
    }

    setRewardsList(updatedList);
    saveRestaurantRewards(selectedRestaurantId, updatedList);
    setIsRewardModalOpen(false);
  };

  const toggleRewardStatus = async (rewardId: string) => {
    const target = rewardsList.find((r) => r.id === rewardId);
    if (!target) return;

    if (target.stock <= 0) {
      showToast(`O prêmio "${target.title}" está com estoque zerado e permanece esgotado.`);
      return;
    }

    const nextStatus: RewardStatus = target.status === 'ativo' ? 'pausado' : 'ativo';
    const nextAvail = nextStatus === 'ativo';

    if (isSupabaseConfigured && UUID_REGEX.test(rewardId)) {
      await updateRewardInSupabase({
        id: rewardId,
        status: nextStatus,
        is_available: nextAvail,
      });
    }

    const updated = rewardsList.map((r) => {
      if (r.id === rewardId) {
        return {
          ...r,
          status: nextStatus,
          isAvailable: nextAvail,
        };
      }
      return r;
    });
    setRewardsList(updated);
    saveRestaurantRewards(selectedRestaurantId, updated);
    showToast(
      `Prêmio "${target.title}" ${nextStatus === 'ativo' ? 'ativado para resgates' : 'pausado temporariamente'}.`
    );
  };

  const handleConfirmDeleteReward = async () => {
    if (!deletingReward) return;

    if (isSupabaseConfigured && UUID_REGEX.test(deletingReward.id)) {
      const { error } = await deleteRewardFromSupabase(deletingReward.id);
      if (error) {
        showToast(`Não foi possível excluir o prêmio: ${error.message}`, 'error');
        return;
      }
    }

    const remaining = rewardsList.filter((r) => r.id !== deletingReward.id);
    setRewardsList(remaining);
    saveRestaurantRewards(selectedRestaurantId, remaining);
    showToast(`Prêmio "${deletingReward.title}" excluído do programa de fidelidade.`);
    setDeletingReward(null);
  };

  // Solicitação de Destaque Regional no Bairro
  const handleRequestHighlight = (e: React.FormEvent) => {
    e.preventDefault();
    const nbObj = NEIGHBORHOODS.find((n) => n.id === selectedNeighborhood) || NEIGHBORHOODS[1] || NEIGHBORHOODS[0];

    setCurrentHighlightStatus('solicitado');
    const newEntry = {
      id: `hh-${Date.now()}`,
      neighborhoodName: nbObj.name,
      duration: selectedDuration,
      status: 'solicitado' as HighlightStatus,
      date: 'Hoje, acabou de solicitar',
    };

    setHighlightHistory((prev) => [newEntry, ...prev]);

    // Salvar destaque na lista global para que apareça imediatamente no Painel Admin
    const currentList = loadRegionalHighlights();
    const newRegionalHighlight: RegionalHighlight = {
      id: `hl-req-${Date.now()}`,
      restaurantId: selectedRestaurantId,
      restaurantName: currentRestaurant.name,
      neighborhoodId: nbObj.id,
      neighborhoodName: nbObj.name,
      requestedDuration: selectedDuration,
      status: 'solicitado',
      requestedAt: 'Agora mesmo',
      isSponsored: true,
      estimatedPriceExample: 'R$ 10 (Gratuito no Lançamento)',
      launchPhaseFree: true,
    };
    saveRegionalHighlights([newRegionalHighlight, ...currentList]);

    setIsRequestModalOpen(false);
    showToast('Solicitação de destaque enviada para moderação administrativa!');
  };

  const getStatusBadge = (status: HighlightStatus | string) => {
    switch (status) {
      case 'solicitado':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Solicitado (Moderação)
          </span>
        );
      case 'aprovado':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Aprovado pela Equipe
          </span>
        );
      case 'agendado':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Agendado
          </span>
        );
      case 'ativo':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            Ativo no Topo (Patrocinado)
          </span>
        );
      case 'encerrado':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
            Encerrado
          </span>
        );
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16 animate-fade-in">
      {/* Toast de Feedback */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-xl animate-fade-in ${
            toastMessage.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="p-1 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Banner de Identificação da Loja (Comerciante Real vs Supervisão Admin/Demonstração) */}
      {isRealMerchant ? (
        <div className="p-4 rounded-3xl bg-slate-900/95 border border-emerald-500/30 text-xs shadow-lg flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-slate-200">
            <span className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 shrink-0">
              <Store className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-xs sm:text-sm">Painel do Comerciante</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                  Loja Oficial Vinculada
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Você está gerenciando exclusivamente <strong>{currentRestaurant.name}</strong> ({currentRestaurant.neighborhoodName})
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-3xl bg-slate-900/95 border border-amber-500/30 space-y-2.5 text-xs shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-slate-200">
              <span className="p-2 rounded-xl bg-amber-500/15 text-amber-400 shrink-0">
                <Store className="w-4 h-4" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-xs sm:text-sm">
                    {isAdmin ? 'Supervisão Administrativa de Lojas' : 'Área do Lojista Parceiro'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/30">
                    {isAdmin ? 'Modo Admin' : 'Ferramenta de Teste'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {isAdmin
                    ? 'Inspecione e gerencie qualquer estabelecimento da plataforma'
                    : 'Alternador de estabelecimentos ativo para testes das 4 lojas'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              <span className="text-[11px] text-slate-400 hidden sm:inline">Loja em gestão:</span>
              <select
                value={selectedRestaurantId}
                onChange={(e) => handleSelectStore(e.target.value)}
                className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium focus:outline-none focus:border-orange-500 text-xs"
              >
                {allRestaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} — {r.neighborhoodName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!isAdmin && (
            <div className="p-3 rounded-2xl bg-black/40 border border-slate-800 text-[11px] text-slate-400 leading-relaxed flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-300">Modo Demonstrativo:</strong> Em produção, o comerciante possui acesso restrito estritamente ao identificador da sua própria loja.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Merchant Header Card com Banner & Botão "Editar Minha Loja" */}
      <div className="rounded-3xl bg-[#131520] border border-slate-800 shadow-xl overflow-hidden">
        {/* Banner Preview */}
        <div className="relative h-28 sm:h-36 w-full bg-slate-900">
          <img
            src={currentRestaurant.bannerUrl}
            alt={currentRestaurant.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#131520] via-black/40 to-transparent" />

          {/* Botão de Edição Rápida da Loja no Banner */}
          <button
            onClick={handleOpenEditStore}
            className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-black/75 hover:bg-black/90 backdrop-blur-md border border-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
          >
            <Pencil className="w-3.5 h-3.5 text-orange-400" />
            Editar minha loja
          </button>
        </div>

        <div className="p-5 pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 border-2 border-amber-500/40 overflow-hidden shrink-0 -mt-7 shadow-lg flex items-center justify-center">
              {currentRestaurant.logoUrl ? (
                <img
                  src={currentRestaurant.logoUrl}
                  alt={currentRestaurant.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Store className="w-7 h-7 text-amber-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white font-display">
                  {currentRestaurant.name}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  Lojista Parceiro
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Responsável: <strong className="text-slate-300">{profile?.full_name || currentRestaurant.ownerName || stats.ownerName}</strong> · Bairro {currentRestaurant.neighborhoodName}
              </p>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Phone className="w-3 h-3 text-emerald-400" />
                WhatsApp: <span className="text-slate-300">{currentRestaurant.whatsappDemo}</span>
                <span>·</span>
                <MapPin className="w-3 h-3 text-orange-400" />
                <span className="truncate max-w-[200px]">{currentRestaurant.address}</span>
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
              disabled={isUpdatingOpenStatus}
              onClick={async () => {
                const nextState = !isOpenToday;
                setIsUpdatingOpenStatus(true);
                const result = await updateRestaurantOperationalStatus(currentRestaurant.supabaseId || currentRestaurant.id, nextState);
                setIsUpdatingOpenStatus(false);
                if (!result.success) {
                  showToast(result.error?.message || 'Não foi possível atualizar o status do balcão.', 'error');
                  return;
                }
                setIsOpenToday(nextState);
                const updated = { ...currentRestaurant, isOpen: nextState };
                updateSingleRestaurant(updated);
                onUpdateRestaurant?.(updated);
                showToast(`Balcão da loja ${nextState ? 'aberto' : 'fechado'}.`);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 ${
                isOpenToday
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              {isUpdatingOpenStatus ? 'Salvando...' : isOpenToday ? 'Aberto' : 'Pausar'}
            </button>
          </div>
        </div>
      </div>

      {/* Analytics KPI strip com transparência */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-slate-400 font-semibold">Desempenho Comercial</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            Estimativas Demonstrativas
          </span>
        </div>

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
              {menuItems[0]?.name || stats.topDishName}
            </span>
            <span className="text-[10px] text-orange-400 font-semibold block mt-0.5">
              {stats.topDishOrders} pedidos no mês
            </span>
          </div>
        </div>
      </div>

      {/* Guia do Comerciante */}
      <GuideSection
        title="Guia de Gestão da Sua Loja"
        steps={[
          "Mantenha o cardápio atualizado com fotos reais e preços em dia.",
          "Check-in no balcão: cada check-in concede 5 pontos locais ao cliente (intervalo mínimo de 2 horas).",
          "Recompensas com Regra 70/30: exige no mínimo 70% de pontos da sua loja e até 30% globais da rede.",
          "Validação obrigatória de vouchers: valide o código no painel antes de entregar a cortesia ao cliente."
        ]}
      />

      <CheckInQrSection restaurant={currentRestaurant} />

      {/* ============================================================ */}
      {/* SEÇÃO PRINCIPAL: GERENCIAR CARDÁPIO & PRODUTOS DA LOJA       */}
      {/* ============================================================ */}
      <div className="rounded-3xl bg-[#13151f] border border-slate-800 p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-orange-500/20 text-orange-400">
                <Flame className="w-5 h-5" />
              </span>
              <h3 className="text-base font-bold text-white font-display">
                Gerenciar Cardápio — {currentRestaurant.name}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Adicione produtos, altere preços, fotos e controle a disponibilidade na chapa ({menuItems.length} itens)
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleOpenAddProduct}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-orange-500/20"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Adicionar produto
            </button>

            <button
              onClick={onOpenFeedWithNewPost}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Postar especial
            </button>
          </div>
        </div>

        {/* Lista de Produtos do Cardápio com CRUD */}
        {menuItems.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
            Nenhum produto cadastrado no cardápio desta loja.
            <button
              onClick={handleOpenAddProduct}
              className="block mx-auto mt-2 text-orange-400 font-semibold underline"
            >
              Clique para adicionar o primeiro produto
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {menuItems.map((item) => (
              <div
                key={item.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shrink-0">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className={`font-bold text-sm ${item.isAvailable ? 'text-white' : 'text-slate-500 line-through'}`}>
                        {item.name}
                      </h4>
                      {item.badge && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1 max-w-sm mt-0.5">
                      {item.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-bold text-amber-400 text-xs tabular-nums">
                        R$ {item.price.toFixed(2).replace('.', ',')}
                      </span>
                      {item.originalPrice && (
                        <span className="text-[10px] text-slate-500 line-through tabular-nums">
                          R$ {item.originalPrice.toFixed(2).replace('.', ',')}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500">· {item.category}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  {/* Toggle Rápido de Chapa */}
                  <button
                    onClick={() => toggleItemAvailability(item.id)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                      item.isAvailable
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                    }`}
                    title={item.isAvailable ? 'Disponível na chapa' : 'Pausado na chapa'}
                  >
                    {item.isAvailable ? (
                      <>
                        <ToggleRight className="w-3.5 h-3.5" />
                        Disponível
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-3.5 h-3.5" />
                        Pausado
                      </>
                    )}
                  </button>

                  {/* Editar Produto */}
                  <button
                    onClick={() => handleOpenEditProduct(item)}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                    title="Editar produto"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  {/* Excluir Produto */}
                  <button
                    onClick={() => setDeletingProduct(item)}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 transition-colors"
                    title="Excluir produto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>



      {/* ============================================================ */}
      {/* SEÇÃO: PROMOÇÕES PERSISTENTES DA LOJA                        */}
      {/* ============================================================ */}
      <div className="rounded-3xl bg-[#13151f] border border-orange-500/25 p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-orange-500/20 text-orange-400"><Tag className="w-5 h-5" /></span>
              <h3 className="text-base font-bold text-white font-display">Promoções da Loja</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">Ofertas desta loja, com preço promocional, validade e cupom. ({promotions.length})</p>
          </div>
          <button onClick={() => openPromotionEditor()} className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-black font-bold text-xs flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Nova promoção
          </button>
        </div>

        {isPromotionFormOpen && (
          <form onSubmit={handleSavePromotion} className="rounded-2xl bg-slate-900 border border-slate-700 p-4 space-y-3">
            <h4 className="text-sm font-bold text-white">{editingPromotionId ? 'Editar promoção' : 'Cadastrar promoção'}</h4>
            <input value={promotionTitle} onChange={(e) => setPromotionTitle(e.target.value)} placeholder="Nome da oferta ou combo" className="w-full rounded-xl bg-[#13151f] border border-slate-700 px-3 py-2.5 text-sm text-white" required />
            <textarea value={promotionDescription} onChange={(e) => setPromotionDescription(e.target.value)} placeholder="Descreva o que está incluído na oferta" className="w-full rounded-xl bg-[#13151f] border border-slate-700 px-3 py-2.5 text-sm text-white" rows={2} />
            <div className="grid grid-cols-2 gap-3">
              <input value={promotionDiscountPrice} onChange={(e) => setPromotionDiscountPrice(e.target.value)} placeholder="Preço promocional (R$)" inputMode="decimal" className="w-full rounded-xl bg-[#13151f] border border-slate-700 px-3 py-2.5 text-sm text-white" required />
              <input value={promotionRegularPrice} onChange={(e) => setPromotionRegularPrice(e.target.value)} placeholder="Preço original (R$)" inputMode="decimal" className="w-full rounded-xl bg-[#13151f] border border-slate-700 px-3 py-2.5 text-sm text-white" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input value={promotionCouponCode} onChange={(e) => setPromotionCouponCode(e.target.value)} placeholder="Cupom (opcional)" className="w-full rounded-xl bg-[#13151f] border border-slate-700 px-3 py-2.5 text-sm text-white" />
              <input type="date" value={promotionValidUntil} onChange={(e) => setPromotionValidUntil(e.target.value)} className="w-full rounded-xl bg-[#13151f] border border-slate-700 px-3 py-2.5 text-sm text-white" />
            </div>
            {promotionError && <p className="text-xs text-rose-400">{promotionError}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => { setIsPromotionFormOpen(false); resetPromotionForm(); }} className="flex-1 rounded-xl bg-slate-800 px-3 py-2.5 text-xs font-semibold text-slate-300">Cancelar</button>
              <button type="submit" disabled={isSavingPromotion} className="flex-1 rounded-xl bg-orange-600 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-50">{isSavingPromotion ? 'Salvando...' : 'Salvar promoção'}</button>
            </div>
          </form>
        )}

        {promotions.length === 0 ? (
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 py-7 text-center text-xs text-slate-400">Nenhuma promoção cadastrada para esta loja.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {promotions.map((promotion) => (
              <article key={promotion.id} className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div><h4 className="font-bold text-sm text-white">{promotion.title}</h4><p className="text-xs text-slate-400 mt-1">{promotion.description}</p></div>
                  <span className={`text-[10px] rounded-full px-2 py-1 border ${promotion.isActive === false ? 'text-slate-400 border-slate-700' : 'text-emerald-300 border-emerald-500/30'}`}>{promotion.isActive === false ? 'Pausada' : 'Ativa'}</span>
                </div>
                <p className="text-xs"><strong className="text-orange-300">R$ {promotion.discountPrice.toFixed(2).replace('.', ',')}</strong> <span className="text-slate-500 line-through ml-1">R$ {promotion.regularPrice.toFixed(2).replace('.', ',')}</span></p>
                {promotion.couponCode && <p className="text-[11px] text-slate-400">Cupom: <strong className="text-amber-300">{promotion.couponCode}</strong></p>}
                {promotion.validUntil && <p className="text-[10px] text-slate-500">Válida até {new Date(promotion.validUntil).toLocaleDateString('pt-BR')}</p>}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => togglePromotionStatus(promotion)} className="rounded-lg bg-slate-800 px-2.5 py-1.5 text-[11px] text-slate-300">{promotion.isActive === false ? 'Ativar' : 'Pausar'}</button>
                  <button onClick={() => openPromotionEditor(promotion)} className="rounded-lg bg-slate-800 px-2.5 py-1.5 text-[11px] text-slate-300">Editar</button>
                  <button onClick={() => handleDeletePromotion(promotion)} className="rounded-lg bg-slate-800 px-2.5 py-1.5 text-[11px] text-rose-300">Excluir</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* SEÇÃO PRINCIPAL: PRÊMIOS E FIDELIDADE DA LOJA                */}
      {/* ============================================================ */}
      <div className="rounded-3xl bg-[#13151f] border border-amber-500/30 p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400">
                <Gift className="w-5 h-5" />
              </span>
              <h3 className="text-base font-bold text-white font-display">
                Prêmios e Fidelidade — {currentRestaurant.name}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Cadastre brindes e cortesias que seus clientes resgatam com pontos acumulados ({rewardsList.length} prêmios)
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleOpenAddReward}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Criar prêmio
            </button>
          </div>
        </div>

        {/* Informative distinction notice */}
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs space-y-1 text-slate-300">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Distinção entre Cardápio Comercial e Programa de Recompensas:</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            • <strong>Não são produtos vendidos por dinheiro:</strong> prêmios de fidelidade são adquiridos exclusivamente através de pontos acumulados pelos clientes (no mínimo 70% obtidos nesta loja e até 30% em pontos globais da rede). Pontos de outras lojas nunca participam do resgate.
            <br />
            • Cada prêmio tem seu próprio estoque físico. Prêmios com estoque zerado ou pausados deixam de ficar disponíveis para resgate no aplicativo do cliente.
          </p>
        </div>

        {/* List of Rewards */}
        {rewardsList.length === 0 ? (
          <div className="text-center py-10 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <Gift className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">
              Nenhum prêmio de fidelidade cadastrado para {currentRestaurant.name}.
            </p>
            <button
              onClick={handleOpenAddReward}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 underline underline-offset-2"
            >
              + Cadastrar primeiro prêmio
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {rewardsList.map((reward) => {
              const isOutOfStock = reward.stock <= 0 || reward.status === 'esgotado';
              const isPaused = reward.status === 'pausado';

              return (
                <div
                  key={reward.id}
                  className={`p-4 rounded-2xl bg-slate-900/90 border flex flex-col justify-between space-y-3 transition-colors ${
                    isOutOfStock
                      ? 'border-slate-800 opacity-80'
                      : isPaused
                      ? 'border-amber-500/20'
                      : 'border-slate-800 hover:border-amber-500/40'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                          {reward.imageUrl ? (
                            <img
                              src={reward.imageUrl}
                              alt={reward.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Gift className="w-5 h-5 text-amber-400" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-white">
                            {reward.title}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/30 tabular-nums">
                              {reward.pointsCost} pts
                            </span>
                            {isOutOfStock ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 font-bold text-[10px] border border-rose-500/30">
                                Esgotado (0 un.)
                              </span>
                            ) : isPaused ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-bold text-[10px] border border-amber-500/30">
                                Pausado
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-medium text-[10px] border border-emerald-500/30">
                                {reward.stock} un. em estoque
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      {reward.description}
                    </p>

                    {/* Breakdown 70/30 */}
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-300 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Mínimo da sua loja (70%):</span>
                        <span className="font-semibold text-amber-400 tabular-nums">{reward.minStorePointsRequired} pts</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Máx. pontos de convite (30%):</span>
                        <span className="font-semibold text-orange-400 tabular-nums">{reward.maxGlobalPointsAllowed} pts</span>
                      </div>
                      {reward.maxRedemptionsPerUser && (
                        <div className="flex justify-between pt-1 border-t border-slate-800 text-[10px] text-slate-400">
                          <span>Limite por cliente:</span>
                          <span className="text-slate-300">{reward.maxRedemptionsPerUser} resgate(s)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <button
                      onClick={() => toggleRewardStatus(reward.id)}
                      disabled={reward.stock <= 0}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                        reward.stock <= 0
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                          : reward.status === 'ativo'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25'
                      }`}
                      title={reward.stock <= 0 ? 'Sem estoque para ativar' : reward.status === 'ativo' ? 'Pausar prêmio' : 'Ativar prêmio'}
                    >
                      {reward.stock <= 0 ? (
                        <>
                          <ToggleLeft className="w-3.5 h-3.5 text-slate-500" />
                          Esgotado
                        </>
                      ) : reward.status === 'ativo' ? (
                        <>
                          <ToggleRight className="w-3.5 h-3.5 text-emerald-400" />
                          Ativo
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-3.5 h-3.5 text-amber-400" />
                          Pausado
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditReward(reward)}
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                        title="Editar prêmio"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setDeletingReward(reward)}
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 transition-colors"
                        title="Excluir prêmio"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Validador Oficial de Vouchers no Balcão */}
      <div className="rounded-3xl bg-[#13151f] border border-emerald-500/30 p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                <Ticket className="w-5 h-5" />
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white font-display">
                Validação de Voucher no Balcão (Entrega de Cortesia)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Valide o código fornecido pelo morador antes de entregar a cortesia. O sistema confere a autenticidade e dá baixa imediata.
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30 self-start sm:self-auto shrink-0">
            Segurança 70/30
          </span>
        </div>

        {/* Regras Operacionais para o Lojista */}
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs space-y-1.5 text-slate-300">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Regras Obrigatórias de Validação para o Comerciante:</span>
          </div>
          <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside leading-relaxed">
            <li><strong>Validação prévia obrigatória:</strong> valide o código no painel <em>antes</em> de entregar o prêmio ao morador.</li>
            <li><strong>Permissão exclusiva:</strong> apenas a sua lanchonete (ou um administrador) pode validar vouchers emitidos para esta loja.</li>
            <li><strong>Vouchers inválidos:</strong> códigos já utilizados, cancelados, expirados ou pertencentes a outro restaurante são recusados pelo sistema e não devem ser aceitos.</li>
            <li><strong>Garantia 70/30:</strong> o sistema garante que pelo menos 70% dos pontos foram conquistados na sua loja e até 30% complementados com pontos globais da rede.</li>
          </ul>
        </div>

        <form onSubmit={handleValidateVoucher} className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <div className="flex-1 relative">
            <input
              type="text"
              value={voucherInput}
              onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
              placeholder="Ex: ZAP-A1B2C3D4"
              maxLength={20}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 tracking-wider uppercase transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isValidatingVoucher || !voucherInput.trim()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isValidatingVoucher ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Validando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Validar Voucher</span>
              </>
            )}
          </button>
        </form>

        {/* Feedback da Validação */}
        {voucherValidationResult && (
          <div
            className={`p-4 rounded-2xl border text-xs space-y-2 animate-fade-in ${
              voucherValidationResult.status === 'success'
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              {voucherValidationResult.status === 'success' ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="text-white">Voucher Autêntico & Validado com Sucesso!</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  <span className="text-white">Atenção na Validação</span>
                </>
              )}
            </div>

            <p className="text-xs leading-relaxed">
              {voucherValidationResult.message}
            </p>

            {voucherValidationResult.status === 'success' && (
              <div className="p-3 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-[11px] text-slate-300 space-y-1 mt-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Prêmio:</span>
                  <strong className="text-white">{voucherValidationResult.rewardTitle}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cliente:</span>
                  <span className="text-emerald-300 font-semibold">{voucherValidationResult.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Pontos Deduzidos:</span>
                  <span className="text-amber-400 font-mono font-bold">{voucherValidationResult.pointsCost} pts</span>
                </div>
                {voucherValidationResult.voucherCode && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Voucher:</span>
                    <span className="text-slate-200 font-mono">{voucherValidationResult.voucherCode}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Orçamento Promocional de Fidelidade (3.000 pontos) */}
      <div className="rounded-3xl bg-[#13151f] border border-amber-500/30 p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400">
                <Gift className="w-5 h-5" />
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white font-display">
                Orçamento Promocional de Fidelidade — {currentRestaurant.name}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Pacote demonstrativo de <strong>3.000 pontos</strong> concedido para você fidelizar clientes locais
            </p>
          </div>

          <span className="text-xs px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30 self-start sm:self-auto shrink-0">
            Fase de Lançamento Gratuito
          </span>
        </div>

        {/* Diferenciação dos 4 Níveis de Valores (Exigência de Arquitetura) */}
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs space-y-2 text-slate-300">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            Diferenciação Clara dos 4 Níveis de Pontuação & Estoque:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80">
              <strong className="text-amber-300 block">1. Orçamento da Loja:</strong>
              Saldo que a lanchonete possui para distribuir em campanhas e atrair clientes.
            </div>
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80">
              <strong className="text-emerald-300 block">2. Saldo do Cliente:</strong>
              Pontos acumulados na carteira pessoal do morador (por check-in e avaliações).
            </div>
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80">
              <strong className="text-orange-300 block">3. Custo do Prêmio:</strong>
              Quantidade de pontos necessária para resgatar uma cortesia cadastrada.
            </div>
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80">
              <strong className="text-blue-300 block">4. Estoque Físico:</strong>
              Quantidade real de unidades disponíveis para entrega no balcão da loja.
            </div>
          </div>
        </div>

        {/* Budget Progress Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
              Pacote Concedido
            </span>
            <span className="text-xl font-extrabold text-white tabular-nums">
              {promotionalBudget.toLocaleString('pt-BR')} pts
            </span>
            <span className="text-[10px] text-emerald-400 block mt-0.5">
              100% gratuito (Demonstração)
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
              Distribuído aos Clientes
            </span>
            <span className="text-xl font-extrabold text-orange-400 tabular-nums">
              {pointsDistributed.toLocaleString('pt-BR')} pts
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {budgetUsagePercent}% do orçamento consumido
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
              Saldo Restante no Caixa
            </span>
            <span className="text-xl font-extrabold text-amber-300 tabular-nums">
              {remainingBudget.toLocaleString('pt-BR')} pts
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Disponível para novas ações
            </span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Consumo do Orçamento</span>
            <span className="font-semibold text-amber-300">{remainingBudget} pts disponíveis</span>
          </div>
          <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
              style={{ width: `${budgetUsagePercent}%` }}
            />
          </div>
        </div>


      </div>

      {/* Destaque Regional por Bairro (5 Estados) */}
      <div className="rounded-3xl bg-[#13151f] border border-slate-800 p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-orange-500/20 text-orange-400">
                <Sparkles className="w-5 h-5" />
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white font-display">
                Destaque Regional no Bairro (Topo Patrocinado)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Coloque sua lanchonete em primeiro lugar na listagem de bairros parceiros
            </p>
          </div>

          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-orange-500/20 self-start sm:self-auto shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Solicitar Destaque
          </button>
        </div>

        {/* Current Highlight State Banner */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
              Status Atual na {currentRestaurant.neighborhoodName}
            </span>
            <div className="flex items-center gap-2">
              {getStatusBadge(currentHighlightStatus)}
              <span className="text-xs text-slate-300">
                {currentHighlightStatus === 'ativo' && 'Exibido com selo Patrocinado no topo'}
                {currentHighlightStatus === 'solicitado' && 'Aguardando aprovação da administração'}
                {currentHighlightStatus === 'aprovado' && 'Aprovado, entrará no ar em instantes'}
                {currentHighlightStatus === 'agendado' && 'Programado para o próximo horário de pico'}
                {currentHighlightStatus === 'encerrado' && 'Período finalizado'}
              </span>
            </div>
          </div>

          <div className="text-right text-xs">
            <span className="text-[10px] text-slate-400 block">Exemplo Futuro</span>
            <span className="font-bold text-amber-400">R$ 10 por 2h (Configurável)</span>
            <span className="text-[10px] text-emerald-400 block mt-0.5">
              Gratuito no Lançamento
            </span>
          </div>
        </div>
      </div>



      {/* ============================================================ */}
      {/* MODAL: EDITAR MINHA LOJA                                      */}
      {/* ============================================================ */}
      {isEditStoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-[#13151f] border border-orange-500/30 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-orange-500/15 text-orange-400">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white font-display">
                    Editar Minha Loja
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Atualize os dados comerciais e fotos do seu estabelecimento
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsEditStoreModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {storeFormError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{storeFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveStore} className="space-y-4 text-xs">
              {/* Imagem de Capa (Banner) com Otimização */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Foto de Capa (Banner da Loja):
                </label>
                <div className="relative h-28 w-full rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden mb-2">
                  <img
                    src={storeFormBannerUrl}
                    alt="Prévia do Banner"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => bannerInputRef.current?.click()}
                      disabled={isOptimizingBanner}
                      className="px-3 py-1.5 rounded-xl bg-black/75 hover:bg-black/90 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors border border-slate-600"
                    >
                      <Camera className="w-3.5 h-3.5 text-orange-400" />
                      {isOptimizingBanner ? 'Otimizando banner...' : 'Alterar foto de capa'}
                    </button>
                  </div>
                </div>
                <input
                  type="file"
                  ref={bannerInputRef}
                  accept="image/*"
                  onChange={handleBannerFileChange}
                  className="hidden"
                />
                {bannerOptimizationInfo && (
                  <p className="text-[11px] text-emerald-400 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    {bannerOptimizationInfo}
                  </p>
                )}
              </div>

              {/* Logo / Perfil da Loja */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Logo / Foto de Perfil da Loja:
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                    {storeFormLogoUrl ? (
                      <img
                        src={storeFormLogoUrl}
                        alt="Logo Loja"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Store className="w-6 h-6 text-slate-500" />
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      ref={logoInputRef}
                      accept="image/*"
                      onChange={handleLogoFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={isOptimizingLogo}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5 text-amber-400" />
                      {isOptimizingLogo ? 'Otimizando logo...' : 'Escolher logo'}
                    </button>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Otimizada automaticamente para até 800px no cliente.
                    </p>
                  </div>
                </div>
                {logoOptimizationInfo && (
                  <p className="text-[11px] text-emerald-400 mt-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    {logoOptimizationInfo}
                  </p>
                )}
              </div>

              {/* Nome do Estabelecimento */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nome do estabelecimento:
                </label>
                <input
                  type="text"
                  value={storeFormName}
                  onChange={(e) => setStoreFormName(e.target.value)}
                  placeholder="Ex: Lanchonete do Bairro"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              {/* Nome do Responsável */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nome do responsável / comerciante:
                </label>
                <input
                  type="text"
                  value={storeFormOwner}
                  onChange={(e) => setStoreFormOwner(e.target.value)}
                  placeholder="Ex: Jorge Ferreira"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              {/* Bairro de Atuação */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Bairro de atuação:
                </label>
                <select
                  value={storeFormNeighborhoodId}
                  onChange={(e) => setStoreFormNeighborhoodId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-orange-500 transition-colors"
                >
                  {NEIGHBORHOODS.filter((n) => n.id !== 'todos').map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Endereço ou Referência Comercial */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Endereço ou referência comercial:
                </label>
                <input
                  type="text"
                  value={storeFormAddress}
                  onChange={(e) => setStoreFormAddress(e.target.value)}
                  placeholder="Ex: Estrada dos Três Rios, 520 (em frente à praça)"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              {/* WhatsApp Comercial */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  WhatsApp comercial para receber pedidos:
                </label>
                <input
                  type="text"
                  value={storeFormWhatsapp}
                  onChange={(e) => setStoreFormWhatsapp(e.target.value)}
                  placeholder="Ex: (21) 98000-0001"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  O link wa.me utilizará este número para direcionar pedidos dos clientes.
                </p>
              </div>

              {/* Descrição / Bio da Loja */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Descrição / bio da loja:
                </label>
                <textarea
                  value={storeFormBio}
                  onChange={(e) => setStoreFormBio(e.target.value)}
                  rows={3}
                  placeholder="Conte o diferencial dos seus lanches, ingredientes especiais e tradição na vizinhança..."
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors resize-none"
                />
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditStoreModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isOptimizingBanner || isOptimizingLogo}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-bold shadow-md shadow-orange-500/20 transition-all disabled:opacity-50"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: ADICIONAR / EDITAR PRODUTO NO CARDÁPIO                */}
      {/* ============================================================ */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-[#13151f] border border-orange-500/30 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-orange-500/15 text-orange-400">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white font-display">
                    {editingProduct ? 'Editar Produto do Cardápio' : 'Adicionar Novo Produto'}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {currentRestaurant.name}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {prodFormError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{prodFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              {/* Foto do Produto com Otimização */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Foto do Produto:
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                    {prodImageUrl ? (
                      <img
                        src={prodImageUrl}
                        alt="Prévia do Produto"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-600" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="file"
                      ref={prodImageInputRef}
                      accept="image/*"
                      onChange={handleProdImageChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => prodImageInputRef.current?.click()}
                      disabled={isOptimizingProdImage}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5 text-orange-400" />
                      {isOptimizingProdImage ? 'Otimizando foto...' : 'Escolher foto do prato'}
                    </button>
                    <p className="text-[10px] text-slate-400">
                      Redução para max 1200px e conversão otimizada WebP/JPEG automática.
                    </p>
                  </div>
                </div>
                {prodOptimizationInfo && (
                  <p className="text-[11px] text-emerald-400 mt-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    {prodOptimizationInfo}
                  </p>
                )}
              </div>

              {/* Nome do Produto */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nome do produto:
                </label>
                <input
                  type="text"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="Ex: Smash Especial da Casa"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Descrição do produto:
                </label>
                <textarea
                  value={prodDescription}
                  onChange={(e) => setProdDescription(e.target.value)}
                  rows={3}
                  placeholder="Ex: 2 smash burgers 100g de fraldinha, queijo cheddar derretido, bacon crocante no pão brioche."
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors resize-none"
                />
              </div>

              {/* Preço e Preço Original */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Preço (R$):
                  </label>
                  <input
                    type="text"
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    placeholder="34,90"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Preço "De" (Opcional):
                  </label>
                  <input
                    type="text"
                    value={prodOriginalPrice}
                    onChange={(e) => setProdOriginalPrice(e.target.value)}
                    placeholder="Ex: 40,00"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors font-mono"
                  />
                </div>
              </div>

              {/* Categoria e Selo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Categoria:
                  </label>
                  <select
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-orange-500 transition-colors"
                  >
                    <option value="Hambúrgueres">Hambúrgueres</option>
                    <option value="Dogão & Lanches">Dogão & Lanches</option>
                    <option value="Pizzas">Pizzas</option>
                    <option value="Porções & Acompanhamentos">Porções & Acompanhamentos</option>
                    <option value="Bebidas">Bebidas</option>
                    <option value="Sobremesas">Sobremesas</option>
                    <option value="Pastéis & Caldos">Pastéis & Caldos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Selo de Destaque (Opcional):
                  </label>
                  <input
                    type="text"
                    value={prodBadge}
                    onChange={(e) => setProdBadge(e.target.value)}
                    placeholder="Ex: Mais Pedido, Artesanal"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
              </div>

              {/* Tempo de Preparo */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Preparo médio (minutos):
                </label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={prodPrepTime}
                  onChange={(e) => setProdPrepTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors font-mono"
                />
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isOptimizingProdImage}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-bold shadow-md shadow-orange-500/20 transition-all disabled:opacity-50"
                >
                  {editingProduct ? 'Salvar Produto' : 'Cadastrar no Cardápio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO DE PRODUTO                    */}
      {/* ============================================================ */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-[#13151f] border border-rose-500/40 rounded-3xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-500/20 text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-base text-white">
                  Excluir Produto?
                </h4>
                <p className="text-xs text-slate-400">
                  Esta ação removerá o item do cardápio público
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <span className="font-bold text-white block">
                {deletingProduct.name}
              </span>
              <span className="text-amber-400 font-semibold">
                R$ {deletingProduct.price.toFixed(2).replace('.', ',')}
              </span>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setDeletingProduct(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeleteProduct}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/20"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Solicitar Destaque Regional */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#13151f] border border-orange-500/40 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-400" />
                <h4 className="font-bold text-base text-white">
                  Solicitar Destaque Regional no Bairro
                </h4>
              </div>
              <button
                onClick={() => setIsRequestModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRequestHighlight} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Bairro do Destaque:
                </label>
                <select
                  value={selectedNeighborhood}
                  onChange={(e) => setSelectedNeighborhood(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-orange-500"
                >
                  {NEIGHBORHOODS.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name} ({n.zone} - {n.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Duração Desejada & Exemplo de Preço Futuro:
                </label>
                <select
                  value={selectedDuration}
                  onChange={(e) => setSelectedDuration(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="2 Horas (Exemplo: R$ 10)">
                    2 Horas — Exemplo Futuro: R$ 10 (Gratuito no Lançamento)
                  </option>
                  <option value="4 Horas (Exemplo: R$ 18)">
                    4 Horas — Exemplo Futuro: R$ 18 (Gratuito no Lançamento)
                  </option>
                  <option value="12 Horas (Exemplo: R$ 35)">
                    12 Horas — Exemplo Futuro: R$ 35 (Gratuito no Lançamento)
                  </option>
                  <option value="24 Horas (Exemplo: R$ 60)">
                    24 Horas — Exemplo Futuro: R$ 60 (Gratuito no Lançamento)
                  </option>
                </select>
              </div>

              {/* Free Launch Transparency Notice */}
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Custo Nesta Fase: R$ 0,00 (Gratuito)
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Durante a fase de lançamento comunitário, todos os destaques são 100% gratuitos para incentivar o comércio local. O valor em reais acima é apenas um exemplo configurável no painel administrativo para sustentabilidade futura.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold shadow-md shadow-orange-600/20"
                >
                  Enviar Solicitação Demo
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
      


      {/* ============================================================ */}
      {/* MODAL: CRIAR OU EDITAR PRÊMIO DE FIDELIDADE                  */}
      {/* ============================================================ */}

      {deletingReward && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="delete-reward-title" className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-[#13151f] p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-rose-500/15 p-2 text-rose-400"><Trash2 className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <h3 id="delete-reward-title" className="text-base font-bold text-white">Excluir prêmio?</h3>
                <p className="mt-2 text-sm text-slate-300">Tem certeza de que deseja excluir <strong className="text-white">{deletingReward.title}</strong> do programa de fidelidade? Esta ação não poderá ser desfeita.</p>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setDeletingReward(null)} className="flex-1 rounded-xl bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700">Cancelar</button>
              <button type="button" onClick={handleConfirmDeleteReward} className="flex-1 rounded-xl bg-rose-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-rose-500">Excluir prêmio</button>
            </div>
          </div>
        </div>
      )}

      {isRewardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-[#13151f] border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">
              {editingReward ? 'Editar Prêmio' : 'Cadastrar Novo Prêmio'}
            </h3>
            
            <form onSubmit={handleSaveReward} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-sm">Nome do Prêmio:</label>
                <input
                  type="text"
                  value={rewardTitle}
                  onChange={(e) => setRewardTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-sm">Descrição:</label>
                <textarea
                  value={rewardDescription}
                  onChange={(e) => setRewardDescription(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-slate-300 font-semibold text-sm">Foto do prêmio (opcional):</label>
                <input
                  ref={rewardImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleRewardImageChange}
                  className="hidden"
                />
                {rewardImageUrl ? (
                  <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 p-3">
                    <img src={rewardImageUrl} alt="Prévia do prêmio" className="h-20 w-20 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-300">Imagem selecionada para este prêmio.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setRewardImageUrl('');
                          setRewardOptimizationInfo(null);
                          if (rewardImageInputRef.current) rewardImageInputRef.current.value = '';
                        }}
                        className="mt-2 text-xs font-semibold text-rose-400 hover:text-rose-300"
                      >
                        Remover foto
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Nenhuma foto selecionada. O prêmio será salvo sem imagem.</p>
                )}
                <button
                  type="button"
                  onClick={() => rewardImageInputRef.current?.click()}
                  disabled={isOptimizingRewardImage}
                  className="w-full rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm font-semibold text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
                >
                  {isOptimizingRewardImage ? 'Processando foto...' : rewardImageUrl ? 'Trocar foto' : 'Escolher foto'}
                </button>
                {rewardOptimizationInfo && <p className="text-xs text-emerald-400">{rewardOptimizationInfo}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 text-sm">Pontos Necessários:</label>
                    <input
                      type="number"
                      value={rewardPointsCost}
                      onChange={(e) => setRewardPointsCost(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 text-sm">Estoque:</label>
                    <input
                      type="number"
                      value={rewardStock}
                      onChange={(e) => setRewardStock(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
              </div>

              {rewardFormError && <p className="text-rose-400 text-xs">{rewardFormError}</p>}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRewardModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-sm transition-colors hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm transition-all shadow-md shadow-amber-600/20"
                >
                  Salvar Prêmio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
