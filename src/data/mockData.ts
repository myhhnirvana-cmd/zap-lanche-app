import {
  Neighborhood,
  CategoryInfo,
  Restaurant,
  MenuItem,
  Promotion,
  SocialPost,
  UserProfileDemo,
  MerchantDemoStats,
  AdminDemoStats,
  LoyaltyReward,
  RegionalHighlight,
  AdminNotice,
  AdminAuditLog,
  PostComment,
  LoyaltyPointWallet,
} from '../types';

// Imagens gastronômicas geradas localmente
export const ASSET_BURGER = '/images/brazilian_burger_1792014250928.jpg';
export const ASSET_PIZZA = '/images/artisan_pizza_1792014251217.jpg';
export const ASSET_DOGAO = '/images/brazilian_dogao_1792014252458.jpg';
export const ASSET_STORE = '/images/lanchonete_front_1792014252947.jpg';

export const ANTI_FRAUD_RULES = [
  {
    id: 'af-1',
    title: 'Prevenção de Convites Falsos & Validade',
    rule: 'Os 15 pontos globais de indicação (validade de 180 dias) são liberados apenas após o amigo indicado realizar seu primeiro check-in validado em um estabelecimento participante.',
  },
  {
    id: 'af-2',
    title: 'Intervalo de Check-in (2 Horas)',
    rule: 'Cada check-in validado concede 5 pontos locais. O intervalo mínimo é de 2 horas entre check-ins do mesmo cliente no mesmo restaurante.',
  },
  {
    id: 'af-3',
    title: 'Auditoria de Avaliação com Foto',
    rule: 'Avaliações exigem foto real do lanche consumido. Imagens repetidas ou de banco de imagens são sinalizadas.',
  },
  {
    id: 'af-4',
    title: 'Regra de Fidelidade 70/30 & Pontos Locais',
    rule: 'Os pontos locais pertencem exclusivamente ao restaurante onde foram conquistados. O resgate exige no mínimo 70% em pontos locais da loja e até 30% em pontos globais da rede. Pontos de outras lojas nunca participam.',
  },
  {
    id: 'af-5',
    title: 'Natureza do Orçamento Promocional',
    rule: 'O pacote de 3.000 pontos do comerciante é exclusivo para fidelização interna. Não é dinheiro, não pode ser sacado nem transferido.',
  },
];

export const NEIGHBORHOODS: Neighborhood[] = [
  { id: 'todos', name: 'Todos os Bairros', zone: 'Zona Oeste', city: 'Rio de Janeiro', state: 'RJ', activeSpotsCount: 0 },
  { id: 'jacarepagua', name: 'Jacarepaguá', zone: 'Zona Oeste', city: 'Rio de Janeiro', state: 'RJ', activeSpotsCount: 0 },
  { id: 'freguesia', name: 'Freguesia (Jacarepaguá)', zone: 'Zona Oeste', city: 'Rio de Janeiro', state: 'RJ', activeSpotsCount: 0 },
  { id: 'cidade-de-deus', name: 'Cidade de Deus', zone: 'Zona Oeste', city: 'Rio de Janeiro', state: 'RJ', activeSpotsCount: 0 },
  { id: 'taquara', name: 'Taquara', zone: 'Zona Oeste', city: 'Rio de Janeiro', state: 'RJ', activeSpotsCount: 0 },
];

/**
 * Verifica se um estabelecimento de demonstração pertence à região/bairro selecionado.
 * - 'todos': contempla todos os estabelecimentos cadastrados (4 lanches).
 * - 'jacarepagua': na Fase 1, todos os 4 estabelecimentos pertencem à macro-região de Jacarepaguá.
 * - Bairros específicos ('freguesia', 'cidade-de-deus', 'taquara'): filtram os estabelecimentos daquele bairro.
 */
