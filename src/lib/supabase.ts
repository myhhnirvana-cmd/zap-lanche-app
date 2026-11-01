
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Restaurant, MenuItem, LoyaltyReward, Promotion } from '../types';

// Obtenção das variáveis injetadas via Vite no ambiente cliente.
const viteEnv =
  typeof import.meta !== 'undefined'
    ? ((import.meta as any).env ?? {})
    : {};

const supabaseUrl = (viteEnv.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL : undefined)) as string | undefined;
const supabaseAnonKey = (viteEnv.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_ANON_KEY : undefined)) as string | undefined;

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
 * Expressão regular para validação do formato UUID (RFC 4122).
 */
export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve o UUID real do restaurante no Supabase.
 * - Se o identificador fornecido já for um UUID válido, retorna-o diretamente.
 * - Se for um slug ou apelido, consulta public.restaurants pelo campo 'slug'.
 * - Como fallback, caso o usuário autenticado seja o proprietário, obtém o UUID da loja vinculada.
 * Não inventa UUID e não permite o uso de slugs no caminho do Storage.
 */
export async function resolveRestaurantUuid(
  restaurantIdOrSlug?: string | null
): Promise<string | null> {
  if (!restaurantIdOrSlug || !isSupabaseConfigured || !supabase) {
    return null;
  }

  const trimmed = restaurantIdOrSlug.trim();
  if (UUID_REGEX.test(trimmed)) {
    return trimmed;
  }

  try {
    // 1. Tenta buscar pelo slug na tabela public.restaurants
    const { data: restBySlug } = await supabase
      .from('restaurants')
      .select('id')
      .eq('slug', trimmed)
      .maybeSingle();

    if (restBySlug?.id && UUID_REGEX.test(restBySlug.id)) {
      return restBySlug.id;
    }

    // 2. Fallback: se o usuário autenticado for o proprietário da loja
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user?.id) {
      const { data: restByOwner } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_profile_id', authData.user.id)
        .maybeSingle();

      if (restByOwner?.id && UUID_REGEX.test(restByOwner.id)) {
        return restByOwner.id;
      }
    }
  } catch (err) {
    console.warn('Falha ao resolver UUID real do restaurante:', err);
  }

  return null;
}

/**
 * Busca os restaurantes ativos no Supabase.
 * Retorna null quando não é possível consultar os dados reais.
 */
function getRestaurantFallbackImage(name: string): string {
  const normalizedName = String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  if (normalizedName.includes('pizza') || normalizedName.includes('forno')) {
    return '/images/artisan_pizza_1792014251217.jpg';
  }
  if (normalizedName.includes('dogao') || normalizedName.includes('dogão')) {
    return '/images/brazilian_dogao_1792014252458.jpg';
  }
  if (normalizedName.includes('smash') || normalizedName.includes('hamburg')) {
    return '/images/brazilian_burger_1792014250928.jpg';
  }
  if (normalizedName.includes('jorge')) {
    return '/images/lanchonete_front_1792014252947.jpg';
  }
  return '/images/brazilian_burger_1792014250928.jpg';
}

export async function fetchRestaurantsFromSupabase(): Promise<Restaurant[] | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('status', 'ativo');

    if (error) {
      console.error('Falha ao consultar restaurantes:', error.message);
      return null;
    }

    if (!data || data.length === 0) {
      return [];
    }

    const realRestaurants: Restaurant[] = data.map((row: any) => {
      const cleanAddress = row.address ? String(row.address).replace(/\s*\(Demonstração\)/gi, '').trim() : '';
      const cleanWhatsapp = row.whatsapp ? String(row.whatsapp).replace(/\s*\(Demonstração\)/gi, '').trim() : '';
      const cleanBio = row.description ? String(row.description).replace(/\s*\[Estabelecimento fictício de demonstração\]/gi, '').trim() : '';

      return {
        id: row.slug || row.id,
        supabaseId: row.id,
        name: row.name || 'Lanchonete',
        neighborhoodId: normalizeSlug(row.neighborhood) || 'todos',
        neighborhoodName: row.neighborhood || 'Bairro',
        category: (row.category || 'hamburguer') as any,
        categoryLabel: row.category_label || 'Lanches de Bairro',
        rating: Number(row.rating) || 0,
        reviewCount: Number(row.review_count) || 0,
        deliveryTime: row.delivery_time || (row.prep_time_minutes ? `${row.prep_time_minutes} min` : ''),
        prepTimeMinutes: typeof row.prep_time_minutes === 'number' ? row.prep_time_minutes : undefined,
        distanceKm: 0,
        latitude: typeof row.latitude === 'number' ? row.latitude : undefined,
        longitude: typeof row.longitude === 'number' ? row.longitude : undefined,
        deliveryFee: typeof row.delivery_fee === 'number' ? row.delivery_fee : 0,
        minOrder: typeof row.min_order === 'number' ? row.min_order : 20.0,
        priceRange: row.price_range || '$$',
        bannerUrl: row.image_url || getRestaurantFallbackImage(row.name),
        logoUrl: row.logo_url || undefined,
        isOpen: row.is_open === true,
        openingHours: row.opening_hours || '',
        address: cleanAddress,
        whatsappDemo: cleanWhatsapp,
        verifiedNeighborhoodSpot: Boolean(row.owner_profile_id),
        bio: cleanBio,
        popularDishes: [],
        ownerProfileId: row.owner_profile_id || undefined,
      } as Restaurant;
    });

    return realRestaurants;
  } catch (err) {
    console.warn('Falha na consulta ao Supabase:', err);
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
        console.error('Falha ao consultar restaurante do comerciante:', error.message);
      }
      return null;
    }

    let ownerRealName: string | undefined = undefined;
    try {
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .maybeSingle();
      if (profileRow?.full_name?.trim()) {
        ownerRealName = profileRow.full_name.trim();
      }
    } catch {
      // Fallback silencioso
    }

    const cleanAddress = data.address ? String(data.address).replace(/\s*\(Demonstração\)/gi, '').trim() : '';
    const cleanWhatsapp = data.whatsapp ? String(data.whatsapp).replace(/\s*\(Demonstração\)/gi, '').trim() : '';
    const cleanBio = data.description ? String(data.description).replace(/\s*\[Estabelecimento fictício de demonstração\]/gi, '').trim() : '';

    return {
      id: data.slug || data.id,
      supabaseId: data.id,
      name: data.name || 'Lanchonete',
      ownerName: ownerRealName,
      neighborhoodId: normalizeSlug(data.neighborhood) || 'todos',
      neighborhoodName: data.neighborhood || 'Bairro',
      category: (data.category || 'hamburguer') as any,
      categoryLabel: data.category_label || 'Lanches de Bairro',
      rating: Number(data.rating) || 0,
      reviewCount: Number(data.review_count) || 0,
      deliveryTime: data.delivery_time || (data.prep_time_minutes ? `${data.prep_time_minutes} min` : ''),
      prepTimeMinutes: typeof data.prep_time_minutes === 'number' ? data.prep_time_minutes : undefined,
      distanceKm: 0,
      latitude: typeof data.latitude === 'number' ? data.latitude : undefined,
      longitude: typeof data.longitude === 'number' ? data.longitude : undefined,
      deliveryFee: typeof data.delivery_fee === 'number' ? data.delivery_fee : 0,
      minOrder: typeof data.min_order === 'number' ? data.min_order : 20.0,
      priceRange: data.price_range || '$$',
      bannerUrl: data.image_url || '/images/lanchonete_front_1792014252947.jpg',
      logoUrl: data.logo_url || undefined,
      isOpen: data.is_open === true,
      openingHours: data.opening_hours || '',
      address: cleanAddress,
      whatsappDemo: cleanWhatsapp,
      verifiedNeighborhoodSpot: true,
      bio: cleanBio,
      popularDishes: [],
      ownerProfileId: data.owner_profile_id || undefined,
    } as Restaurant;
  } catch (err) {
    console.warn('Erro ao consultar restaurante do comerciante:', err);
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
    if (restaurants.length === 0) {
      supabaseMenuCache = {};
      return {};
    }

    const resolvedRestaurantIds = await Promise.all(
      restaurants.map((restaurant) => resolveRestaurantUuid(restaurant.supabaseId || restaurant.id))
    );
    const restaurantIds = [...new Set(resolvedRestaurantIds.filter((id): id is string => Boolean(id)))];
    if (restaurantIds.length === 0) {
      supabaseMenuCache = {};
      return {};
    }

    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .in('restaurant_id', restaurantIds);

    if (error) {
      console.error('Falha ao consultar produtos:', error.message);
      return null;
    }

    if (!data || data.length === 0) {
      supabaseMenuCache = {};
      return {};
    }

    const uuidToSlugMap = new Map<string, string>();

    for (const restaurant of restaurants) {
      if (restaurant.supabaseId) {
        uuidToSlugMap.set(restaurant.supabaseId, restaurant.id);
      } else if (UUID_REGEX.test(restaurant.id)) {
        uuidToSlugMap.set(restaurant.id, restaurant.id);
      }
    }

    const groupedMenu: Record<string, MenuItem[]> = {};

    for (const row of data) {
      const restaurantSlug =
        uuidToSlugMap.get(row.restaurant_id) || row.restaurant_id;

      if (!groupedMenu[restaurantSlug]) {
        groupedMenu[restaurantSlug] = [];
      }

      const item: MenuItem = {
        id: row.id,
        supabaseId: row.id,
        restaurantId: restaurantSlug,
        name: row.name || 'Produto',
        description: row.description || '',
        price:
          typeof row.price === 'number'
            ? row.price
            : parseFloat(row.price) || 0,
        imageUrl: row.image_url || '',
        category: row.category || 'Lanches',
        originalPrice: row.original_price == null ? undefined : Number(row.original_price),
        badge: row.badge || undefined,
        prepTimeMinutes: Number(row.prep_time_minutes) || 20,
        isAvailable: row.available ?? true,
      };

      groupedMenu[restaurantSlug].push(item);
    }

    supabaseMenuCache = groupedMenu;
    return groupedMenu;
  } catch (err) {
    console.warn('Falha na consulta de menu_items no Supabase:', err);
    return null;
  }
}


