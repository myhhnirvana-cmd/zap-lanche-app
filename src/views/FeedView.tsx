import React, { useState, useRef, useEffect } from 'react';
import {
  Heart,
  MessageCircle,
  MapPin,
  Flame,
  PlusCircle,
  Check,
  Send,
  Sparkles,
  ShoppingBag,
  Camera,
  Image as ImageIcon,
  Trash2,
  Pencil,
  X,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { SocialPost, Restaurant, PostComment } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getAvatarUrl, DEFAULT_AVATAR_URL } from '../data/avatars';
import {
  isSupabaseConfigured,
  fetchComments,
  insertComment,
  updateComment,
  deleteComment,
  UUID_REGEX,
  fetchPostsFromSupabase,
  insertPostToSupabase,
  updatePostInSupabase,
  deletePostInSupabase,
  fetchPostLikesFromSupabase,
  togglePostLikeInSupabase,
} from '../lib/supabase';
import { MOCK_POSTS, processAndCompressImage, savePostsFromStorage, loadPostsFromStorage, savePostsToStorage } from '../data/mockData';

interface FeedViewProps {
  restaurants: Restaurant[];
  onSelectRestaurantById: (id: string) => void;
  onOpenDishPreview: (dishName: string, restaurantName: string) => void;
}

// -------------------------------------------------------------
// FEED REAL: CARREGAMENTO INTEGRADO COM O SUPABASE
// -------------------------------------------------------------


