
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Restaurant, MenuItem } from '../types';
import { MOCK_RESTAURANTS, MOCK_MENU_ITEMS } from '../data/mockData';

// Obtenção das variáveis injetadas via Vite no ambiente cliente.
const viteEnv =
  typeof import.meta !== 'undefined'
    ? ((import.meta as any).env ?? {})
    : {};

const supabaseUrl = viteEnv.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = viteEnv.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Indica se as credenciais do Supabase estão configuradas.
 */
export const isSupabaseConfigured = Boolean(
  supabaseUrl?.trim() &&
  supabaseAnonKey?.trim()
);

/**
 * Instância centralizada do cliente Supabase.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

/**
 * Bucket padrão de imagens do Supabase Storage.
 */
export const SUPABASE_STORAGE_BUCKET = 'Zaplanche-images';

/**
 * Busca os restaurantes ativos no Supabase.
 * Retorna null quando não é possível consultar os dados reais.
 */
export async function fetchRestaurantsFromSupabase(): Promise<Restaurant[] | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('status', 'ativo');

    if (error || !data || data.length === 0) {
      if (error) {
        console.error('Falha ao consultar restaurantes:', error.message);
      }
      return null;
    }

    const mergedRestaurants: Restaurant[] = data.map((row: any) => {
      const localMatch = MOCK_RESTAURANTS.find(
        (item) => item.id === row.slug || item.id === row.id
      );

      if (!localMatch) {
        return {
          id: row.slug || row.id,
          supabaseId: row.id,
          name: row.name || 'Lanchonete',
          neighborhoodId: 'todos',
          neighborhoodName: row.neighborhood || 'Bairro',
          category: 'hamburguer',
          categoryLabel: 'Lanches de Bairro',
          rating: 4.8,
          reviewCount: 1,
          deliveryTime: '30-40 min',
          distanceKm: 1.0,
          deliveryFee: 0,
          minOrder: 20.0,
          priceRange: '$$',
          bannerUrl:
            row.image_url ||
            '/src/assets/images/lanchonete_front_1792014252947.jpg',
          isOpen: row.status === 'ativo',
          openingHours: '18h às 23h30',
          address: row.address || '',
          whatsappDemo: row.whatsapp || '',
          verifiedNeighborhoodSpot: true,
          bio: row.description || '',
          popularDishes: [],
          ownerProfileId: row.owner_profile_id || undefined,
        } as Restaurant;
      }

      return {
        ...localMatch,
        id: row.slug || localMatch.id,
        supabaseId: row.id,
        name: row.name || localMatch.name,
        bio: row.description || localMatch.bio,
        address: row.address || localMatch.address,
        neighborhoodName:
          row.neighborhood || localMatch.neighborhoodName,
        whatsappDemo: row.whatsapp || localMatch.whatsappDemo,
        bannerUrl: row.image_url || localMatch.bannerUrl,
        isOpen: row.status === 'ativo',
        ownerProfileId: row.owner_profile_id || undefined,
      };
    });

    return mergedRestaurants;
  } catch (err) {
    console.warn(
      'Falha na consulta ao Supabase, mantendo dados locais:',
      err
    );
    return null;
  }
}

/**
 * Busca o restaurante associado ao comerciante autenticado.
 */
