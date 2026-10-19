import React, { useState, useMemo } from 'react';
import {
  Search,
  MapPin,
  Clock,
  Star,
  Sparkles,
  Flame,
  Filter,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Gift,
  Bell,
  X,
} from 'lucide-react';
import { Restaurant, FoodCategory, Neighborhood } from '../types';
import {
  CATEGORIES,
  MOCK_ADMIN_NOTICES,
  loadAdminNotices,
  loadRegionalHighlights,
  isRestaurantInNeighborhood,
} from '../data/mockData';

interface ExploreViewProps {
  currentNeighborhood: Neighborhood;
  restaurants: Restaurant[];
  onSelectRestaurant: (restaurant: Restaurant) => void;
  onOpenNeighborhoodModal: () => void;
  onSelectDishPreview: (dishName: string, restaurant: Restaurant) => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  currentNeighborhood,
  restaurants,
  onSelectRestaurant,
  onOpenNeighborhoodModal,
  onSelectDishPreview,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FoodCategory>('todos');
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [freeDeliveryOnly, setFreeDeliveryOnly] = useState(false);

  // Filter restaurants
  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((r) => {
      // Matches neighborhood / region (shows all demonstrative spots belonging to that region)
      const matchesNeighborhood = isRestaurantInNeighborhood(r, currentNeighborhood.id);

      // Matches search query
      const matchesSearch =
        !searchQuery.trim() ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.popularDishes.some((d) => d.toLowerCase().includes(searchQuery.toLowerCase()));

      // Matches category
      const matchesCategory =
        selectedCategory === 'todos' || r.category === selectedCategory;

      // Filter open
      const matchesOpen = !onlyOpen || r.isOpen;

      // Filter free delivery
      const matchesDelivery = !freeDeliveryOnly || r.deliveryFee === 0;

      return matchesNeighborhood && matchesSearch && matchesCategory && matchesOpen && matchesDelivery;
    });
  }, [restaurants, currentNeighborhood, searchQuery, selectedCategory, onlyOpen, freeDeliveryOnly]);

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Search & Location Bar */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por lanches, dogão, pizza, smash..."
            className="w-full pl-10 pr-4 py-3 text-sm rounded-2xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Neighborhood Highlight Banner */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-transparent border border-orange-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                Gastronomia de Bairro: <span className="text-orange-400">{currentNeighborhood.name}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Apoie as lanchonetes e negócios locais da sua vizinhança
              </p>
            </div>
          </div>
          <button
            onClick={onOpenNeighborhoodModal}
            className="text-xs font-medium text-orange-400 hover:text-orange-300 underline underline-offset-2 shrink-0 ml-2"
          >
            Trocar
          </button>
        </div>

        {/* Active Community Notice from Admin */}
        {(() => {
          const notices = loadAdminNotices();
          const activeNotice = notices.find(
            (n) =>
              n.active &&
              (n.targetNeighborhood === 'Todos os Bairros' ||
                n.targetNeighborhood.toLowerCase().includes(currentNeighborhood.name.toLowerCase()) ||
                currentNeighborhood.name.toLowerCase().includes(n.targetNeighborhood.toLowerCase()))
          );
          if (!activeNotice) return null;
          return (
            <div className="p-3 rounded-2xl bg-[#141624] border border-amber-500/30 flex items-start justify-between gap-3 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="p-1 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                  <Bell className="w-3.5 h-3.5" />
                </span>
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <span>{activeNotice.title}</span>
                    <span className="text-[10px] text-amber-400 font-normal">
                      · {activeNotice.targetNeighborhood}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                    {activeNotice.content}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Categories Horizontal Carousel */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-0.5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Categorias do Bairro
          </h2>
          <span className="text-xs text-slate-400">
            {CATEGORIES.length - 1} opções
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-black font-bold shadow-md shadow-orange-500/20'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                }`}
              >
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setOnlyOpen(!onlyOpen)}
          className={`px-3 py-1.5 rounded-lg border transition-colors shrink-0 flex items-center gap-1.5 ${
            onlyOpen
              ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 font-semibold'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${onlyOpen ? 'bg-emerald-400' : 'bg-slate-500'}`} />
          Abertos Agora
        </button>

        <button
          onClick={() => setFreeDeliveryOnly(!freeDeliveryOnly)}
          className={`px-3 py-1.5 rounded-lg border transition-colors shrink-0 ${
            freeDeliveryOnly
              ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 font-semibold'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          Entrega Grátis
        </button>

        {(selectedCategory !== 'todos' || onlyOpen || freeDeliveryOnly || searchQuery) && (
          <button
            onClick={() => {
              setSelectedCategory('todos');
              setOnlyOpen(false);
              setFreeDeliveryOnly(false);
              setSearchQuery('');
            }}
            className="text-xs text-orange-400 hover:text-orange-300 underline underline-offset-2 ml-auto shrink-0"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Restaurant List */}
      <div>
        {/* Highlight Regional (Patrocinado) */}
        {(() => {
          const dynamicHighlights = loadRegionalHighlights().filter((h) => h.status === 'ativo');
          const matchingHl = dynamicHighlights.find(
            (h) =>
              currentNeighborhood.id === 'todos' ||
              h.neighborhoodId === currentNeighborhood.id ||
              h.neighborhoodName.toLowerCase().includes(currentNeighborhood.name.toLowerCase()) ||
              currentNeighborhood.name.toLowerCase().includes(h.neighborhoodName.toLowerCase())
          );
          const featured = matchingHl ? restaurants.find((r) => r.id === matchingHl.restaurantId) : null;

          if (!featured) return null;
          return (
            <div
              onClick={() => onSelectRestaurant(featured)}
              className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-500/10 border-2 border-amber-500/50 cursor-pointer shadow-lg hover:border-amber-400 transition-all group"
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="flex items-center gap-1.5 font-bold text-amber-300 uppercase tracking-wider text-[11px] bg-amber-500/20 border border-amber-400/40 px-2.5 py-0.5 rounded-full">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Patrocinado · Destaque de {featured.neighborhoodName}
                </span>
                <span className="text-[11px] text-slate-300 font-medium">
                  {featured.activeHighlight?.requestedDuration} (Demonstração)
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-base text-white group-hover:text-amber-300 transition-colors">
                    {featured.name}
                  </h3>
                  <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">
                    {featured.bio}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-amber-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    Ver destaque regional <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </div>
          );
        })()}

        <div className="flex items-center justify-between mb-3 px-0.5">
          <h2 className="text-base font-bold text-white flex items-center gap-2 font-display">
            <Flame className="w-4 h-4 text-orange-400" />
            Lanches & Restaurantes ({filteredRestaurants.length})
          </h2>
          <span className="text-xs text-slate-400">
            {currentNeighborhood.name}
          </span>
        </div>

        {filteredRestaurants.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl bg-slate-900/50 border border-slate-800">
            <p className="text-slate-400 text-sm">
              Nenhuma lanchonete encontrada com esses filtros.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('todos');
                setSearchQuery('');
                setOnlyOpen(false);
                setFreeDeliveryOnly(false);
              }}
              className="mt-3 px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-orange-400 hover:bg-slate-750 transition-colors"
            >
              Ver todas as lanchonetes
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRestaurants.map((restaurant) => (
              <div
                key={restaurant.id}
                onClick={() => onSelectRestaurant(restaurant)}
                className="group cursor-pointer rounded-2xl bg-[#13151f] border border-slate-800/80 hover:border-orange-500/40 transition-all overflow-hidden flex flex-col hover:shadow-xl hover:shadow-orange-500/5"
              >
                {/* Image header with badges */}
                <div className="relative h-44 sm:h-48 w-full bg-slate-900 overflow-hidden">
                  <img
                    src={restaurant.bannerUrl}
                    alt={restaurant.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#13151f] via-black/20 to-transparent" />

                  {/* Rating Badge */}
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-slate-700/60 text-white text-xs font-bold flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="tabular-nums">{restaurant.rating.toFixed(1)}</span>
                    <span className="text-[10px] text-slate-400">({restaurant.reviewCount})</span>
                  </div>

                  {/* Status / Category tag */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${
                        restaurant.isOpen
                          ? 'bg-emerald-500 text-black font-bold'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {restaurant.isOpen ? 'Aberto' : 'Fechado'}
                    </span>
                  </div>

                  {/* Neighborhood badge */}
                  <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-xs text-slate-300">
                    <span className="flex items-center gap-1 font-medium text-amber-300 drop-shadow-sm">
                      <MapPin className="w-3 h-3 text-orange-400" />
                      {restaurant.neighborhoodName} · {restaurant.distanceKm} km
                    </span>
                    <span className="flex items-center gap-1 text-slate-200">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {restaurant.deliveryTime}
                    </span>
                  </div>
                </div>

                {/* Details body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-base text-white group-hover:text-orange-400 transition-colors">
                        {restaurant.name}
                      </h3>
                      <span className="text-xs font-medium text-slate-400 shrink-0">
                        {restaurant.deliveryFee === 0 ? (
                          <span className="text-emerald-400 font-semibold">Entrega Grátis</span>
                        ) : (
                          `Entrega R$ ${restaurant.deliveryFee.toFixed(2).replace('.', ',')}`
                        )}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                      {restaurant.bio}
                    </p>
                  </div>

                  {/* Loyalty Club Indicator */}
                  {restaurant.rewards && restaurant.rewards.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-300/90 font-medium bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                      <Gift className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">Clube de Fidelidade: Recompensas a partir de {Math.min(...restaurant.rewards.map(r => r.pointsCost))} pts</span>
                    </div>
                  )}

                  {/* Popular Dishes chips */}
                  <div className="pt-2 border-t border-slate-800/70">
                    <div className="text-[11px] text-slate-400 font-medium mb-1.5 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-orange-400" />
                      Pratos famosos da casa:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {restaurant.popularDishes.map((dish, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectDishPreview(dish, restaurant);
                          }}
                          className="px-2 py-0.5 rounded-md bg-slate-850 hover:bg-orange-500/20 hover:text-orange-300 border border-slate-800 text-[11px] text-slate-300 transition-colors truncate max-w-[170px]"
                        >
                          {dish}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-xs font-semibold text-orange-400 group-hover:translate-x-0.5 transition-transform">
                    <span>Ver cardápio e promoções</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