/** Consulta o cardápio persistente de um ou mais estabelecimentos. */
export async function fetchRestaurantMenuFromSupabase(
  restaurant: Restaurant
): Promise<MenuItem[] | null> {
  const result = await fetchMenuItemsFromSupabase([restaurant]);
  if (!result) return null;
  return result[restaurant.id] || (restaurant.supabaseId ? result[restaurant.supabaseId] : undefined) || [];
}

function mapDbRowToPromotion(row: any, restaurantName = ''): Promotion {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    restaurantName,
    title: row.title || 'Oferta',
    description: row.description || '',
    badge: row.badge || 'Oferta',
    discountPrice: Number(row.discount_price) || 0,
    regularPrice: Number(row.regular_price) || 0,
    couponCode: row.coupon_code || undefined,
    validUntil: row.valid_until || '',
    imageUrl: row.image_url || '',
    isActive: row.is_active !== false,
  };
}

/** Busca somente promoções visíveis para o usuário atual, respeitando RLS. */
export async function fetchRestaurantPromotions(
  restaurantId: string,
  restaurantName = ''
): Promise<Promotion[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const resolvedId = await resolveRestaurantUuid(restaurantId);
  if (!resolvedId) return null;

  const { data, error } = await supabase
    .from('restaurant_promotions')
    .select('*')
    .eq('restaurant_id', resolvedId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Falha ao consultar promoções:', error.message);
    return null;
  }
  return (data || []).map((row: any) => mapDbRowToPromotion(row, restaurantName));
}

export async function insertRestaurantPromotion(
  promotion: Omit<Promotion, 'id' | 'restaurantId' | 'restaurantName'> & { restaurantId: string }
): Promise<{ data: Promotion | null; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) return { data: null, error: new Error('Supabase não configurado') };
  const restaurantId = await resolveRestaurantUuid(promotion.restaurantId);
  if (!restaurantId) return { data: null, error: new Error('Não foi possível identificar a loja no Supabase.') };

  const payload = {
    restaurant_id: restaurantId,
    title: promotion.title.trim(),
    description: promotion.description.trim(),
    badge: promotion.badge.trim() || 'Oferta',
    discount_price: promotion.discountPrice,
    regular_price: promotion.regularPrice,
    coupon_code: promotion.couponCode?.trim() || null,
    valid_until: promotion.validUntil || null,
    image_url: promotion.imageUrl?.trim() || null,
    is_active: true,
  };
  const { data, error } = await supabase.from('restaurant_promotions').insert(payload).select().single();
  if (error || !data) return { data: null, error: new Error(error?.message || 'Não foi possível cadastrar a promoção.') };
  return { data: mapDbRowToPromotion(data), error: null };
}

