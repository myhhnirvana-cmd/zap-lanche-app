import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Restaurant, MenuItem } from '../types';
import { MOCK_RESTAURANTS, MOCK_MENU_ITEMS } from '../data/mockData';

// Obtenção das variáveis injetadas via Vite no ambiente cliente
const viteEnv = typeof import.meta !== 'undefined' ? ((import.meta as any).env ?? {}) : {};
const supabaseUrl = viteEnv.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = viteEnv.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Indica se as credenciais do Supabase estão devidamente configuradas no ambiente.
 * Se falso, o aplicativo opera normalmente utilizando os dados de demonstração (mockData).
 */
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.trim() !== '' &&
  supabaseAnonKey.trim() !== ''
);

/**
 * Instância centralizada do cliente Supabase.
 * Inicializada apenas quando as variáveis de ambiente obrigatórias estiverem presentes.
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
 * Nome do bucket padrão configurado no Supabase Storage para armazenamento de imagens.
 */
export const SUPABASE_STORAGE_BUCKET = 'Zaplanche-images';

/**
 * Busca os restaurantes ativos do Supabase e converte para o tipo Restaurant do aplicativo.
 * Preserva o id antigo (slug) e completa os campos ausentes no banco com os dados locais.
 * Retorna null em caso de falha ou resposta vazia para acionar o fallback transparente.
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
      return null;
    }

    const mergedRestaurants: Restaurant[] = data.map((row: any) => {
      const localMatch = MOCK_RESTAURANTS.find(
        (m) => m.id === row.slug || m.id === row.id
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
          bannerUrl: row.image_url || '/src/assets/images/lanchonete_front_1792014252947.jpg',
          isOpen: row.status === 'ativo',
          openingHours: '18h às 23h30',
          address: row.address || '',
          whatsappDemo: row.whatsapp || '',
          verifiedNeighborhoodSpot: true,
          bio: row.description || '',
          popularDishes: [],
        } as Restaurant;
      }

      return {
        ...localMatch,
        id: row.slug || localMatch.id,
        supabaseId: row.id,
        name: row.name || localMatch.name,
        bio: row.description || localMatch.bio,
        address: row.address || localMatch.address,
        neighborhoodName: row.neighborhood || localMatch.neighborhoodName,
        whatsappDemo: row.whatsapp || localMatch.whatsappDemo,
        bannerUrl: row.image_url || localMatch.bannerUrl,
        isOpen: row.status === 'ativo',
      };
    });

    return mergedRestaurants;
  } catch (err) {
    console.warn('Falha na consulta ao Supabase, mantendo dados locais:', err);
    return null;
  }
}

/**
 * Cache em memória dos produtos carregados do Supabase.
 */
export let supabaseMenuCache: Record<string, MenuItem[]> | null = null;

/**
 * Busca produtos ativos da tabela 'public.menu_items' do Supabase.
 * - Filtra por 'available = true'.
 * - Relaciona 'restaurant_id' (UUID) ao restaurante pelo seu 'supabaseId', mantendo o slug em 'restaurantId'.
 * - Completa campos não existentes na tabela com os dados locais quando houver correspondência por nome.
 * - Mantém fallback dos produtos locais caso a consulta falhe ou retorne vazia.
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
      return null;
    }

    // Mapa de correspondência UUID -> slug estável do restaurante
    const uuidToSlugMap = new Map<string, string>();
    for (const r of restaurants) {
      if (r.supabaseId) {
        uuidToSlugMap.set(r.supabaseId, r.id);
      }
    }

    const groupedMenu: Record<string, MenuItem[]> = {};

    for (const row of data) {
      const restaurantSlug = uuidToSlugMap.get(row.restaurant_id) || row.restaurant_id;

      if (!groupedMenu[restaurantSlug]) {
        groupedMenu[restaurantSlug] = [];
      }

      // Busca correspondência com produto local para preservar campos complementares que não estão na tabela
      const localList = MOCK_MENU_ITEMS[restaurantSlug] || [];
      const localMatch = localList.find(
        (m) => m.name.trim().toLowerCase() === String(row.name || '').trim().toLowerCase()
      );

      const item: MenuItem = {
        id: row.id,
        supabaseId: row.id,
        restaurantId: restaurantSlug,
        name: row.name || localMatch?.name || 'Produto',
        description: row.description || localMatch?.description || '',
        price: typeof row.price === 'number' ? row.price : parseFloat(row.price) || (localMatch?.price ?? 0),
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
    // Sincroniza em memória com MOCK_MENU_ITEMS para que os componentes existentes consumam sem persistência no localStorage
    Object.assign(MOCK_MENU_ITEMS, groupedMenu);

    return groupedMenu;
  } catch (err) {
    console.warn('Falha na consulta de menu_items no Supabase, mantendo dados locais:', err);
    return null;
  }
}

/**
 * Normaliza uma sequência de texto para formato slug consistente (kebab-case, minúsculas, sem acentos).
 * Retorna null caso a string resultante seja vazia ou indefinida.
 */
export function normalizeSlug(text?: string | null): string | null {
  if (!text) return null;
  const normalized = text
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
 * Insere um novo restaurante no Supabase.
 * - ID gerado exclusivamente pelo banco (DEFAULT gen_random_uuid()).
 * - Não associa automaticamente a nenhum proprietário sem indicação explícita.
 * - Normaliza o slug e trata conflitos de unicidade reutilizando a permissão de valor NULL.
 * - Retorna a resposta real do Supabase para validação no frontend.
 */
export async function insertRestaurantToSupabase(data: InsertRestaurantInput) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: new Error('Supabase não configurado') };
  }

  const trimmedName = data.name?.trim();
  const trimmedNeighborhood = data.neighborhood?.trim();

  if (!trimmedName || !trimmedNeighborhood) {
    return { data: null, error: new Error('Nome e bairro são obrigatórios para cadastro') };
  }

  // Gera slug a partir do valor informado ou a partir do nome; mantém null se não for possível
  const baseSlug = data.slug ? normalizeSlug(data.slug) : normalizeSlug(trimmedName);

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

  // Tratamento de conflito na restrição UNIQUE da coluna 'slug' (código PostgreSQL 23505)
  if (error && (error.code === '23505' || error.message?.toLowerCase().includes('slug')) && payload.slug) {
    // 1. Tenta sufixo aleatório curto para preservar o slug
    const suffix = Math.random().toString(36).substring(2, 6);
    const retryWithSuffix = await supabase
      .from('restaurants')
      .insert([{ ...payload, slug: `${payload.slug}-${suffix}` }])
      .select()
      .single();

    if (!retryWithSuffix.error) {
      return { data: retryWithSuffix.data, error: null };
    }

    // 2. Como a coluna 'slug' aceita NULL, envia null sem criar slug forçado
    const retryWithNull = await supabase
      .from('restaurants')
      .insert([{ ...payload, slug: null }])
      .select()
      .single();

    if (!retryWithNull.error) {
      return { data: retryWithNull.data, error: null };
    }
  }

  return { data: inserted, error };
}

