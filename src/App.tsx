import React, { useState, useEffect } from 'react';
import {
  ActiveTab,
  Restaurant,
  MenuItem,
  Neighborhood,
} from './types';
import { Header } from './components/layout/Header';
import { HomologationBanner } from './components/common/HomologationBanner';
import { BottomNav } from './components/layout/BottomNav';
import { NeighborhoodModal } from './components/common/NeighborhoodModal';
import { ExploreView } from './views/ExploreView';
import { RestaurantDetailView } from './views/RestaurantDetailView';
import { FeedView } from './views/FeedView';
import { ProfileView } from './views/ProfileView';
import { MerchantView } from './views/MerchantView';
import { AdminView } from './views/AdminView';
import { AdminGate } from './components/auth/AdminGate';
import { MerchantGate } from './components/auth/MerchantGate';
import { DishDetailModal } from './views/DishDetailModal';
import { GitHubGuideModal } from './views/GitHubGuideModal';
import { AcceptInvitationModal } from './components/merchant/AcceptInvitationModal';
import { fetchRestaurantsFromSupabase, fetchMenuItemsFromSupabase, isSupabaseConfigured } from './lib/supabase';
import { loadAllMenuItems, MOCK_MENU_ITEMS, saveCurrentNeighborhood } from './data/mockData';
import { useAuth } from './contexts/AuthContext';

