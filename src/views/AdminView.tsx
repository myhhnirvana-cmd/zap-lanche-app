import React, { useState } from 'react';
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

interface AdminViewProps {
  onOpenGitHubGuide: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ onOpenGitHubGuide }) => {
  const [stats, setStats] = useState<AdminDemoStats>(MOCK_ADMIN_STATS);
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

        <button
          onClick={onOpenGitHubGuide}
          className="px-3.5 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-amber-400 flex items-center gap-1.5 transition-colors"
        >
          <Database className="w-3.5 h-3.5" />
          Preparação Supabase (Fase 2)
        </button>
      </div>

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

              {/* Moderation Actions for the 5 states */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-0 border-slate-800">
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
      {/* 3. FILA DE APROVAÇÃO DE NOVAS LANCHONETES                    */}
      {/* ============================================================ */}
      <div className="rounded-3xl bg-[#13151f] border border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-400" />
              Fila de Aprovação de Novas Lanchonetes
            </h3>
            <p className="text-xs text-slate-400">
              Validar se o estabelecimento realmente opera no bairro antes de liberar o cardápio
            </p>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30">
            {stats.pendingApprovals.length} pendentes
          </span>
        </div>

        <div className="space-y-3">
          {stats.pendingApprovals.map((req) => {
            const status = approvedList[req.id];
            return (
              <div
                key={req.id}
                className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-white">
                      {req.name}
                    </h4>
                    <span className="text-[11px] px-2 py-0.2 rounded bg-slate-800 text-orange-400 font-medium">
                      {req.category}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                    <span className="flex items-center gap-1 text-slate-300">
                      <MapPin className="w-3 h-3 text-orange-400" />
                      Bairro {req.neighborhood}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {req.whatsapp}
                    </span>
                    <span>·</span>
                    <span>{req.requestedAt}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-0 border-slate-800">
                  {status === 'approved' ? (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Aprovado no Bairro (+3.000 pts Liberados)
                    </span>
                  ) : status === 'rejected' ? (
                    <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                      <XCircle className="w-4 h-4" />
                      Recusado
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => handleRejectMerchant(req.id)}
                        className="px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold transition-colors"
                      >
                        Recusar
                      </button>
                      <button
                        onClick={() => handleApproveMerchant(req.id)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Aprovar no Bairro
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
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
              <div className="text-right text-[10px] text-slate-400 shrink-0 ml-2">
                <span>{log.performedBy}</span>
                <span className="block">{log.timestamp}</span>
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
    </div>
  );
};
