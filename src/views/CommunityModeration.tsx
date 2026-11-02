import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Ban, CheckCircle2, Clock3, Loader2, MessageSquare, RefreshCw, Shield, Trash2, UserRound, Undo2 } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

type Member = {
  profile_id: string;
  full_name: string | null;
  username: string | null;
  role: string;
  is_suspended: boolean;
  suspension_reason: string | null;
  suspended_until: string | null;
  created_at: string;
};
type ModerationLog = { id: string; action: string; reason: string; performed_by_name: string | null; target_name: string | null; created_at: string };
type CommunityPost = {
  id: string;
  title: string | null;
  content: string | null;
  status: string;
  created_at: string;
  author_name: string | null;
};
const panelClass = 'rounded-3xl border border-slate-800 bg-[#13151f] p-5 space-y-4';
const inputClass = 'w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none';

export const CommunityModeration: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [history, setHistory] = useState<ModerationLog[]>([]);
  const [selectedUser, setSelectedUser] = useState<Member | null>(null);
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState<'1' | '7' | '30' | '90' | 'permanent'>('7');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase não está configurado neste ambiente.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const [memberResult, postResult] = await Promise.all([
      supabase.rpc('admin_list_community_members'),
      supabase.rpc('admin_list_community_posts'),
      supabase.rpc('admin_list_community_moderation_history'),
    ]);
    if (memberResult.error || postResult.error || historyResult.error) {
      setError(memberResult.error?.message || postResult.error?.message || historyResult.error?.message || 'Não foi possível carregar a moderação. Verifique se o SQL de moderação foi aplicado no ambiente de teste.');
    } else {
      setMembers((memberResult.data || []) as Member[]);
      setPosts((postResult.data || []) as CommunityPost[]);
      setHistory((historyResult.data || []) as ModerationLog[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const applySuspension = async () => {
    if (!selectedUser || !reason.trim()) {
      setError('Informe obrigatoriamente o motivo da suspensão.');
      return;
    }
    if (!supabase) return;
    setSaving(true);
    setError('');
    const until = duration === 'permanent'
      ? null
      : new Date(Date.now() + Number(duration) * 24 * 60 * 60 * 1000).toISOString();
    const { error: rpcError } = await supabase.rpc('admin_set_community_suspension', {
      p_profile_id: selectedUser.profile_id,
      p_reason: reason.trim(),
      p_suspended_until: until,
      p_suspend: true,
    });
    setSaving(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setNotice('Suspensão registrada e auditada.');
    setSelectedUser(null);
    setReason('');
    await load();
  };

  const reinstateUser = async (member: Member) => {
    if (!supabase || !window.confirm(`Reativar ${member.full_name || member.username || 'este usuário'}?`)) return;
    setSaving(true);
    const { error: rpcError } = await supabase.rpc('admin_set_community_suspension', {
      p_profile_id: member.profile_id,
      p_reason: 'Suspensão revogada pelo administrador.',
      p_suspended_until: null,
      p_suspend: false,
    });
    setSaving(false);
    if (rpcError) setError(rpcError.message);
    else { setNotice('Acesso comunitário reativado.'); await load(); }
  };

  const moderatePost = async (post: CommunityPost, remove: boolean) => {
    if (!supabase || !window.confirm(remove ? 'Ocultar esta publicação do feed? A ação ficará registrada e poderá ser revertida.' : 'Restaurar esta publicação no feed?')) return;
    setSaving(true);
    const { error: rpcError } = await supabase.rpc('admin_moderate_community_post', {
      p_post_id: post.id,
      p_remove: remove,
      p_reason: remove ? 'Removida pela moderação administrativa.' : 'Publicação restaurada pela moderação administrativa.',
    });
    setSaving(false);
    if (rpcError) setError(rpcError.message);
    else { setNotice(remove ? 'Publicação ocultada e registrada no histórico.' : 'Publicação restaurada.'); await load(); }
  };

  return (
    <section className={panelClass} aria-labelledby="community-moderation-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 id="community-moderation-title" className="flex items-center gap-2 text-sm font-bold text-white">
            <Shield className="h-4 w-4 text-orange-400" /> Moderação da Comunidade
          </h3>
          <p className="mt-1 text-xs text-slate-400">Suspensões, publicações e histórico auditável. O bloqueio é validado no banco de dados.</p>
        </div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div>}
      {notice && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200"><CheckCircle2 className="h-4 w-4" />{notice}<button className="ml-auto" onClick={() => setNotice('')}>Fechar</button></div>}

      {selectedUser && (
        <div className="space-y-3 rounded-2xl border border-orange-500/30 bg-slate-900 p-4">
          <div className="flex items-center justify-between gap-2">
            <strong className="text-sm text-white">Suspender {selectedUser.full_name || selectedUser.username || 'usuário'}</strong>
            <button onClick={() => setSelectedUser(null)} className="text-xs text-slate-400">Cancelar</button>
          </div>
          <label className="block space-y-1 text-xs text-slate-300">Duração
            <select className={inputClass} value={duration} onChange={e => setDuration(e.target.value as typeof duration)}>
              <option value="1">1 dia</option><option value="7">7 dias</option><option value="30">30 dias</option><option value="90">90 dias</option><option value="permanent">Permanente, até revogação manual</option>
            </select>
          </label>
          <label className="block space-y-1 text-xs text-slate-300">Motivo obrigatório
            <textarea className={inputClass} rows={3} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} placeholder="Descreva o motivo da medida..." />
          </label>
          <button onClick={() => void applySuspension()} disabled={saving || !reason.trim()} className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Salvando...' : 'Confirmar suspensão'}</button>
        </div>
      )}

      <div className="space-y-2">
        <h4 className="flex items-center gap-2 text-xs font-bold text-slate-200"><UserRound className="h-4 w-4 text-orange-400" /> Usuários</h4>
        {loading ? <div className="flex items-center gap-2 py-5 text-xs text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />Carregando...</div> : members.length === 0 ? <p className="rounded-xl bg-slate-900 p-3 text-xs text-slate-400">Nenhum perfil encontrado.</p> : members.map(member => {
          const activeSuspension = member.is_suspended && (!member.suspended_until || new Date(member.suspended_until).getTime() > Date.now());
          return <div key={member.profile_id} className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{member.full_name || member.username || 'Usuário sem nome'}</p><p className="text-[11px] text-slate-400">@{member.username || 'sem usuário'} · {member.role}</p>
              {activeSuspension && <p className="mt-1 text-[11px] text-rose-300">{member.suspension_reason} · {member.suspended_until ? `até ${new Date(member.suspended_until).toLocaleString('pt-BR')}` : 'prazo indeterminado'}</p>}
              {member.is_suspended && !activeSuspension && <p className="mt-1 text-[11px] text-emerald-300">Prazo encerrado, acesso liberado automaticamente.</p>}
            </div>
            {member.role === 'admin' ? <span className="text-[10px] text-slate-500">Conta administrativa protegida</span> : activeSuspension
              ? <button onClick={() => void reinstateUser(member)} disabled={saving} className="inline-flex items-center justify-center gap-1 rounded-lg border border-emerald-500/30 px-3 py-2 text-xs text-emerald-300"><Undo2 className="h-3.5 w-3.5" />Reativar</button>
              : <button onClick={() => { setSelectedUser(member); setReason(''); }} className="inline-flex items-center justify-center gap-1 rounded-lg border border-rose-500/30 px-3 py-2 text-xs text-rose-300"><Ban className="h-3.5 w-3.5" />Suspender</button>}
          </div>;
        })}
      </div>

      <div className="space-y-2 border-t border-slate-800 pt-4">
        <h4 className="flex items-center gap-2 text-xs font-bold text-slate-200"><MessageSquare className="h-4 w-4 text-orange-400" /> Publicações recentes</h4>
        {posts.length === 0 ? <p className="rounded-xl bg-slate-900 p-3 text-xs text-slate-400">Nenhuma publicação encontrada.</p> : posts.map(post => {
          const hidden = post.status === 'removido_moderacao';
          return <div key={post.id} className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{post.title || post.content || 'Publicação sem texto'}</p><p className="text-[11px] text-slate-400">{post.author_name || 'Autor desconhecido'} · {new Date(post.created_at).toLocaleString('pt-BR')} · {hidden ? 'Oculta' : post.status}</p></div>
            <button onClick={() => void moderatePost(post, !hidden)} disabled={saving} className={`inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-2 text-xs ${hidden ? 'border-emerald-500/30 text-emerald-300' : 'border-rose-500/30 text-rose-300'}`}>
              {hidden ? <Undo2 className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}{hidden ? 'Restaurar' : 'Ocultar publicação'}
            </button>
          </div>;
        })}
      </div>
      <div className="space-y-2 border-t border-slate-800 pt-4">
        <h4 className="flex items-center gap-2 text-xs font-bold text-slate-200"><Clock3 className="h-4 w-4 text-orange-400" /> Histórico de moderação</h4>
        {history.length === 0 ? <p className="rounded-xl bg-slate-900 p-3 text-xs text-slate-400">Nenhuma ação registrada ainda.</p> : history.map(item => (
          <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs">
            <p className="font-semibold text-white">{item.action.replaceAll('_', ' ')} · {item.target_name || 'Alvo não disponível'}</p>
            <p className="mt-1 text-slate-300">{item.reason}</p>
            <p className="mt-1 text-[10px] text-slate-500">{item.performed_by_name || 'Administrador'} · {new Date(item.created_at).toLocaleString('pt-BR')}</p>
          </div>
        ))}
      </div>
      <p className="flex items-center gap-2 border-t border-slate-800 pt-3 text-[10px] text-slate-500"><Clock3 className="h-3.5 w-3.5" /> Suspensões temporárias expiram automaticamente. As ações administrativas são gravadas no histórico do banco.</p>
    </section>
  );
};