export function isRestaurantInNeighborhood(restaurant: Restaurant, neighborhoodId: string): boolean {
  const normalizedId = String(neighborhoodId ?? '').trim().toLowerCase();

  if (!normalizedId || normalizedId === 'todos' || normalizedId === 'all') {
    return true;
  }

  if (normalizedId === 'jacarepagua') {
    // Todos os 4 estabelecimentos demonstrativos operam na macro-região de Jacarepaguá
    return true;
  }

  const neighborhoodName = String(restaurant.neighborhoodName ?? '').trim().toLowerCase();
  const restaurantNeighborhoodId = String(restaurant.neighborhoodId ?? '').trim().toLowerCase();

  if (normalizedId === 'freguesia') {
    return (
      restaurantNeighborhoodId === 'freguesia' ||
      neighborhoodName.includes('freguesia')
    );
  }

  if (normalizedId === 'cidade-de-deus') {
    return (
      restaurantNeighborhoodId === 'cidade-de-deus' ||
      neighborhoodName.includes('cidade de deus')
    );
  }

  if (normalizedId === 'taquara') {
    return (
      restaurantNeighborhoodId === 'taquara' ||
      neighborhoodName.includes('taquara')
    );
  }

  return restaurantNeighborhoodId === normalizedId;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'todos', name: 'Todos', iconName: 'Compass' },
  { id: 'hamburguer', name: 'Hambúrgueres', iconName: 'Flame' },
  { id: 'lanches-dogao', name: 'Dogão & Lanches', iconName: 'Sandwich' },
  { id: 'pizza', name: 'Pizzas', iconName: 'Pizza' },
  { id: 'pasteis', name: 'Pastéis & Caldos', iconName: 'UtensilsCrossed' },
  { id: 'acai', name: 'Açaí & Sucos', iconName: 'Coffee' },
  { id: 'caseira', name: 'Comida Caseira', iconName: 'Soup' },
  { id: 'porcoes', name: 'Porções & Petiscos', iconName: 'Beer' },
  { id: 'sobremesas', name: 'Doces & Sobremesas', iconName: 'Cake' },
];

export const MOCK_LOYALTY_REWARDS: Record<string, LoyaltyReward[]> = {};

export const MOCK_REGIONAL_HIGHLIGHTS: RegionalHighlight[] = [];

export const MOCK_RESTAURANTS: Restaurant[] = [];

export const MOCK_MENU_ITEMS: Record<string, MenuItem[]> = {};

export const MOCK_PROMOTIONS: Record<string, Promotion[]> = {};

export const MOCK_POSTS: SocialPost[] = [];

export const MOCK_USER_PROFILE: UserProfileDemo = {
  id: '',
  name: '',
  username: '',
  neighborhood: '',
  avatarUrl: '',
  bio: '',
  memberSince: '',
  reviewsCount: 0,
  likedPostsCount: 0,
  savedSpotsCount: 0,
  loyaltyWallet: {
    globalReferralPoints: 0,
    storePoints: {},
  },
  foodieBadges: [],
  recentOrders: [],
  checkinHistory: [],
};

export const MOCK_MERCHANT_STATS_MAP: Record<string, MerchantDemoStats> = {};

export const MOCK_MERCHANT_STATS: MerchantDemoStats = {
  restaurantId: '',
  restaurantName: '',
  neighborhood: '',
  ownerName: '',
  viewsThisWeek: 0,
  zapClicksThisWeek: 0,
  feedInteractions: 0,
  topDishName: '',
  topDishOrders: 0,
  pendingZapOrdersCount: 0,
  monthlyRevenueEstimate: 0,
  promotionalPointBudget: 3000,
  promotionalPointsDistributed: 0,
  rewards: [],
  concessionsHistory: [],
  highlightStatus: 'nenhum',
  highlightHistory: [],
};

export const MOCK_ADMIN_NOTICES: AdminNotice[] = [];

export const MOCK_ADMIN_AUDIT_LOGS: AdminAuditLog[] = [];

export const MOCK_ADMIN_STATS: AdminDemoStats = {
  totalNeighborhoods: 4,
  activeMerchants: 0,
  communityPosts: 0,
  zapDirectsCount: 0,
  defaultPointBudget: 3000,
  futureHighlightPriceExample: 'R$ 10 por 2 horas',
  highlightRequests: [],
  notices: [],
  auditLogs: [],
  pendingApprovals: [],
};

// -------------------------------------------------------------
// PERSISTÊNCIA LOCAL RESILIENTE (INTEGRAÇÃO DOS CIRCUITOS DO PROTÓTIPO)
// -------------------------------------------------------------
export const USER_PROFILE_STORAGE_KEY = 'zap_lanche_user_profile_v1';
export const ADMIN_NOTICES_STORAGE_KEY = 'zap_lanche_admin_notices_v1';
export const REGIONAL_HIGHLIGHTS_STORAGE_KEY = 'zap_lanche_highlights_v1';
export const MERCHANT_STATS_STORAGE_KEY = 'zap_lanche_merchant_stats_v1';

export function loadUserProfile(): UserProfileDemo {
  if (typeof window === 'undefined') return MOCK_USER_PROFILE;
  try {
    const raw = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
    if (!raw) return MOCK_USER_PROFILE;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.loyaltyWallet) {
      return parsed;
    }
  } catch (e) {
    console.warn('Erro ao carregar perfil do localStorage', e);
  }
  return MOCK_USER_PROFILE;
}

export function saveUserProfile(profile: UserProfileDemo): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    return true;
  } catch (e) {
    console.warn('Erro ao salvar perfil no localStorage', e);
    return false;
  }
}

