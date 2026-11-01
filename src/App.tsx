import React, { useState, useEffect, useRef } from 'react';
import {
  ActiveTab,
  Restaurant,
  MenuItem,
  Neighborhood,
} from './types';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { DemoBadge } from './components/common/DemoBadge';
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
import { fetchRestaurantsFromSupabase, fetchMenuItemsFromSupabase, isSupabaseConfigured, applyReferralCode } from './lib/supabase';
import { loadAllMenuItems, MOCK_MENU_ITEMS, saveCurrentNeighborhood } from './data/mockData';
import { useAuth } from './contexts/AuthContext';

export default function App() {
  const { user } = useAuth();
  const [pendingReferralCode, setPendingReferralCode] = useState<string | null>(null);
  const referralAttemptRef = useRef<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('explorar');
  const [currentNeighborhood, setCurrentNeighborhood] = useState<Neighborhood>({ id: 'todos', name: 'Todos os Bairros', zone: '', city: '', state: '', activeSpotsCount: 0 });
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [selectedRestaurantInitialTab, setSelectedRestaurantInitialTab] = useState<'cardapio' | 'promocoes' | 'fidelidade' | 'publicacoes'>('cardapio');
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [dishModalRestaurant, setDishModalRestaurant] = useState<Restaurant | undefined>(undefined);
  const [isNeighborhoodModalOpen, setIsNeighborhoodModalOpen] = useState(false);
  const [isGitHubGuideOpen, setIsGitHubGuideOpen] = useState(false);
  const [pendingInviteToken, setPendingInviteToken] = useState<string | null>(null);

  // Captura convites de comerciante e códigos de indicação antes de qualquer login/cadastro.
  // O código de indicação fica persistido até o vínculo ser confirmado pelo Supabase.
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const token = searchParams.get('convite') || searchParams.get('token');
      const referralFromUrl = searchParams.get('ref') || searchParams.get('referral');
      if (token && token.trim()) setPendingInviteToken(token.trim());

      const savedReferral = window.localStorage.getItem('zap_pending_referral_code');
      const referralCode = referralFromUrl?.trim() || savedReferral?.trim();
      if (referralCode) {
        setPendingReferralCode(referralCode);
        try {
          window.localStorage.setItem('zap_pending_referral_code', referralCode);
        } catch {
          // A indicação ainda pode ser aplicada nesta sessão, mesmo sem armazenamento local.
        }
      }

      if (token || referralFromUrl) {
        const cleanUrl = window.location.pathname + (window.location.hash || '');
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } catch (error) {
      console.warn('Não foi possível recuperar o convite da URL:', error);
    }
  }, []);

  // Aplica a indicação automaticamente assim que houver uma sessão autenticada.
  // Em caso de falha, mantém o código salvo para permitir nova tentativa sem bloquear o acesso.
  useEffect(() => {
    if (!user?.id || !pendingReferralCode || referralAttemptRef.current === pendingReferralCode) return;

    referralAttemptRef.current = pendingReferralCode;

    const applyPendingReferral = async () => {
      const result = await applyReferralCode(pendingReferralCode);

      if (result.success) {
        try {
          window.localStorage.removeItem('zap_pending_referral_code');
        } catch {
          // O vínculo já foi confirmado no servidor.
        }
        setPendingReferralCode(null);
        referralAttemptRef.current = null;
        console.info('Código de indicação vinculado automaticamente.');
      } else {
        console.warn('Não foi possível vincular automaticamente o código de indicação:', result.message);
        referralAttemptRef.current = null;
      }
    };

    void applyPendingReferral();
  }, [user?.id, pendingReferralCode]);

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
  const handleSelectRestaurant = (restaurant: Restaurant, initialTab: 'cardapio' | 'promocoes' | 'fidelidade' | 'publicacoes' = 'cardapio') => {
    // Sincroniza com versão mais recente da loja
    const current = restaurants.find((r) => r.id === restaurant.id) || restaurant;
    setSelectedRestaurant(current);
    setSelectedRestaurantInitialTab(initialTab);
    setActiveTab('restaurante');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Navigate to restaurant by ID (e.g. from Feed or Profile)
  const handleSelectRestaurantById = (id: string, initialTab: 'cardapio' | 'promocoes' | 'fidelidade' | 'publicacoes' = 'cardapio') => {
    const found = restaurants.find((r) => r.id === id) || restaurants[0];
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
      {/* Phase 1 Demonstration Badge */}
      <DemoBadge onOpenInfo={() => setIsGitHubGuideOpen(true)} />

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