export async function updateRestaurantPromotion(
  promotionId: string,
  changes: Partial<Omit<Promotion, 'id' | 'restaurantId' | 'restaurantName'>> & { isActive?: boolean }
): Promise<{ data: Promotion | null; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) return { data: null, error: new Error('Supabase não configurado') };
  const payload: Record<string, any> = { updated_at: new Date().toISOString() };
  if (changes.title !== undefined) payload.title = changes.title.trim();
  if (changes.description !== undefined) payload.description = changes.description.trim();
  if (changes.badge !== undefined) payload.badge = changes.badge.trim() || 'Oferta';
  if (changes.discountPrice !== undefined) payload.discount_price = changes.discountPrice;
  if (changes.regularPrice !== undefined) payload.regular_price = changes.regularPrice;
  if (changes.couponCode !== undefined) payload.coupon_code = changes.couponCode.trim() || null;
  if (changes.validUntil !== undefined) payload.valid_until = changes.validUntil || null;
  if (changes.imageUrl !== undefined) payload.image_url = changes.imageUrl.trim() || null;
  if (changes.isActive !== undefined) payload.is_active = changes.isActive;

  const { data, error } = await supabase.from('restaurant_promotions').update(payload).eq('id', promotionId).select().single();
  if (error || !data) return { data: null, error: new Error(error?.message || 'Não foi possível atualizar a promoção.') };
  return { data: mapDbRowToPromotion(data), error: null };
}

export async function deleteRestaurantPromotion(promotionId: string): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) return { error: new Error('Supabase não configurado') };
  const { error } = await supabase.from('restaurant_promotions').delete().eq('id', promotionId);
  return { error: error ? new Error(error.message) : null };
}

/** Atualiza o status operacional sem alterar o status de cadastro/moderação da loja. */
export async function updateRestaurantOperationalStatus(
  restaurantId: string,
  isOpen: boolean
): Promise<{ success: boolean; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) return { success: false, error: new Error('Supabase não configurado') };
  const resolvedId = await resolveRestaurantUuid(restaurantId);
  if (!resolvedId) return { success: false, error: new Error('Não foi possível identificar a loja no Supabase.') };
  const { data, error } = await supabase
    .from('restaurants')
    .update({ is_open: isOpen })
    .eq('id', resolvedId)
    .select('id, is_open')
    .maybeSingle();
  if (error || !data) return { success: false, error: new Error(error?.message || 'A loja não foi atualizada. Verifique a permissão do comerciante.') };
  return { success: true, error: null };
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

export interface UpdateRestaurantInput {
  id: string;
  name?: string;
  description?: string;
  neighborhood?: string;
  address?: string;
  whatsapp?: string;
  image_url?: string;
  logo_url?: string;
  is_open?: boolean;
  opening_hours?: string | null;
  delivery_time?: string | null;
  prep_time_minutes?: number | null;
  latitude?: number | null;
  longitude?: number | null;
}

/**
 * Atualiza os dados de um restaurante no Supabase.
 * Salva a URL da foto de capa (image_url) e da logo (logo_url) de forma persistente.
 */
export async function updateRestaurantInSupabase(input: UpdateRestaurantInput) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: new Error('Supabase não configurado') };
  }

  let targetId = input.id;
  if (!UUID_REGEX.test(targetId)) {
    try {
      const { data: rest } = await supabase
        .from('restaurants')
        .select('id')
        .or(`slug.eq.${targetId},id.eq.${targetId}`)
        .maybeSingle();

      if (rest?.id) {
        targetId = rest.id;
      }
    } catch {
      // Mantém targetId original se consulta falhar
    }
  }

  const payload: Record<string, any> = {};
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.description !== undefined) payload.description = input.description?.trim() || null;
  if (input.neighborhood !== undefined) payload.neighborhood = input.neighborhood?.trim() || null;
  if (input.address !== undefined) payload.address = input.address?.trim() || null;
  if (input.whatsapp !== undefined) payload.whatsapp = input.whatsapp?.trim() || null;
  if (input.image_url !== undefined) payload.image_url = input.image_url?.trim() || null;
  if (input.logo_url !== undefined) payload.logo_url = input.logo_url?.trim() || null;
  if (input.is_open !== undefined) payload.is_open = input.is_open;
  if (input.opening_hours !== undefined) payload.opening_hours = input.opening_hours?.trim() || null;
  if (input.delivery_time !== undefined) payload.delivery_time = input.delivery_time?.trim() || null;
  if (input.prep_time_minutes !== undefined) payload.prep_time_minutes = input.prep_time_minutes;
  if (input.latitude !== undefined) payload.latitude = input.latitude;
  if (input.longitude !== undefined) payload.longitude = input.longitude;

  let { data, error } = await supabase
    .from('restaurants')
    .update(payload)
    .eq('id', targetId)
    .select()
    .maybeSingle();

  // Caso a coluna logo_url ainda não exista no banco remoto (código 42703),
  // retenta a atualização sem o campo logo_url para preservar a atualização dos demais campos.
  if (error && error.code === '42703' && 'logo_url' in payload) {
    const fallbackPayload = { ...payload };
    delete fallbackPayload.logo_url;
    const retry = await supabase
      .from('restaurants')
      .update(fallbackPayload)
      .eq('id', targetId)
      .select()
      .maybeSingle();
    data = retry.data;
    error = retry.error;
  }

  return { data, error };
}

/**
 * Realiza upload de foto de capa (banner) ou logo no bucket do Supabase Storage ('Zaplanche-images').
 * Converte base64 (DataURL) para Blob e retorna a URL pública persistente no Supabase.
 * O caminho no Storage segue estritamente o formato: restaurants/<UUID>/<imageType>-<timestamp>.<ext>
 */