export const FeedView: React.FC<FeedViewProps> = ({
  restaurants,
  onSelectRestaurantById,
  onOpenDishPreview,
}) => {
  const { user, profile } = useAuth();

  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);



  // Identificação do usuário autenticado a partir do Supabase Auth e public.profiles
  const authenticatedAuthorName =
    profile?.full_name?.trim() ||
    user?.user_metadata?.full_name?.trim() ||
    user?.user_metadata?.name?.trim() ||
    user?.email?.split('@')[0] ||
    'Morador';

  const currentUserId = user?.id || 'usr-anon';

  const userAvatarChoice =
    (user?.user_metadata?.avatar_id as string | undefined) ||
    (user?.user_metadata?.avatar_url as string | undefined) ||
    (typeof window !== 'undefined' && user?.id ? localStorage.getItem(`zap_lanche_avatar_url_${user.id}`) : null) ||
    (typeof window !== 'undefined' && user?.id ? localStorage.getItem(`zap_lanche_avatar_${user.id}`) : null);

  const currentAvatar = getAvatarUrl(userAvatarChoice);

  const currentAuthorRole: 'morador' | 'comerciante' | 'critico_do_bairro' =
    profile?.role === 'comerciante'
      ? 'comerciante'
      : profile?.role === 'admin'
      ? 'critico_do_bairro'
      : 'morador';

  const [filterRole, setFilterRole] = useState<'todos' | 'morador' | 'comerciante'>('todos');
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  // Estado do formulário de criação
  const [showNewPostForm, setShowNewPostForm] = useState(false);
  const [newPostText, setNewPostText] = useState('');
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [newPostImageName, setNewPostImageName] = useState<string | null>(null);
  const [isCompressingNewImage, setIsCompressingNewImage] = useState(false);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Estado de edição de publicação própria
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [editText, setEditText] = useState('');
  const [editImage, setEditImage] = useState<string | null>(null);
  const [editImageName, setEditImageName] = useState<string | null>(null);
  const [isCompressingEditImage, setIsCompressingEditImage] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);

  // Estado de confirmação de exclusão
  const [postToDelete, setPostToDelete] = useState<SocialPost | null>(null);

  // Mensagens de feedback (sucesso, aviso ou erro)
  const [notification, setNotification] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);

  const [editingComment, setEditingComment] = useState<{postId: string, commentId: string, text: string} | null>(null);
  const [commentToDelete, setCommentToDelete] = useState<{postId: string, commentId: string, text: string} | null>(null);
  const [isDeletingComment, setIsDeletingComment] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);



  // Limpar notificação após tempo determinado
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [notification]);

  // Sincroniza publicações compartilhadas, curtidas e comentários do Supabase
  useEffect(() => {
    let isMounted = true;
    async function syncSupabaseFeed() {
      if (!isSupabaseConfigured) return;

      try {
        const [postsRes, likesRes, commentsRes] = await Promise.all([
          fetchPostsFromSupabase(),
          fetchPostLikesFromSupabase(),
          fetchComments(),
        ]);

        if (!isMounted) return;

        const dbPosts = postsRes.data || [];
        const dbLikes = likesRes.data || [];
        const dbComments = commentsRes.data || [];

        // Mapear posts do banco de dados compartilhado
        const mappedDbPosts: SocialPost[] = dbPosts.map((p) => {
          const postLikes = dbLikes.filter((l) => l.post_id === p.id);
          const postComments = dbComments.filter((c) => c.post_id === p.id);

          const formattedComments: PostComment[] = postComments.map((c) => ({
            id: c.id,
            profile_id: c.profile_id,
            authorId: c.profile_id,
            authorName: c.author_name,
            authorAvatar: c.author_avatar || DEFAULT_AVATAR_URL,
            text: c.text,
            createdAt: new Date(c.created_at).toLocaleDateString('pt-BR') + ' às ' + new Date(c.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            postId: c.post_id,
          }));

          return {
            id: p.id,
            restaurantId: p.restaurant_id || '',
            restaurantName: p.restaurant_name,
            restaurantCategory: p.restaurant_category,
            neighborhood: p.neighborhood,
            authorId: p.profile_id,
            authorName: p.author_name,
            authorAvatar: p.author_avatar || DEFAULT_AVATAR_URL,
            authorRole: p.author_role,
            content: p.content,
            imageUrl: p.image_url || undefined,
            likesCount: postLikes.length,
            isLiked: user?.id ? postLikes.some((l) => l.profile_id === user.id) : false,
            commentsCount: formattedComments.length,
            comments: formattedComments,
            createdAt: new Date(p.created_at).toLocaleDateString('pt-BR') + ' às ' + new Date(p.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            editedAt: p.edited_at ? 'Editado recentemente' : undefined,
            isOwnPost: user?.id ? p.profile_id === user.id : false,
            hasPhotoValidation: Boolean(p.image_url),
            is_demo: p.is_demo,
          };
        });

        // Posts demonstrativos padrão identificados com selo de demonstração
        const demoPostsWithComments: SocialPost[] = MOCK_POSTS.map((mp) => {
          const postComments = dbComments.filter((c) => c.post_id === mp.id);
          const postLikes = dbLikes.filter((l) => l.post_id === mp.id);
          const formattedComments: PostComment[] = postComments.map((c) => ({
            id: c.id,
            profile_id: c.profile_id,
            authorId: c.profile_id,
            authorName: c.author_name,
            authorAvatar: c.author_avatar || DEFAULT_AVATAR_URL,
            text: c.text,
            createdAt: new Date(c.created_at).toLocaleDateString('pt-BR'),
            postId: c.post_id,
          }));

          return {
            ...mp,
            is_demo: true,
            comments: [...(mp.comments || []), ...formattedComments],
            commentsCount: (mp.comments || []).length + formattedComments.length,
            likesCount: (mp.likesCount || 0) + postLikes.length,
            isLiked: user?.id ? postLikes.some((l) => l.profile_id === user.id) : mp.isLiked,
          };
        });

        if (mappedDbPosts.length > 0) {
          setPosts([...mappedDbPosts, ...demoPostsWithComments]);
        } else {
          setPosts(demoPostsWithComments);
        }
      } catch (err) {
        console.warn('Erro ao sincronizar feed com o Supabase:', err);
      }
    }

    syncSupabaseFeed();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Identificação do proprietário usando o ID real da sessão autenticada (auth.users.id)
  const isCommentOwner = (comment: PostComment): boolean => {
    if (!user?.id) return false;
    return comment.profile_id === user.id || comment.authorId === user.id;
  };

  // Função para verificar se a publicação pertence ao usuário atual
  const isPostOwner = (post: SocialPost): boolean => {
    if (user?.id && post.authorId === user.id) return true;
    return post.isOwnPost === true;
  };

  // -------------------------------------------------------------
  // SELEÇÃO E PRÉ-VISUALIZAÇÃO DE FOTO DA GALERIA (CRIAÇÃO)
  // -------------------------------------------------------------
  const handleSelectNewImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFormError(null);
    setIsCompressingNewImage(true);

    try {
      const compressedDataUrl = await processAndCompressImage(file);
      setNewPostImage(compressedDataUrl);
      setNewPostImageName(file.name);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao processar a foto.';
      setFormError(message);
      setNewPostImage(null);
      setNewPostImageName(null);
    } finally {
      setIsCompressingNewImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveNewImage = () => {
    setNewPostImage(null);
    setNewPostImageName(null);
    setFormError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // -------------------------------------------------------------
  // CRIAÇÃO DE NOVA POSTAGEM COM PERSISTÊNCIA COMPARTILHADA
  // -------------------------------------------------------------
  const handlePublishPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim()) {
      setFormError('Escreva uma mensagem ou comentário para compartilhar no feed.');
      return;
    }

    if (!user?.id) {
      setNotification({
        type: 'warning',
        text: 'Entre na sua conta para publicar uma recomendação compartilhada no feed.',
      });
      return;
    }

    const targetRestaurant = selectedRestaurantId
      ? restaurants.find((r) => r.id === selectedRestaurantId)
      : undefined;

    const restaurantIdToUse = targetRestaurant?.supabaseId || targetRestaurant?.id || null;

    let createdId = `post-user-${Date.now()}`;

    if (isSupabaseConfigured) {
      const { data: dbPost, error: postErr } = await insertPostToSupabase({
        restaurant_id: restaurantIdToUse,
        restaurant_name: targetRestaurant?.name || 'Comunidade ZapLanche',
        restaurant_category: targetRestaurant?.categoryLabel || 'Comunidade',
        neighborhood: targetRestaurant?.neighborhoodName || 'Comunidade',
        profile_id: user.id,
        author_name: authenticatedAuthorName,
        author_avatar: currentAvatar,
        author_role: currentAuthorRole,
        content: newPostText.trim(),
        image_url: newPostImage || null,
        is_demo: false,
      });

      if (postErr || !dbPost) {
        setNotification({
          type: 'error',
          text: `Falha ao salvar publicação no banco: ${postErr?.message || 'Erro de conexão.'}`,
        });
        return;
      }

      createdId = dbPost.id;
    }

    const newPost: SocialPost = {
      id: createdId,
      restaurantId: targetRestaurant?.id || '',
      restaurantName: targetRestaurant?.name || 'Comunidade ZapLanche',
      restaurantCategory: targetRestaurant?.categoryLabel || 'Comunidade',
      neighborhood: targetRestaurant?.neighborhoodName || 'Comunidade',
      authorId: user.id,
      authorName: authenticatedAuthorName,
      authorAvatar: currentAvatar,
      authorRole: currentAuthorRole,
      content: newPostText.trim(),
      imageUrl: newPostImage || undefined,
      likesCount: 0,
      isLiked: false,
      commentsCount: 0,
      comments: [],
      createdAt: 'Agora mesmo',
      isOwnPost: true,
      hasPhotoValidation: Boolean(newPostImage),
      is_demo: false,
    };

    const updatedPosts = [newPost, ...posts];
    setPosts(updatedPosts);
    savePostsToStorage(updatedPosts);

    setNotification({
      type: 'success',
      text: 'Sua publicação foi compartilhada com todos os moradores do bairro!',
    });

    setNewPostText('');
    setNewPostImage(null);
    setNewPostImageName(null);
    setFormError(null);
    setShowNewPostForm(false);
  };

  // -------------------------------------------------------------
  // EDIÇÃO DE PUBLICAÇÃO PRÓPRIA
  // -------------------------------------------------------------
  const handleStartEdit = (post: SocialPost) => {
    if (!isPostOwner(post)) return;
    setEditingPost(post);
    setEditText(post.content);
    setEditImage(post.imageUrl || null);
    setEditImageName(post.imageUrl ? 'Foto atual' : null);
    setEditFormError(null);
  };

  const handleSelectEditImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setEditFormError(null);
    setIsCompressingEditImage(true);

    try {
      const compressedDataUrl = await processAndCompressImage(file);
      setEditImage(compressedDataUrl);
      setEditImageName(file.name);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao processar a foto.';
      setEditFormError(message);
    } finally {
      setIsCompressingEditImage(false);
      if (editFileInputRef.current) editFileInputRef.current.value = '';
    }
  };

  const handleRemoveEditImage = () => {
    setEditImage(null);
    setEditImageName(null);
    if (editFileInputRef.current) editFileInputRef.current.value = '';
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;
    if (!isPostOwner(editingPost)) {
      setEditFormError('Você não tem permissão para editar esta publicação.');
      return;
    }
    if (!editText.trim()) {
      setEditFormError('O texto da publicação não pode ficar vazio.');
      return;
    }

    if (isSupabaseConfigured && editingPost.id.startsWith('post-')) {
      const { error: updateErr } = await updatePostInSupabase(
        editingPost.id,
        editText.trim(),
        editImage || null
      );
      if (updateErr) {
        setEditFormError(`Erro ao atualizar no servidor: ${updateErr.message}`);
        return;
      }
    }

    const updatedPosts = posts.map((p) => {
      if (p.id === editingPost.id) {
        return {
          ...p,
          content: editText.trim(),
          imageUrl: editImage || undefined,
          editedAt: 'Editado agora',
          hasPhotoValidation: Boolean(editImage),
        };
      }
      return p;
    });

    setPosts(updatedPosts);
    savePostsToStorage(updatedPosts);

    setNotification({
      type: 'success',
      text: 'Publicação atualizada com sucesso!',
    });

    setEditingPost(null);
  };

  // -------------------------------------------------------------
  // EXCLUSÃO DE PUBLICAÇÃO PRÓPRIA (COM CONFIRMAÇÃO)
  // -------------------------------------------------------------
  const handleConfirmDelete = async () => {
    if (!postToDelete) return;
    if (!isPostOwner(postToDelete)) {
      setNotification({
        type: 'error',
        text: 'Não é permitido excluir publicações de outros autores.',
      });
      setPostToDelete(null);
      return;
    }

    if (isSupabaseConfigured && postToDelete.id.startsWith('post-')) {
      const { error: delErr } = await deletePostInSupabase(postToDelete.id);
      if (delErr) {
        setNotification({
          type: 'error',
          text: `Erro ao excluir no servidor: ${delErr.message}`,
        });
        setPostToDelete(null);
        return;
      }
    }

    const updatedPosts = posts.filter((p) => p.id !== postToDelete.id);
    setPosts(updatedPosts);
    savePostsToStorage(updatedPosts);

    setNotification({
      type: 'success',
      text: 'Sua publicação foi excluída do feed.',
    });
    setPostToDelete(null);
  };

  // Curtidas compartilhadas sincronizadas no Supabase
  const toggleLike = async (postId: string) => {
    const targetPost = posts.find((p) => p.id === postId);
    if (!targetPost) return;
    const currentlyLiked = Boolean(targetPost.isLiked);

    if (!user?.id) {
      setNotification({
        type: 'warning',
        text: 'Faça login na sua conta para curtir recomendações do bairro!',
      });
      return;
    }

    const nextLiked = !currentlyLiked;
    const currentCount = targetPost.likesCount || 0;
    const nextCount = nextLiked ? currentCount + 1 : Math.max(0, currentCount - 1);

    const updatedPosts = posts.map((p) =>
      p.id === postId ? { ...p, isLiked: nextLiked, likesCount: nextCount } : p
    );
    setPosts(updatedPosts);
    savePostsToStorage(updatedPosts);

    if (isSupabaseConfigured) {
      await togglePostLikeInSupabase(postId, user.id, currentlyLiked);
    }
  };

  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    if (!user?.id) {
      setNotification({
        type: 'warning',
        text: 'Você precisa entrar na sua conta para publicar um comentário.',
      });
      return;
    }

    const realProfileId = user.id;

    if (isSupabaseConfigured) {
      const { data: dbComment, error } = await insertComment({
        post_id: postId,
        profile_id: realProfileId,
        author_name: authenticatedAuthorName,
        author_avatar: currentAvatar,
        text,
      });

      if (error || !dbComment) {
        setNotification({
          type: 'error',
          text: `Falha ao salvar comentário no Supabase: ${error?.message || 'Erro de comunicação.'}`,
        });
        return;
      }

      const newComment: PostComment = {
        id: dbComment.id,
        profile_id: dbComment.profile_id,
        authorId: dbComment.profile_id,
        authorName: dbComment.author_name,
        authorAvatar: dbComment.author_avatar || currentAvatar,
        text: dbComment.text,
        createdAt: 'Agora mesmo',
        postId,
      };

      const updatedPosts = posts.map((p) => {
        if (p.id === postId) {
          const existingComments = Array.isArray(p.comments) ? p.comments : [];
          const updatedComments = [...existingComments, newComment];
          return {
            ...p,
            comments: updatedComments,
            commentsCount: updatedComments.length,
          };
        }
        return p;
      });

      setPosts(updatedPosts);
      savePostsToStorage(updatedPosts);
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
      setNotification({
        type: 'success',
        text: 'Comentário publicado com sucesso!',
      });
    } else {
      const newComment: PostComment = {
        id: `comm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        profile_id: realProfileId,
        authorId: realProfileId,
        authorName: authenticatedAuthorName,
        authorAvatar: currentAvatar,
        text,
        createdAt: 'Agora mesmo',
        postId,
      };

      const updatedPosts = posts.map((p) => {
        if (p.id === postId) {
          const existingComments = Array.isArray(p.comments) ? p.comments : [];
          const updatedComments = [...existingComments, newComment];
          return {
            ...p,
            comments: updatedComments,
            commentsCount: updatedComments.length,
          };
        }
        return p;
      });

      setPosts(updatedPosts);
      savePostsToStorage(updatedPosts);
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
      setNotification({
        type: 'success',
        text: 'Comentário publicado localmente!',
      });
    }
  };

  const handleSaveCommentEdit = async () => {
    if (!editingComment) return;
    const newText = editingComment.text.trim();
    if (!newText) {
      setNotification({
        type: 'warning',
        text: 'O texto do comentário não pode ficar vazio.',
      });
      return;
    }

    const targetPost = posts.find((p) => p.id === editingComment.postId);
    const targetComment = targetPost?.comments?.find((c) => c.id === editingComment.commentId);

    if (!targetComment || !isCommentOwner(targetComment)) {
      setNotification({
        type: 'error',
        text: 'Você só pode editar os seus próprios comentários.',
      });
      setEditingComment(null);
      return;
    }

    const isDbComment = UUID_REGEX.test(targetComment.id);

    if (isSupabaseConfigured && isDbComment) {
      const { data, error } = await updateComment(targetComment.id, newText);
      if (error || !data) {
        setNotification({
          type: 'error',
          text: `Erro ao atualizar comentário no Supabase: ${error?.message || 'Falha de comunicação.'}`,
        });
        return;
      }
    }

    const updatedPosts = posts.map((p) => {
      if (p.id === editingComment.postId) {
        const updatedComments = (p.comments || []).map((c) =>
          c.id === editingComment.commentId ? { ...c, text: newText } : c
        );
        return { ...p, comments: updatedComments };
      }
      return p;
    });

    setPosts(updatedPosts);
    savePostsToStorage(updatedPosts);
    setEditingComment(null);
    setNotification({
      type: 'success',
      text: 'Comentário atualizado com sucesso!',
    });
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    const targetPost = posts.find((p) => p.id === postId);
    const targetComment = targetPost?.comments?.find((c) => c.id === commentId);

    if (!targetComment || !isCommentOwner(targetComment)) {
      setNotification({
        type: 'error',
        text: 'Você só pode excluir os seus próprios comentários.',
      });
      return false;
    }

    const isDbComment = UUID_REGEX.test(targetComment.id);

    if (isSupabaseConfigured && isDbComment) {
      const { error } = await deleteComment(targetComment.id);
      if (error) {
        setNotification({
          type: 'error',
          text: `Erro ao excluir comentário no Supabase: ${error.message}`,
        });
        return false;
      }
    }

    const updatedPosts = posts.map((p) => {
      if (p.id === postId) {
        const updatedComments = (p.comments || []).filter((c) => c.id !== commentId);
        return {
          ...p,
          comments: updatedComments,
          commentsCount: Math.max(0, updatedComments.length),
        };
      }
      return p;
    });

    setPosts(updatedPosts);
    savePostsToStorage(updatedPosts);
    setNotification({
      type: 'success',
      text: 'Comentário excluído com sucesso!',
    });
    return true;
  };

  const handleConfirmDeleteComment = async () => {
    if (!commentToDelete || isDeletingComment) return;
    setIsDeletingComment(true);

    try {
      const success = await handleDeleteComment(
        commentToDelete.postId,
        commentToDelete.commentId
      );
      if (success) {
        setCommentToDelete(null);
      }
    } finally {
      setIsDeletingComment(false);
    }
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
            Dicas dos vizinhos, fotos de lanches e novidades das lanchonetes locais
          </p>
        </div>

        <button
          onClick={() => {
            setShowNewPostForm(!showNewPostForm);
            setFormError(null);
          }}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-orange-500/20"
        >
          <PlusCircle className="w-4 h-4 stroke-[2.5]" />
          <span>Postar Lanche</span>
        </button>
      </div>

      {/* Notificação dinâmica de Sucesso / Aviso / Erro */}
      {notification && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-center gap-2.5 animate-fade-in shadow-lg ${
            notification.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : notification.type === 'warning'
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
          }`}
        >
          {notification.type === 'success' && <Check className="w-4 h-4 shrink-0 text-emerald-400" />}
          {notification.type === 'warning' && (
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          )}
          {notification.type === 'error' && (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span className="flex-1 font-medium">{notification.text}</span>
          <button
            onClick={() => setNotification(null)}
            className="p-1 rounded text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* FORMULÁRIO DE NOVA PUBLICAÇÃO (FOTO DA GALERIA + TEXTO)      */}
      {/* ============================================================ */}
      {showNewPostForm && (
        <form
          onSubmit={handlePublishPost}
          className="p-4 sm:p-5 rounded-3xl bg-[#131520] border border-orange-500/40 space-y-3.5 shadow-2xl animate-slide-up"
        >
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <span className="text-xs font-bold text-orange-400 flex items-center gap-1.5 font-display">
              <Sparkles className="w-3.5 h-3.5" />
              Compartilhar Recomendação no Feed
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium">
              {authenticatedAuthorName}
            </span>
          </div>

          {/* Campo de texto */}
          <div>
            <textarea
              value={newPostText}
              onChange={(e) => {
                setNewPostText(e.target.value);
                if (formError) setFormError(null);
              }}
              placeholder="Conta para a vizinhança: qual foi o lanche de hoje? O que achou do sabor, do ponto da carne ou do atendimento?"
              className="w-full h-24 p-3 text-xs rounded-2xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 resize-none transition-colors"
              required
            />
          </div>

          {/* Selecionar Estabelecimento do Bairro */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <label className="text-slate-400 text-[11px] font-semibold">
              Marcar uma lanchonete (opcional):
            </label>
            <select
              value={selectedRestaurantId}
              onChange={(e) => setSelectedRestaurantId(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-orange-500"
            >
              <option value="">Publicação geral (sem restaurante)</option>
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.neighborhoodName})
                </option>
              ))}
            </select>
          </div>

          {/* Pré-visualização da Foto Selecionada (se houver) */}
          {newPostImage && (
            <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950">
              <div className="relative h-44 sm:h-56 w-full">
                <img
                  src={newPostImage}
                  alt="Pré-visualização do lanche"
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>

              {/* Barra de controle da foto anexada */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between p-2 rounded-xl bg-black/80 backdrop-blur-md border border-slate-700 text-xs">
                <div className="flex items-center gap-1.5 text-slate-200 truncate pr-2">
                  <ImageIcon className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span className="truncate text-[11px]">
                    {newPostImageName || 'Foto pronta para postar'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition-colors"
                  >
                    Substituir
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveNewImage}
                    className="p-1 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-colors"
                    title="Remover foto (publicar somente texto)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mensagem de Erro de Validação de Imagem / Texto */}
          {formError && (
            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Barra de Ações: Botão de Galeria / Foto e Botões de Envio */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
            {/* Input oculto com trigger nativo de galeria para Android/Desktop */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleSelectNewImage}
              className="hidden"
            />

            <button
              type="button"
              disabled={isCompressingNewImage}
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl border border-slate-700 hover:border-orange-500/50 bg-slate-900 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {isCompressingNewImage ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin text-orange-400" />
                  <span>Otimizando foto...</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 text-orange-400" />
                  <span>{newPostImage ? 'Trocar Foto' : 'Foto da Galeria (Máx 2MB)'}</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowNewPostForm(false);
                  setNewPostImage(null);
                  setFormError(null);
                }}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isCompressingNewImage}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-orange-600 hover:bg-orange-500 text-white transition-all shadow-md shadow-orange-600/20 disabled:opacity-50"
              >
                Publicar no Feed
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Role Filter Tabs */}
      <div className="flex items-center gap-2 text-xs overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setFilterRole('todos')}
          className={`px-3 py-1.5 rounded-xl border transition-colors whitespace-nowrap ${
            filterRole === 'todos'
              ? 'bg-orange-500/20 border-orange-500 text-orange-300 font-bold'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          Todos os Posts ({posts.length})
        </button>
        <button
          onClick={() => setFilterRole('morador')}
          className={`px-3 py-1.5 rounded-xl border transition-colors whitespace-nowrap ${
            filterRole === 'morador'
              ? 'bg-orange-500/20 border-orange-500 text-orange-300 font-bold'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          Moradores da Região
        </button>
        <button
          onClick={() => setFilterRole('comerciante')}
          className={`px-3 py-1.5 rounded-xl border transition-colors whitespace-nowrap ${
            filterRole === 'comerciante'
              ? 'bg-orange-500/20 border-orange-500 text-orange-300 font-bold'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          Direto das Lanchonetes
        </button>
      </div>

      {/* ============================================================ */}
      {/* LISTAGEM DE POSTAGENS DO FEED                                */}
      {/* ============================================================ */}
      <div className="space-y-5">
        {filteredPosts.map((post) => {
          const isLiked = Boolean(post.isLiked);
          const likesCount = post.likesCount || 0;
          const isCommentsOpen = activeCommentPostId === post.id;
          const userOwnsThisPost = isPostOwner(post);
          const postComments = Array.isArray(post.comments) ? post.comments : [];
          const commentsCount = postComments.length;

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
                      <span>{post.authorName}</span>
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
                      {post.is_demo && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-slate-800 text-slate-400 border border-slate-700">
                          Demonstração
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span className="flex items-center gap-0.5 text-orange-400/90">
                        <MapPin className="w-3 h-3" />
                        {post.neighborhood}
                      </span>
                      <span>·</span>
                      <span>{post.createdAt}</span>
                      {post.editedAt && (
                        <span className="text-amber-400/80 italic">({post.editedAt})</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Restaurant Tag shortcut */}
                  <button
                    onClick={() => onSelectRestaurantById(post.restaurantId)}
                    className="text-xs font-semibold text-slate-300 hover:text-orange-400 transition-colors text-right max-w-[130px] truncate"
                  >
                    @{post.restaurantName}
                  </button>

                  {/* ============================================================ */}
                  {/* CONTROLES DE EDITAR E EXCLUIR (APENAS PARA O AUTOR DO POST)  */}
                  {/* Regra de interface do protótipo: outros autores NÃO possuem */}
                  {/* esses botões no DOM.                                         */}
                  {/* ============================================================ */}
                  {userOwnsThisPost && (
                    <div className="flex items-center gap-1 pl-2 border-l border-slate-800">
                      <button
                        onClick={() => handleStartEdit(post)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors"
                        title="Editar sua publicação"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setPostToDelete(post)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="Excluir sua publicação"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Post Content */}
              <div className="p-3.5 sm:p-4 text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                {post.content}
              </div>

              {/* ============================================================ */}
              {/* IMAGEM DA PUBLICAÇÃO (RENDERIZADA SOMENTE SE EXISTIR!)       */}
              {/* Se o post for apenas texto, nenhum bloco vazio é exibido.    */}
              {/* ============================================================ */}
              {post.imageUrl && (
                <div className="relative h-64 sm:h-80 w-full bg-slate-900 overflow-hidden">
                  <img
                    src={post.imageUrl}
                    alt="Foto do lanche compartilhada"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
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
                          onOpenDishPreview(post.taggedDish!.name, post.restaurantName)
                        }
                        className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-bold shrink-0 transition-colors"
                      >
                        Ver no Cardápio
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Engagement Controls */}
              <div className="p-3 sm:p-4 flex items-center justify-between border-t border-slate-850">
                <div className="flex items-center gap-4">
                  {/* Like Button */}
                  <button
                    onClick={() => toggleLike(post.id)}
                    className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                      isLiked ? 'text-rose-500' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Heart
                      className={`w-5 h-5 transition-transform ${
                        isLiked ? 'fill-rose-500 scale-110' : ''
                      }`}
                    />
                    <span className="tabular-nums">{likesCount}</span>
                  </button>

                  {/* Comment Toggle */}
                  <button
                    onClick={() =>
                      setActiveCommentPostId(isCommentsOpen ? null : post.id)
                    }
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span className="tabular-nums">{commentsCount}</span>
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
                  <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>Comentários da vizinhança</span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      {commentsCount} {commentsCount === 1 ? 'comentário' : 'comentários'}
                    </span>
                  </div>

                  {commentsCount === 0 ? (
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center text-xs text-slate-400">
                      Nenhum comentário ainda. Seja o primeiro a comentar!
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs max-h-60 overflow-y-auto pr-1">
                      {postComments.map((comment) => (
                        <div
                          key={comment.id}
                          className="p-2.5 rounded-xl bg-slate-850 text-slate-300 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {comment.authorAvatar ? (
                                <img
                                  src={comment.authorAvatar}
                                  alt={comment.authorName}
                                  className="w-5 h-5 rounded-full object-cover border border-slate-700"
                                />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-white font-bold">
                                  {comment.authorName.charAt(0)}
                                </div>
                              )}
                              <strong className="text-white block font-medium text-[11px]">
                                {comment.authorName}
                              </strong>
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {comment.createdAt}
                            </span>
                          </div>
                          <p className="text-xs text-slate-200 pl-7 leading-relaxed">
                            {comment.text}
                          </p>
                          {isCommentOwner(comment) && (
                            <div className="flex gap-2 justify-end pt-1">
                              <button
                                onClick={() =>
                                  setEditingComment({
                                    postId: post.id,
                                    commentId: comment.id,
                                    text: comment.text,
                                  })
                                }
                                className="text-[10px] text-slate-400 hover:text-amber-300 transition-colors"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setCommentToDelete({
                                    postId: post.id,
                                    commentId: comment.id,
                                    text: comment.text,
                                  })
                                }
                                className="text-[10px] text-rose-400 hover:text-rose-300 transition-colors"
                              >
                                Excluir
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

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
                      disabled={!commentInputs[post.id]?.trim()}
                      className="p-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white transition-colors disabled:opacity-40 disabled:hover:bg-orange-600"
                      aria-label="Enviar comentário"
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

      {/* ============================================================ */}
      {/* MODAL DE EDIÇÃO DE PUBLICAÇÃO                                */}
      {/* ============================================================ */}
      {editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-[#131520] border border-orange-500/40 rounded-3xl p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-amber-400" />
                <h4 className="font-bold text-sm text-white font-display">
                  Editar Sua Publicação
                </h4>
              </div>
              <button
                onClick={() => setEditingPost(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Texto da recomendação:
                </label>
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={4}
                  className="w-full p-3 rounded-2xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 resize-none text-xs"
                  required
                />
              </div>

              {/* Gerenciamento da Foto na Edição */}
              <div className="space-y-2">
                <label className="block text-slate-300 font-semibold">
                  Foto do Lanche:
                </label>

                {editImage ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950">
                    <div className="h-40 w-full overflow-hidden">
                      <img
                        src={editImage}
                        alt="Foto do lanche editada"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-2.5 bg-black/80 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-300 truncate max-w-[200px]">
                        {editImageName || 'Foto anexada'}
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => editFileInputRef.current?.click()}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium"
                        >
                          Substituir
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveEditImage}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-[11px] font-medium"
                        >
                          Remover Foto
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl border border-dashed border-slate-700 bg-slate-900 text-center space-y-2">
                    <p className="text-slate-400 text-[11px]">
                      Esta publicação está sem foto no momento.
                    </p>
                    <button
                      type="button"
                      disabled={isCompressingEditImage}
                      onClick={() => editFileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-orange-400 font-semibold text-xs inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Adicionar Foto da Galeria (Máx 2MB)
                    </button>
                  </div>
                )}

                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleSelectEditImage}
                  className="hidden"
                />
              </div>

              {editFormError && (
                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editFormError}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPost(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCompressingEditImage}
                  className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold shadow-md shadow-orange-600/20 disabled:opacity-50"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO                             */}
      {/* ============================================================ */}
      {postToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-[#131520] border border-rose-500/40 rounded-3xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-rose-400">
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">
                  Excluir Publicação?
                </h4>
                <span className="text-[11px] text-slate-400">Esta ação não pode ser desfeita</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-900 p-3 rounded-2xl border border-slate-800">
              "{postToDelete.content.slice(0, 100)}
              {postToDelete.content.length > 100 ? '...' : ''}"
            </p>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPostToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors shadow-md shadow-rose-600/20"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ============================================================ */}
      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE COMENTÁRIO              */}
      {/* ============================================================ */}
      {commentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-[#131520] border border-rose-500/40 rounded-3xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-rose-400">
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">
                  Excluir Comentário?
                </h4>
                <span className="text-[11px] text-slate-400">Esta ação não pode ser desfeita</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-900 p-3 rounded-2xl border border-slate-800 break-words">
              "{commentToDelete.text.slice(0, 120)}
              {commentToDelete.text.length > 120 ? '...' : ''}"
            </p>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={isDeletingComment}
                onClick={() => setCommentToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingComment}
                onClick={handleConfirmDeleteComment}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors shadow-md shadow-rose-600/20 disabled:opacity-50"
              >
                {isDeletingComment ? 'Excluindo...' : 'Confirmar exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}
      {editingComment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#131520] p-4 rounded-2xl border border-orange-500/40 w-full max-w-sm space-y-3 shadow-2xl">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Pencil className="w-3.5 h-3.5 text-orange-400" />
              Editar comentário
            </h4>
            <input
              type="text"
              value={editingComment.text}
              onChange={(e) =>
                setEditingComment({ ...editingComment, text: e.target.value })
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveCommentEdit();
              }}
              autoFocus
              className="w-full p-2.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingComment(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveCommentEdit}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white transition-colors shadow-md shadow-orange-600/20"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