export default function App() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('explorar');
  const [currentNeighborhood, setCurrentNeighborhood] = useState<Neighborhood>({ id: 'todos', name: 'Todos os Bairros', zone: '', city: '', state: '', activeSpotsCount: 0 });
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [selectedRestaurantInitialTab, setSelectedRestaurantInitialTab] = useState<'cardapio' | 'promocoes' | 'fidelidade' | 'premios' | 'resgates' | 'publicacoes'>('cardapio');
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [dishModalRestaurant, setDishModalRestaurant] = useState<Restaurant | undefined>(undefined);
  const [isNeighborhoodModalOpen, setIsNeighborhoodModalOpen] = useState(false);
  const [isGitHubGuideOpen, setIsGitHubGuideOpen] = useState(false);
  const [pendingInviteToken, setPendingInviteToken] = useState<string | null>(null);

  // Captura do parâmetro de convite (?ref=CODIGO)
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const referralCode = searchParams.get('ref');
      if (referralCode && referralCode.trim()) {
        localStorage.setItem('pending_referral_code', referralCode.trim());
        // Remove o parâmetro da URL
        const cleanUrl = window.location.pathname + (window.location.hash || '');
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } catch {
      // Ignora erro de parsing de URL
    }
  }, []);

  // Captura do parâmetro de convite antigo (?convite=TOKEN ou ?token=TOKEN)
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const token = searchParams.get('convite') || searchParams.get('token');
      if (token && token.trim()) {
        setPendingInviteToken(token.trim());
        // Remove o token da URL para não permanecer no histórico nem ser copiado indevidamente
        const cleanUrl = window.location.pathname + (window.location.hash || '');
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } catch {
      // Ignora erro de parsing de URL
    }
  }, []);

  // Redireciona para 'explorar' se o usuário deslogar enquanto estiver na área de comerciante
  useEffect(() => {
    if (activeTab === 'lojista' && !user && isSupabaseConfigured) {
      setActiveTab('explorar');
    }
  }, [user, activeTab]);

  // Busca assíncrona dos restaurantes e cardápios no Supabase com fallback transparente para dados locais
  useEffect(() => {
    let isMounted = true;
    async function loadFromSupabase() {
      const restData = await fetchRestaurantsFromSupabase();
      const currentList = restData && restData.length > 0 ? restData : restaurants;
      if (isMounted && restData && restData.length > 0) {
        setRestaurants(restData);
      }
      const menuData = await fetchMenuItemsFromSupabase(currentList);
      if (isMounted && menuData && Object.keys(menuData).length > 0) {
        // O Supabase já é a fonte da verdade e o cache é gerenciado em lib/supabase.ts
      }
    }
    loadFromSupabase();
    return () => {
      isMounted = false;
    };
  }, []);

  // Troca de bairro com persistência
  const handleSelectNeighborhood = (nb: Neighborhood) => {
    setCurrentNeighborhood(nb);
    saveCurrentNeighborhood(nb);
  };

  // Atualização em tempo real de loja (Área do Lojista)
  const handleUpdateRestaurant = (updated: Restaurant) => {
    setRestaurants((prev) => {
      return prev.map((r) => (r.id === updated.id ? updated : r));
    });
    if (selectedRestaurant?.id === updated.id) {
      setSelectedRestaurant(updated);
    }
  };

  // Navigate to restaurant details
  const handleSelectRestaurant = (restaurant: Restaurant, initialTab: 'cardapio' | 'promocoes' | 'fidelidade' | 'premios' | 'resgates' | 'publicacoes' = 'cardapio') => {
    // Sincroniza com versão mais recente da loja
    const current = restaurants.find((r) => r.id === restaurant.id) || restaurant;
    setSelectedRestaurant(current);
    setSelectedRestaurantInitialTab(initialTab);
    setActiveTab('restaurante');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Navigate to restaurant by ID (e.g. from Feed or Profile)
  const handleSelectRestaurantById = (id: string, initialTab: 'cardapio' | 'promocoes' | 'fidelidade' | 'premios' | 'resgates' | 'publicacoes' = 'cardapio') => {
    // Publicações do Supabase usam o UUID real da loja; dados locais podem usar o ID interno.
    // Aceita ambos para evitar falha de navegação e nunca direciona para outra loja por fallback.
    const found = restaurants.find((r) => r.id === id || r.supabaseId === id);
    if (!found) {
      console.warn('[ZapLanche] Loja da publicação não encontrada para navegação:', id);
      return;
    }
    handleSelectRestaurant(found, initialTab);
  };

  // Open dish preview modal
  const handleSelectDishPreview = (dishName: string, restaurant: Restaurant) => {
    const allMenus = loadAllMenuItems();
    const restItems = allMenus[restaurant.id] || MOCK_MENU_ITEMS[restaurant.id] || [];
    const found =
      restItems.find((i: MenuItem) => i.name.toLowerCase().includes(dishName.toLowerCase())) ||
      restItems[0];
    setSelectedMenuItem(found);
    setDishModalRestaurant(restaurant);
  };

  const handleOpenDishByName = (dishName: string, restaurantName: string) => {
    const restaurant =
      restaurants.find((r) =>
        r.name.toLowerCase().includes(restaurantName.toLowerCase())
      ) || restaurants[0];
    handleSelectDishPreview(dishName, restaurant);
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col font-sans selection:bg-orange-500/30 selection:text-orange-200">
      <HomologationBanner />
      {/* Top Header */}
      <Header
        currentNeighborhood={currentNeighborhood}
        onOpenNeighborhoodModal={() => setIsNeighborhoodModalOpen(true)}
        activeTab={activeTab}
        onChangeTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {profile?.is_suspended && (!profile.suspended_until || new Date(profile.suspended_until).getTime() > Date.now()) && (
        <div role="status" className="mx-auto mt-3 w-full max-w-6xl px-4 sm:px-6">
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">
            <p className="font-bold">Acesso às interações da comunidade suspenso</p>
            <p className="mt-1 text-xs text-rose-100/90">Motivo: {profile.suspension_reason || 'Medida administrativa de moderação.'}</p>
            <p className="mt-1 text-xs text-rose-200">{profile.suspended_until ? `Sua suspensão termina em ${new Date(profile.suspended_until).toLocaleString('pt-BR')}.` : 'Suspensão por prazo indeterminado. Entre em contato com a equipe para solicitar revisão.'} Você continua podendo acessar e consultar o conteúdo público.</p>
          </div>
        </div>
      )}

      {/* Main Responsive Canvas */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-5 pb-20 md:pb-10">
        {activeTab === 'explorar' && (
          <ExploreView
            currentNeighborhood={currentNeighborhood}
            restaurants={restaurants}
            onSelectRestaurant={handleSelectRestaurant}
            onOpenNeighborhoodModal={() => setIsNeighborhoodModalOpen(true)}
            onSelectDishPreview={handleSelectDishPreview}
          />
        )}

        {activeTab === 'restaurante' && selectedRestaurant && (
          <RestaurantDetailView
            restaurant={selectedRestaurant}
            initialTab={selectedRestaurantInitialTab}
            onBack={() => setActiveTab('explorar')}
            onSelectMenuItem={(item) => {
              setSelectedMenuItem(item);
              setDishModalRestaurant(selectedRestaurant);
            }}
          />
        )}

        {activeTab === 'feed' && (
          <FeedView
            restaurants={restaurants}
            currentNeighborhood={currentNeighborhood}
            onSelectRestaurantById={handleSelectRestaurantById}
            onOpenDishPreview={handleOpenDishByName}
          />
        )}

        {activeTab === 'perfil' && (
          <ProfileView
            onSelectRestaurantById={handleSelectRestaurantById}
            onOpenGitHubGuide={() => setIsGitHubGuideOpen(true)}
          />
        )}

        {activeTab === 'lojista' && (
          <MerchantGate onBackToExplore={() => setActiveTab('explorar')}>
            <MerchantView
              restaurants={restaurants}
              onUpdateRestaurant={handleUpdateRestaurant}
              onOpenFeedWithNewPost={() => setActiveTab('feed')}
            />
          </MerchantGate>
        )}

        {activeTab === 'admin' && (
          <AdminGate onOpenGitHubGuide={() => setIsGitHubGuideOpen(true)}>
            <AdminView
              onOpenGitHubGuide={() => setIsGitHubGuideOpen(true)}
              onRestaurantAdded={async () => {
                const restData = await fetchRestaurantsFromSupabase();
                if (restData) setRestaurants(restData);
              }}
            />
          </AdminGate>
        )}
      </main>

      {/* Bottom Navigation for Mobile Touch */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Modals */}
      <NeighborhoodModal
        isOpen={isNeighborhoodModalOpen}
        onClose={() => setIsNeighborhoodModalOpen(false)}
        currentNeighborhood={currentNeighborhood}
        onSelectNeighborhood={handleSelectNeighborhood}
      />

      <DishDetailModal
        item={selectedMenuItem}
        restaurant={dishModalRestaurant}
        onClose={() => setSelectedMenuItem(null)}
      />

      <GitHubGuideModal
        isOpen={isGitHubGuideOpen}
        onClose={() => setIsGitHubGuideOpen(false)}
      />

      {/* Modal de Aceitação de Convite de Comerciante com Confirmação Explícita */}
      {pendingInviteToken && (
        <AcceptInvitationModal
          token={pendingInviteToken}
          onClose={() => setPendingInviteToken(null)}
          onAccepted={async (restaurantId) => {
            setPendingInviteToken(null);
            const restData = await fetchRestaurantsFromSupabase();
            if (restData && restData.length > 0) {
              setRestaurants(restData);
              const acceptedRest = restData.find((r) => r.supabaseId === restaurantId || r.id === restaurantId);
              if (acceptedRest) setSelectedRestaurant(acceptedRest);
            }
            setActiveTab('lojista');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}
    </div>
  );
}