export function loadAdminNotices(): AdminNotice[] {
  if (typeof window === 'undefined') return MOCK_ADMIN_NOTICES;
  try {
    const raw = localStorage.getItem(ADMIN_NOTICES_STORAGE_KEY);
    if (!raw) return MOCK_ADMIN_NOTICES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (e) {
    console.warn('Erro ao carregar avisos do localStorage', e);
  }
  return MOCK_ADMIN_NOTICES;
}

export function saveAdminNotices(notices: AdminNotice[]): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(ADMIN_NOTICES_STORAGE_KEY, JSON.stringify(notices));
    return true;
  } catch (e) {
    console.warn('Erro ao salvar avisos no localStorage', e);
    return false;
  }
}

export function loadRegionalHighlights(): RegionalHighlight[] {
  if (typeof window === 'undefined') return MOCK_REGIONAL_HIGHLIGHTS;
  try {
    const raw = localStorage.getItem(REGIONAL_HIGHLIGHTS_STORAGE_KEY);
    if (!raw) return MOCK_REGIONAL_HIGHLIGHTS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (e) {
    console.warn('Erro ao carregar destaques do localStorage', e);
  }
  return MOCK_REGIONAL_HIGHLIGHTS;
}

export function saveRegionalHighlights(highlights: RegionalHighlight[]): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(REGIONAL_HIGHLIGHTS_STORAGE_KEY, JSON.stringify(highlights));
    return true;
  } catch (e) {
    console.warn('Erro ao salvar destaques no localStorage', e);
    return false;
  }
}

export function loadMerchantStats(restaurantId?: string): MerchantDemoStats {
  const targetId = restaurantId || 'rest-jorge-jpa';
  if (typeof window === 'undefined') {
    return MOCK_MERCHANT_STATS_MAP[targetId] || MOCK_MERCHANT_STATS;
  }
  try {
    const rawPerStore = localStorage.getItem(`zap_lanche_merchant_stats_${targetId}`);
    if (rawPerStore) {
      const parsed = JSON.parse(rawPerStore);
      if (parsed && typeof parsed === 'object' && parsed.restaurantId) {
        return parsed;
      }
    }
    const raw = localStorage.getItem(MERCHANT_STATS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.restaurantId === targetId) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Erro ao carregar estatísticas do lojista', e);
  }
  return MOCK_MERCHANT_STATS_MAP[targetId] || MOCK_MERCHANT_STATS;
}

export function saveMerchantStats(stats: MerchantDemoStats): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(MERCHANT_STATS_STORAGE_KEY, JSON.stringify(stats));
    if (stats.restaurantId) {
      localStorage.setItem(`zap_lanche_merchant_stats_${stats.restaurantId}`, JSON.stringify(stats));
    }
    return true;
  } catch (e) {
    console.warn('Erro ao salvar estatísticas do lojista', e);
    return false;
  }
}


// -------------------------------------------------------------
// PERSISTÊNCIA DE PRÊMIOS DE FIDELIDADE (GESTÃO PELO COMERCIANTE)
// -------------------------------------------------------------
export function loadCurrentNeighborhood(): Neighborhood {
  if (typeof window === 'undefined') return NEIGHBORHOODS[0];
  try {
    const raw = localStorage.getItem('zap_lanche_neighborhood_v1');
    if (!raw) return NEIGHBORHOODS[0];
    const parsed = JSON.parse(raw);
    const found = NEIGHBORHOODS.find((n) => n.id === parsed.id);
    if (found) return found;
    return NEIGHBORHOODS[0];
  } catch (e) {
    return NEIGHBORHOODS[0];
  }
}

export function saveCurrentNeighborhood(neighborhood: Neighborhood): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('zap_lanche_neighborhood_v1', JSON.stringify(neighborhood));
}

export function loadLoyaltyWallet(): LoyaltyPointWallet {
  const profile = loadUserProfile();
  return profile.loyaltyWallet;
}

export function saveLoyaltyWallet(wallet: LoyaltyPointWallet): void {
  const profile = loadUserProfile();
  saveUserProfile({ ...profile, loyaltyWallet: wallet });
}

// -------------------------------------------------------------
// PERSISTÊNCIA DE RESTAURANTES (EDIÇÃO DA LOJA PELO COMERCIANTE)
// -------------------------------------------------------------
export const RESTAURANTS_STORAGE_KEY = 'zap_lanche_restaurants_v2';

function isValidRestaurantArray(value: unknown): value is Restaurant[] {
  return Array.isArray(value) && value.every((item) => {
    if (!item || typeof item !== 'object') return false;
    return typeof (item as Partial<Restaurant>).id === 'string' && typeof (item as Partial<Restaurant>).name === 'string';
  });
}