export async function uploadRestaurantImage(
  restaurantId: string,
  dataUrlOrFile: string | File | Blob,
  imageType: 'banner' | 'logo' | 'reward'
): Promise<{ publicUrl: string | null; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { publicUrl: null, error: new Error('Supabase não configurado') };
  }

  try {
    // 1. Identifica e valida o UUID real do restaurante (não aceita slug no Storage e não inventa UUID)
    const resolvedUuid = await resolveRestaurantUuid(restaurantId);
    if (!resolvedUuid) {
      const errorMsg = `Não foi possível identificar o UUID real do restaurante para '${restaurantId}'. O caminho no Storage exige o UUID real no formato restaurants/<UUID>/<arquivo>.`;
      console.error(errorMsg);
      return { publicUrl: null, error: new Error(errorMsg) };
    }

    let blob: Blob;
    let extension = 'webp';
    let mimeType = 'image/webp';

    if (typeof dataUrlOrFile === 'string') {
      // Se já for uma URL externa ou URL pública do Supabase Storage, reaproveita
      if (dataUrlOrFile.startsWith('http://') || dataUrlOrFile.startsWith('https://')) {
        return { publicUrl: dataUrlOrFile, error: null };
      }
      if (dataUrlOrFile.startsWith('data:')) {
        const [header, base64] = dataUrlOrFile.split(',');
        mimeType = header.match(/:(.*?);/)?.[1] || 'image/webp';
        extension = mimeType.split('/')[1] || 'webp';
        if (extension === 'jpeg') extension = 'jpg';
        const binary = atob(base64);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          array[i] = binary.charCodeAt(i);
        }
        blob = new Blob([array], { type: mimeType });
      } else {
        return { publicUrl: null, error: new Error('Formato de imagem inválido') };
      }
    } else if (dataUrlOrFile instanceof File) {
      blob = dataUrlOrFile;
      mimeType = dataUrlOrFile.type || 'image/jpeg';
      extension = mimeType.split('/')[1] || 'jpg';
      if (extension === 'jpeg') extension = 'jpg';
    } else {
      blob = dataUrlOrFile;
      mimeType = blob.type || 'image/webp';
      extension = mimeType.split('/')[1] || 'webp';
    }

    const timestamp = Date.now();
    const filePath = `restaurants/${resolvedUuid}/${imageType}-${timestamp}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .upload(filePath, blob, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error(`Falha no upload para Supabase Storage (${imageType}):`, uploadError.message);
      return { publicUrl: null, error: new Error(uploadError.message) };
    }

    const { data: publicUrlData } = supabase.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .getPublicUrl(filePath);

    return { publicUrl: publicUrlData.publicUrl, error: null };
  } catch (err: any) {
    console.error(`Exceção no upload para Supabase Storage (${imageType}):`, err);
    return { publicUrl: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Atualiza o nome do comerciante na tabela public.profiles do Supabase.
 */
export async function updateUserProfileName(userId: string, fullName: string) {
  if (!isSupabaseConfigured || !supabase || !userId) {
    return { data: null, error: new Error('Supabase não configurado ou ID do usuário ausente') };
  }

  const trimmed = fullName.trim();
  const { data, error } = await supabase
    .from('profiles')
    .update({ full_name: trimmed })
    .eq('id', userId)
    .select('id, full_name, username, role, created_at')
    .maybeSingle();

  try {
    await supabase.auth.updateUser({
      data: { full_name: trimmed, name: trimmed },
    });
  } catch (authErr) {
    console.warn('Erro ao atualizar metadata do usuário:', authErr);
  }

  return { data, error };
}

export let lastLoyaltyError: {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
} | null = null;

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
    imageUrl: row.image_url ?? originalInput?.imageUrl ?? '',
    category: row.category || originalInput?.category || 'Lanches',
    originalPrice: row.original_price == null ? originalInput?.originalPrice : Number(row.original_price),
    isAvailable: row.available ?? originalInput?.isAvailable ?? true,
    isPopular: originalInput?.isPopular,
    badge: row.badge || originalInput?.badge,
    prepTimeMinutes: Number(row.prep_time_minutes) || originalInput?.prepTimeMinutes || 20,
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
    original_price: item.originalPrice ?? null,
    category: item.category || 'Lanches',
    badge: item.badge || null,
    prep_time_minutes: item.prepTimeMinutes || 20,
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
    original_price: item.originalPrice ?? null,
    category: item.category || 'Lanches',
    badge: item.badge || null,
    prep_time_minutes: item.prepTimeMinutes || 20,
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
export interface UserLoyaltyBalance {
  store_available_points: number;
  global_available_points: number;
  other_stores_available_points: number;
  total_available_points: number;
  max_redeemable_at_store: number;
  expired_points: number;
  consumed_points: number;
}

/**
 * Consulta atômica e definitiva de saldo de fidelidade via RPC get_user_loyalty_balance.
 * Aplica a Regra 70/30, FIFO por expiração e não duplica contagem de débitos.
 */
export async function fetchUserLoyaltyBalance(
  restaurantId?: string
): Promise<{ data: UserLoyaltyBalance | null; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: new Error('Supabase não configurado neste ambiente.') };
  }

  try {
    const { data, error } = await supabase.rpc('get_user_loyalty_balance', {
      p_restaurant_id: restaurantId || null,
    });

    if (error) {
      console.warn('RPC get_user_loyalty_balance não disponível ou erro:', error.message);
      return { data: null, error: new Error(error.message) };
    }

    const res = typeof data === 'string' ? JSON.parse(data) : data;
    if (res && typeof res.total_available_points === 'number') {
      return {
        data: {
          store_available_points: Number(res.store_available_points) || 0,
          global_available_points: Number(res.global_available_points) || 0,
          other_stores_available_points: Number(res.other_stores_available_points) || 0,
          total_available_points: Number(res.total_available_points) || 0,
          max_redeemable_at_store: Number(res.max_redeemable_at_store) || 0,
          expired_points: Number(res.expired_points) || 0,
          consumed_points: Number(res.consumed_points) || 0,
        },
        error: null,
      };
    }

    return { data: null, error: new Error('Formato de resposta inesperado de get_user_loyalty_balance.') };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Consulta e soma os pontos válidos e disponíveis do usuário autenticado.
 * Utiliza preferencialmente a RPC get_user_loyalty_balance para evitar a
 * armadilha de contagem dupla de estornos e débitos.
 */
export async function fetchLoyaltyPoints(
  userId: string
): Promise<number | null> {
  lastLoyaltyError = null;

  if (!isSupabaseConfigured || !supabase) {
    lastLoyaltyError = { message: 'Supabase não está configurado neste ambiente.' };
    return null;
  }

  if (!userId?.trim()) {
    lastLoyaltyError = { message: 'userId está vazio.' };
    return null;
  }

  try {
    // 1. Tenta a RPC oficial segura
    const rpcRes = await fetchUserLoyaltyBalance();
    if (rpcRes.data) {
      return rpcRes.data.total_available_points;
    }

    // 2. Fallback resiliente: calcula créditos positivos não expirados subtraindo consumo ativo
    // (evita subtrair loyalty_transactions.points negativos se já existirem)
    const nowIso = new Date().toISOString();
    const { data: credits, error: creditErr } = await supabase
      .from('loyalty_transactions')
      .select('id, points, expires_at')
      .eq('profile_id', userId)
      .gt('points', 0);

    if (creditErr) {
      lastLoyaltyError = {
        message: creditErr.message,
        details: creditErr.details,
        hint: creditErr.hint,
        code: creditErr.code,
      };
      return null;
    }

    const { data: consumptions } = await supabase
      .from('loyalty_consumption')
      .select('credit_transaction_id, points_consumed')
      .eq('is_active', true);

    const consumptionMap = new Map<string, number>();
    for (const c of consumptions || []) {
      const prev = consumptionMap.get(c.credit_transaction_id) || 0;
      consumptionMap.set(c.credit_transaction_id, prev + (Number(c.points_consumed) || 0));
    }

    let totalAvailable = 0;
    for (const tx of credits || []) {
      const isExpired = tx.expires_at && tx.expires_at <= nowIso;
      if (isExpired) continue;

      const consumed = consumptionMap.get(tx.id) || 0;
      const remaining = Math.max(0, (Number(tx.points) || 0) - consumed);
      totalAvailable += remaining;
    }

    return totalAvailable;
  } catch (err: any) {
    const errMessage = err instanceof Error ? err.message : String(err);
    lastLoyaltyError = { message: errMessage };
    return null;
  }
}

/**
 * Interface que espelha exatamente a estrutura da tabela public.comments no Supabase.
 */
export interface DbCommentRow {
  id: string;
  post_id: string;
  profile_id: string;
  author_name: string;
  author_avatar?: string | null;
  text: string;
  created_at: string;
}

/**
 * Consulta comentários persistidos na tabela public.comments do Supabase.
 * Se postId for fornecido, filtra pelos comentários da publicação específica.
 */
export async function fetchComments(
  postId?: string
): Promise<{ data: DbCommentRow[] | null; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: new Error('Supabase não configurado') };
  }

  try {
    let query = supabase
      .from('comments')
      .select('id, post_id, profile_id, author_name, author_avatar, text, created_at')
      .order('created_at', { ascending: true });

    if (postId) {
      query = query.eq('post_id', postId);
    }

    const { data, error } = await query;
    if (error) {
      return { data: null, error: new Error(error.message) };
    }
    return { data: (data as DbCommentRow[]) ?? [], error: null };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Insere um novo comentário na tabela public.comments do Supabase.
 * O profile_id DEVE corresponder a auth.uid() da sessão autenticada.
 */
export async function insertComment(comment: {
  post_id: string;
  profile_id: string;
  author_name: string;
  author_avatar?: string | null;
  text: string;
}): Promise<{ data: DbCommentRow | null; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: new Error('Supabase não configurado') };
  }

  try {
    const { data, error } = await supabase
      .from('comments')
      .insert([
        {
          post_id: comment.post_id,
          profile_id: comment.profile_id,
          author_name: comment.author_name.trim(),
          author_avatar: comment.author_avatar || null,
          text: comment.text.trim(),
        },
      ])
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }
    return { data: data as DbCommentRow, error: null };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Atualiza o texto de um comentário existente na tabela public.comments.
 * A segurança RLS garante que somente o autor (profile_id = auth.uid()) consiga atualizar.
 */
export async function updateComment(
  commentId: string,
  text: string
): Promise<{ data: DbCommentRow | null; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: new Error('Supabase não configurado') };
  }

  try {
    const { data, error } = await supabase
      .from('comments')
      .update({ text: text.trim() })
      .eq('id', commentId)
      .select()
      .maybeSingle();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }
    return { data: data as DbCommentRow, error: null };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Exclui um comentário na tabela public.comments.
 * A segurança RLS garante que somente o autor (profile_id = auth.uid()) consiga excluir.
 * Solicita o retorno da linha excluída com .select() para confirmar que a exclusão ocorreu.
 */
export async function deleteComment(
  commentId: string
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: new Error('Supabase não configurado') };
  }

  try {
    const { data, error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .select();

    if (error) {
      return { error: new Error(error.message) };
    }

    if (!data || data.length === 0) {
      return {
        error: new Error(
          'Nenhum comentário foi excluído. Verifique se o comentário existe e se você é o autor.'
        ),
      };
    }

    return { error: null };
  } catch (err: any) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}

// ==============================================================================
// 1. FEED COMPARTILHADO: PUBLICAÇÕES E CURTIDAS REAIS
// ==============================================================================

export interface DbPostRow {
  id: string;
  restaurant_id: string | null;
  restaurant_name: string;
  restaurant_category: string;
  neighborhood: string;
  profile_id: string;
  author_name: string;
  author_avatar?: string | null;
  author_role: 'morador' | 'comerciante' | 'critico_do_bairro';
  content: string;
  image_url?: string | null;
  is_demo: boolean;
  created_at: string;
  edited_at?: string | null;
}

export interface InsertPostInput {
  restaurant_id?: string | null;
  restaurant_name: string;
  restaurant_category: string;
  neighborhood: string;
  profile_id: string;
  author_name: string;
  author_avatar?: string | null;
  author_role?: 'morador' | 'comerciante' | 'critico_do_bairro';
  content: string;
  image_url?: string | null;
  is_demo?: boolean;
}

export async function fetchPostsFromSupabase(): Promise<{ data: DbPostRow[] | null; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: new Error('Supabase não configurado') };
  }

  try {
    const { data, error } = await supabase
      .from('posts')
      .select('id, restaurant_id, author_profile_id, content, image_url, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    if (!data || data.length === 0) {
      return { data: [], error: null };
    }

    // Busca restaurantes e perfis para enriquecer os dados das postagens
    const { data: restaurants } = await supabase
      .from('restaurants')
      .select('id, slug, name, neighborhood, category');

    const restMap = new Map<string, any>();
    for (const r of restaurants || []) {
      restMap.set(r.id, r);
      if (r.slug) restMap.set(r.slug, r);
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, role');

    const profileMap = new Map<string, any>();
    for (const p of profiles || []) {
      profileMap.set(p.id, p);
    }

    const mappedPosts: DbPostRow[] = data.map((row: any) => {
      const rest = row.restaurant_id ? restMap.get(row.restaurant_id) : null;
      const authorId = row.author_profile_id || row.profile_id;
      const authorProfile = profileMap.get(authorId);

      return {
        id: row.id,
        restaurant_id: row.restaurant_id || null,
        restaurant_name: rest?.name || 'Comunidade ZapLanche',
        restaurant_category: rest?.category || 'Comunidade',
        neighborhood: rest?.neighborhood || 'Comunidade',
        profile_id: authorId,
        author_name: authorProfile?.full_name || authorProfile?.username || 'Morador',
        author_avatar: authorProfile?.avatar_url || null,
        author_role: (authorProfile?.role === 'comerciante' ? 'comerciante' : 'morador') as any,
        content: row.content,
        image_url: row.image_url,
        is_demo: false,
        created_at: row.created_at,
        edited_at: row.edited_at || null,
      };
    });

    return { data: mappedPosts, error: null };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function insertPostToSupabase(input: InsertPostInput): Promise<{ data: DbPostRow | null; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: new Error('Supabase não configurado') };
  }

  try {
    // A autoria vem da sessão real do Supabase Auth, nunca de um ID informado pela interface.
    const { data: authData, error: authError } = await supabase.auth.getUser();
    const authenticatedUserId = authData?.user?.id;

    if (authError || !authenticatedUserId) {
      return { data: null, error: new Error('Entre na sua conta para publicar no feed.') };
    }

    const resolvedRestId = input.restaurant_id
      ? (await resolveRestaurantUuid(input.restaurant_id)) || input.restaurant_id
      : null;

    const payload = {
      restaurant_id: resolvedRestId,
      author_profile_id: authenticatedUserId,
      content: input.content.trim(),
      image_url: input.image_url || null,
    };

    const { data, error } = await supabase
      .from('posts')
      .insert([payload])
      .select()
      .single();

    if (error || !data) {
      return { data: null, error: new Error(error?.message || 'Falha ao publicar') };
    }

    const mapped: DbPostRow = {
      id: data.id,
      restaurant_id: data.restaurant_id || null,
      restaurant_name: input.restaurant_name,
      restaurant_category: input.restaurant_category,
      neighborhood: input.neighborhood,
      profile_id: data.author_profile_id,
      author_name: input.author_name,
      author_avatar: input.author_avatar || null,
      author_role: input.author_role || 'morador',
      content: data.content,
      image_url: data.image_url,
      is_demo: false,
      created_at: data.created_at,
    };

    return { data: mapped, error: null };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function updatePostInSupabase(
  postId: string,
  content: string,
  imageUrl?: string | null
): Promise<{ data: DbPostRow | null; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: new Error('Supabase não configurado') };
  }

  try {
    const payload: Record<string, any> = {
      content: content.trim(),
      edited_at: new Date().toISOString(),
    };
    if (imageUrl !== undefined) {
      payload.image_url = imageUrl;
    }

    const { data, error } = await supabase
      .from('posts')
      .update(payload)
      .eq('id', postId)
      .select()
      .maybeSingle();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as DbPostRow, error: null };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function deletePostInSupabase(postId: string): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: new Error('Supabase não configurado') };
  }

  try {
    const { data, error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)
      .select();

    if (error) {
      return { error: new Error(error.message) };
    }

    if (!data || data.length === 0) {
      return { error: new Error('Nenhuma publicação foi excluída. Verifique se você é o autor.') };
    }

    return { error: null };
  } catch (err: any) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function fetchPostLikesFromSupabase(): Promise<{ data: { post_id: string; profile_id: string }[] | null; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: new Error('Supabase não configurado') };
  }

  try {
    const { data, error } = await supabase
      .from('post_likes')
      .select('post_id, profile_id');

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function togglePostLikeInSupabase(
  postId: string,
  profileId: string,
  currentlyLiked: boolean
): Promise<{ isLiked: boolean; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { isLiked: !currentlyLiked, error: null };
  }

  try {
    if (currentlyLiked) {
      const { error } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('profile_id', profileId);

      if (error) return { isLiked: true, error: new Error(error.message) };
      return { isLiked: false, error: null };
    } else {
      const { error } = await supabase
        .from('post_likes')
        .insert([{ post_id: postId, profile_id: profileId }]);

      if (error && error.code !== '23505') {
        return { isLiked: false, error: new Error(error.message) };
      }
      return { isLiked: true, error: null };
    }
  } catch (err: any) {
    return { isLiked: currentlyLiked, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

// ==============================================================================
// 2. QUADRO DE PONTOS POR ESTABELECIMENTO
// ==============================================================================

export interface StorePointBreakdown {
  restaurantId: string;
  restaurant_id: string;
  restaurantName: string;
  restaurant_name: string;
  points: number;
  balance: number;
  transactionsCount: number;
  transactions_count: number;
}

export async function fetchStoreLoyaltyBreakdown(
  userId: string
): Promise<{ data: StorePointBreakdown[] | null; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase || !userId) {
    return { data: null, error: new Error('Supabase não configurado ou usuário ausente') };
  }

  try {
    const nowIso = new Date().toISOString();

    // 1. Busca transações de crédito positivas e não expiradas vinculadas a lojas
    const { data: credits, error: creditErr } = await supabase
      .from('loyalty_transactions')
      .select('id, restaurant_id, points, expires_at')
      .eq('profile_id', userId)
      .not('restaurant_id', 'is', null)
      .gt('points', 0);

    if (creditErr) {
      return { data: null, error: new Error(creditErr.message) };
    }

    // 2. Busca consumos ativos para abater dos créditos
    const creditIds = (credits || []).map((c) => c.id);
    const consumptionMap = new Map<string, number>();

    if (creditIds.length > 0) {
      const { data: consumptions } = await supabase
        .from('loyalty_consumption')
        .select('credit_transaction_id, points_consumed')
        .in('credit_transaction_id', creditIds)
        .eq('is_active', true);

      for (const c of consumptions || []) {
        const prev = consumptionMap.get(c.credit_transaction_id) || 0;
        consumptionMap.set(c.credit_transaction_id, prev + (Number(c.points_consumed) || 0));
      }
    }

    // 3. Agrupa por loja considerando apenas créditos válidos
    const storeMap = new Map<string, { points: number; count: number }>();
    for (const row of credits || []) {
      const isExpired = row.expires_at && row.expires_at <= nowIso;
      if (isExpired) continue;

      const rId = String(row.restaurant_id);
      const consumed = consumptionMap.get(row.id) || 0;
      const remaining = Math.max(0, (Number(row.points) || 0) - consumed);

      const current = storeMap.get(rId) || { points: 0, count: 0 };
      storeMap.set(rId, { points: current.points + remaining, count: current.count + 1 });
    }

    // Busca nomes reais das lojas no Supabase
    const restNameMap = new Map<string, string>();
    try {
      const { data: dbRests } = await supabase.from('restaurants').select('id, slug, name');
      for (const r of dbRests || []) {
        restNameMap.set(r.id, r.name);
        if (r.slug) restNameMap.set(r.slug, r.name);
      }
    } catch {
      // Fallback
    }

    const result: StorePointBreakdown[] = Array.from(storeMap.entries())
      .filter(([_, stat]) => stat.points > 0 || stat.count > 0)
      .map(([restaurantId, stat]) => {
        const name = restNameMap.get(restaurantId) || `Lanchonete (${restaurantId.slice(0, 8)})`;
        return {
          restaurantId,
          restaurant_id: restaurantId,
          restaurantName: name,
          restaurant_name: name,
          points: stat.points,
          balance: stat.points,
          transactionsCount: stat.count,
          transactions_count: stat.count,
        };
      });

    return { data: result, error: null };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

// ==============================================================================
// 3. INDICAÇÃO DE AMIGOS COM BÔNUS REAL
// ==============================================================================

export async function fetchUserProfileReferralCode(
  userId: string
): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase || !userId) return null;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('referral_code')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar código de indicação:', error.message);
      return null;
    }

    const referralCode =
      typeof data?.referral_code === 'string'
        ? data.referral_code.trim()
        : '';

    return referralCode || null;
  } catch (error) {
    console.error('Falha ao consultar código de indicação:', error);
    return null;
  }
}

export async function applyReferralCode(
  code: string
): Promise<{ success: boolean; message: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, message: 'Serviço de indicação indisponível.' };
  }

  try {
    const { data, error } = await supabase.rpc('register_referral_code', {
      p_referral_code: code.trim(),
    });

    if (error) {
      return { success: false, message: error.message || 'Erro ao registrar código de indicação no servidor.' };
    }

    const res = typeof data === 'string' ? JSON.parse(data) : data;
    return {
      success: Boolean(res?.success),
      message: res?.message || (res?.success ? 'Código vinculado com sucesso! O bônus será creditado no seu primeiro check-in.' : 'Código de indicação inválido.'),
    };
  } catch (err: any) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, message: errorMsg || 'Falha ao aplicar código de indicação.' };
  }
}

export interface ReferralRecord {
  id: string;
  status: string;
  created_at: string;
  completed_at?: string | null;
  referred_name?: string;
}

export async function fetchUserReferralsList(
  userId: string
): Promise<ReferralRecord[]> {
  if (!isSupabaseConfigured || !supabase || !userId) return [];

  try {
    const { data, error } = await supabase
      .from('referrals')
      .select('id, status, created_at, completed_at')
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map((item, index) => ({
      ...item,
      referred_name: `Amigo indicado #${index + 1}`,
    }));
  } catch {
    return [];
  }
}

