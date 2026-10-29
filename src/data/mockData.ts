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
    title: 'Prevenção de Convites Falsos',
    rule: 'Pontos de indicação são liberados apenas após validação de número e primeiro acesso efetivo do convidado na região.',
  },
  {
    id: 'af-2',
    title: 'Limite Diário de Check-in',
    rule: 'Máximo de 1 check-in validado por dia por cliente em cada estabelecimento, com validação de proximidade.',
  },
  {
    id: 'af-3',
    title: 'Auditoria de Avaliação com Foto',
    rule: 'Avaliações exigem foto real do lanche consumido. Imagens repetidas ou de banco de imagens são sinalizadas.',
  },
  {
    id: 'af-4',
    title: 'Regra de Fidelidade 70/30',
    rule: 'Pelo menos 70% do custo de qualquer recompensa deve vir de pontos daquele estabelecimento. Pontos globais de convite cobrem no máximo 30%.',
  },
  {
    id: 'af-5',
    title: 'Natureza do Orçamento Promocional',
    rule: 'O pacote de 3.000 pontos do comerciante é exclusivo para fidelização interna. Não é dinheiro, não pode ser sacado nem transferido.',
  },
];

export const NEIGHBORHOODS: Neighborhood[] = [
  { id: 'todos', name: 'Todos os Bairros', zone: 'Zona Oeste', city: 'Rio de Janeiro', state: 'RJ', activeSpotsCount: 4 },
  { id: 'jacarepagua', name: 'Jacarepaguá', zone: 'Zona Oeste', city: 'Rio de Janeiro', state: 'RJ', activeSpotsCount: 4 },
  { id: 'freguesia', name: 'Freguesia (Jacarepaguá)', zone: 'Zona Oeste', city: 'Rio de Janeiro', state: 'RJ', activeSpotsCount: 1 },
  { id: 'cidade-de-deus', name: 'Cidade de Deus', zone: 'Zona Oeste', city: 'Rio de Janeiro', state: 'RJ', activeSpotsCount: 1 },
  { id: 'taquara', name: 'Taquara', zone: 'Zona Oeste', city: 'Rio de Janeiro', state: 'RJ', activeSpotsCount: 1 },
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

export const MOCK_LOYALTY_REWARDS: Record<string, LoyaltyReward[]> = {
  'rest-jorge-jpa': [
    {
      id: 'rew-1',
      restaurantId: 'rest-jorge-jpa',
      restaurantName: 'Lanchonete do Jorge',
      title: 'Porção de Batata Rústica Individual',
      description: 'Batata dourada crocante temperada com alecrim e potinho de maionese verde caseira.',
      pointsCost: 300,
      stock: 20,
      status: 'ativo',
      isAvailable: true,
      maxRedemptionsPerUser: 1,
      maxGlobalPointsAllowed: 90, // 30%
      minStorePointsRequired: 210, // 70%
      imageUrl: ASSET_BURGER,
    },
    {
      id: 'rew-2',
      restaurantId: 'rest-jorge-jpa',
      restaurantName: 'Lanchonete do Jorge',
      title: 'Pudim Caseiro no Ponto',
      description: 'Fatia generosa do tradicional pudim da casa com calda dourada.',
      pointsCost: 200,
      stock: 15,
      status: 'ativo',
      isAvailable: true,
      maxRedemptionsPerUser: 1,
      maxGlobalPointsAllowed: 60, // 30%
      minStorePointsRequired: 140, // 70%
      imageUrl: ASSET_STORE,
    },
    {
      id: 'rew-3',
      restaurantId: 'rest-jorge-jpa',
      restaurantName: 'Lanchonete do Jorge',
      title: 'Smash Burger Clássico da Freguesia',
      description: 'Hambúrguer de 100g artesanal na chapa com cheddar derretido e pão brioche tostado.',
      pointsCost: 500,
      stock: 10,
      status: 'ativo',
      isAvailable: true,
      maxRedemptionsPerUser: 1,
      maxGlobalPointsAllowed: 150, // 30%
      minStorePointsRequired: 350, // 70%
      imageUrl: ASSET_BURGER,
    },
  ],
  'rest-dogao-pedro-cdd': [
    {
      id: 'rew-4',
      restaurantId: 'rest-dogao-pedro-cdd',
      restaurantName: 'Dogão do Pedro prensado',
      title: 'Refrigerante 350ml Gelado',
      description: 'Lata gelada à sua escolha para acompanhar seu dogão prensado.',
      pointsCost: 150,
      stock: 30,
      status: 'ativo',
      isAvailable: true,
      maxRedemptionsPerUser: 2,
      maxGlobalPointsAllowed: 45, // 30%
      minStorePointsRequired: 105, // 70%
      imageUrl: ASSET_DOGAO,
    },
    {
      id: 'rew-5',
      restaurantId: 'rest-dogao-pedro-cdd',
      restaurantName: 'Dogão do Pedro prensado',
      title: 'Dogão Simples da Chapa',
      description: 'Cachorro-quente prensado com purê, milho, vinagrete e batata palha.',
      pointsCost: 350,
      stock: 12,
      status: 'ativo',
      isAvailable: true,
      maxRedemptionsPerUser: 1,
      maxGlobalPointsAllowed: 105, // 30%
      minStorePointsRequired: 245, // 70%
      imageUrl: ASSET_DOGAO,
    },
  ],
  'rest-forno-taquara': [
    {
      id: 'rew-6',
      restaurantId: 'rest-forno-taquara',
      restaurantName: 'Pizzaria Forno da Taquara',
      title: 'Brotinho Doce de Chocolate',
      description: 'Mini pizza doce artesanal com cobertura cremosa de chocolate.',
      pointsCost: 280,
      stock: 15,
      status: 'ativo',
      isAvailable: true,
      maxRedemptionsPerUser: 1,
      maxGlobalPointsAllowed: 84, // 30%
      minStorePointsRequired: 196, // 70%
      imageUrl: ASSET_PIZZA,
    },
    {
      id: 'rew-7',
      restaurantId: 'rest-forno-taquara',
      restaurantName: 'Pizzaria Forno da Taquara',
      title: 'Refrigerante 2 Litros da Casa',
      description: 'Refrigerante de 2 litros gelado para sua noite de pizza em família.',
      pointsCost: 220,
      stock: 18,
      status: 'ativo',
      isAvailable: true,
      maxRedemptionsPerUser: 1,
      maxGlobalPointsAllowed: 66, // 30%
      minStorePointsRequired: 154, // 70%
      imageUrl: ASSET_PIZZA,
    },
  ],
  'rest-garagem-jpa': [
    {
      id: 'rew-8',
      restaurantId: 'rest-garagem-jpa',
      restaurantName: 'Garagem do Smash JPA',
      title: 'Porção de Batata Palito Crocante',
      description: 'Fritas sequinhas com tempero especial da casa.',
      pointsCost: 260,
      stock: 25,
      status: 'ativo',
      isAvailable: true,
      maxRedemptionsPerUser: 1,
      maxGlobalPointsAllowed: 78, // 30%
      minStorePointsRequired: 182, // 70%
      imageUrl: ASSET_BURGER,
    },
  ],
};

export const MOCK_REGIONAL_HIGHLIGHTS: RegionalHighlight[] = [
  {
    id: 'hl-1',
    restaurantId: 'rest-jorge-jpa',
    restaurantName: 'Lanchonete do Jorge',
    neighborhoodId: 'freguesia',
    neighborhoodName: 'Freguesia (Jacarepaguá)',
    requestedDuration: '2 Horas (Demonstração)',
    status: 'ativo',
    requestedAt: 'Hoje, às 19:30',
    endsAt: 'Hoje, às 21:30',
    isSponsored: true,
    estimatedPriceExample: 'R$ 10 (Exemplo Futuro)',
    launchPhaseFree: true,
  },
  {
    id: 'hl-2',
    restaurantId: 'rest-forno-taquara',
    restaurantName: 'Pizzaria Forno da Taquara',
    neighborhoodId: 'taquara',
    neighborhoodName: 'Taquara',
    requestedDuration: '12 Horas (Demonstração)',
    status: 'agendado',
    requestedAt: 'Hoje, às 17:00',
    scheduledFor: 'Amanhã, às 18:00',
    isSponsored: true,
    estimatedPriceExample: 'R$ 35 (Exemplo Futuro)',
    launchPhaseFree: true,
  },
  {
    id: 'hl-3',
    restaurantId: 'rest-garagem-jpa',
    restaurantName: 'Garagem do Smash JPA',
    neighborhoodId: 'jacarepagua',
    neighborhoodName: 'Jacarepaguá',
    requestedDuration: '2 Horas (Demonstração)',
    status: 'solicitado',
    requestedAt: 'Hoje, às 20:10',
    isSponsored: true,
    estimatedPriceExample: 'R$ 10 (Exemplo Futuro)',
    launchPhaseFree: true,
  },
  {
    id: 'hl-4',
    restaurantId: 'rest-dogao-pedro-cdd',
    restaurantName: 'Dogão do Pedro prensado',
    neighborhoodId: 'cidade-de-deus',
    neighborhoodName: 'Cidade de Deus',
    requestedDuration: '2 Horas (Demonstração)',
    status: 'encerrado',
    requestedAt: 'Ontem, às 18:00',
    endsAt: 'Ontem, às 20:00',
    isSponsored: true,
    estimatedPriceExample: 'R$ 10 (Exemplo Futuro)',
    launchPhaseFree: true,
  },
];

export const MOCK_RESTAURANTS: Restaurant[] = [
  {
    id: 'rest-jorge-jpa',
    name: 'Lanchonete do Jorge',
    ownerName: 'Jorge Ferreira',
    neighborhoodId: 'freguesia',
    neighborhoodName: 'Freguesia (Jacarepaguá)',
    category: 'hamburguer',
    categoryLabel: 'Hambúrguer Artesanal & Lanches de Chapa',
    rating: 4.9,
    reviewCount: 318,
    deliveryTime: '25-35 min',
    distanceKm: 0.9,
    deliveryFee: 4.0,
    minOrder: 25.0,
    priceRange: '$$',
    bannerUrl: ASSET_STORE,
    isOpen: true,
    openingHours: 'Ter a Dom: 18h às 00h',
    address: 'Estrada dos Três Rios, 520 (Demonstração)',
    whatsappDemo: '(21) 98000-0001 (Demonstração)',
    verifiedNeighborhoodSpot: true,
    bio: 'Ponto tradicional da vizinhança na Freguesia. Pão selado na manteiga, blend artesanal de fraldinha e maionese verde caseira. [Estabelecimento fictício de demonstração]',
    popularDishes: ['Smash Especial da Freguesia', 'X-Salada Tradicional da Chapa', 'Batata Rústica com Alecrim'],
    activeHighlight: MOCK_REGIONAL_HIGHLIGHTS[0],
    rewards: MOCK_LOYALTY_REWARDS['rest-jorge-jpa'],
  },
  {
    id: 'rest-dogao-pedro-cdd',
    name: 'Dogão do Pedro prensado',
    ownerName: 'Pedro Santos',
    neighborhoodId: 'cidade-de-deus',
    neighborhoodName: 'Cidade de Deus',
    category: 'lanches-dogao',
    categoryLabel: 'Cachorro-Quente & Lanches Rápidos',
    rating: 4.8,
    reviewCount: 215,
    deliveryTime: '20-30 min',
    distanceKm: 0.6,
    deliveryFee: 0,
    minOrder: 18.0,
    priceRange: '$',
    bannerUrl: ASSET_DOGAO,
    isOpen: true,
    openingHours: 'Seg a Sáb: 17h às 01h',
    address: 'Rua Daniel, 110 (Demonstração)',
    whatsappDemo: '(21) 98000-0002 (Demonstração)',
    verifiedNeighborhoodSpot: true,
    bio: 'Cachorro-quente prensado caprichado, purê cremoso, vinagrete fresco, queijo derretido e batata palha crocante. [Estabelecimento fictício de demonstração]',
    popularDishes: ['Dogão Especial Cidade de Deus', 'Dogão de Calabresa na Chapa', 'X-Tudo do Pedro'],
    rewards: MOCK_LOYALTY_REWARDS['rest-dogao-pedro-cdd'],
  },
  {
    id: 'rest-forno-taquara',
    name: 'Pizzaria Forno da Taquara',
    ownerName: 'Alessandra Forno',
    neighborhoodId: 'taquara',
    neighborhoodName: 'Taquara',
    category: 'pizza',
    categoryLabel: 'Pizzas Artesanais & Forno a Lenha',
    rating: 4.9,
    reviewCount: 420,
    deliveryTime: '35-45 min',
    distanceKm: 1.4,
    deliveryFee: 5.0,
    minOrder: 45.0,
    priceRange: '$$',
    bannerUrl: ASSET_PIZZA,
    isOpen: true,
    openingHours: 'Qua a Dom: 18h30 às 23h30',
    address: 'Estrada do Tindiba, 840 (Demonstração)',
    whatsappDemo: '(21) 98000-0003 (Demonstração)',
    verifiedNeighborhoodSpot: true,
    bio: 'Massa leve com fermentação artesanal, molho de tomates frescos e queijo gratinado na temperatura ideal. [Estabelecimento fictício de demonstração]',
    popularDishes: ['Pizza Margherita Especial da Taquara', 'Pizza Calabresa Artesanal', 'Quatro Queijos Gratinada'],
    rewards: MOCK_LOYALTY_REWARDS['rest-forno-taquara'],
  },
  {
    id: 'rest-garagem-jpa',
    name: 'Garagem do Smash JPA',
    ownerName: 'Rafael Smash',
    neighborhoodId: 'jacarepagua',
    neighborhoodName: 'Jacarepaguá',
    category: 'hamburguer',
    categoryLabel: 'Smash Burgers & Fritas Crocantes',
    rating: 4.7,
    reviewCount: 180,
    deliveryTime: '30-40 min',
    distanceKm: 1.8,
    deliveryFee: 4.5,
    minOrder: 30.0,
    priceRange: '$$',
    bannerUrl: ASSET_BURGER,
    isOpen: true,
    openingHours: 'Ter a Dom: 18h às 23h30',
    address: 'Estrada do Gabinal, 340 (Demonstração)',
    whatsappDemo: '(21) 98000-0004 (Demonstração)',
    verifiedNeighborhoodSpot: true,
    bio: 'Smash burgers com crostinha marcante na chapa de ferro fundido, cheddar cremoso e pão brioche dourado. [Estabelecimento fictício de demonstração]',
    popularDishes: ['Double Smash Bacon Jacarepaguá', 'Cheese Salada Smash Carioca', 'Fritas Rústicas com Maionese'],
    rewards: MOCK_LOYALTY_REWARDS['rest-garagem-jpa'],
  },
];

export const MOCK_MENU_ITEMS: Record<string, MenuItem[]> = {
  'rest-jorge-jpa': [
    {
      id: 'm1',
      restaurantId: 'rest-jorge-jpa',
      name: 'Smash Especial da Freguesia',
      description: 'Dois smash de 100g de fraldinha com crosta caramelizada na chapa, queijo cheddar cremoso, fatias de bacon crocante e cebola caramelizada.',
      price: 36.9,
      originalPrice: 42.0,
      imageUrl: ASSET_BURGER,
      category: 'Hambúrgueres',
      isAvailable: true,
      isPopular: true,
      badge: 'Mais Pedido no Bairro',
      prepTimeMinutes: 20,
    },
    {
      id: 'm2',
      restaurantId: 'rest-jorge-jpa',
      name: 'X-Salada Tradicional da Chapa',
      description: 'Blend de 160g suculento, queijo prato derretido, tomate fresco, alface crocante e a receita caseira de maionese verde temperada.',
      price: 28.5,
      imageUrl: ASSET_BURGER,
      category: 'Hambúrgueres',
      isAvailable: true,
      isPopular: true,
      prepTimeMinutes: 18,
    },
    {
      id: 'm3',
      restaurantId: 'rest-jorge-jpa',
      name: 'Batata Rústica com Alecrim',
      description: 'Batatas fritas com casca douradas na medida certa, flor de sal, alecrim fresco e potinho de molho de alho tostado.',
      price: 20.0,
      imageUrl: ASSET_BURGER,
      category: 'Acompanhamentos',
      isAvailable: true,
      prepTimeMinutes: 12,
    },
    {
      id: 'm4',
      restaurantId: 'rest-jorge-jpa',
      name: 'Pudim de Leite Condensado Caseiro',
      description: 'Fatia generosa e aveludada, sem furinhos, com calda de caramelo dourado no ponto clássico.',
      price: 13.0,
      imageUrl: ASSET_STORE,
      category: 'Sobremesas',
      isAvailable: true,
      prepTimeMinutes: 5,
    },
  ],
  'rest-dogao-pedro-cdd': [
    {
      id: 'm5',
      restaurantId: 'rest-dogao-pedro-cdd',
      name: 'Dogão Especial Cidade de Deus',
      description: 'Duas salsichas de qualidade, purê de batata artesanal, molho de tomate rústico, milho, vinagrete fresco, queijo derretido e batata palha fininha.',
      price: 21.0,
      originalPrice: 24.0,
      imageUrl: ASSET_DOGAO,
      category: 'Cachorro-Quente',
      isAvailable: true,
      isPopular: true,
      badge: 'Campeão de Vendas',
      prepTimeMinutes: 15,
    },
    {
      id: 'm6',
      restaurantId: 'rest-dogao-pedro-cdd',
      name: 'Dogão de Calabresa na Chapa',
      description: 'Linguiça calabresa defumada fatiada e chapeada com cebola, purê cremoso, queijo tostado e molho barbecue.',
      price: 23.5,
      imageUrl: ASSET_DOGAO,
      category: 'Cachorro-Quente',
      isAvailable: true,
      prepTimeMinutes: 15,
    },
  ],
  'rest-forno-taquara': [
    {
      id: 'm7',
      restaurantId: 'rest-forno-taquara',
      name: 'Pizza Margherita Especial da Taquara',
      description: 'Massa artesanal maturada, molho de tomate temperado, muçarela derretida, queijo parmesão e folhas frescas de manjericão.',
      price: 66.0,
      imageUrl: ASSET_PIZZA,
      category: 'Pizzas',
      isAvailable: true,
      isPopular: true,
      prepTimeMinutes: 30,
    },
    {
      id: 'm8',
      restaurantId: 'rest-forno-taquara',
      name: 'Pizza Calabresa Artesanal',
      description: 'Massa fina e crocante, calabresa defumada fatiada, rodelas finas de cebola e azeitonas pretas.',
      price: 60.0,
      imageUrl: ASSET_PIZZA,
      category: 'Pizzas',
      isAvailable: true,
      prepTimeMinutes: 25,
    },
  ],
  'rest-garagem-jpa': [
    {
      id: 'm9',
      restaurantId: 'rest-garagem-jpa',
      name: 'Double Smash Bacon Jacarepaguá',
      description: 'Dois discos de 90g prensados na chapa de ferro, cheddar derretido duplo, fatias de bacon crocante e molho especial no pão brioche.',
      price: 34.0,
      imageUrl: ASSET_BURGER,
      category: 'Hambúrgueres',
      isAvailable: true,
      isPopular: true,
      prepTimeMinutes: 20,
    },
    {
      id: 'm10',
      restaurantId: 'rest-garagem-jpa',
      name: 'Cheese Salada Smash Carioca',
      description: 'Smash burger 100g, queijo prato, picles suaves, alface, tomate fresco e maionese artesanal.',
      price: 27.0,
      imageUrl: ASSET_BURGER,
      category: 'Hambúrgueres',
      isAvailable: true,
      prepTimeMinutes: 18,
    },
  ],
};

export const MOCK_PROMOTIONS: Record<string, Promotion[]> = {
  'rest-jorge-jpa': [
    {
      id: 'promo-1',
      restaurantId: 'rest-jorge-jpa',
      restaurantName: 'Lanchonete do Jorge',
      title: 'Combo Vizinho da Freguesia',
      description: '1 Smash Especial da Freguesia + 1 Batata Individual + 1 Bebida em lata (Demonstração).',
      badge: 'Desconto de R$ 10',
      discountPrice: 46.0,
      regularPrice: 56.0,
      couponCode: 'FREGUESIA10',
      validUntil: 'Hoje até às 23h59',
      imageUrl: ASSET_BURGER,
    },
    {
      id: 'promo-2',
      restaurantId: 'rest-jorge-jpa',
      restaurantName: 'Lanchonete do Jorge',
      title: 'Quarta do Smash com Batata Cortesia',
      description: 'Na compra de 2 Smash Burgers artesanais, ganhe 1 porção de batata rústica com alecrim.',
      badge: 'Batata Cortesia',
      discountPrice: 65.0,
      regularPrice: 85.0,
      couponCode: 'SMASHJPA',
      validUntil: 'Válido até domingo',
      imageUrl: ASSET_STORE,
    },
  ],
  'rest-dogao-pedro-cdd': [
    {
      id: 'promo-3',
      restaurantId: 'rest-dogao-pedro-cdd',
      restaurantName: 'Dogão do Pedro prensado',
      title: 'Dose Dupla Cidade de Deus',
      description: '2 Dogões Especiais Completos + 1 Refrigerante 600ml (Demonstração).',
      badge: 'Entrega Grátis na Região',
      discountPrice: 40.0,
      regularPrice: 50.0,
      couponCode: 'DOGAOCDD',
      validUntil: 'Válido até 01h',
      imageUrl: ASSET_DOGAO,
    },
  ],
  'rest-forno-taquara': [
    {
      id: 'promo-4',
      restaurantId: 'rest-forno-taquara',
      restaurantName: 'Pizzaria Forno da Taquara',
      title: 'Noite da Pizza na Taquara',
      description: 'Qualquer pizza grande salgada acompanhada de refrigerante cortesia.',
      badge: 'Promoção do Bairro',
      discountPrice: 66.0,
      regularPrice: 78.0,
      couponCode: 'TAQUARAPIZZA',
      validUntil: 'Válido terças e quintas',
      imageUrl: ASSET_PIZZA,
    },
  ],
  'rest-garagem-jpa': [
    {
      id: 'promo-5',
      restaurantId: 'rest-garagem-jpa',
      restaurantName: 'Garagem do Smash JPA',
      title: 'Quinta do Burger em Jacarepaguá',
      description: 'Double Smash Bacon com desconto especial para moradores de Jacarepaguá.',
      badge: 'Desconto de R$ 7',
      discountPrice: 29.0,
      regularPrice: 36.0,
      couponCode: 'JPAQUINTA',
      validUntil: 'Válido até 23h30',
      imageUrl: ASSET_BURGER,
    },
  ],
};

export const MOCK_POSTS: SocialPost[] = [
  {
    id: 'post-1',
    restaurantId: 'rest-jorge-jpa',
    restaurantName: 'Lanchonete do Jorge',
    restaurantCategory: 'Hambúrguer Artesanal',
    neighborhood: 'Freguesia (Jacarepaguá)',
    authorId: 'usr-renato-souza',
    authorName: 'Renato Souza',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    authorRole: 'morador',
    content: 'O Smash Especial da Lanchonete do Jorge aqui na Freguesia é impecável! Carne no ponto certo, queijo bem derretido e a maionese verde com sabor caseiro.',
    imageUrl: ASSET_BURGER,
    likesCount: 128,
    isLiked: false,
    commentsCount: 1,
    comments: [
      {
        id: 'comm-1',
        authorId: 'usr-marcelo-freguesia',
        profile_id: 'usr-marcelo-freguesia',
        authorName: 'Marcelo (Morador da Freguesia)',
        authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
        text: 'Muito bom ver mais fotos reais aqui no feed da região!',
        createdAt: 'Há 25 minutos',
      },
    ],
    createdAt: 'Há 45 minutos',
    hasPhotoValidation: true,
    isOwnPost: false,
    taggedDish: {
      id: 'm1',
      name: 'Smash Especial da Freguesia',
      price: 36.9,
    },
  },
  {
    id: 'post-2',
    restaurantId: 'rest-dogao-pedro-cdd',
    restaurantName: 'Dogão do Pedro prensado',
    restaurantCategory: 'Cachorro-Quente',
    neighborhood: 'Cidade de Deus',
    authorId: 'usr-pedro-lanches',
    authorName: 'Pedro Lanches',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    authorRole: 'comerciante',
    content: 'Chapa quente e purê fresquinho saindo agora para os vizinhos da Cidade de Deus! Quem chamar no Zap ganha sachê extra de vinagrete caseiro.',
    imageUrl: ASSET_DOGAO,
    likesCount: 94,
    isLiked: true,
    commentsCount: 0,
    comments: [],
    createdAt: 'Há 2 horas',
    hasPhotoValidation: true,
    isOwnPost: false,
    taggedDish: {
      id: 'm5',
      name: 'Dogão Especial Cidade de Deus',
      price: 21.0,
    },
  },
  {
    id: 'post-3',
    restaurantId: 'rest-forno-taquara',
    restaurantName: 'Pizzaria Forno da Taquara',
    restaurantCategory: 'Pizzas Artesanais',
    neighborhood: 'Taquara',
    authorId: 'usr-camila-ribeiro',
    authorName: 'Camila Ribeiro',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    authorRole: 'critico_do_bairro',
    content: 'A massa da Forno da Taquara é muito leve. A borda dourada e o aroma de manjericão fresco deixam o quarteirão com cheiro de pizzaria de verdade.',
    imageUrl: ASSET_PIZZA,
    likesCount: 185,
    isLiked: false,
    commentsCount: 0,
    comments: [],
    createdAt: 'Há 4 horas',
    hasPhotoValidation: true,
    isOwnPost: false,
    taggedDish: {
      id: 'm7',
      name: 'Pizza Margherita Especial da Taquara',
      price: 66.0,
    },
  },
];

export const MOCK_USER_PROFILE: UserProfileDemo = {
  id: 'usr-thiago-jpa',
  name: 'Thiago da Silva',
  username: '@thiago.lanches',
  neighborhood: 'Freguesia (Jacarepaguá), Rio de Janeiro - RJ',
  avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
  bio: 'Avaliador amador de lanches de bairro, caçador de x-tudo e apoiador dos comércios locais em Jacarepaguá e Freguesia. [Perfil fictício de demonstração]',
  memberSince: 'Março de 2024',
  reviewsCount: 28,
  likedPostsCount: 76,
  savedSpotsCount: 9,
  loyaltyWallet: {
    // 120 pontos globais conquistados através de convites válidos
    globalReferralPoints: 120,
    // Pontos acumulados exclusivamente em cada estabelecimento
    storePoints: {
      'rest-jorge-jpa': 360,
      'rest-dogao-pedro-cdd': 180,
      'rest-forno-taquara': 220,
      'rest-garagem-jpa': 90,
    },
  },
  foodieBadges: [
    {
      id: 'b1',
      label: 'Fã de Jacarepaguá & Freguesia',
      icon: 'Award',
      description: 'Mais de 15 pedidos simulados em lanchonetes da região',
    },
    {
      id: 'b2',
      label: 'Caçador de Smash Burger',
      icon: 'Flame',
      description: 'Avaliou hamburguerias artesanais da vizinhança',
    },
    {
      id: 'b3',
      label: 'Vizinho Conectado',
      icon: 'Users',
      description: 'Interagiu no feed comunitário de gastronomia',
    },
  ],
  checkinHistory: [],
  recentOrders: [
    {
      id: 'ord-8921',
      restaurantId: 'rest-jorge-jpa',
      restaurantName: 'Lanchonete do Jorge',
      date: 'Ontem, às 20:45',
      itemsSummary: '1x Smash Especial da Freguesia + 1x Batata Rústica',
      total: 56.9,
      status: 'Entregue',
    },
    {
      id: 'ord-8714',
      restaurantId: 'rest-dogao-pedro-cdd',
      restaurantName: 'Dogão do Pedro prensado',
      date: '11 de Outubro, às 21:50',
      itemsSummary: '2x Dogão Especial Cidade de Deus',
      total: 42.0,
      status: 'Entregue',
    },
    {
      id: 'ord-8602',
      restaurantId: 'rest-forno-taquara',
      restaurantName: 'Pizzaria Forno da Taquara',
      date: '06 de Outubro, às 20:30',
      itemsSummary: '1x Pizza Margherita Especial da Taquara',
      total: 71.0,
      status: 'Entregue',
    },
  ],
};

export const MOCK_MERCHANT_STATS_MAP: Record<string, MerchantDemoStats> = {
  'rest-jorge-jpa': {
    restaurantId: 'rest-jorge-jpa',
    restaurantName: 'Lanchonete do Jorge',
    neighborhood: 'Freguesia (Jacarepaguá)',
    ownerName: 'Jorge Ferreira',
    viewsThisWeek: 1620,
    zapClicksThisWeek: 284,
    feedInteractions: 470,
    topDishName: 'Smash Especial da Freguesia',
    topDishOrders: 132,
    pendingZapOrdersCount: 3,
    monthlyRevenueEstimate: 16200.0,
    promotionalPointBudget: 3000,
    promotionalPointsDistributed: 640,
    rewards: MOCK_LOYALTY_REWARDS['rest-jorge-jpa'],
    concessionsHistory: [
      {
        id: 'dc-1',
        restaurantId: 'rest-jorge-jpa',
        restaurantName: 'Lanchonete do Jorge',
        points: 30,
        reason: 'Check-in de Mesa com Proximidade',
        date: 'Hoje, às 19:40',
        validationStatus: 'simulada_validada',
        operatorNote: 'Validação presencial simulada no balcão',
      },
    ],
    highlightStatus: 'ativo',
    highlightHistory: [
      {
        id: 'hh-1',
        neighborhoodName: 'Freguesia (Jacarepaguá)',
        duration: '2 Horas (Demonstração)',
        status: 'ativo',
        date: 'Hoje, às 19:30',
      },
      {
        id: 'hh-2',
        neighborhoodName: 'Freguesia (Jacarepaguá)',
        duration: '12 Horas (Demonstração)',
        status: 'encerrado',
        date: '08 de Outubro, às 18:00',
      },
    ],
  },
  'rest-dogao-pedro-cdd': {
    restaurantId: 'rest-dogao-pedro-cdd',
    restaurantName: 'Dogão do Pedro prensado',
    neighborhood: 'Cidade de Deus',
    ownerName: 'Pedro Santos',
    viewsThisWeek: 980,
    zapClicksThisWeek: 195,
    feedInteractions: 310,
    topDishName: 'Dogão Especial Cidade de Deus',
    topDishOrders: 94,
    pendingZapOrdersCount: 2,
    monthlyRevenueEstimate: 11400.0,
    promotionalPointBudget: 3000,
    promotionalPointsDistributed: 420,
    rewards: MOCK_LOYALTY_REWARDS['rest-dogao-pedro-cdd'],
    concessionsHistory: [],
    highlightStatus: 'encerrado',
    highlightHistory: [
      {
        id: 'hh-3',
        neighborhoodName: 'Cidade de Deus',
        duration: '2 Horas (Demonstração)',
        status: 'encerrado',
        date: 'Ontem, às 18:00',
      },
    ],
  },
  'rest-forno-taquara': {
    restaurantId: 'rest-forno-taquara',
    restaurantName: 'Pizzaria Forno da Taquara',
    neighborhood: 'Taquara',
    ownerName: 'Alessandra Forno',
    viewsThisWeek: 1450,
    zapClicksThisWeek: 230,
    feedInteractions: 520,
    topDishName: 'Pizza Margherita Especial da Taquara',
    topDishOrders: 110,
    pendingZapOrdersCount: 4,
    monthlyRevenueEstimate: 19800.0,
    promotionalPointBudget: 3000,
    promotionalPointsDistributed: 780,
    rewards: MOCK_LOYALTY_REWARDS['rest-forno-taquara'],
    concessionsHistory: [],
    highlightStatus: 'agendado',
    highlightHistory: [
      {
        id: 'hh-4',
        neighborhoodName: 'Taquara',
        duration: '12 Horas (Demonstração)',
        status: 'agendado',
        date: 'Hoje, às 17:00',
      },
    ],
  },
  'rest-garagem-jpa': {
    restaurantId: 'rest-garagem-jpa',
    restaurantName: 'Garagem do Smash JPA',
    neighborhood: 'Jacarepaguá',
    ownerName: 'Rafael Smash',
    viewsThisWeek: 890,
    zapClicksThisWeek: 160,
    feedInteractions: 240,
    topDishName: 'Double Smash Bacon Jacarepaguá',
    topDishOrders: 78,
    pendingZapOrdersCount: 1,
    monthlyRevenueEstimate: 9200.0,
    promotionalPointBudget: 3000,
    promotionalPointsDistributed: 310,
    rewards: MOCK_LOYALTY_REWARDS['rest-garagem-jpa'],
    concessionsHistory: [],
    highlightStatus: 'solicitado',
    highlightHistory: [
      {
        id: 'hh-5',
        neighborhoodName: 'Jacarepaguá',
        duration: '2 Horas (Demonstração)',
        status: 'solicitado',
        date: 'Hoje, às 20:10',
      },
    ],
  },
};

export const MOCK_MERCHANT_STATS: MerchantDemoStats = MOCK_MERCHANT_STATS_MAP['rest-jorge-jpa'];

export const MOCK_ADMIN_NOTICES: AdminNotice[] = [
  {
    id: 'not-1',
    title: 'Fase de Lançamento Gratuito em Jacarepaguá & Região!',
    content: 'O ZAP LANCHE é 100% gratuito para moradores e comércios locais. Conheça as lanchonetes de bairro e aproveite os prêmios do Clube de Fidelidade.',
    targetNeighborhood: 'Todos os Bairros',
    active: true,
    createdAt: 'Hoje',
  },
  {
    id: 'not-2',
    title: 'Horário Especial de Sexta na Freguesia e Taquara',
    content: 'Diversos estabelecimentos parceiros com atendimento estendido até a madrugada pelo WhatsApp.',
    targetNeighborhood: 'Freguesia e Taquara',
    active: true,
    createdAt: 'Ontem',
  },
];

export const MOCK_ADMIN_AUDIT_LOGS: AdminAuditLog[] = [
  {
    id: 'log-1',
    action: 'Aprovação de Lanchonete',
    detail: 'Pizzaria Forno da Taquara aprovada para operação comunitária.',
    performedBy: 'Administradora Geral',
    timestamp: 'Hoje, às 14:22',
  },
  {
    id: 'log-2',
    action: 'Destaque Regional Ativado',
    detail: 'Lanchonete do Jorge ativada no topo da Freguesia (Modo Lançamento Gratuito).',
    performedBy: 'Administradora Geral',
    timestamp: 'Hoje, às 19:30',
  },
  {
    id: 'log-3',
    action: 'Concessão de Orçamento de Fidelidade',
    detail: 'Liberado pacote padrão de 3.000 pontos promocionais para nova adesão.',
    performedBy: 'Sistema Automático',
    timestamp: 'Ontem, às 10:00',
  },
];

export const MOCK_ADMIN_STATS: AdminDemoStats = {
  totalNeighborhoods: 4,
  activeMerchants: 48,
  communityPosts: 620,
  zapDirectsCount: 2340,
  defaultPointBudget: 3000,
  futureHighlightPriceExample: 'R$ 10 por 2 horas (Exemplo Futuro)',
  highlightRequests: MOCK_REGIONAL_HIGHLIGHTS,
  notices: MOCK_ADMIN_NOTICES,
  auditLogs: MOCK_ADMIN_AUDIT_LOGS,
  pendingApprovals: [
    {
      id: 'ap-1',
      name: 'Pastelaria da Praça Seca / Taquara',
      neighborhood: 'Taquara',
      category: 'Pastéis & Caldos',
      requestedAt: 'Há 25 minutos',
      whatsapp: '(21) 98000-0010 (Demonstração)',
    },
    {
      id: 'ap-2',
      name: 'Açaí Raiz de Jacarepaguá',
      neighborhood: 'Jacarepaguá',
      category: 'Açaí & Sucos',
      requestedAt: 'Há 1 hora',
      whatsapp: '(21) 98000-0020 (Demonstração)',
    },
    {
      id: 'ap-3',
      name: 'Cantinho do Lanche Carioca',
      neighborhood: 'Cidade de Deus',
      category: 'Lanches & Dogão',
      requestedAt: 'Há 3 horas',
      whatsapp: '(21) 98000-0030 (Demonstração)',
    },
  ],
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
  if (typeof window === 'undefined') return MOCK_RESTAURANTS;
  try {
    const raw = localStorage.getItem(RESTAURANTS_STORAGE_KEY);
    if (!raw) return MOCK_RESTAURANTS;
    const parsed = JSON.parse(raw);
    if (isValidRestaurantArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    console.warn('Erro ao carregar restaurantes do localStorage', e);
  }
  return MOCK_RESTAURANTS;
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
  if (typeof window === 'undefined') return MOCK_MENU_ITEMS;
  try {
    const raw = localStorage.getItem(MENU_ITEMS_STORAGE_KEY);
    if (!raw) return MOCK_MENU_ITEMS;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return { ...MOCK_MENU_ITEMS, ...parsed };
    }
  } catch (e) {
    console.warn('Erro ao carregar cardápios do localStorage', e);
  }
  return MOCK_MENU_ITEMS;
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
  return all[restaurantId] || MOCK_MENU_ITEMS[restaurantId] || [];
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
  if (typeof window === 'undefined') return MOCK_LOYALTY_REWARDS;
  try {
    const raw = localStorage.getItem(REWARDS_STORAGE_KEY);
    if (!raw) return MOCK_LOYALTY_REWARDS;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return { ...MOCK_LOYALTY_REWARDS, ...parsed };
    }
  } catch (e) {
    console.warn('Erro ao carregar prêmios do localStorage', e);
  }
  return MOCK_LOYALTY_REWARDS;
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
  return all[restaurantId] || MOCK_LOYALTY_REWARDS[restaurantId] || [];
}

export function saveRestaurantRewards(restaurantId: string, rewards: LoyaltyReward[]): Record<string, LoyaltyReward[]> {
  const all = loadAllRewards();
  const next = { ...all, [restaurantId]: rewards };
  saveAllRewards(next);
  return next;
}

