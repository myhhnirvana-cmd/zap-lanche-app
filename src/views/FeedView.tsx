import React, { useState } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  MapPin,
  Flame,
  PlusCircle,
  Check,
  Send,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import { SocialPost, Restaurant, MenuItem } from '../types';
import { MOCK_POSTS, ASSET_BURGER } from '../data/mockData';

interface FeedViewProps {
  restaurants: Restaurant[];
  onSelectRestaurantById: (id: string) => void;
  onOpenDishPreview: (dishName: string, restaurantName: string) => void;
}

export const FeedView: React.FC<FeedViewProps> = ({
  restaurants,
  onSelectRestaurantById,
  onOpenDishPreview,
}) => {
  const [posts, setPosts] = useState<SocialPost[]>(MOCK_POSTS);
  const [filterRole, setFilterRole] = useState<'todos' | 'morador' | 'comerciante'>('todos');
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [postLikes, setPostLikes] = useState<Record<string, { count: number; liked: boolean }>>({
    'post-1': { count: 142, liked: false },
    'post-2': { count: 98, liked: true },
    'post-3': { count: 231, liked: false },
  });

  // New post simulation
  const [newPostText, setNewPostText] = useState('');
  const [showNewPostForm, setShowNewPostForm] = useState(false);
  const [postCreatedSuccess, setPostCreatedSuccess] = useState(false);

  const toggleLike = (postId: string) => {
    setPostLikes((prev) => {
      const current = prev[postId] || { count: 10, liked: false };
      return {
        ...prev,
        [postId]: {
          count: current.liked ? current.count - 1 : current.count + 1,
          liked: !current.liked,
        },
      };
    });
  };

  const handleAddComment = (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p
      )
    );
    setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
  };

  const handlePublishDemoPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim()) return;

    const newPost: SocialPost = {
      id: `post-demo-${Date.now()}`,
      restaurantId: 'rest-jorge-mooca',
      restaurantName: 'Lanchonete do Jorge',
      restaurantCategory: 'Hambúrguer Artesanal',
      neighborhood: 'Mooca',
      authorName: 'Você (Thiago da Silva)',
      authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      authorRole: 'morador',
      content: newPostText,
      imageUrl: ASSET_BURGER,
      likesCount: 1,
      isLiked: true,
      commentsCount: 0,
      createdAt: 'Agora mesmo',
      taggedDish: {
        id: 'm1',
        name: 'Smash Mooca Monstro',
        price: 36.9,
      },
    };

    setPosts([newPost, ...posts]);
    setPostLikes((prev) => ({ ...prev, [newPost.id]: { count: 1, liked: true } }));
    setNewPostText('');
    setShowNewPostForm(false);
    setPostCreatedSuccess(true);
    setTimeout(() => setPostCreatedSuccess(false), 3000);
  };

  const filteredPosts = posts.filter((p) => {
    if (filterRole === 'todos') return true;
    return p.authorRole === filterRole;
  });

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-16 animate-fade-in">
      {/* Feed Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2 font-display">
            <Flame className="w-5 h-5 text-orange-500 fill-orange-500/20" />
            Feed Gastronômico do Bairro
          </h2>
          <p className="text-xs text-slate-400">
            Fotos reais, dicas dos vizinhos e novidades fresquinhas das lanchonetes
          </p>
        </div>

        <button
          onClick={() => setShowNewPostForm(!showNewPostForm)}
          className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-orange-600/20"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Postar Lanche</span>
        </button>
      </div>

      {/* Success banner */}
      {postCreatedSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Sua publicação gastronômica foi compartilhada com o bairro!</span>
        </div>
      )}

      {/* New Post Form Drawer */}
      {showNewPostForm && (
        <form
          onSubmit={handlePublishDemoPost}
          className="p-4 rounded-2xl bg-[#131520] border border-orange-500/30 space-y-3 shadow-xl animate-slide-up"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Compartilhar Recomendação no Bairro
            </span>
            <span className="text-[10px] text-slate-400">Modo Demonstração</span>
          </div>

          <textarea
            value={newPostText}
            onChange={(e) => setNewPostText(e.target.value)}
            placeholder="Qual foi o lanche de hoje? Conta o que achou da chapa, do molho ou do atendimento..."
            className="w-full h-24 p-3 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 resize-none"
            required
          />

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400">
              Marcando: <strong className="text-slate-200">Lanchonete do Jorge (Mooca)</strong>
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowNewPostForm(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-orange-600 hover:bg-orange-500 text-white transition-colors"
              >
                Publicar no Feed
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Role Filter Tabs */}
      <div className="flex items-center gap-2 text-xs">
        <button
          onClick={() => setFilterRole('todos')}
          className={`px-3 py-1.5 rounded-lg border transition-colors ${
            filterRole === 'todos'
              ? 'bg-orange-500/20 border-orange-500 text-orange-300 font-bold'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          Todos os Posts ({posts.length})
        </button>
        <button
          onClick={() => setFilterRole('morador')}
          className={`px-3 py-1.5 rounded-lg border transition-colors ${
            filterRole === 'morador'
              ? 'bg-orange-500/20 border-orange-500 text-orange-300 font-bold'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          Avaliações de Moradores
        </button>
        <button
          onClick={() => setFilterRole('comerciante')}
          className={`px-3 py-1.5 rounded-lg border transition-colors ${
            filterRole === 'comerciante'
              ? 'bg-orange-500/20 border-orange-500 text-orange-300 font-bold'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          Direto da Cozinha / Lojas
        </button>
      </div>

      {/* Posts List */}
      <div className="space-y-5">
        {filteredPosts.map((post) => {
          const likeState = postLikes[post.id] || { count: post.likesCount, liked: post.isLiked || false };
          const isCommentsOpen = activeCommentPostId === post.id;

          return (
            <article
              key={post.id}
              className="rounded-3xl bg-[#12141e] border border-slate-800/90 overflow-hidden shadow-xl"
            >
              {/* Post Author Bar */}
              <div className="p-3.5 sm:p-4 flex items-center justify-between border-b border-slate-850">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center font-bold text-orange-400">
                    {post.authorName.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                      {post.authorName}
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                          post.authorRole === 'morador'
                            ? 'bg-blue-500/15 text-blue-300'
                            : post.authorRole === 'comerciante'
                            ? 'bg-amber-500/15 text-amber-300'
                            : 'bg-purple-500/15 text-purple-300'
                        }`}
                      >
                        {post.authorRole === 'morador'
                          ? 'Morador'
                          : post.authorRole === 'comerciante'
                          ? 'Comerciante'
                          : 'Crítico Local'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span className="flex items-center gap-0.5 text-orange-400/90">
                        <MapPin className="w-3 h-3" />
                        {post.neighborhood}
                      </span>
                      <span>·</span>
                      <span>{post.createdAt}</span>
                    </div>
                  </div>
                </div>

                {/* Restaurant Tag shortcut */}
                <button
                  onClick={() => onSelectRestaurantById(post.restaurantId)}
                  className="text-xs font-semibold text-slate-300 hover:text-orange-400 transition-colors text-right max-w-[130px] truncate"
                >
                  @{post.restaurantName}
                </button>
              </div>

              {/* Post Content */}
              <div className="p-3.5 sm:p-4 text-xs sm:text-sm text-slate-200 leading-relaxed">
                {post.content}
              </div>

              {/* Food Image */}
              <div className="relative h-64 sm:h-80 w-full bg-slate-900 overflow-hidden">
                <img
                  src={post.imageUrl}
                  alt="Foto do lanche"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                {/* Tagged Dish Badge */}
                {post.taggedDish && (
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between p-2 rounded-xl bg-black/75 backdrop-blur-md border border-slate-700/80 text-white">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-7 h-7 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                        <ShoppingBag className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
                        <span className="text-[10px] text-slate-400 block uppercase tracking-wider">
                          Prato marcado
                        </span>
                        <span className="text-xs font-bold text-white truncate block">
                          {post.taggedDish.name}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        onOpenDishPreview(
                          post.taggedDish!.name,
                          post.restaurantName
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-bold shrink-0 transition-colors"
                    >
                      Ver no Cardápio
                    </button>
                  </div>
                )}
              </div>

              {/* Engagement Controls */}
              <div className="p-3 sm:p-4 flex items-center justify-between border-t border-slate-850">
                <div className="flex items-center gap-4">
                  {/* Like Button */}
                  <button
                    onClick={() => toggleLike(post.id)}
                    className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                      likeState.liked
                        ? 'text-rose-500'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Heart
                      className={`w-5 h-5 transition-transform ${
                        likeState.liked ? 'fill-rose-500 scale-110' : ''
                      }`}
                    />
                    <span className="tabular-nums">{likeState.count}</span>
                  </button>

                  {/* Comment Toggle */}
                  <button
                    onClick={() =>
                      setActiveCommentPostId(
                        isCommentsOpen ? null : post.id
                      )
                    }
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span className="tabular-nums">{post.commentsCount}</span>
                  </button>
                </div>

                <button
                  onClick={() => onSelectRestaurantById(post.restaurantId)}
                  className="text-xs font-bold text-orange-400 hover:text-orange-300 underline underline-offset-2"
                >
                  Pedir no Zap da Loja
                </button>
              </div>

              {/* Comments Section Drawer */}
              {isCommentsOpen && (
                <div className="p-3 sm:p-4 bg-slate-900/80 border-t border-slate-800 space-y-3 animate-fade-in">
                  <div className="text-xs font-bold text-slate-300">
                    Comentários da vizinhança
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="p-2 rounded-xl bg-slate-850 text-slate-300">
                      <strong className="text-white block font-medium">
                        Marcelo Mooca
                      </strong>
                      Concordo 100%! O hambúrguer deles é o melhor da Zona Leste.
                    </div>
                  </div>

                  {/* Add comment input */}
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={commentInputs[post.id] || ''}
                      onChange={(e) =>
                        setCommentInputs({
                          ...commentInputs,
                          [post.id]: e.target.value,
                        })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddComment(post.id);
                      }}
                      placeholder="Deixe um elogio ou dica..."
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddComment(post.id)}
                      className="p-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};