// ==============================================================================
// 4. PRÊMIOS DE FIDELIDADE PERSISTENTES E RESGATE REAL
// ==============================================================================

export async function fetchRewardsFromSupabase(
  restaurantId?: string
): Promise<LoyaltyReward[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const resolvedRestaurantId = restaurantId
      ? await resolveRestaurantUuid(restaurantId)
      : null;
    if (restaurantId && !resolvedRestaurantId) return null;

    let query = supabase.from('loyalty_rewards').select('*');
    if (resolvedRestaurantId) {
      query = query.eq('restaurant_id', resolvedRestaurantId);
    }

    const { data, error } = await query;
    if (error || !data) return null;

    return data.map((r: any) => ({
      id: r.id,
      restaurantId: r.restaurant_id,
      restaurantName: '',
      title: r.title,
      description: r.description,
      pointsCost: r.points_cost,
      stock: r.stock,
      status: r.status,
      isAvailable: r.status === 'ativo' && r.stock > 0,
      maxGlobalPointsAllowed: Math.round(r.points_cost * 0.3),
      minStorePointsRequired: Math.round(r.points_cost * 0.7),
      maxRedemptionsPerUser: r.max_redemptions_per_user || 1,
      imageUrl: r.image_url || '',
    }));
  } catch {
    return null;
  }
}

