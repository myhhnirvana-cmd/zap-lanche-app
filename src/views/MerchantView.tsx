import React, { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react';
import {
  Restaurant,
  MerchantDemoStats,
  MenuItem,
  HighlightStatus,
  RegionalHighlight,
  LoyaltyReward,
  RewardStatus,
  DemoPointConcession,
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
import { insertMenuItem, updateMenuItem, deleteMenuItem } from '../lib/supabase';

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
  const { user, isAdmin, isMerchant, merchantRestaurant } = useAuth();

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
  const [confirmedOrders, setConfirmedOrders] = useState<Record<string, boolean>>({});

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
  const handleSelectStore = (storeId: string) => {
    setSelectedRestaurantId(storeId);
    const store = allRestaurants.find((r) => r.id === storeId) || allRestaurants[0];
    const items = loadRestaurantMenu(storeId);
    setMenuItems(items);
    setIsOpenToday(store.isOpen);

    const storeRewards = loadRestaurantRewards(storeId);
    setRewardsList(storeRewards);

    const storeStats = loadMerchantStats(storeId);
    setStats(storeStats);
    setPointsDistributed(storeStats.promotionalPointsDistributed);

    const storeHl = existingHighlights.find((h) => h.restaurantId === storeId);
    setCurrentHighlightStatus((storeHl?.status || storeStats.highlightStatus) as HighlightStatus);
    setHighlightHistory(storeStats.highlightHistory);
  };

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
  const [storeFormOwner, setStoreFormOwner] = useState(currentRestaurant.ownerName || stats.ownerName);
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
  const [prodIsAvailable, setProdIsAvailable] = useState(true);
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
  // ESTADOS DO MODAL: SIMULAÇÃO DE CONCESSÃO DE PONTOS
  // -------------------------------------------------------------
  const [isConcessionModalOpen, setIsConcessionModalOpen] = useState(false);
  const [concessionPoints, setConcessionPoints] = useState<number>(30);
  const [concessionReason, setConcessionReason] = useState<string>('');
  const [concessionValidated, setConcessionValidated] = useState<boolean>(true);
  const [isGrantingPoints, setIsGrantingPoints] = useState<boolean>(false);

  const remainingBudget = Math.max(0, promotionalBudget - pointsDistributed);
  const budgetUsagePercent = Math.min(100, Math.round((pointsDistributed / promotionalBudget) * 100));

  // Abertura do Modal de Edição da Loja
  const handleOpenEditStore = () => {
    setStoreFormName(currentRestaurant.name);
    setStoreFormOwner(currentRestaurant.ownerName || stats.ownerName);
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

  // Upload e Otimização do Banner
  const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsOptimizingBanner(true);
      setStoreFormError(null);
      const result = await optimizeImage(file, 1600, 0.8);
      setStoreFormBannerUrl(result.dataUrl);
      setBannerOptimizationInfo(
        `Banner otimizado: ${formatBytes(result.originalSize)} → ${formatBytes(result.optimizedSize)} (${result.reductionPercentage}% menor, ${result.format.toUpperCase()})`
      );
    } catch (err: any) {
      setStoreFormError(err.message || 'Erro ao processar imagem de capa.');
    } finally {
      setIsOptimizingBanner(false);
    }
  };

  // Upload e Otimização da Logo/Avatar
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsOptimizingLogo(true);
      setStoreFormError(null);
      const result = await optimizeImage(file, 800, 0.8);
      setStoreFormLogoUrl(result.dataUrl);
      setLogoOptimizationInfo(
        `Logo otimizada: ${formatBytes(result.originalSize)} → ${formatBytes(result.optimizedSize)} (${result.reductionPercentage}% menor, ${result.format.toUpperCase()})`
      );
    } catch (err: any) {
      setStoreFormError(err.message || 'Erro ao processar logo da loja.');
    } finally {
      setIsOptimizingLogo(false);
    }
  };

  // Salvar Edição da Loja
  const handleSaveStore = (e: React.FormEvent) => {
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

    const nbObj = NEIGHBORHOODS.find((n) => n.id === storeFormNeighborhoodId) || NEIGHBORHOODS[1] || NEIGHBORHOODS[0];

    const updatedRestaurant: Restaurant = {
      ...currentRestaurant,
      name: storeFormName.trim(),
      ownerName: storeFormOwner.trim(),
      bio: storeFormBio.trim(),
      neighborhoodId: storeFormNeighborhoodId,
      neighborhoodName: nbObj.name,
      address: storeFormAddress.trim(),
      whatsappDemo: storeFormWhatsapp.trim(),
      bannerUrl: storeFormBannerUrl,
      logoUrl: storeFormLogoUrl.trim() || undefined,
    };

    updateSingleRestaurant(updatedRestaurant);
    onUpdateRestaurant?.(updatedRestaurant);

    const updatedStats: MerchantDemoStats = {
      ...stats,
      restaurantName: updatedRestaurant.name,
      ownerName: updatedRestaurant.ownerName || storeFormOwner.trim(),
      neighborhood: updatedRestaurant.neighborhoodName,
    };
    setStats(updatedStats);
    saveMerchantStats(updatedStats);

    setIsEditStoreModalOpen(false);
    showToast(`Loja "${updatedRestaurant.name}" atualizada com sucesso!`);
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
    setProdIsAvailable(true);
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
    setProdIsAvailable(item.isAvailable);
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
        isAvailable: prodIsAvailable,
        imageUrl: prodImageUrl || editingProduct.imageUrl,
      };

      const { data, error } = await updateMenuItem(updatedItem);
      if (error || !data) {
        setProdFormError('Erro ao atualizar produto: ' + (error?.message || 'Falha ao atualizar'));
        return;
      }
      
      const updatedList = menuItems.map((item) => (item.id === editingProduct.id ? data : item));
      setMenuItems(updatedList);
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
        isAvailable: prodIsAvailable,
        imageUrl: prodImageUrl || currentRestaurant.bannerUrl,
      };

      const { data, error } = await insertMenuItem(newItem);
      if (error || !data) {
        setProdFormError('Erro ao adicionar produto: ' + (error?.message || 'Falha ao adicionar'));
        return;
      }
      
      const updatedList = [data, ...menuItems];
      setMenuItems(updatedList);
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
    showToast(`"${data.name}" ${data.isAvailable ? 'ativado para pedidos' : 'pausado na chapa'}.`);
  };

  const handleConfirmOrder = (orderId: string) => {
    setConfirmedOrders((prev) => ({ ...prev, [orderId]: true }));
  };

  // -------------------------------------------------------------
  // HANDLERS: GESTÃO DE PRÊMIOS E FIDELIDADE
  // -------------------------------------------------------------
  const handleOpenAddReward = () => {
    setEditingReward(null);
    setRewardTitle('');
    setRewardDescription('');
    setRewardPointsCost('300');
    setRewardStock('20');
    setRewardStatus('ativo');
    setRewardMaxPerUser('1');
    setRewardImageUrl(currentRestaurant.bannerUrl);
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
    setRewardImageUrl(reward.imageUrl || currentRestaurant.bannerUrl);
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

  const handleSaveReward = (e: React.FormEvent) => {
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

    let updatedList: LoyaltyReward[];
    if (editingReward) {
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
              imageUrl: rewardImageUrl || r.imageUrl,
            }
          : r
      );
      showToast(`Prêmio "${rewardTitle.trim()}" atualizado com sucesso!`);
    } else {
      const newReward: LoyaltyReward = {
        id: `rew-${Date.now()}`,
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
        imageUrl: rewardImageUrl || currentRestaurant.bannerUrl,
      };
      updatedList = [newReward, ...rewardsList];
      showToast(`Novo prêmio "${rewardTitle.trim()}" cadastrado com sucesso!`);
    }

    setRewardsList(updatedList);
    saveRestaurantRewards(selectedRestaurantId, updatedList);
    setIsRewardModalOpen(false);
  };

  const toggleRewardStatus = (rewardId: string) => {
    const updated = rewardsList.map((r) => {
      if (r.id === rewardId) {
        if (r.stock <= 0) {
          return { ...r, status: 'esgotado' as RewardStatus, isAvailable: false };
        }
        const nextStatus: RewardStatus = r.status === 'ativo' ? 'pausado' : 'ativo';
        return {
          ...r,
          status: nextStatus,
          isAvailable: nextStatus === 'ativo',
        };
      }
      return r;
    });
    setRewardsList(updated);
    saveRestaurantRewards(selectedRestaurantId, updated);
    const item = updated.find((r) => r.id === rewardId);
    if (item) {
      showToast(
        item.stock <= 0
          ? `O prêmio "${item.title}" está com estoque zerado e permanece esgotado.`
          : `Prêmio "${item.title}" ${item.status === 'ativo' ? 'ativado para resgates' : 'pausado temporariamente'}.`
      );
    }
  };

  const handleConfirmDeleteReward = () => {
    if (!deletingReward) return;
    const remaining = rewardsList.filter((r) => r.id !== deletingReward.id);
    setRewardsList(remaining);
    saveRestaurantRewards(selectedRestaurantId, remaining);
    showToast(`Prêmio "${deletingReward.title}" excluído do programa de fidelidade.`);
    setDeletingReward(null);
  };

  // -------------------------------------------------------------
  // HANDLERS: SIMULAÇÃO DE CONCESSÃO DE PONTOS
  // -------------------------------------------------------------
  const handleOpenConcessionModal = (amount: number, reason: string) => {
    if (remainingBudget < amount) {
      showToast(`Orçamento insuficiente! Saldo restante é de ${remainingBudget} pontos.`, 'error');
      return;
    }
    setConcessionPoints(amount);
    setConcessionReason(reason);
    setConcessionValidated(true);
    setIsConcessionModalOpen(true);
  };

  const handleConfirmGrantPoints = () => {
    if (isGrantingPoints) return;
    if (remainingBudget < concessionPoints) {
      showToast(`Orçamento insuficiente! Saldo restante é de ${remainingBudget} pontos.`, 'error');
      setIsConcessionModalOpen(false);
      return;
    }

    setIsGrantingPoints(true);
    const newDistributed = pointsDistributed + concessionPoints;
    setPointsDistributed(newDistributed);

    const newConcession: DemoPointConcession = {
      id: `dc-${Date.now()}`,
      restaurantId: selectedRestaurantId,
      restaurantName: currentRestaurant.name,
      points: concessionPoints,
      reason: concessionReason,
      date: 'Hoje, agora mesmo (Simulação)',
      validationStatus: 'simulada_validada',
      operatorNote: 'Validação presencial demonstrativa conferida',
    };

    const currentHistory = stats.concessionsHistory || [];
    const updatedHistory = [newConcession, ...currentHistory];

    const updatedStats: MerchantDemoStats = {
      ...stats,
      promotionalPointsDistributed: newDistributed,
      concessionsHistory: updatedHistory,
    };

    setStats(updatedStats);
    saveMerchantStats(updatedStats);

    setIsConcessionModalOpen(false);
    setIsGrantingPoints(false);
    showToast(`Demonstração: +${concessionPoints} pontos concedidos por "${concessionReason}". Saldo atualizado.`);
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

  const mockIncomingOrders = [
    {
      id: 'ord-in-1',
      clientName: 'Thiago da Silva (Freguesia)',
      items: '1x Smash Especial da Freguesia + 1x Batata Rústica',
      time: 'Há 4 minutos',
      total: 56.9,
      obs: 'Carne ao ponto, sem picles',
    },
    {
      id: 'ord-in-2',
      clientName: 'Juliana Mendes (Jacarepaguá)',
      items: '2x X-Salada Tradicional + 1x Pudim Caseiro',
      time: 'Há 12 minutos',
      total: 70.0,
      obs: 'Caprichar na maionese verde caseira',
    },
  ];

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
                Responsável: <strong className="text-slate-300">{currentRestaurant.ownerName || stats.ownerName}</strong> · Bairro {currentRestaurant.neighborhoodName}
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
              onClick={() => {
                const nextState = !isOpenToday;
                setIsOpenToday(nextState);
                const updated = { ...currentRestaurant, isOpen: nextState };
                updateSingleRestaurant(updated);
                onUpdateRestaurant?.(updated);
                showToast(`Balcão da loja ${nextState ? 'aberto' : 'fechado'}.`);
              }}
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
            {menuItems[0]?.name || stats.topDishName}
          </span>
          <span className="text-[10px] text-orange-400 font-semibold block mt-0.5">
            {stats.topDishOrders} pedidos no mês
          </span>
        </div>
      </div>

      {/* Guia do Comerciante */}
      <GuideSection
        title="Como gerenciar sua loja"
        steps={[
          "Mantenha o cardápio atualizado com fotos reais e preços.",
          "Controle o status do balcão (aberto/pausado) para receber pedidos.",
          "Gerencie o programa de fidelidade criando prêmios atraentes.",
          "Monitore o desempenho da sua loja e interaja no feed."
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
            • <strong>Não são produtos vendidos por dinheiro:</strong> prêmios de fidelidade são adquiridos exclusivamente através de pontos acumulados pelos clientes (pelo menos 70% obtidos nesta loja e até 30% de pontos de convites comunitários).
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

        {/* Action: Distribuir Pontos para Ações de Clientes (com confirmação e transparência) */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-xs font-bold text-white">
              Simular Concessão de Pontos (Ação Demonstrativa):
            </span>
            <span className="text-[11px] text-amber-400 font-medium">
              * Exige confirmação prévia e registro
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() =>
                handleOpenConcessionModal(30, 'Check-in de Mesa com Proximidade')
              }
              disabled={remainingBudget < 30}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              +30 pts (Simular Check-in de Mesa)
            </button>

            <button
              onClick={() =>
                handleOpenConcessionModal(50, 'Avaliação com Foto Real do Prato')
              }
              disabled={remainingBudget < 50}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-3.5 h-3.5 text-orange-400" />
              +50 pts (Simular Avaliação com Foto)
            </button>
          </div>

          {/* Histórico Demonstrativo de Concessões */}
          {stats.concessionsHistory && stats.concessionsHistory.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Histórico Demonstrativo de Concessões ({stats.concessionsHistory.length})
              </span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {stats.concessionsHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <span>{item.reason}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 font-bold">
                          +{item.points} pts
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {item.date} · {item.operatorNote}
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium border border-emerald-500/30 shrink-0">
                      Simulada
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
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

      {/* Simulated Live Zap Orders Queue */}
      <div className="rounded-3xl bg-[#13151f] border border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              Pedidos Chegando no WhatsApp (Simulação)
            </h3>
            <p className="text-xs text-slate-400">
              Notificação direta para o comerciante sem intermediários nem comissão
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
                  Descrição dos ingredientes:
                </label>
                <textarea
                  value={prodDescription}
                  onChange={(e) => setProdDescription(e.target.value)}
                  rows={2}
                  placeholder="Ex: 2 smash burgers 100g de fraldinha, queijo cheddar derretido, bacon crocante e maionese artesanal..."
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

              {/* Tempo de Preparo e Disponibilidade */}
              <div className="grid grid-cols-2 gap-3 items-center">
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

                <div className="pt-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={prodIsAvailable}
                      onChange={(e) => setProdIsAvailable(e.target.checked)}
                      className="w-4 h-4 rounded text-orange-500 focus:ring-0 bg-slate-900 border-slate-700"
                    />
                    <span className="text-xs font-semibold text-white">
                      Disponível na chapa
                    </span>
                  </label>
                </div>
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
      {/* MODAL: CONFIRMAÇÃO DE CONCESSÃO DE PONTOS                    */}
      {/* ============================================================ */}
      {isConcessionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#13151f] border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400">
                <Gift className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Confirmar Concessão de Pontos
                </h3>
                <p className="text-xs text-slate-400">
                  Ação demonstrativa para {currentRestaurant.name}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Pontos a Conceder:</span>
                <span className="font-extrabold text-amber-400">+{concessionPoints} pts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Motivo / Ação:</span>
                <span className="font-semibold text-white">{concessionReason}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cliente Destinatário:</span>
                <span className="font-semibold text-emerald-400">Thiago da Silva (@thiago.lanches)</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2">
                <span className="text-slate-400">Orçamento Restante Após Ação:</span>
                <span className="font-bold text-white">{remainingBudget - concessionPoints} pts</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Ao confirmar, esta concessão será registrada no histórico de campanhas da loja e abatida do orçamento promocional de fidelidade.
            </p>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsConcessionModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmGrantPoints}
                disabled={isGrantingPoints}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-xs shadow-md transition-all disabled:opacity-50"
              >
                {isGrantingPoints ? 'Concedendo...' : 'Confirmar Concessão'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CRIAR OU EDITAR PRÊMIO DE FIDELIDADE                  */}
      {/* ============================================================ */}
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
