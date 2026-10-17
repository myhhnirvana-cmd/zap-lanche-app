import React, { useState, useRef } from 'react';
import {
  User,
  MapPin,
  Award,
  Clock,
  Heart,
  Bookmark,
  ChevronRight,
  ShieldCheck,
  ShoppingBag,
  Flame,
  CheckCircle2,
  Gift,
  Share2,
  Info,
  Sparkles,
  Check,
  Pencil,
  Camera,
  X,
  AlertCircle,
} from 'lucide-react';
import { UserProfileDemo, Restaurant } from '../types';
import {
  MOCK_USER_PROFILE,
  MOCK_RESTAURANTS,
  ANTI_FRAUD_RULES,
  NEIGHBORHOODS,
  loadUserProfile,
  saveUserProfile,
} from '../data/mockData';
import { optimizeImage, formatBytes } from '../utils/imageOptimizer';

interface ProfileViewProps {
  onSelectRestaurantById: (id: string, initialTab?: 'cardapio' | 'promocoes' | 'fidelidade' | 'publicacoes') => void;
  onOpenGitHubGuide: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  onSelectRestaurantById,
  onOpenGitHubGuide,
}) => {
  const [user, setUser] = useState<UserProfileDemo>(() => loadUserProfile());
  const [activeTab, setActiveTab] = useState<'pedidos' | 'fidelidade' | 'medalhas'>('pedidos');
  const [inviteSimulated, setInviteSimulated] = useState(false);

  // Estados do Modal de Edição de Perfil
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState(user.name);
  const [editUsername, setEditUsername] = useState(user.username);
  const [editBio, setEditBio] = useState(user.bio);
  const [editNeighborhood, setEditNeighborhood] = useState(user.neighborhood);
  const [editAvatarUrl, setEditAvatarUrl] = useState(user.avatarUrl);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationFeedback, setOptimizationFeedback] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [saveSuccessFeedback, setSaveSuccessFeedback] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const totalPoints =
    Object.values(user.loyaltyWallet.storePoints).reduce((a, b) => a + b, 0) +
    user.loyaltyWallet.globalReferralPoints;

  const handleOpenEditModal = () => {
    setEditName(user.name);
    setEditUsername(user.username);
    setEditBio(user.bio);
    setEditNeighborhood(user.neighborhood);
    setEditAvatarUrl(user.avatarUrl);
    setOptimizationFeedback(null);
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsOptimizing(true);
      setEditError(null);
      const result = await optimizeImage(file, 800, 0.8);
      setEditAvatarUrl(result.dataUrl);
      setOptimizationFeedback(
        `Foto otimizada com sucesso! ${formatBytes(result.originalSize)} → ${formatBytes(result.optimizedSize)} (${result.reductionPercentage}% menor, ${result.format.toUpperCase()})`
      );
    } catch (err: any) {
      setEditError(err.message || 'Erro ao processar imagem.');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      setEditError('O nome de exibição não pode ficar vazio.');
      return;
    }
    if (!editUsername.trim()) {
      setEditError('O nome de usuário não pode ficar vazio.');
      return;
    }

    const formattedUsername = editUsername.startsWith('@') ? editUsername.trim() : `@${editUsername.trim()}`;

    const updated: UserProfileDemo = {
      ...user,
      name: editName.trim(),
      username: formattedUsername,
      bio: editBio.trim(),
      neighborhood: editNeighborhood,
      avatarUrl: editAvatarUrl,
    };

    setUser(updated);
    saveUserProfile(updated);
    setIsEditModalOpen(false);
    setSaveSuccessFeedback(true);
    setTimeout(() => setSaveSuccessFeedback(false), 3500);
  };

  const handleSimulateInvite = () => {
    // Simulated referral invite under anti-fraud limits
    setUser((prev) => {
      const updated: UserProfileDemo = {
        ...prev,
        loyaltyWallet: {
          ...prev.loyaltyWallet,
          globalReferralPoints: prev.loyaltyWallet.globalReferralPoints + 50,
        },
      };
      saveUserProfile(updated);
      return updated;
    });
    setInviteSimulated(true);
    setTimeout(() => setInviteSimulated(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-16 animate-fade-in">
      {/* Feedback Toast de Sucesso */}
      {saveSuccessFeedback && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Perfil atualizado com sucesso! As alterações já estão visíveis.</span>
          </div>
          <button onClick={() => setSaveSuccessFeedback(false)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="rounded-3xl bg-[#13151f] border border-slate-800 p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl -mr-10 -mt-10" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 p-0.5 shadow-lg">
                <div className="w-full h-full rounded-2xl bg-slate-900 overflow-hidden flex items-center justify-center">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-extrabold text-2xl text-orange-400">
                      {user.name.charAt(0)}
                    </span>
                  )}
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-[10px] text-black font-bold">
                ✓
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white font-display">
                  {user.name}
                </h2>
                <span className="text-xs text-orange-400 font-medium">
                  {user.username}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed max-w-md">
                {user.bio}
              </p>

              <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                <span className="flex items-center gap-1 text-slate-300">
                  <MapPin className="w-3 h-3 text-orange-400" />
                  {user.neighborhood}
                </span>
                <span>·</span>
                <span>Membro desde {user.memberSince}</span>
              </div>
            </div>
          </div>

          {/* Botão Editar Perfil */}
          <button
            onClick={handleOpenEditModal}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700/80 hover:border-orange-500/40 text-xs font-semibold text-white flex items-center gap-1.5 transition-all self-stretch sm:self-auto justify-center shadow-sm"
          >
            <Pencil className="w-3.5 h-3.5 text-orange-400" />
            Editar perfil
          </button>
        </div>

        {/* Counter Stats */}
        <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-slate-800/80 text-center">
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-base font-extrabold text-amber-400 block tabular-nums">
              {totalPoints} pts
            </span>
            <span className="text-[10px] text-slate-400">Pontos de Fidelidade</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-base font-extrabold text-orange-400 block tabular-nums">
              {user.recentOrders.length}
            </span>
            <span className="text-[10px] text-slate-400">Pedidos no Bairro</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-base font-extrabold text-emerald-400 block tabular-nums">
              {user.foodieBadges.length}
            </span>
            <span className="text-[10px] text-slate-400">Selos de Morador</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 text-xs sm:text-sm font-semibold">
        <button
          onClick={() => setActiveTab('pedidos')}
          className={`flex-1 py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'pedidos'
              ? 'border-orange-500 text-orange-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Pedidos Demo ({user.recentOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('fidelidade')}
          className={`flex-1 py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'fidelidade'
              ? 'border-amber-400 text-amber-300 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Gift className="w-4 h-4 text-amber-400" />
          Meus Pontos ({totalPoints} pts)
        </button>

        <button
          onClick={() => setActiveTab('medalhas')}
          className={`flex-1 py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'medalhas'
              ? 'border-orange-500 text-orange-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Award className="w-4 h-4" />
          Selos ({user.foodieBadges.length})
        </button>
      </div>

      {/* Tab 1: Pedidos Recentes */}
      {activeTab === 'pedidos' && (
        <div className="space-y-3">
          <div className="text-xs text-slate-400 flex items-center justify-between px-1">
            <span>Últimos lanches solicitados via Zap da vizinhança</span>
            <span className="text-amber-400 font-medium">Demonstração</span>
          </div>

          {user.recentOrders.map((order) => (
            <div
              key={order.id}
              className="p-4 rounded-2xl bg-[#13151f] border border-slate-800 flex items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-white">
                    {order.restaurantName}
                  </h4>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    {order.status}
                  </span>
                </div>

                <p className="text-xs text-slate-300">
                  {order.itemsSummary}
                </p>

                <div className="text-[11px] text-slate-400">
                  {order.date} · <strong className="text-amber-400 tabular-nums">R$ {order.total.toFixed(2).replace('.', ',')}</strong>
                </div>
              </div>

              <button
                onClick={() => {
                  const targetId =
                    order.restaurantId ||
                    MOCK_RESTAURANTS.find((r) =>
                      r.name.toLowerCase().includes(order.restaurantName.toLowerCase())
                    )?.id ||
                    'rest-jorge-jpa';
                  onSelectRestaurantById(targetId);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-xs font-semibold text-orange-400 transition-colors shrink-0"
              >
                Pedir de Novo
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Meus Pontos & Fidelidade (Regra 70/30) */}
      {activeTab === 'fidelidade' && (
        <div className="space-y-4">
          {/* Global Referral Points Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-500/15 via-[#161824] to-amber-500/10 border border-orange-500/30 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-orange-400 uppercase tracking-wider block">
                  Pontos Globais de Convite
                </span>
                <span className="text-2xl font-extrabold text-white tabular-nums">
                  {user.loyaltyWallet.globalReferralPoints} pts
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Conquistados convidando amigos com validação de WhatsApp. Podem cobrir até 30% do custo de qualquer recompensa.
                </p>
              </div>

              <button
                onClick={handleSimulateInvite}
                className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors self-start sm:self-auto shrink-0 shadow-md shadow-orange-600/20"
              >
                {inviteSimulated ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    +50 Pontos Adicionados!
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    Simular Convite (+50 pts)
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Store-specific Points breakdown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Pontos Conquistados por Lanchonete (Mínimo 70% nos Prêmios)
              </h4>
              <span className="text-[11px] text-amber-400 font-semibold">
                Regra 70/30 Ativa
              </span>
            </div>

            <div className="space-y-2.5">
              {MOCK_RESTAURANTS.map((rest) => {
                const points = user.loyaltyWallet.storePoints[rest.id] || 0;
                return (
                  <div
                    key={rest.id}
                    className="p-3.5 rounded-2xl bg-[#13151f] border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="font-bold text-sm text-white">
                          {rest.name}
                        </h5>
                        <span className="text-[11px] text-slate-400">
                          ({rest.neighborhoodName})
                        </span>
                      </div>
                      <span className="text-xs text-amber-400 font-semibold tabular-nums mt-0.5 block">
                        {points} pontos acumulados nesta casa
                      </span>
                    </div>

                    <button
                      onClick={() => onSelectRestaurantById(rest.id, 'fidelidade')}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-xs font-semibold text-orange-400 transition-colors shrink-0"
                    >
                      Ver Prêmios da Casa
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rule and Anti-Fraud Summary */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              Diretrizes de Proteção do Comércio Local:
            </div>
            <ul className="space-y-1.5 text-slate-400 text-[11px] leading-relaxed list-disc list-inside">
              <li>Pelo menos <strong>70% dos pontos</strong> para resgatar um lanche devem ser conquistados no próprio estabelecimento (por check-in ou fotos auditadas).</li>
              <li>Até <strong>30% do custo</strong> pode ser abatido com seus pontos globais de indicação.</li>
              <li>Os pontos não possuem valor monetário, não podem ser convertidos em dinheiro e não são transferíveis entre estabelecimentos.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Tab 3: Selos */}
      {activeTab === 'medalhas' && (
        <div className="space-y-3">
          {user.foodieBadges.map((badge) => (
            <div
              key={badge.id}
              className="p-4 rounded-2xl bg-[#13151f] border border-slate-800 flex items-center gap-3.5"
            >
              <div className="w-12 h-12 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-white">
                  {badge.label}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {badge.description}
                </p>
              </div>
              <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Ativo
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Phase 1 Explanatory Card */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs space-y-2 text-slate-300">
        <div className="flex items-center gap-2 text-amber-400 font-bold">
          <ShieldCheck className="w-4 h-4" />
          Sobre a Versão de Lançamento (Visual & Demonstração)
        </div>
        <p className="text-slate-400 leading-relaxed">
          Nesta fase inicial, o ZAP LANCHE é 100% gratuito para moradores e comerciantes. Todas as ações de pontos e pedidos funcionam em modo demonstrativo, preparando a integração definitiva com o <strong>Supabase</strong>.
        </p>
        <button
          onClick={onOpenGitHubGuide}
          className="text-xs font-semibold text-orange-400 hover:text-orange-300 underline underline-offset-2"
        >
          Ver arquitetura do Supabase e instruções do GitHub
        </button>
      </div>

      {/* Modal: Editar Meu Perfil */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#13151f] border border-orange-500/30 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-orange-500/15 text-orange-400">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white font-display">
                    Editar Meu Perfil
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Dados do morador / cliente do bairro
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              {/* Foto de Perfil com Otimização */}
              <div>
                <label className="block text-slate-300 font-semibold mb-2">
                  Foto de Perfil:
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                    {editAvatarUrl ? (
                      <img
                        src={editAvatarUrl}
                        alt="Prévia do Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-bold text-orange-400">
                        {editName.charAt(0) || 'U'}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <input
                      type="file"
                      ref={avatarInputRef}
                      accept="image/*"
                      onChange={handleAvatarFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={isOptimizing}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5 text-orange-400" />
                      {isOptimizing ? 'Otimizando imagem...' : 'Escolher nova foto'}
                    </button>
                    <p className="text-[10px] text-slate-400">
                      Otimização automática para WebP/JPEG com até 800px no cliente.
                    </p>
                  </div>
                </div>

                {optimizationFeedback && (
                  <p className="text-[11px] text-emerald-400 mt-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    {optimizationFeedback}
                  </p>
                )}
              </div>

              {/* Nome de Exibição */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nome de exibição:
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Ex: Thiago da Silva"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              {/* Nome de Usuário */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nome de usuário (@):
                </label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="@thiago_jpa"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors font-mono"
                />
              </div>

              {/* Bairro do Morador */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Bairro associado:
                </label>
                <select
                  value={editNeighborhood}
                  onChange={(e) => setEditNeighborhood(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-orange-500 transition-colors"
                >
                  {NEIGHBORHOODS.filter((n) => n.id !== 'todos').map((n) => (
                    <option key={n.id} value={n.name}>
                      {n.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Biografia */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Biografia ou descrição:
                </label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={3}
                  placeholder="Conte um pouco sobre sua paixão por lanches locais..."
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors resize-none"
                />
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isOptimizing}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-bold shadow-md shadow-orange-500/20 transition-all disabled:opacity-50"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