export async function insertRewardToSupabase(
  reward: {
    restaurantId?: string;
    restaurant_id?: string;
    title: string;
    description: string;
    pointsCost?: number;
    points_cost?: number;
    stock: number;
    status: 'ativo' | 'pausado' | 'esgotado';
    imageUrl?: string | null;
    image_url?: string | null;
    maxRedemptionsPerUser?: number;
    max_redemptions_per_user?: number;
    max_global_points_allowed?: number;
    min_store_points_required?: number;
    is_available?: boolean;
  }
): Promise<{ data: LoyaltyReward | null; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: new Error('Supabase não configurado') };
  }

  try {
    const pointsCost = reward.pointsCost ?? reward.points_cost ?? 100;
    const rId = reward.restaurantId || reward.restaurant_id || '';
    const imgUrl = reward.imageUrl || reward.image_url || null;
    const maxUser = reward.maxRedemptionsPerUser || reward.max_redemptions_per_user || 1;

    const payload = {
      restaurant_id: rId,
      title: reward.title.trim(),
      description: reward.description.trim(),
      points_cost: pointsCost,
      stock: reward.stock,
      status: reward.status,
      image_url: imgUrl,
      max_redemptions_per_user: maxUser,
    };

    const { data, error } = await supabase
      .from('loyalty_rewards')
      .insert([payload])
      .select()
      .single();

    if (error || !data) {
      return { data: null, error: new Error(error?.message || 'Falha ao inserir prêmio') };
    }

    const mapped: LoyaltyReward = {
      id: data.id,
      restaurantId: data.restaurant_id,
      restaurantName: '',
      title: data.title,
      description: data.description,
      pointsCost: data.points_cost,
      stock: data.stock,
      status: data.status,
      isAvailable: data.status === 'ativo' && data.stock > 0,
      maxGlobalPointsAllowed: Math.round(data.points_cost * 0.3),
      minStorePointsRequired: Math.round(data.points_cost * 0.7),
      maxRedemptionsPerUser: data.max_redemptions_per_user || 1,
      imageUrl: data.image_url || '',
    };

    return { data: mapped, error: null };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function updateRewardInSupabase(
  reward: {
    id: string;
    title?: string;
    description?: string;
    pointsCost?: number;
    points_cost?: number;
    stock?: number;
    status?: 'ativo' | 'pausado' | 'esgotado';
    isAvailable?: boolean;
    is_available?: boolean;
    imageUrl?: string | null;
    image_url?: string | null;
    maxRedemptionsPerUser?: number;
    max_redemptions_per_user?: number;
    maxGlobalPointsAllowed?: number;
    max_global_points_allowed?: number;
    minStorePointsRequired?: number;
    min_store_points_required?: number;
    restaurantName?: string;
  }
): Promise<{ data: LoyaltyReward | null; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: new Error('Supabase não configurado') };
  }

  try {
    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (reward.title !== undefined) payload.title = reward.title.trim();
    if (reward.description !== undefined) payload.description = reward.description.trim();
    if (reward.pointsCost !== undefined) payload.points_cost = reward.pointsCost;
    if (reward.points_cost !== undefined) payload.points_cost = reward.points_cost;
    if (reward.stock !== undefined) {
      payload.stock = reward.stock;
      if (reward.stock <= 0) payload.status = 'esgotado';
    }
    if (reward.status !== undefined && (reward.stock === undefined || reward.stock > 0)) {
      payload.status = reward.status;
    }
    if (reward.imageUrl !== undefined) payload.image_url = reward.imageUrl;
    if (reward.image_url !== undefined) payload.image_url = reward.image_url;
    if (reward.maxRedemptionsPerUser !== undefined) payload.max_redemptions_per_user = reward.maxRedemptionsPerUser;
    if (reward.max_redemptions_per_user !== undefined) payload.max_redemptions_per_user = reward.max_redemptions_per_user;

    const { data, error } = await supabase
      .from('loyalty_rewards')
      .update(payload)
      .eq('id', reward.id)
      .select()
      .single();

    if (error || !data) {
      return { data: null, error: new Error(error?.message || 'Falha ao atualizar prêmio') };
    }

    const mapped: LoyaltyReward = {
      id: data.id,
      restaurantId: data.restaurant_id,
      restaurantName: reward.restaurantName || '',
      title: data.title,
      description: data.description,
      pointsCost: data.points_cost,
      stock: data.stock,
      status: data.status,
      isAvailable: data.status === 'ativo' && data.stock > 0,
      maxGlobalPointsAllowed: Math.round(data.points_cost * 0.3),
      minStorePointsRequired: Math.round(data.points_cost * 0.7),
      maxRedemptionsPerUser: data.max_redemptions_per_user || 1,
      imageUrl: data.image_url || '',
    };

    return { data: mapped, error: null };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function deleteRewardFromSupabase(
  rewardId: string
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: new Error('Supabase não configurado') };
  }

  try {
    const { error } = await supabase
      .from('loyalty_rewards')
      .delete()
      .eq('id', rewardId);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err: any) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function redeemRewardInSupabase(
  rewardId: string
): Promise<{ success: boolean; voucherCode?: string; pointsDeducted?: number; message: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, message: 'Serviço de resgate indisponível.' };
  }

  try {
    const { data, error } = await supabase.rpc('redeem_loyalty_reward', {
      p_reward_id: rewardId,
    });

    if (error) {
      return { success: false, message: error.message };
    }

    const res = typeof data === 'string' ? JSON.parse(data) : data;
    if (res?.success) {
      return {
        success: true,
        voucherCode: res.voucher_code,
        pointsDeducted: res.points_deducted,
        message: res.message || 'Prêmio resgatado com sucesso!',
      };
    }

    return {
      success: false,
      message: res?.message || 'Não foi possível concluir o resgate.',
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Falha ao processar resgate no servidor.' };
  }
}

