import React, { useState, useMemo } from 'react';
import {
  Search,
  MapPin,
  Clock,
  Star,
  Sparkles,
  Flame,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Gift,
  Bell,
} from 'lucide-react';
import { Restaurant, FoodCategory, Neighborhood } from '../types';
import {
  CATEGORIES,
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
      const matchesNeighborhood = isRestaurantInNeighborhood(r, currentNeighborhood.id, currentNeighborhood.name);
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        r.name.toLowerCase().includes(query) ||
        r.categoryLabel.toLowerCase().includes(query) ||
        r.popularDishes.some((d) => d.toLowerCase().includes(query));
      const matchesCategory = selectedCategory === 'todos' || r.category === selectedCategory;
      const matchesOpen = !onlyOpen || r.isOpen;
      const matchesDelivery = !freeDeliveryOnly || r.deliveryFee === 0;

      return matchesNeighborhood && matchesSearch && matchesCategory && matchesOpen && matchesDelivery;
    });
  }, [restaurants, currentNeighborhood, searchQuery, selectedCategory, onlyOpen, freeDeliveryOnly]);

  return (
    <div className="space-y-4 pb-12 animate-fade-in">
      {/* Search & Location Bar */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por lanches, dogão, pizza, smash..."
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-bg-surface border border-border-muted text-text-primary placeholder-text-secondary focus:outline-none focus:border-orange-500 transition-colors shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-text-secondary hover:text-text-primary"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Neighborhood Highlight Banner */}
        <div className="p-3 rounded-xl bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-transparent border border-orange-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                Região: <span className="text-orange-400">{currentNeighborhood.name}</span>
              </div>
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
            <div className="p-2.5 rounded-xl bg-bg-surface border border-amber-500/30 flex items-start gap-2 text-xs">
              <span className="p-1 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                <Bell className="w-3 h-3" />
              </span>
              <p className="text-[11px] text-text-secondary leading-snug">
                <strong className="text-text-primary">{activeNotice.title}</strong> · {activeNotice.content}
              </p>
            </div>
          );
        })()}
      </div>

      {/* Categories Horizontal Carousel */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-0.5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
            Categorias do Bairro
          </h2>
          <span className="text-xs text-text-secondary">
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
                    : 'bg-bg-surface border border-border-muted text-text-secondary hover:text-text-primary hover:border-border-muted'
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
              : 'bg-bg-surface border-border-muted text-text-secondary hover:text-text-secondary'
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
              : 'bg-bg-surface border-border-muted text-text-secondary hover:text-text-secondary'
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

      {/* Restaurant Grid */}
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
                <span className="text-[11px] text-text-secondary font-medium">
                  {featured.activeHighlight?.requestedDuration} (Demonstração)
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-base text-text-primary group-hover:text-amber-300 transition-colors">
                    {featured.name}
                  </h3>
                  <p className="text-xs text-text-secondary line-clamp-1 mt-0.5">
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
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2 font-display">
            <Flame className="w-4 h-4 text-orange-400" />
            Lanches & Restaurantes ({filteredRestaurants.length})
          </h2>
          <span className="text-xs text-text-secondary">
            {currentNeighborhood.name}
          </span>
        </div>

        {filteredRestaurants.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl bg-bg-surface/50 border border-border-muted">
            <p className="text-text-secondary text-sm">
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
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {filteredRestaurants.map((restaurant) => (
              <article
                key={restaurant.id}
                onClick={() => onSelectRestaurant(restaurant)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectRestaurant(restaurant);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`Ver restaurante ${restaurant.name}`}
                className="group min-w-0 cursor-pointer rounded-2xl bg-bg-surface border border-border-muted/80 hover:border-orange-500/50 transition-all overflow-hidden flex flex-col hover:shadow-xl hover:shadow-orange-500/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                {/* Full cover: contain keeps the complete restaurant artwork visible */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex items-center justify-center">
                  <img
                    src={restaurant.bannerUrl}
                    alt={`Capa de ${restaurant.name}`}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-contain object-center p-1.5 transition-transform duration-300 group-hover:scale-[1.02]"
                  />

                  {restaurant.logoUrl && (
                    <div className="absolute bottom-2 left-2 w-9 h-9 rounded-xl bg-white p-0.5 shadow-lg border border-white/70 overflow-hidden">
                      <img
                        src={restaurant.logoUrl}
                        alt={`Logo de ${restaurant.name}`}
                        loading="lazy"
                        className="w-full h-full object-contain rounded-lg"
                      />
                    </div>
                  )}

                  <div className="absolute top-2 left-2">
                    <span
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold shadow-sm ${
                        restaurant.isOpen === true
                          ? 'bg-emerald-500 text-black'
                          : 'bg-slate-950/85 text-white'
                      }`}
                    >
                      {restaurant.isOpen === true ? 'Aberto' : restaurant.isOpen === false ? 'Fechado' : 'Status não informado'}
                    </span>
                  </div>

                  <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-black/75 backdrop-blur-sm border border-white/10 text-white text-[10px] font-bold flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>{restaurant.reviewCount > 0 ? restaurant.rating.toFixed(1) : 'Novo'}</span>
                    {restaurant.reviewCount > 0 && <span className="text-white/70">({restaurant.reviewCount})</span>}
                  </div>
                </div>

                {/* Compact restaurant identity */}
                <div className="p-3 sm:p-3.5 flex-1 flex flex-col gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-orange-400 mb-0.5 truncate">
                      {restaurant.categoryLabel}
                    </p>
                    <h3 className="font-bold text-sm sm:text-base leading-tight text-text-primary group-hover:text-orange-400 transition-colors line-clamp-2">
                      {restaurant.name}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-text-secondary leading-snug line-clamp-2 mt-1">
                      {restaurant.bio}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-1 text-[10px] sm:text-[11px] text-text-secondary">
                    <span className="flex items-center gap-1 min-w-0">
                      <MapPin className="w-3 h-3 text-orange-400 shrink-0" />
                      <span className="truncate">{restaurant.neighborhoodName}</span>
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      {restaurant.deliveryTime}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-1 text-[10px] sm:text-[11px]">
                    <span className="font-semibold text-text-secondary truncate">
                      {restaurant.deliveryFee === 0
                        ? <span className="text-emerald-400">Entrega grátis</span>
                        : `Entrega R$ ${restaurant.deliveryFee.toFixed(2).replace('.', ',')}`}
                    </span>
                    {restaurant.rewards && restaurant.rewards.length > 0 && (
                      <span className="flex items-center gap-1 text-amber-300 shrink-0">
                        <Gift className="w-3 h-3" />
                        Prêmios
                      </span>
                    )}
                  </div>

                  {restaurant.popularDishes.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1 border-t border-border-muted/70">
                      {restaurant.popularDishes.slice(0, 2).map((dish, index) => (
                        <button
                          key={`${restaurant.id}-dish-${index}`}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onSelectDishPreview(dish, restaurant);
                          }}
                          className="max-w-full truncate rounded-md bg-bg-surface border border-border-muted px-1.5 py-1 text-[10px] text-text-secondary hover:text-orange-300 hover:border-orange-500/40 transition-colors"
                        >
                          {dish}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto pt-1 flex items-center justify-between text-[11px] font-semibold text-orange-400">
                    <span>Ver restaurante</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
