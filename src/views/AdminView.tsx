import React, { useState, useEffect } from 'react';
import {
  Shield,
  MapPin,
  CheckCircle2,
  XCircle,
  Building2,
  Users,
  MessageSquare,
  Database,
  ArrowUpRight,
  Sparkles,
  Phone,
  Clock,
  Layers,
  Sliders,
  Bell,
  Calendar,
  AlertTriangle,
  Gift,
  Plus,
  Send,
  Power,
  UserPlus,
  Mail,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  Share2,
  Trash2,
} from 'lucide-react';
import {
  AdminDemoStats,
  HighlightStatus,
  RegionalHighlight,
  AdminNotice,
} from '../types';
import {
  MOCK_ADMIN_STATS,
  MOCK_REGIONAL_HIGHLIGHTS,
  MOCK_ADMIN_NOTICES,
  MOCK_ADMIN_AUDIT_LOGS,
  NEIGHBORHOODS,
  loadRegionalHighlights,
  saveRegionalHighlights,
  loadAdminNotices,
  saveAdminNotices,
} from '../data/mockData';
import { supabase, isSupabaseConfigured, insertRestaurantToSupabase, fetchRestaurantsFromSupabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface AdminViewProps {
  onOpenGitHubGuide: () => void;
  onRestaurantAdded?: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ onOpenGitHubGuide, onRestaurantAdded }) => {
  const { session, user } = useAuth();
  const [stats, setStats] = useState<AdminDemoStats>(MOCK_ADMIN_STATS);
  const [pendingDeletion, setPendingDeletion] = useState<{ type: 'highlight' | 'notice' | 'audit'; id: string; title: string } | null>(null);
  const [approvedList, setApprovedList] = useState<Record<string, 'approved' | 'rejected'>>({});

  // Parâmetros configuráveis do programa
  const [defaultPointBudget, setDefaultPointBudget] = useState(3000);
  const [futureHighlightPrice, setFutureHighlightPrice] = useState(10);
  const [futureDuration, setFutureDuration] = useState('2 Horas');

  // Moderação de Destaques Regionais (5 Estados) sincronizada
  const [highlights, setHighlights] = useState<RegionalHighlight[]>(() =>
    loadRegionalHighlights()
  );
  const [highlightFilter, setHighlightFilter] = useState<'todos' | HighlightStatus>('todos');

  // Gestão de Avisos Comunitários sincronizada
  const [notices, setNotices] = useState<AdminNotice[]>(() => loadAdminNotices());
  const [newNoticeTitle, setNewNoticeTitle] = useState('');
  const [newNoticeContent, setNewNoticeContent] = useState('');
  const [newNoticeNeighborhood, setNewNoticeNeighborhood] = useState('Todos os Bairros');
  const [showNoticeForm, setShowNoticeForm] = useState(false);

  // Estados para formulário de cadastro de restaurante
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [newRestName, setNewRestName] = useState('');
  const [newRestNeighborhood, setNewRestNeighborhood] = useState('');
  const [newRestWhatsapp, setNewRestWhatsapp] = useState('');
  const [newRestAddress, setNewRestAddress] = useState('');
  const [newRestDescription, setNewRestDescription] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para formulário de convite de comerciante
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteRestaurantId, setInviteRestaurantId] = useState('');
  const [inviteMode, setInviteMode] = useState<'email' | 'manual'>('email');
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccessData, setInviteSuccessData] = useState<{
    inviteUrl: string;
    email: string | null;
    code: string | null;
    restaurantName: string;
    expiresAt?: string;
    userStatus?: string;
  } | null>(null);
  const [hasCopiedInvite, setHasCopiedInvite] = useState(false);

  // Lista de lanchonetes com seus UUIDs reais do Supabase
  const [availableRestaurants, setAvailableRestaurants] = useState<
    Array<{ id: string; name: string; neighborhood?: string; owner_profile_id?: string | null }>
  >([]);

  const loadAvailableRestaurants = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error: restError } = await supabase
          .from('restaurants')
          .select('id, name, neighborhood, status, owner_profile_id')
          .eq('status', 'ativo')
          .order('name');
        if (!restError && data && data.length > 0) {
          setAvailableRestaurants(data);
          return;
        }
      } catch {
        // Fallback silencioso
      }
    }
    const fallback = await fetchRestaurantsFromSupabase();
    if (fallback && fallback.length > 0) {
      setAvailableRestaurants(
        fallback
          .filter((r) => r.supabaseId)
          .map((r) => ({
            id: r.supabaseId!,
            name: r.name,
            neighborhood: r.neighborhoodName,
            owner_profile_id: null,
          }))
      );
    }
  };

  useEffect(() => {
    loadAvailableRestaurants();
  }, []);

  const handleRegisterRestaurant = async () => {
    if (!newRestName.trim() || !newRestNeighborhood.trim()) {
      setError('Nome e Bairro são obrigatórios.');
      return;
    }
    setIsRegistering(true);
    setError(null);
    const { data, error: registerError } = await insertRestaurantToSupabase({
      name: newRestName,
      neighborhood: newRestNeighborhood,
      whatsapp: newRestWhatsapp,
      address: newRestAddress,
      description: newRestDescription
    });

    setIsRegistering(false);
    if (registerError) {
      setError(registerError.message);
    } else {
      setNewRestName('');
      setNewRestNeighborhood('');
      setNewRestWhatsapp('');
      setNewRestAddress('');
      setNewRestDescription('');
      setShowRegistrationForm(false);
      await loadAvailableRestaurants();
      if (onRestaurantAdded) onRestaurantAdded();
    }
  };

  const handleInviteMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccessData(null);
    setHasCopiedInvite(false);

    const trimmedEmail = inviteEmail.trim().toLowerCase();
    if (!inviteRestaurantId) {
      setInviteError('Selecione o estabelecimento para o qual o convite será emitido.');
      return;
    }

    if (inviteMode === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
        setInviteError('Informe um endereço de e-mail válido.');
        return;
      }
    }

    // Obtenção da sessão e token de autenticação real do Admin Master
    let token = session?.access_token;
    if (!token && supabase) {
      const { data: sessionData } = await supabase.auth.getSession();
      token = sessionData.session?.access_token;
    }

    if (!token) {
      setInviteError('Sessão expirada ou não autenticada. Faça login novamente como administrador.');
      return;
    }

    setIsInviting(true);

    try {
      const viteEnv = typeof import.meta !== 'undefined' ? ((import.meta as any).env ?? {}) : {};
      const anonKey = viteEnv.VITE_SUPABASE_ANON_KEY as string | undefined;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
      if (anonKey) {
        headers['apikey'] = anonKey;
      }

      const response = await fetch('https://ortuxqmqtngkvynmgpch.supabase.co/functions/v1/invite-merchant', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          restaurant_id: inviteRestaurantId,
          mode: inviteMode,
          email: inviteMode === 'email' ? trimmedEmail : null,
        }),
      });

      let responseData: any = null;
      try {
        responseData = await response.json();
      } catch {
        // Resposta não-JSON
      }

      if (!response.ok) {
        const msg = responseData?.error || responseData?.message;
        if (response.status === 401) {
          setInviteError('Sessão expirada ou não autorizada (401). Faça login novamente como administrador.');
        } else if (response.status === 403) {
          setInviteError('Acesso negado (403). Apenas administradores confirmados podem convidar comerciantes.');
        } else if (response.status === 409) {
          setInviteError(msg ? `Conflito (409): ${msg}` : 'Conflito (409): Já existe um convite pendente ou este estabelecimento já possui proprietário.');
        } else if (response.status === 500) {
          setInviteError(msg ? `Erro no servidor (500): ${msg}` : 'Erro interno no servidor (500) ao emitir o convite.');
        } else {
          setInviteError(msg ? `Erro (${response.status}): ${msg}` : `Erro (${response.status}) ao comunicar com o servidor.`);
        }
        return;
      }

      // Sucesso na emissão do convite
      const targetRest = availableRestaurants.find((r) => r.id === inviteRestaurantId);
      const returnedInviteUrl = responseData?.invite_url || (responseData?.invitation_token ? `${window.location.origin}/?token=${responseData.invitation_token}` : '');

      setInviteSuccessData({
        inviteUrl: returnedInviteUrl,
        email: inviteMode === 'email' ? trimmedEmail : null,
        code: responseData?.invitation_code || null,
        restaurantName: targetRest?.name || 'Estabelecimento Selecionado',
        expiresAt: responseData?.expires_at,
        userStatus: responseData?.user_status,
      });

      setInviteEmail('');
      setInviteRestaurantId('');
    } catch (err: any) {
      setInviteError(err?.message ? `Falha de rede: ${err.message}` : 'Erro de conexão ao contatar a Edge Function.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleCopyInviteLink = async (url: string) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setHasCopiedInvite(true);
      setTimeout(() => setHasCopiedInvite(false), 3000);
    } catch {
      // Falha silenciosa no clipboard
    }
  };

  const handleShareWhatsApp = (url: string, restName: string) => {
    const text = `Olá! Você foi convidado para gerenciar o estabelecimento "${restName}" no ZAP LANCHE.\n\nAcesse o link exclusivo abaixo para concluir seu cadastro:\n${url}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const handleApproveMerchant = (id: string) => {
    setApprovedList((prev) => ({ ...prev, [id]: 'approved' }));
  };

  const handleRejectMerchant = (id: string) => {
    setApprovedList((prev) => ({ ...prev, [id]: 'rejected' }));
  };

  // Alterar status de um destaque regional
  const handleUpdateHighlightStatus = (id: string, newStatus: HighlightStatus) => {
    setHighlights((prev) => {
      const updated = prev.map((h) => (h.id === id ? { ...h, status: newStatus } : h));
      saveRegionalHighlights(updated);
      return updated;
    });
  };

  const handleDeleteHighlight = (id: string) => {
    const item = highlights.find((highlight) => highlight.id === id);
    if (item) setPendingDeletion({ type: 'highlight', id, title: item.restaurantName });
  };

  // Publicar novo aviso comunitário
  const handlePublishNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoticeTitle.trim() || !newNoticeContent.trim()) return;

    const notice: AdminNotice = {
      id: `not-${Date.now()}`,
      title: newNoticeTitle.trim(),
      content: newNoticeContent.trim(),
      targetNeighborhood: newNoticeNeighborhood,
      active: true,
      createdAt: 'Agora mesmo',
    };

    setNotices((prev) => {
      const updated = [notice, ...prev];
      saveAdminNotices(updated);
      return updated;
    });
    setNewNoticeTitle('');
    setNewNoticeContent('');
    setShowNoticeForm(false);
  };

  const handleDeleteNotice = (id: string) => {
    const item = notices.find((notice) => notice.id === id);
    if (item) setPendingDeletion({ type: 'notice', id, title: item.title });
  };

  const handleDeleteAuditLog = (id: string) => {
    const item = stats.auditLogs.find((log) => log.id === id);
    if (item) setPendingDeletion({ type: 'audit', id, title: item.action });
  };

  const confirmPendingDeletion = () => {
    if (!pendingDeletion) return;
    const { type, id } = pendingDeletion;
    if (type === 'highlight') {
      setHighlights((prev) => {
        const updated = prev.filter((highlight) => highlight.id !== id);
        saveRegionalHighlights(updated);
        return updated;
      });
    } else if (type === 'notice') {
      setNotices((prev) => {
        const updated = prev.filter((notice) => notice.id !== id);
        saveAdminNotices(updated);
        return updated;
      });
    } else {
      setStats((prev) => ({ ...prev, auditLogs: prev.auditLogs.filter((log) => log.id !== id) }));
    }
    setPendingDeletion(null);
  };

  const handleToggleNotice = (id: string) => {
    setNotices((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, active: !n.active } : n));
      saveAdminNotices(updated);
      return updated;
    });
  };

  const filteredHighlights =
    highlightFilter === 'todos'
      ? highlights
      : highlights.filter((h) => h.status === highlightFilter);

  const getStatusBadge = (status: HighlightStatus) => {
    switch (status) {
      case 'solicitado':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            1. Solicitado
          </span>
        );
      case 'aprovado':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            2. Aprovado
          </span>
        );
      case 'agendado':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            3. Agendado
          </span>
        );
      case 'ativo':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            4. Ativo no Topo
          </span>
        );
      case 'encerrado':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
            5. Encerrado
          </span>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16 animate-fade-in">
      {/* Admin Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-orange-500/20 text-orange-400">
              <Shield className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white font-display">
              Painel Administrativo Geral (ZAP LANCHE)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gestão macro dos bairros, moderação de destaques regionais e regras do programa de fidelidade
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenGitHubGuide}
            className="px-3.5 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-amber-400 flex items-center gap-1.5 transition-colors"
          >
            <Database className="w-3.5 h-3.5" />
            Preparação Supabase (Fase 2)
          </button>
          <button
            onClick={() => {
              setShowInviteForm(!showInviteForm);
              setShowRegistrationForm(false);
              setInviteError(null);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
              showInviteForm
                ? 'bg-amber-400 text-black shadow-md shadow-amber-500/20'
                : 'bg-amber-500 hover:bg-amber-400 text-black'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Convidar Comerciante
          </button>
          <button
            onClick={() => {
              setShowRegistrationForm(!showRegistrationForm);
              setShowInviteForm(false);
            }}
            className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Estabelecimento
          </button>
        </div>
      </div>

      {/* Formulário de Convite de Comerciante */}
      {showInviteForm && (
        <div className="p-5 rounded-3xl bg-slate-900 border border-amber-500/40 space-y-4 animate-fade-in shadow-xl">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                  <UserPlus className="w-4 h-4" />
                </span>
                Convidar Comerciante Responsável
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Emita um convite por e-mail ou gere um código manual seguro para compartilhar.
              </p>
            </div>
            <button
              onClick={() => {
                setShowInviteForm(false);
                setInviteError(null);
                setInviteSuccessData(null);
              }}
              className="text-slate-400 hover:text-white text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Fechar
            </button>
          </div>

          {inviteSuccessData ? (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3.5 animate-fade-in">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  {inviteSuccessData.email
                    ? `Convite emitido com sucesso para ${inviteSuccessData.email}!`
                    : 'Convite manual emitido com sucesso!'}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                O convite para o estabelecimento <strong className="text-white">{inviteSuccessData.restaurantName}</strong> foi registrado com segurança no Supabase.
              </p>

              {inviteSuccessData.code && (
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-slate-300">
                    Código manual (válido por 24 horas):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={inviteSuccessData.code}
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono text-[11px] text-amber-300 focus:outline-none select-all"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyInviteLink(inviteSuccessData.code!)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-750"
                    >
                      {hasCopiedInvite ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-amber-400" />
                          <span>Copiar Código</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {inviteSuccessData.inviteUrl ? (
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-slate-300">
                    Link de Convite:
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={inviteSuccessData.inviteUrl}
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono text-[11px] text-amber-300 focus:outline-none select-all"
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyInviteLink(inviteSuccessData.inviteUrl)}
                        className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-750"
                      >
                        {hasCopiedInvite ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-amber-400" />
                            <span>Copiar Link</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShareWhatsApp(inviteSuccessData.inviteUrl, inviteSuccessData.restaurantName)}
                        className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-emerald-600/20"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">
                  O convite foi registrado no banco de dados e processado pelo Supabase Auth.
                </p>
              )}

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-emerald-500/20">
                <span className="text-[10px] text-slate-400">
                  {inviteSuccessData.expiresAt ? `Expira em: ${new Date(inviteSuccessData.expiresAt).toLocaleString('pt-BR')}` : 'Validade de 24 horas.'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setInviteSuccessData(null);
                    setInviteError(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold self-end sm:self-auto"
                >
                  Convidar Outro Comerciante
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleInviteMerchant} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Estabelecimento Parceiro *
                  </label>
                  <select
                    value={inviteRestaurantId}
                    onChange={(e) => setInviteRestaurantId(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="">Selecione a lanchonete...</option>
                    {availableRestaurants.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} {r.neighborhood ? `(${r.neighborhood})` : ''} {r.owner_profile_id ? '· [Possui Responsável]' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Tipo de convite *
                  </label>
                  <select
                    value={inviteMode}
                    onChange={(e) => setInviteMode(e.target.value as 'email' | 'manual')}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="email">Por e-mail</option>
                    <option value="manual">Manual (sem e-mail)</option>
                  </select>
                </div>
              </div>

              {inviteMode === 'email' ? (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    E-mail do Comerciante *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="comerciante@email.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
                    />
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  Será gerado um código aleatório válido por 24 horas. Compartilhe-o somente com a pessoa que assumirá o estabelecimento.
                </p>
              )}
              {inviteError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-rose-300 text-xs animate-fade-in">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span className="leading-relaxed">{inviteError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowInviteForm(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-md shadow-amber-500/20"
                >
                  {isInviting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Emitindo Convite...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Emitir Convite</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {showRegistrationForm && (
        <div className="p-4 rounded-3xl bg-slate-900 border border-orange-500/30 space-y-4">
          <h3 className="font-bold text-white">Cadastrar Novo Estabelecimento</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Nome" value={newRestName} onChange={(e) => setNewRestName(e.target.value)} className="p-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs" />
            <input type="text" placeholder="Bairro" value={newRestNeighborhood} onChange={(e) => setNewRestNeighborhood(e.target.value)} className="p-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs" />
            <input type="text" placeholder="WhatsApp" value={newRestWhatsapp} onChange={(e) => setNewRestWhatsapp(e.target.value)} className="p-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs" />
            <input type="text" placeholder="Endereço" value={newRestAddress} onChange={(e) => setNewRestAddress(e.target.value)} className="p-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs" />
          </div>
          <textarea placeholder="Descrição" value={newRestDescription} onChange={(e) => setNewRestDescription(e.target.value)} className="w-full p-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs" />
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <button onClick={handleRegisterRestaurant} disabled={isRegistering} className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold">
            {isRegistering ? 'Cadastrando...' : 'Cadastrar'}
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[#13151f] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Bairros Mapeados</span>
            <MapPin className="w-4 h-4 text-orange-400" />
          </div>
          <span className="text-2xl font-extrabold text-white tabular-nums">
            {stats.totalNeighborhoods}
          </span>
          <span className="text-[10px] text-slate-400 block mt-1">
            Zona Oeste - Rio de Janeiro
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#13151f] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Comércios Ativos</span>
            <Building2 className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-2xl font-extrabold text-amber-400 tabular-nums">
            {stats.activeMerchants}
          </span>
          <span className="text-[10px] text-emerald-400 block mt-1">
            Sem mensalidades cobradas
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#13151f] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Destaques Regionais</span>
            <Sparkles className="w-4 h-4 text-orange-400" />
          </div>
          <span className="text-2xl font-extrabold text-white tabular-nums">
            {highlights.length}
          </span>
          <span className="text-[10px] text-emerald-400 block mt-1">
            100% gratuitos no lançamento
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#13151f] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Direcionamentos Zap</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-2xl font-extrabold text-emerald-400 tabular-nums">
            {stats.zapDirectsCount}
          </span>
          <span className="text-[10px] text-slate-400 block mt-1">
            Sem taxa de comissão
          </span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1. CONFIGURAÇÕES GLOBAIS DO PROGRAMA DE LANÇAMENTO           */}
      {/* ============================================================ */}
      <div className="rounded-3xl bg-[#13151f] border border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-orange-400" />
              Configuração dos Parâmetros do Programa
            </h3>
            <p className="text-xs text-slate-400">
              Ajuste do pacote promocional e valores de referência futuros
            </p>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30">
            Fase de Lançamento Gratuito Ativa
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Pacote Promocional Inicial */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-amber-400" />
              Pacote Promocional Padrão por Nova Lanchonete:
            </span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Pontos concedidos à loja para inaugurar seu clube. Não é dinheiro e não permite saques.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="number"
                value={defaultPointBudget}
                onChange={(e) => setDefaultPointBudget(Number(e.target.value))}
                className="w-32 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-amber-300 font-extrabold text-sm focus:outline-none focus:border-amber-500"
              />
              <span className="text-slate-400">pontos por adesão</span>
            </div>
          </div>

          {/* Exemplo de Preço e Duração do Destaque Regional */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-orange-400" />
              Exemplo de Preço Futuro do Destaque Regional:
            </span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Valor de referência para fases posteriores (R$ 10 por 2h). Gratuito durante o lançamento.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-slate-400 font-bold">R$</span>
              <input
                type="number"
                value={futureHighlightPrice}
                onChange={(e) => setFutureHighlightPrice(Number(e.target.value))}
                className="w-20 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-amber-300 font-extrabold text-sm focus:outline-none focus:border-amber-500"
              />
              <span className="text-slate-400">por</span>
              <select
                value={futureDuration}
                onChange={(e) => setFutureDuration(e.target.value)}
                className="px-2 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none"
              >
                <option value="2 Horas">2 Horas</option>
                <option value="4 Horas">4 Horas</option>
                <option value="12 Horas">12 Horas</option>
                <option value="24 Horas">24 Horas</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. MODERAÇÃO DE DESTAQUES REGIONAIS SOLICITADOS (5 ESTADOS)  */}
      {/* ============================================================ */}
      <div className="rounded-3xl bg-[#13151f] border border-slate-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-400" />
              Moderação de Destaques Regionais (5 Estados)
            </h3>
            <p className="text-xs text-slate-400">
              Gerencie as solicitações de presença prioritária no topo dos bairros parceiros
            </p>
          </div>

          {/* State Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {(['todos', 'solicitado', 'aprovado', 'agendado', 'ativo', 'encerrado'] as const).map(
              (st) => (
                <button
                  key={st}
                  onClick={() => setHighlightFilter(st)}
                  className={`px-2.5 py-1 rounded-lg font-medium capitalize whitespace-nowrap transition-colors ${
                    highlightFilter === st
                      ? 'bg-orange-500 text-black font-bold'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              )
            )}
          </div>
        </div>

        <div className="space-y-3">
          {filteredHighlights.map((hl) => (
            <div
              key={hl.id}
              className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-white">
                    {hl.restaurantName}
                  </h4>
                  {getStatusBadge(hl.status)}
                </div>

                <div className="text-slate-400 flex items-center gap-2 text-[11px]">
                  <span className="flex items-center gap-1 text-slate-300">
                    <MapPin className="w-3 h-3 text-orange-400" />
                    Bairro {hl.neighborhoodName}
                  </span>
                  <span>·</span>
                  <span>Duração: {hl.requestedDuration}</span>
                  <span>·</span>
                  <span className="text-amber-400">{hl.estimatedPriceExample}</span>
                </div>
              </div>

              {/* Ações de moderação e remoção individual */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-0 border-slate-800 flex-wrap">
                <button
                  onClick={() => handleDeleteHighlight(hl.id)}
                  title="Excluir solicitação"
                  aria-label={`Excluir solicitação de ${hl.restaurantName}`}
                  className="p-2 rounded-lg border border-rose-500/30 text-rose-300 hover:bg-rose-500/20"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                {hl.status === 'solicitado' && (
                  <>
                    <button
                      onClick={() => handleUpdateHighlightStatus(hl.id, 'encerrado')}
                      className="px-2.5 py-1 rounded-lg border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 text-xs font-semibold"
                    >
                      Recusar
                    </button>
                    <button
                      onClick={() => handleUpdateHighlightStatus(hl.id, 'aprovado')}
                      className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
                    >
                      Aprovar
                    </button>
                    <button
                      onClick={() => handleUpdateHighlightStatus(hl.id, 'ativo')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      Ativar no Topo
                    </button>
                  </>
                )}

                {hl.status === 'aprovado' && (
                  <>
                    <button
                      onClick={() => handleUpdateHighlightStatus(hl.id, 'agendado')}
                      className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
                    >
                      Agendar Horário
                    </button>
                    <button
                      onClick={() => handleUpdateHighlightStatus(hl.id, 'ativo')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      Ativar no Topo
                    </button>
                  </>
                )}

                {hl.status === 'agendado' && (
                  <button
                    onClick={() => handleUpdateHighlightStatus(hl.id, 'ativo')}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    Antecipar p/ Ativo
                  </button>
                )}

                {hl.status === 'ativo' && (
                  <button
                    onClick={() => handleUpdateHighlightStatus(hl.id, 'encerrado')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Encerrar Destaque
                  </button>
                )}

                {hl.status === 'encerrado' && (
                  <button
                    onClick={() => handleUpdateHighlightStatus(hl.id, 'ativo')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-orange-400 text-xs font-semibold"
                  >
                    Reativar (Demo)
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. PUBLICAÇÃO & GESTÃO DE AVISOS COMUNITÁRIOS (NOTICES)      */}
      {/* ============================================================ */}

      <div className="rounded-3xl bg-[#13151f] border border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-orange-400" />
              Avisos Comunitários para os Moradores e Lojistas
            </h3>
            <p className="text-xs text-slate-400">
              Comunique novidades da fase de lançamento para bairros específicos
            </p>
          </div>

          <button
            onClick={() => setShowNoticeForm(!showNoticeForm)}
            className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Aviso
          </button>
        </div>

        {/* Form to create notice */}
        {showNoticeForm && (
          <form
            onSubmit={handlePublishNotice}
            className="p-4 rounded-2xl bg-slate-900 border border-orange-500/30 space-y-3 text-xs animate-fade-in"
          >
            <div className="font-bold text-white text-sm">
              Criar Novo Aviso Comunitário:
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Título do Aviso:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Fase de Lançamento Gratuito na Taquara"
                  value={newNoticeTitle}
                  onChange={(e) => setNewNoticeTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Bairro Alvo:
                </label>
                <select
                  value={newNoticeNeighborhood}
                  onChange={(e) => setNewNoticeNeighborhood(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="Todos os Bairros">Todos os Bairros</option>
                  {NEIGHBORHOODS.map((n) => (
                    <option key={n.id} value={n.name}>
                      {n.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Conteúdo da Mensagem:
              </label>
              <textarea
                required
                rows={2}
                placeholder="Descreva o comunicado para os vizinhos e comerciantes..."
                value={newNoticeContent}
                onChange={(e) => setNewNoticeContent(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-orange-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNoticeForm(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Publicar Aviso
              </button>
            </div>
          </form>
        )}

        {/* Notices List */}
        <div className="space-y-2.5">
          {notices.map((nt) => (
            <div
              key={nt.id}
              className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
                nt.active
                  ? 'bg-slate-900/80 border-slate-800'
                  : 'bg-slate-900/40 border-slate-800/40 opacity-60'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white">{nt.title}</h4>
                  <span className="px-2 py-0.2 rounded-full bg-slate-800 text-amber-300 text-[10px] font-semibold">
                    {nt.targetNeighborhood}
                  </span>
                  <span className="text-[10px] text-slate-400">· {nt.createdAt}</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {nt.content}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleToggleNotice(nt.id)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 ${
                  nt.active
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Power className="w-3 h-3" />
                {nt.active ? 'Ativo' : 'Desativado'}
              </button>
              <button
                onClick={() => handleDeleteNotice(nt.id)}
                title="Excluir aviso"
                aria-label={`Excluir aviso ${nt.title}`}
                className="p-2 rounded-lg border border-rose-500/30 text-rose-300 hover:bg-rose-500/20"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 5. REGISTRO DE AUDITORIA SIMPLES (AUDIT LOGS)                */}
      {/* ============================================================ */}
      <div className="rounded-3xl bg-[#13151f] border border-slate-800 p-5 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-orange-400" />
          Registro de Auditoria e Ações Recentes
        </h3>
        <p className="text-xs text-slate-400">
          Transparência das movimentações do sistema e concessões de pontos
        </p>

        <div className="space-y-2">
          {stats.auditLogs.map((log) => (
            <div
              key={log.id}
              className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center justify-between"
            >
              <div>
                <span className="font-bold text-amber-300 block">
                  {log.action}
                </span>
                <span className="text-slate-300 text-[11px]">
                  {log.detail}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right text-[10px] text-slate-400">
                  <span>{log.performedBy}</span>
                  <span className="block">{log.timestamp}</span>
                </div>
                <button
                  onClick={() => handleDeleteAuditLog(log.id)}
                  title="Excluir registro"
                  aria-label={`Excluir registro ${log.action}`}
                  className="p-2 rounded-lg border border-rose-500/30 text-rose-300 hover:bg-rose-500/20"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Neighborhood Distribution */}
      <div className="rounded-3xl bg-[#13151f] border border-slate-800 p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-orange-400" />
            Bairros Ativos no ZAP LANCHE
          </h3>
          <p className="text-xs text-slate-400">
            Regiões operando com feed comunitário e catálogo de lanches
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {NEIGHBORHOODS.map((nb) => (
            <div
              key={nb.id}
              className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between"
            >
              <div>
                <span className="font-bold text-sm text-white block">
                  {nb.name}
                </span>
                <span className="text-[11px] text-slate-400">
                  {nb.zone} · {nb.city} - {nb.state}
                </span>
              </div>
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg tabular-nums">
                {nb.activeSpotsCount} locais
              </span>
            </div>
          ))}
        </div>
      </div>

      {pendingDeletion && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          role="presentation"
          onClick={() => setPendingDeletion(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-confirm-title"
            className="w-full max-w-sm rounded-2xl border border-rose-500/30 bg-slate-900 p-5 shadow-2xl space-y-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-rose-500/15 p-2 text-rose-300">
                <Trash2 className="h-5 w-5" />
              </span>
              <h3 id="delete-confirm-title" className="text-base font-bold text-white">Confirmar exclusão</h3>
            </div>
            <p className="text-sm text-slate-300">
              Deseja realmente excluir <strong className="text-white">{pendingDeletion.title}</strong>? Esta ação não poderá ser desfeita.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDeletion(null)}
                className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmPendingDeletion}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-500"
              >
                Confirmar exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