/**
 * Validação presencial de voucher pelo comerciante ou administrador via RPC mark_loyalty_redemption_used.
 * Garante que somente o comerciante do restaurante ou admin possa validar, evita duplicidade e vouchers expirados.
 */
export async function markLoyaltyRedemptionUsed(
  voucherCode: string
): Promise<{
  success: boolean;
  code?: string;
  message: string;
  data?: {
    redemption_id?: string;
    voucher_code?: string;
    reward_title?: string;
    customer_name?: string;
    points_cost?: number;
    used_at?: string;
  };
}> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, message: 'Supabase não está configurado neste ambiente.' };
  }

  const normalized = voucherCode?.trim().toUpperCase();
  if (!normalized || normalized.length < 4) {
    return { success: false, message: 'Código de voucher inválido.' };
  }

  try {
    const { data, error } = await supabase.rpc('mark_loyalty_redemption_used', {
      p_voucher_code: normalized,
    });

    if (error) {
      return { success: false, message: error.message };
    }

    const res = typeof data === 'string' ? JSON.parse(data) : data;
    return {
      success: Boolean(res?.success),
      code: res?.code,
      message: res?.message || (res?.success ? 'Voucher validado com sucesso!' : 'Falha na validação.'),
      data: res?.success ? res : undefined,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Falha ao conectar ao servidor para validar voucher.',
    };
  }
}