export async function fetchMerchantRestaurant(
  userId: string
): Promise<Restaurant | null> {
  if (!isSupabaseConfigured || !supabase || !userId) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('owner_profile_id', userId)
      .eq('status', 'ativo')
      .maybeSingle();

    if (error || !data) {
      if (error) {
        console.error(
          'Falha ao consultar restaurante do comerciante:',
          error.message
        );
      }
      return null;
    }

    const localMatch = MOCK_RESTAURANTS.find(
      (item) => item.id === data.slug || item.id === data.id
    );

    if (!localMatch) {
      return {
        id: data.slug || data.id,
        supabaseId: data.id,
        name: data.name || 'Lanchonete',
        neighborhoodId: 'todos',
        neighborhoodName: data.neighborhood || 'Bairro',
        category: 'hamburguer',
        categoryLabel: 'Lanches de Bairro',
        rating: 4.8,
        reviewCount: 1,
        deliveryTime: '30-40 min',
        distanceKm: 1.0,
        deliveryFee: 0,
        minOrder: 20.0,
        priceRange: '$$',
        bannerUrl:
          data.image_url ||
          '/src/assets/images/lanchonete_front_1792014252947.jpg',
        isOpen: data.status === 'ativo',
        openingHours: '18h às 23h30',
        address: data.address || '',
        whatsappDemo: data.whatsapp || '',
        verifiedNeighborhoodSpot: true,
        bio: data.description || '',
        popularDishes: [],
        ownerProfileId: data.owner_profile_id || undefined,
      } as Restaurant;
    }

    return {
      ...localMatch,
      id: data.slug || localMatch.id,
      supabaseId: data.id,
      name: data.name || localMatch.name,
      bio: data.description || localMatch.bio,
      address: data.address || localMatch.address,
      neighborhoodName:
        data.neighborhood || localMatch.neighborhoodName,
      whatsappDemo: data.whatsapp || localMatch.whatsappDemo,
      bannerUrl: data.image_url || localMatch.bannerUrl,
      isOpen: data.status === 'ativo',
      ownerProfileId: data.owner_profile_id || undefined,
    };
  } catch (err) {
    console.warn(
      'Erro ao consultar restaurante do comerciante:',
      err
    );
    return null;
  }
}

/**
 * Cache em memória dos produtos carregados do Supabase.
 */
export let supabaseMenuCache: Record<string, MenuItem[]> | null = null;

/**
 * Busca os produtos disponíveis no Supabase e os agrupa por restaurante.
 */
export async function fetchMenuItemsFromSupabase(
  restaurants: Restaurant[]
): Promise<Record<string, MenuItem[]> | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('available', true);

    if (error || !data || data.length === 0) {
      if (error) {
        console.error('Falha ao consultar produtos:', error.message);
      }
      return null;
    }

    const uuidToSlugMap = new Map<string, string>();

    for (const restaurant of restaurants) {
      if (restaurant.supabaseId) {
        uuidToSlugMap.set(restaurant.supabaseId, restaurant.id);
      }
    }

    const groupedMenu: Record<string, MenuItem[]> = {};

    for (const row of data) {
      const restaurantSlug =
        uuidToSlugMap.get(row.restaurant_id) || row.restaurant_id;

      if (!groupedMenu[restaurantSlug]) {
        groupedMenu[restaurantSlug] = [];
      }

      const localList = MOCK_MENU_ITEMS[restaurantSlug] || [];
      const localMatch = localList.find(
        (item) =>
          item.name.trim().toLowerCase() ===
          String(row.name || '').trim().toLowerCase()
      );

      const item: MenuItem = {
        id: row.id,
        supabaseId: row.id,
        restaurantId: restaurantSlug,
        name: row.name || localMatch?.name || 'Produto',
        description: row.description || localMatch?.description || '',
        price:
          typeof row.price === 'number'
            ? row.price
            : parseFloat(row.price) || (localMatch?.price ?? 0),
        originalPrice: localMatch?.originalPrice,
        imageUrl: row.image_url || localMatch?.imageUrl || '',
        category: localMatch?.category || 'Lanches',
        isAvailable: row.available ?? true,
        isPopular: localMatch?.isPopular,
        badge: localMatch?.badge,
        prepTimeMinutes: localMatch?.prepTimeMinutes,
      };

      groupedMenu[restaurantSlug].push(item);
    }

    supabaseMenuCache = groupedMenu;

    // Mantém a compatibilidade com os componentes existentes.
    Object.assign(MOCK_MENU_ITEMS, groupedMenu);

    return groupedMenu;
  } catch (err) {
    console.warn(
      'Falha na consulta de menu_items no Supabase, mantendo dados locais:',
      err
    );
    return null;
  }
}

/**
 * Normaliza texto para slug: minúsculas, sem acentos e com hífens.
 */
export function normalizeSlug(text?: string | null): string | null {
  if (text === undefined || text === null) {
    return null;
  }

  const normalized = String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || null;
}

export interface InsertRestaurantInput {
  name: string;
  neighborhood: string;
  whatsapp?: string | null;
  address?: string | null;
  description?: string | null;
  image_url?: string | null;
  slug?: string | null;
  owner_profile_id?: string | null;
}