export function loadRestaurants(): Restaurant[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RESTAURANTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (isValidRestaurantArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    console.warn('Erro ao carregar restaurantes do localStorage', e);
  }
  return [];
}

export function saveRestaurants(restaurants: Restaurant[]): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(RESTAURANTS_STORAGE_KEY, JSON.stringify(restaurants));
    return true;
  } catch (e) {
    console.warn('Erro ao salvar restaurantes no localStorage', e);
    return false;
  }
}

export function updateSingleRestaurant(updated: Restaurant): Restaurant[] {
  const current = loadRestaurants();
  const next = current.map((r) => (r.id === updated.id ? updated : r));
  saveRestaurants(next);
  return next;
}

// -------------------------------------------------------------
// PERSISTÊNCIA DE CARDÁPIOS (GESTÃO DE PRODUTOS PELO COMERCIANTE)
// -------------------------------------------------------------
export const MENU_ITEMS_STORAGE_KEY = 'zap_lanche_menu_items_v2';

export function loadAllMenuItems(): Record<string, MenuItem[]> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(MENU_ITEMS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch (e) {
    console.warn('Erro ao carregar cardápios do localStorage', e);
  }
  return {};
}

export function saveAllMenuItems(menuMap: Record<string, MenuItem[]>): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(MENU_ITEMS_STORAGE_KEY, JSON.stringify(menuMap));
    return true;
  } catch (e) {
    console.warn('Erro ao salvar cardápios no localStorage', e);
    return false;
  }
}

export function loadRestaurantMenu(restaurantId: string): MenuItem[] {
  const all = loadAllMenuItems();
  return all[restaurantId] || [];
}

export function saveRestaurantMenu(restaurantId: string, items: MenuItem[]): Record<string, MenuItem[]> {
  const all = loadAllMenuItems();
  const next = { ...all, [restaurantId]: items };
  saveAllMenuItems(next);
  return next;
}

// -------------------------------------------------------------
// PERSISTÊNCIA DE PRÊMIOS DE FIDELIDADE (REWARDS)
// -------------------------------------------------------------
export const REWARDS_STORAGE_KEY = 'zap_lanche_rewards_v2';

export function loadAllRewards(): Record<string, LoyaltyReward[]> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(REWARDS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch (e) {
    console.warn('Erro ao carregar prêmios do localStorage', e);
  }
  return {};
}

export function saveAllRewards(rewardsMap: Record<string, LoyaltyReward[]>): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(REWARDS_STORAGE_KEY, JSON.stringify(rewardsMap));
    return true;
  } catch (e) {
    console.warn('Erro ao salvar prêmios no localStorage', e);
    return false;
  }
}

export function loadRestaurantRewards(restaurantId: string): LoyaltyReward[] {
  const all = loadAllRewards();
  return all[restaurantId] || [];
}

export function saveRestaurantRewards(restaurantId: string, rewards: LoyaltyReward[]): Record<string, LoyaltyReward[]> {
  const all = loadAllRewards();
  const next = { ...all, [restaurantId]: rewards };
  saveAllRewards(next);
  return next;
}

export function loadPostsFromStorage(): SocialPost[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('zap_lanche_posts');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}
export const loadPostsToStorage = loadPostsFromStorage;

export function savePostsFromStorage(posts: SocialPost[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('zap_lanche_posts', JSON.stringify(posts));
  } catch {}
}
export const savePostsToStorage = savePostsFromStorage;

export async function processAndCompressImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selecione um arquivo de imagem válido.');
  }

  const imageUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = imageUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Não foi possível abrir esta imagem.'));
    });

    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Não foi possível preparar a imagem.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    // WebP reduz bastante o peso mantendo o enquadramento e a proporção originais.
    let quality = 0.82;
    let result = canvas.toDataURL('image/webp', quality);
    while (result.length * 0.75 > 500 * 1024 && quality > 0.52) {
      quality -= 0.08;
      result = canvas.toDataURL('image/webp', quality);
    }

    // Se ainda estiver grande, reduz dimensões proporcionalmente, sem cortar a foto.
    if (result.length * 0.75 > 500 * 1024) {
      const reduction = Math.sqrt((500 * 1024) / (result.length * 0.75));
      const smaller = document.createElement('canvas');
      smaller.width = Math.max(1, Math.round(canvas.width * reduction));
      smaller.height = Math.max(1, Math.round(canvas.height * reduction));
      const smallerContext = smaller.getContext('2d');
      if (!smallerContext) throw new Error('Não foi possível otimizar a imagem.');
      smallerContext.drawImage(canvas, 0, 0, smaller.width, smaller.height);
      result = smaller.toDataURL('image/webp', 0.68);
    }

    return result;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

