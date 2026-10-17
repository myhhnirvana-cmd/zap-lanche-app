export interface Neighborhood {
  id: string;
  name: string;
  zone: string;
  city: string;
  state: string;
  activeSpotsCount: number;
}

export type FoodCategory =
  | 'todos'
  | 'hamburguer'
  | 'lanches-dogao'
  | 'pizza'
  | 'pasteis'
  | 'acai'
  | 'caseira'
  | 'porcoes'
  | 'sobremesas';

export interface CategoryInfo {
  id: FoodCategory;
  name: string;
  iconName: string;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  category: string;
  isAvailable: boolean;
  isPopular?: boolean;
  badge?: string;
  prepTimeMinutes?: number;
}

export interface Promotion {
  id: string;
  restaurantId: string;
  restaurantName: string;
  title: string;
  description: string;
  badge: string;
  discountPrice: number;
  regularPrice: number;
  couponCode?: string;
  validUntil: string;
  imageUrl: string;
}

// -------------------------------------------------------------
// PROGRAMA DE PONTOS & FIDELIDADE (REGRAS 70/30 E ORÇAMENTO)
// -------------------------------------------------------------
export type RewardStatus = 'ativo' | 'pausado' | 'esgotado';

export interface LoyaltyReward {
  id: string;
  restaurantId: string;
  restaurantName: string;
  title: string;
  description: string;
  pointsCost: number; // Custo total de pontos (> 0)
  isAvailable: boolean;
  maxGlobalPointsAllowed: number; // Até 30% do custo
  minStorePointsRequired: number; // Pelo menos 70% do custo
  imageUrl?: string;
  stock: number; // Quantidade de unidades em estoque (inteiro >= 0)
  status: RewardStatus; // 'ativo' | 'pausado' | 'esgotado'
  maxRedemptionsPerUser?: number; // Limite opcional de resgates por cliente
}

export interface DemoPointConcession {
  id: string;
  restaurantId: string;
  restaurantName: string;
  points: number;
  reason: string;
  date: string;
  validationStatus: 'simulada_validada' | 'pendente';
  operatorNote: string;
}

export type UserRole = 'cliente' | 'comerciante' | 'admin';

export interface AppUserSession {
  userId: string;
  role: UserRole;
  merchantStoreId?: string; // Vinculado à loja quando comerciante
  isDemoSession: boolean;
}

export interface LoyaltyPointWallet {
  // Pontos globais obtidos exclusivamente por convites válidos
  globalReferralPoints: number;
  // Pontos específicos de cada estabelecimento (obtidos por check-in ou avaliação com foto)
  storePoints: Record<string, number>;
}

// -------------------------------------------------------------
// DESTAQUE REGIONAL (5 ESTADOS E PATROCÍNIO)
// -------------------------------------------------------------
export type HighlightStatus = 'solicitado' | 'aprovado' | 'agendado' | 'ativo' | 'encerrado';

export interface RegionalHighlight {
  id: string;
  restaurantId: string;
  restaurantName: string;
  neighborhoodId: string;
  neighborhoodName: string;
  requestedDuration: string; // Ex: "2 Horas (Demonstração)", "24 Horas"
  status: HighlightStatus;
  requestedAt: string;
  scheduledFor?: string;
  endsAt?: string;
  isSponsored: boolean;
  estimatedPriceExample: string; // Ex: "R$ 10 (Exemplo Futuro)"
  launchPhaseFree: boolean; // Sempre true na fase de lançamento
}

export interface Restaurant {
  id: string;
  name: string;
  ownerName?: string;
  neighborhoodId: string;
  neighborhoodName: string;
  category: FoodCategory;
  categoryLabel: string;
  rating: number;
  reviewCount: number;
  deliveryTime: string;
  distanceKm: number;
  deliveryFee: number;
  minOrder: number;
  priceRange: '$' | '$$' | '$$$';
  bannerUrl: string;
  logoUrl?: string;
  isOpen: boolean;
  openingHours: string;
  address: string;
  whatsappDemo: string;
  verifiedNeighborhoodSpot: boolean;
  bio: string;
  popularDishes: string[];
  activeHighlight?: RegionalHighlight;
  rewards?: LoyaltyReward[];
}