/**
 * Insere um restaurante no Supabase.
 */
export async function insertRestaurantToSupabase(
  data: InsertRestaurantInput
) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      data: null,
      error: new Error('Supabase não configurado'),
    };
  }

  const trimmedName = data.name?.trim();
  const trimmedNeighborhood = data.neighborhood?.trim();

  if (!trimmedName || !trimmedNeighborhood) {
    return {
      data: null,
      error: new Error(
        'Nome e bairro são obrigatórios para cadastro'
      ),
    };
  }

  const baseSlug = data.slug
    ? normalizeSlug(data.slug)
    : normalizeSlug(trimmedName);

  const payload = {
    name: trimmedName,
    neighborhood: trimmedNeighborhood,
    whatsapp: data.whatsapp?.trim() || null,
    address: data.address?.trim() || null,
    description: data.description?.trim() || null,
    image_url: data.image_url?.trim() || null,
    owner_profile_id: data.owner_profile_id?.trim() || null,
    slug: baseSlug,
    status: 'ativo',
  };

  const { data: inserted, error } = await supabase
    .from('restaurants')
    .insert([payload])
    .select()
    .single();

  if (
    error &&
    (error.code === '23505' ||
      error.message?.toLowerCase().includes('slug')) &&
    payload.slug
  ) {
    const suffix = Math.random().toString(36).substring(2, 6);

    const retryWithSuffix = await supabase
      .from('restaurants')
      .insert([
        {
          ...payload,
          slug: `${payload.slug}-${suffix}`,
        },
      ])
      .select()
      .single();

    if (!retryWithSuffix.error) {
      return {
        data: retryWithSuffix.data,
        error: null,
      };
    }

    const retryWithNull = await supabase
      .from('restaurants')
      .insert([
        {
          ...payload,
          slug: null,
        },
      ])
      .select()
      .single();

    if (!retryWithNull.error) {
      return {
        data: retryWithNull.data,
        error: null,
      };
    }
  }

  return { data: inserted, error };
}

export let lastLoyaltyError: {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
} | null = null;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function mapDbRowToMenuItem(row: any, originalInput?: Partial<MenuItem>): MenuItem {
  return {
    id: row.id,
    supabaseId: row.id,
    restaurantId: originalInput?.restaurantId || row.restaurant_id,
    name: row.name || originalInput?.name || 'Produto',
    description: row.description ?? originalInput?.description ?? '',
    price:
      typeof row.price === 'number'
        ? row.price
        : parseFloat(row.price) || (originalInput?.price ?? 0),
    originalPrice: originalInput?.originalPrice,
    imageUrl: row.image_url ?? originalInput?.imageUrl ?? '',
    category: originalInput?.category || 'Lanches',
    isAvailable: row.available ?? originalInput?.isAvailable ?? true,
    isPopular: originalInput?.isPopular,
    badge: originalInput?.badge,
    prepTimeMinutes: originalInput?.prepTimeMinutes ?? 20,
  };
}

/**
 * Cria um item de cardápio no Supabase.
 * A tabela public.menu_items contém exclusivamente as colunas:
 * id, restaurant_id, name, description, price, image_url, available, created_at.
 */
export async function insertMenuItem(item: Omit<MenuItem, 'id'> & { restaurantId: string }) {
  if (!isSupabaseConfigured || !supabase) return { data: null, error: new Error('Supabase não configurado') };

  let resolvedRestaurantId = item.restaurantId;

  // Se o identificador passado for um slug, busca o UUID real da loja
  if (!UUID_REGEX.test(resolvedRestaurantId)) {
    try {
      const { data: rest } = await supabase
        .from('restaurants')
        .select('id')
        .or(`slug.eq.${resolvedRestaurantId},id.eq.${resolvedRestaurantId}`)
        .maybeSingle();

      if (rest?.id) {
        resolvedRestaurantId = rest.id;
      }
    } catch {
      // Mantém resolvedRestaurantId original em caso de falha de consulta
    }
  }

  const payload = {
    restaurant_id: resolvedRestaurantId,
    name: item.name.trim(),
    description: item.description?.trim() || null,
    price: typeof item.price === 'number' ? item.price : parseFloat(String(item.price)) || 0,
    image_url: item.imageUrl?.trim() || null,
    available: item.isAvailable ?? true,
  };

  const { data, error } = await supabase
    .from('menu_items')
    .insert([payload])
    .select()
    .single();

  if (error || !data) {
    return { data: null, error };
  }

  return { data: mapDbRowToMenuItem(data, item), error: null };
}

