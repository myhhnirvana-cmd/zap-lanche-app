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

export interface Restaurant {
  id: string;
  name: string;
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
  authorName: string;
  authorAvatar: string;
  authorRole: 'morador' | 'comerciante' | 'critico_do_bairro';
  content: string;
  imageUrl: string;
  likesCount: number;
  isLiked?: boolean;
  commentsCount: number;
  createdAt: string;
  taggedDish?: {
    id: string;
    name: string;
    price: number;
  };
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
  foodieBadges: {
    id: string;
    label: string;
    icon: string;
    description: string;
  }[];
  recentOrders: {
    id: string;
    restaurantName: string;
    date: string;
    itemsSummary: string;
    total: number;
    status: 'Concluído' | 'Entregue' | 'Retirado';
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
}

export interface AdminDemoStats {
  totalNeighborhoods: number;
  activeMerchants: number;
  communityPosts: number;
  zapDirectsCount: number;
  pendingApprovals: {
    id: string;
    name: string;
    neighborhood: string;
    category: string;
    requestedAt: string;
    whatsapp: string;
  }[];
}

export type ActiveTab = 'explorar' | 'feed' | 'restaurante' | 'perfil' | 'lojista' | 'admin';
