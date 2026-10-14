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
} from 'lucide-react';
import { AdminDemoStats } from '../types';
import { MOCK_ADMIN_STATS, NEIGHBORHOODS } from '../data/mockData';

interface AdminViewProps {
  onOpenGitHubGuide: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ onOpenGitHubGuide }) => {
  const [stats, setStats] = useState<AdminDemoStats>(MOCK_ADMIN_STATS);
  const [approvedList, setApprovedList] = useState<Record<string, 'approved' | 'rejected'>>({});

  const handleApprove = (id: string) => {
    setApprovedList((prev) => ({ ...prev, [id]: 'approved' }));
  };

  const handleReject = (id: string) => {
    setApprovedList((prev) => ({ ...prev, [id]: 'rejected' }));
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
            Gestão macro de bairros parceiros, aprovação de novas lanchonetes e moderação comunitária
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
            SP, RJ e capitais
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
            +14 cadastros este mês
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#13151f] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Posts Comunitários</span>
            <MessageSquare className="w-4 h-4 text-blue-400" />
          </div>
          <span className="text-2xl font-extrabold text-white tabular-nums">
            {stats.communityPosts}
          </span>
          <span className="text-[10px] text-slate-400 block mt-1">
            Avaliações e fotos de lanches
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

      {/* Pending Approvals Table/List */}
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
                      Aprovado no Bairro
                    </span>
                  ) : status === 'rejected' ? (
                    <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                      <XCircle className="w-4 h-4" />
                      Recusado
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => handleReject(req.id)}
                        className="px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold transition-colors"
                      >
                        Recusar
                      </button>
                      <button
                        onClick={() => handleApprove(req.id)}
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