export interface PostComment {
  id: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  createdAt: string;
}

export interface SocialPost {
  id: string;
  restaurantId: string;
  restaurantName: string;
  restaurantCategory: string;
  neighborhood: string;
  authorId?: string; // Identificador estável do autor (regra de interface para o protótipo)
  authorName: string;
  authorAvatar: string;
  authorRole: 'morador' | 'comerciante' | 'critico_do_bairro';
  content: string;
  imageUrl?: string; // Opcional: permite publicações somente com texto
  likesCount: number;
  isLiked?: boolean;
  commentsCount: number;
  comments?: PostComment[];
  createdAt: string;
  editedAt?: string; // Registro de data/hora de edição
  isOwnPost?: boolean; // Sinalizador de conveniência no protótipo
  taggedDish?: {
    id: string;
    name: string;
    price: number;
  };
  hasPhotoValidation?: boolean; // Avaliação acompanhada de foto auditada
  isModerated?: boolean;
}

export interface UserProfileDemo {
  id: string;
  name: string;
  username: string;
  neighborhood: string;
  avatarUrl: string;
  bio: string;
  memberSince: string;
  reviewsCount: number;
  likedPostsCount: number;
  savedSpotsCount: number;
  loyaltyWallet: LoyaltyPointWallet;
  foodieBadges: {
    id: string;
    label: string;
    icon: string;
    description: string;
  }[];
  recentOrders: {
    id: string;
    restaurantId?: string;
    restaurantName: string;
    date: string;
    itemsSummary: string;
    total: number;
    status: 'Concluído' | 'Entregue' | 'Retirado';
  }[];
  checkinHistory: {
    restaurantId: string;
    restaurantName: string;
    date: string;
    points: number;
  }[];
}

export interface MerchantDemoStats {
  restaurantId: string;
  restaurantName: string;
  neighborhood: string;
  ownerName: string;
  viewsThisWeek: number;
  zapClicksThisWeek: number;
  feedInteractions: number;
  topDishName: string;
  topDishOrders: number;
  pendingZapOrdersCount: number;
  monthlyRevenueEstimate: number;
  // Orçamento promocional de fidelidade (3.000 pontos de inauguração)
  promotionalPointBudget: number;
  promotionalPointsDistributed: number;
  rewards: LoyaltyReward[];
  concessionsHistory?: DemoPointConcession[];
  highlightStatus: HighlightStatus | 'nenhum';
  highlightHistory: {
    id: string;
    neighborhoodName: string;
    duration: string;
    status: HighlightStatus;
    date: string;
  }[];
}

export interface AdminNotice {
  id: string;
  title: string;
  content: string;
  targetNeighborhood: string; // "Todos" ou nome do bairro
  active: boolean;
  createdAt: string;
}

export interface AdminAuditLog {
  id: string;
  action: string;
  detail: string;
  performedBy: string;
  timestamp: string;
}

export interface AdminDemoStats {
  totalNeighborhoods: number;
  activeMerchants: number;
  communityPosts: number;
  zapDirectsCount: number;
  defaultPointBudget: number; // 3000
  futureHighlightPriceExample: string; // Ex: "R$ 10 por 2 horas"
  highlightRequests: RegionalHighlight[];
  pendingApprovals: {
    id: string;
    name: string;
    neighborhood: string;
    category: string;
    requestedAt: string;
    whatsapp: string;
  }[];
  notices: AdminNotice[];
  auditLogs: AdminAuditLog[];
}

export type ActiveTab = 'explorar' | 'feed' | 'restaurante' | 'perfil' | 'lojista' | 'admin';