/**
 * Cancelamento atômico de resgate via RPC cancel_loyalty_redemption.
 * Estorna apenas pontos ainda não expirados preservando o expires_at original.
 */
export async function cancelLoyaltyRedemption(
  redemptionId: string,
  reason: string = 'Cancelamento solicitado'
): Promise<{
  success: boolean;
  code?: string;
  message: string;
  pointsRefunded?: number;
  pointsExpiredLost?: number;
}> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, message: 'Supabase não está configurado neste ambiente.' };
  }

  try {
    const { data, error } = await supabase.rpc('cancel_loyalty_redemption', {
      p_redemption_id: redemptionId,
      p_reason: reason,
    });

    if (error) {
      return { success: false, message: error.message };
    }

    const res = typeof data === 'string' ? JSON.parse(data) : data;
    return {
      success: Boolean(res?.success),
      code: res?.code,
      message: res?.message || (res?.success ? 'Resgate cancelado com sucesso.' : 'Falha ao cancelar resgate.'),
      pointsRefunded: res?.points_refunded,
      pointsExpiredLost: res?.points_expired_lost,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Falha ao cancelar resgate.',
    };
  }
}



export interface RestaurantReviewSummary {
  average: number;
  count: number;
  myRating: number | null;
  myComment: string | null;
}

export async function fetchRestaurantReviewSummary(restaurantId: string, profileId?: string): Promise<RestaurantReviewSummary | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const restaurantUuid = await resolveRestaurantUuid(restaurantId);
  if (!restaurantUuid) return null;

  const { data: restaurantRow, error: restaurantError } = await supabase
    .from('restaurants')
    .select('rating, review_count')
    .eq('id', restaurantUuid)
    .maybeSingle();
  if (restaurantError || !restaurantRow) return null;

  let myRating: number | null = null;
  let myComment: string | null = null;
  if (profileId) {
    const { data: myReview } = await supabase
      .from('restaurant_reviews')
      .select('rating, comment')
      .eq('restaurant_id', restaurantUuid)
      .eq('profile_id', profileId)
      .maybeSingle();
    if (myReview) {
      myRating = Number(myReview.rating);
      myComment = myReview.comment || null;
    }
  }

  return {
    average: Number(restaurantRow.rating) || 0,
    count: Number(restaurantRow.review_count) || 0,
    myRating,
    myComment,
  };
}

export async function insertRestaurantReview(input: { restaurantId: string; profileId: string; rating: number; comment?: string }): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { success: false, error: 'Conexão indisponível.' };
  const restaurantUuid = await resolveRestaurantUuid(input.restaurantId);
  if (!restaurantUuid) return { success: false, error: 'Loja não identificada no sistema.' };
  const { error } = await supabase.from('restaurant_reviews').insert({
    restaurant_id: restaurantUuid,
    profile_id: input.profileId,
    rating: input.rating,
    comment: input.comment?.trim() || null,
  });
  if (error) {
    if (error.code === '23505') return { success: false, error: 'Você já avaliou esta loja.' };
    console.error('Falha ao registrar avaliação:', error.message);
    return { success: false, error: 'Não foi possível salvar sua avaliação agora.' };
  }
  return { success: true };
}
