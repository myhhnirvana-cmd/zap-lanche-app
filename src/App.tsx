import React, { useState } from 'react';
import { ActiveTab, Restaurant, MenuItem, Neighborhood } from './types';
import { NEIGHBORHOODS, MOCK_RESTAURANTS, MOCK_MENU_ITEMS } from './data/mockData';
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
import { DishDetailModal } from './views/DishDetailModal';
import { GitHubGuideModal } from './views/GitHubGuideModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('explorar');
  const [currentNeighborhood, setCurrentNeighborhood] = useState<Neighborhood>(NEIGHBORHOODS[0]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [dishModalRestaurant, setDishModalRestaurant] = useState<Restaurant | undefined>(undefined);
  
  const [isNeighborhoodModalOpen, setIsNeighborhoodModalOpen] = useState(false);
  const [isGitHubGuideOpen, setIsGitHubGuideOpen] = useState(false);

  // Navigate to restaurant details
  const handleSelectRestaurant = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setActiveTab('restaurante');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Navigate to restaurant by ID (e.g. from Feed or Profile)
  const handleSelectRestaurantById = (id: string) => {
    const found = MOCK_RESTAURANTS.find((r) => r.id === id) || MOCK_RESTAURANTS[0];
    handleSelectRestaurant(found);
  };

  // Open dish preview modal
  const handleSelectDishPreview = (dishName: string, restaurant: Restaurant) => {
    const restItems = MOCK_MENU_ITEMS[restaurant.id] || MOCK_MENU_ITEMS['rest-jorge-mooca'];
    const found = restItems.find((i) => i.name.toLowerCase().includes(dishName.toLowerCase())) || restItems[0];
    setSelectedMenuItem(found);
    setDishModalRestaurant(restaurant);
  };

  const handleOpenDishByName = (dishName: string, restaurantName: string) => {
    const restaurant = MOCK_RESTAURANTS.find((r) => r.name.toLowerCase().includes(restaurantName.toLowerCase())) || MOCK_RESTAURANTS[0];
    handleSelectDishPreview(dishName, restaurant);
  };

  return (
    <div className="min-h-screen bg-[#0c0d12] text-slate-100 flex flex-col font-sans selection:bg-orange-500/30 selection:text-orange-200">
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
            restaurants={MOCK_RESTAURANTS}
            onSelectRestaurant={handleSelectRestaurant}
            onOpenNeighborhoodModal={() => setIsNeighborhoodModalOpen(true)}
            onSelectDishPreview={handleSelectDishPreview}
          />
        )}

        {activeTab === 'restaurante' && selectedRestaurant && (
          <RestaurantDetailView
            restaurant={selectedRestaurant}
            onBack={() => setActiveTab('explorar')}
            onSelectMenuItem={(item) => {
              setSelectedMenuItem(item);
              setDishModalRestaurant(selectedRestaurant);
            }}
          />
        )}

        {activeTab === 'feed' && (
          <FeedView
            restaurants={MOCK_RESTAURANTS}
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
          <MerchantView
            onOpenFeedWithNewPost={() => setActiveTab('feed')}
          />
        )}

        {activeTab === 'admin' && (
          <AdminView
            onOpenGitHubGuide={() => setIsGitHubGuideOpen(true)}
          />
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
        onSelectNeighborhood={(nb) => setCurrentNeighborhood(nb)}
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
    </div>
  );
}
