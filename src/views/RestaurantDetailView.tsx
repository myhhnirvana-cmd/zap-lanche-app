import React, { useState } from 'react';
import {
  ArrowLeft,
  Star,
  MapPin,
  Clock,
  Phone,
  MessageCircle,
  Share2,
  CheckCircle,
  Sparkles,
  Tag,
  Plus,
  Flame,
  MessageSquare,
  ThumbsUp,
} from 'lucide-react';
import { Restaurant, MenuItem, Promotion, SocialPost } from '../types';
import { MOCK_MENU_ITEMS, MOCK_PROMOTIONS, MOCK_POSTS } from '../data/mockData';

interface RestaurantDetailViewProps {
  restaurant: Restaurant;
  onBack: () => void;
  onSelectMenuItem: (item: MenuItem) => void;
}

export const RestaurantDetailView: React.FC<RestaurantDetailViewProps> = ({
  restaurant,
  onBack,
  onSelectMenuItem,
}) => {
  const [activeTab, setActiveTab] = useState<'cardapio' | 'promocoes' | 'publicacoes'>('cardapio');
  const [copiedLink, setCopiedLink] = useState(false);

  const menuItems = MOCK_MENU_ITEMS[restaurant.id] || MOCK_MENU_ITEMS['rest-jorge-mooca'] || [];
  const promotions = MOCK_PROMOTIONS[restaurant.id] || MOCK_PROMOTIONS['rest-jorge-mooca'] || [];
  const posts = MOCK_POSTS.filter((p) => p.restaurantId === restaurant.id);

  // Group menu by categories
  const categoriesInMenu = Array.from(new Set(menuItems.map((m) => m.category)));
  const [selectedMenuCategory, setSelectedMenuCategory] = useState<string>('todos');

  const filteredMenuItems =
    selectedMenuCategory === 'todos'
      ? menuItems
      : menuItems.filter((m) => m.category === selectedMenuCategory);

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="pb-16 animate-fade-in space-y-5">
      {/* Top back button navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-850 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Explorar
        </button>

        <button
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" />
          {copiedLink ? 'Link Copiado!' : 'Compartilhar'}
        </button>
      </div>

      {/* Hero Banner Card */}
      <div className="rounded-3xl bg-[#13151f] border border-slate-800 overflow-hidden shadow-xl">
        <div className="relative h-48 sm:h-64 w-full bg-slate-900">
          <img
            src={restaurant.bannerUrl}
            alt={restaurant.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#13151f] via-black/40 to-black/30" />

          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-emerald-500 text-black text-xs font-extrabold uppercase">
              {restaurant.isOpen ? 'Aberto Hoje' : 'Fechado'}
            </span>
            {restaurant.verifiedNeighborhoodSpot && (
              <span className="px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md border border-amber-500/50 text-amber-300 text-xs font-semibold flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-amber-400" />
                Ponto Oficial do Bairro
              </span>
            )}
          </div>

          <div className="absolute bottom-4 left-4 right-4 text-white">
            <span className="text-xs font-semibold text-orange-400">
              {restaurant.categoryLabel}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display">
              {restaurant.name}
            </h1>
          </div>
        </div>

        {/* Info Grid */}
        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 border-y border-slate-800/80 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-white tabular-nums">{restaurant.rating.toFixed(1)}</span>
                <span className="text-[11px] text-slate-400 block">({restaurant.reviewCount} avaliações)</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-400 shrink-0" />
              <div>
                <span className="font-bold text-white">{restaurant.deliveryTime}</span>
                <span className="text-[11px] text-slate-400 block">{restaurant.openingHours}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-orange-400 shrink-0" />
              <div>
                <span className="font-bold text-white">{restaurant.neighborhoodName}</span>
                <span className="text-[11px] text-slate-400 block">{restaurant.distanceKm} km de você</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold text-white">Zap Direto</span>
                <span className="text-[11px] text-slate-400 block">{restaurant.whatsappDemo}</span>
              </div>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {restaurant.bio}
          </p>

          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>{restaurant.address}</span>
          </div>
        </div>
      </div>

      {/* 3 Main Tabs: Cardápio, Promoções, Publicações */}
      <div>
        <div className="flex border-b border-slate-800 text-xs sm:text-sm font-semibold">
          <button
            onClick={() => setActiveTab('cardapio')}
            className={`flex-1 py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'cardapio'
                ? 'border-orange-500 text-orange-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-4 h-4" />
            Cardápio Completo ({menuItems.length})
          </button>

          <button
            onClick={() => setActiveTab('promocoes')}
            className={`flex-1 py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'promocoes'
                ? 'border-orange-500 text-orange-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tag className="w-4 h-4" />
            Promoções do Bairro ({promotions.length})
          </button>

          <button
            onClick={() => setActiveTab('publicacoes')}
            className={`flex-1 py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'publicacoes'
                ? 'border-orange-500 text-orange-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Publicações & Fotos ({posts.length})
          </button>
        </div>

        {/* Tab 1: Cardápio */}
        {activeTab === 'cardapio' && (
          <div className="mt-5 space-y-4">
            {/* Category filter sub-chips */}
            {categoriesInMenu.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                <button
                  onClick={() => setSelectedMenuCategory('todos')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedMenuCategory === 'todos'
                      ? 'bg-orange-500 text-black font-bold'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  Todos
                </button>
                {categoriesInMenu.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedMenuCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      selectedMenuCategory === cat
                        ? 'bg-orange-500 text-black font-bold'
                        : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredMenuItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectMenuItem(item)}
                  className="group cursor-pointer p-3.5 rounded-2xl bg-[#13151f] border border-slate-800/80 hover:border-orange-500/40 transition-all flex gap-3.5 items-center justify-between"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-white group-hover:text-orange-400 transition-colors">
                        {item.name}
                      </h4>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {item.badge}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2">
                      {item.description}
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-sm font-extrabold text-amber-400 tabular-nums">
                        R$ {item.price.toFixed(2).replace('.', ',')}
                      </span>
                      {item.originalPrice && (
                        <span className="text-xs text-slate-400 line-through tabular-nums">
                          R$ {item.originalPrice.toFixed(2).replace('.', ',')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Thumbnail */}
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-slate-900 shrink-0">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                    <button
                      type="button"
                      className="absolute bottom-1 right-1 w-6 h-6 rounded-lg bg-orange-600 text-white flex items-center justify-center shadow-md hover:bg-orange-500 transition-colors"
                      title="Ver e pedir no Zap"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Promoções */}
        {activeTab === 'promocoes' && (
          <div className="mt-5 space-y-4">
            {promotions.length === 0 ? (
              <div className="text-center py-10 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-xs">
                Nenhuma promoção ativa no momento para esta lanchonete.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {promotions.map((promo) => (
                  <div
                    key={promo.id}
                    className="rounded-2xl bg-gradient-to-br from-[#141622] to-[#1a1d2d] border border-amber-500/30 p-4.5 space-y-3 relative overflow-hidden shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/40 mb-1.5">
                          {promo.badge}
                        </span>
                        <h4 className="text-base font-bold text-white">
                          {promo.title}
                        </h4>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs text-slate-400 line-through block tabular-nums">
                          R$ {promo.regularPrice.toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-base font-extrabold text-amber-400 tabular-nums">
                          R$ {promo.discountPrice.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {promo.description}
                    </p>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        {promo.validUntil}
                      </span>
                      {promo.couponCode && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 text-[11px]">Cupom:</span>
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono font-bold text-amber-400 text-xs">
                            {promo.couponCode}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Publicações & Fotos */}
        {activeTab === 'publicacoes' && (
          <div className="mt-5 space-y-4">
            {posts.length === 0 ? (
              <div className="text-center py-10 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-xs">
                Ainda não há postagens marcando este restaurante no feed da comunidade.
              </div>
            ) : (
              posts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-2xl bg-[#13151f] border border-slate-800 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-orange-400 overflow-hidden">
                        {post.authorName.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          {post.authorName}
                          <span className="text-[10px] text-amber-400 font-medium">
                            · {post.authorRole === 'morador' ? 'Morador do Bairro' : 'Comerciante'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {post.createdAt}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed">
                    {post.content}
                  </p>

                  <div className="relative h-48 sm:h-56 rounded-xl overflow-hidden bg-slate-900">
                    <img
                      src={post.imageUrl}
                      alt="Prato do post"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <span className="flex items-center gap-1.5 text-orange-400 font-semibold">
                      <ThumbsUp className="w-3.5 h-3.5" />
                      {post.likesCount} curtiram no bairro
                    </span>
                    <span>{post.commentsCount} comentários de vizinhos</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