/**
 * Atualiza um item de cardápio no Supabase.
 * Envia exclusivamente as colunas reais da tabela public.menu_items.
 */
export async function updateMenuItem(item: MenuItem) {
  if (!isSupabaseConfigured || !supabase) return { data: null, error: new Error('Supabase não configurado') };

  const targetId = item.supabaseId || item.id;

  const payload = {
    name: item.name.trim(),
    description: item.description?.trim() || null,
    price: typeof item.price === 'number' ? item.price : parseFloat(String(item.price)) || 0,
    image_url: item.imageUrl?.trim() || null,
    available: item.isAvailable ?? true,
  };

  const { data, error } = await supabase
    .from('menu_items')
    .update(payload)
    .eq('id', targetId)
    .select()
    .single();

  if (error || !data) {
    return { data: null, error };
  }

  return { data: mapDbRowToMenuItem(data, item), error: null };
}

/**
 * Exclui um item de cardápio no Supabase.
 */
export async function deleteMenuItem(itemId: string) {
  if (!isSupabaseConfigured || !supabase) return { data: null, error: new Error('Supabase não configurado') };

  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', itemId);

  return { error };
}

/**
 * Consulta e soma os pontos reais do usuário autenticado.
 *
 * Retorna:
 * - número, incluindo zero, quando a consulta funciona;
 * - null quando ocorre erro ou o Supabase não está configurado.
 *
 * Os logs ajudam a distinguir erro de consulta de uma resposta vazia.
 */
export async function fetchLoyaltyPoints(
  userId: string
): Promise<number | null> {
  lastLoyaltyError = null;

  if (!isSupabaseConfigured || !supabase) {
    lastLoyaltyError = { message: 'Supabase não está configurado neste ambiente.' };
    console.error(
      'PONTOS REAIS: Supabase não está configurado neste ambiente.'
    );
    return null;
  }

  if (!userId?.trim()) {
    lastLoyaltyError = { message: 'userId está vazio.' };
    console.error('PONTOS REAIS: userId está vazio.');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('loyalty_transactions')
      .select('points')
      .eq('profile_id', userId);

    if (error) {
      lastLoyaltyError = {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      };

      console.error('FALHA REAL loyalty_transactions:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        userId,
      });

      return null;
    }

    const rows = data ?? [];
    const total = rows.reduce(
      (sum, item) => sum + (Number(item.points) || 0),
      0
    );

    console.info('SUCESSO loyalty_transactions:', {
      userId,
      quantidade: rows.length,
      total,
    });

    return total;
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    lastLoyaltyError = { message: errMessage };

    console.error('EXCEÇÃO ao consultar pontos reais:', {
      userId,
      message: errMessage,
    });

    return null;
  }
}
export interface FeedComment {
  id: string;
  post_id: string;
  profile_id: string;
  author_name: string;
  author_avatar: string | null;
  text: string;
  created_at: string;
}

export async function fetchComments(postId: string) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase não configurado') };
  }

  return await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
}

export async function insertComment(
  postId: string,
  text: string
) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase não configurado') };
  }

  const { data: authData, error: authError } =
    await supabase.auth.getUser();

  if (authError || !authData.user) {
    return {
      data: null,
      error: authError || new Error('Faça login para comentar.'),
    };
  }

  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      profile_id: authData.user.id,
      author_name: '',
      author_avatar: null,
      text: text.trim(),
    })
    .select()
    .single();

  return { data, error };
}

export async function updateComment(
  commentId: string,
  text: string
) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase não configurado') };
  }

  return await supabase
    .from('comments')
    .update({ text: text.trim() })
    .eq('id', commentId)
    .select()
    .single();
}

export async function deleteComment(commentId: string) {
  if (!supabase) {
    return { error: new Error('Supabase não configurado') };
  }

  return await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);
}
