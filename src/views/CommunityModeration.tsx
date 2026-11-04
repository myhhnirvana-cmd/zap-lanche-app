import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Ban, CheckCircle2, ChevronDown, Clock3, Loader2, MessageSquare, RefreshCw, Search, Shield, Trash2, Undo2 } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

type Member = { profile_id: string; full_name: string | null; username: string | null; role: string; is_suspended: boolean; suspension_reason: string | null; suspended_until: string | null; created_at: string };
type ModerationLog = { id: string; action: string; reason: string; performed_by_name: string | null; target_name: string | null; created_at: string };
type CommunityPost = { id: string; title: string | null; content: string | null; status: string; created_at: string; author_name: string | null };
type Tab = 'users' | 'posts' | 'history';
const panelClass = 'rounded-3xl border border-slate-800 bg-[#13151f] p-4 sm:p-5 space-y-4';
const inputClass = 'w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none';

export const CommunityModeration: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [history, setHistory] = useState<ModerationLog[]>([]);
  const [loaded, setLoaded] = useState<Record<Tab, boolean>>({ users: false, posts: false, history: false });
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<Member | null>(null);
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState<'1' | '7' | '30' | '90' | 'permanent'>('7');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const pageSize = 10;

  const loadTab = useCallback(async (tab: Tab, force = false) => {
    if (!isSupabaseConfigured || !supabase) { setError('Supabase não está configurado neste ambiente.'); return; }
    if (loaded[tab] && !force) return;
    setLoading(true); setError('');
    const rpc = tab === 'users' ? 'admin_list_community_members' : tab === 'posts' ? 'admin_list_community_posts' : 'admin_list_community_moderation_history';
    const { data, error: rpcError } = await supabase.rpc(rpc);
    setLoading(false);
    if (rpcError) { setError(rpcError.message || 'Não foi possível carregar esta seção.'); return; }
    if (tab === 'users') setMembers((data || []) as Member[]);
    if (tab === 'posts') setPosts((data || []) as CommunityPost[]);
    if (tab === 'history') setHistory((data || []) as ModerationLog[]);
    setLoaded(previous => ({ ...previous, [tab]: true }));
  }, [loaded]);

  useEffect(() => { if (expanded) void loadTab(activeTab); }, [expanded, activeTab, loadTab]);
  useEffect(() => { setPage(1); }, [activeTab, search]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('pt-BR');
    if (activeTab === 'users') return members.filter(m => !q || [m.full_name, m.username, m.role].some(v => (v || '').toLocaleLowerCase('pt-BR').includes(q)));
    if (activeTab === 'posts') return posts.filter(p => !q || [p.title, p.content, p.author_name, p.status].some(v => (v || '').toLocaleLowerCase('pt-BR').includes(q)));
    return history.filter(h => !q || [h.action, h.reason, h.performed_by_name, h.target_name].some(v => (v || '').toLocaleLowerCase('pt-BR').includes(q)));
  }, [activeTab, members, posts, history, search]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const refreshAfterAction = async (tab: Tab) => { await loadTab(tab, true); if (tab !== 'history') await loadTab('history', true); };

  const applySuspension = async () => {
    if (!selectedUser || !reason.trim()) { setError('Informe obrigatoriamente o motivo da suspensão.'); return; }
    if (!supabase) return;
    setSaving(true); setError('');
    const until = duration === 'permanent' ? null : new Date(Date.now() + Number(duration) * 86400000).toISOString();
    const { error: rpcError } = await supabase.rpc('admin_set_community_suspension', { p_profile_id: selectedUser.profile_id, p_reason: reason.trim(), p_suspended_until: until, p_suspend: true });
    setSaving(false);
    if (rpcError) { setError(rpcError.message); return; }
    setNotice('Suspensão registrada e auditada.'); setSelectedUser(null); setReason('');
    await refreshAfterAction('users');
  };

  const reinstateUser = async (member: Member) => {
    if (!supabase || !window.confirm(`Reativar ${member.full_name || member.username || 'este usuário'}?`)) return;
    setSaving(true); setError('');
    const { error: rpcError } = await supabase.rpc('admin_set_community_suspension', { p_profile_id: member.profile_id, p_reason: 'Suspensão revogada pelo administrador.', p_suspended_until: null, p_suspend: false });
    setSaving(false);
    if (rpcError) setError(rpcError.message); else { setNotice('Acesso comunitário reativado.'); await refreshAfterAction('users'); }
  };

  const moderatePost = async (post: CommunityPost, remove: boolean) => {
    if (!supabase || !window.confirm(remove ? 'Ocultar esta publicação do feed? A ação ficará registrada e poderá ser revertida.' : 'Restaurar esta publicação no feed?')) return;
    setSaving(true); setError('');
    const { error: rpcError } = await supabase.rpc('admin_moderate_community_post', { p_post_id: post.id, p_remove: remove, p_reason: remove ? 'Removida pela moderação administrativa.' : 'Publicação restaurada pela moderação administrativa.' });
    setSaving(false);
    if (rpcError) setError(rpcError.message); else { setNotice(remove ? 'Publicação ocultada e registrada no histórico.' : 'Publicação restaurada.'); await refreshAfterAction('posts'); }
  };

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'users', label: 'Usuários', count: members.length },
    { id: 'posts', label: 'Publicações', count: posts.length },
    { id: 'history', label: 'Histórico', count: history.length },
  ];

  return <section className={panelClass} aria-labelledby="community-moderation-title">
    <button type="button" onClick={() => setExpanded(v => !v)} aria-expanded={expanded} aria-controls="community-moderation-content" className="flex w-full items-center justify-between gap-3 text-left">
      <span className="flex min-w-0 items-center gap-3">
        <span className="rounded-xl bg-orange-500/15 p-2 text-orange-400"><Shield className="h-5 w-5" /></span>
        <span className="min-w-0"><span id="community-moderation-title" className="block text-sm font-bold text-white">Moderação da Comunidade</span><span className="mt-0.5 block text-xs text-slate-400">Gerencie usuários, publicações e consulte ações registradas.</span></span>
      </span>
      <span className="flex shrink-0 items-center gap-2 text-xs text-slate-400">{expanded ? 'Recolher' : 'Abrir painel'}<ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} /></span>
    </button>

    {expanded && <div id="community-moderation-content" className="space-y-4 border-t border-slate-800 pt-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Seções de moderação">
          {tabs.map(tab => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${activeTab === tab.id ? 'bg-orange-500 text-slate-950' : 'border border-slate-700 bg-slate-900 text-slate-300 hover:text-white'}`}>{tab.label}{loaded[tab.id] ? ` · ${tab.count}` : ''}</button>)}
        </div>
        <button type="button" onClick={() => void loadTab(activeTab, true)} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar</button>
      </div>
      <label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder={activeTab === 'users' ? 'Pesquisar por nome, usuário ou perfil...' : activeTab === 'posts' ? 'Pesquisar por texto, autor ou status...' : 'Pesquisar por ação, pessoa ou motivo...'} className={`${inputClass} pl-9`} /></label>
      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div>}
      {notice && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200"><CheckCircle2 className="h-4 w-4" />{notice}<button className="ml-auto" onClick={() => setNotice('')}>Fechar</button></div>}
      {selectedUser && activeTab === 'users' && <div className="space-y-3 rounded-2xl border border-orange-500/30 bg-slate-900 p-4">
        <div className="flex items-center justify-between gap-2"><strong className="text-sm text-white">Suspender {selectedUser.full_name || selectedUser.username || 'usuário'}</strong><button onClick={() => setSelectedUser(null)} className="text-xs text-slate-400">Cancelar</button></div>
        <label className="block space-y-1 text-xs text-slate-300">Duração<select className={inputClass} value={duration} onChange={e => setDuration(e.target.value as typeof duration)}><option value="1">1 dia</option><option value="7">7 dias</option><option value="30">30 dias</option><option value="90">90 dias</option><option value="permanent">Permanente, até revogação manual</option></select></label>
        <label className="block space-y-1 text-xs text-slate-300">Motivo obrigatório<textarea className={inputClass} rows={3} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} placeholder="Descreva o motivo da medida..." /></label>
        <button onClick={() => void applySuspension()} disabled={saving || !reason.trim()} className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Salvando...' : 'Confirmar suspensão'}</button>
      </div>}
      {loading && !loaded[activeTab] ? <div className="flex items-center gap-2 py-5 text-xs text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />Carregando esta seção...</div> : visible.length === 0 ? <p className="rounded-xl bg-slate-900 p-3 text-xs text-slate-400">{search ? 'Nenhum resultado para esta pesquisa.' : activeTab === 'users' ? 'Nenhum perfil encontrado.' : activeTab === 'posts' ? 'Nenhuma publicação encontrada.' : 'Nenhuma ação registrada ainda.'}</p> : <div className="space-y-2">
        {activeTab === 'users' && (visible as Member[]).map(member => {
          const activeSuspension = member.is_suspended && (!member.suspended_until || new Date(member.suspended_until).getTime() > Date.now());
          return <div key={member.profile_id} className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{member.full_name || member.username || 'Usuário sem nome'}</p><p className="text-[11px] text-slate-400">@{member.username || 'sem usuário'} · {member.role}</p>{activeSuspension && <p className="mt-1 text-[11px] text-rose-300">{member.suspension_reason} · {member.suspended_until ? `até ${new Date(member.suspended_until).toLocaleString('pt-BR')}` : 'prazo indeterminado'}</p>}{member.is_suspended && !activeSuspension && <p className="mt-1 text-[11px] text-emerald-300">Prazo encerrado, acesso liberado automaticamente.</p>}</div>
            {member.role === 'admin' ? <span className="text-[10px] text-slate-500">Conta administrativa protegida</span> : activeSuspension ? <button onClick={() => void reinstateUser(member)} disabled={saving} className="inline-flex items-center justify-center gap-1 rounded-lg border border-emerald-500/30 px-3 py-2 text-xs text-emerald-300"><Undo2 className="h-3.5 w-3.5" />Reativar</button> : <button onClick={() => { setSelectedUser(member); setReason(''); }} className="inline-flex items-center justify-center gap-1 rounded-lg border border-rose-500/30 px-3 py-2 text-xs text-rose-300"><Ban className="h-3.5 w-3.5" />Suspender</button>}
          </div>;
        })}
        {activeTab === 'posts' && (visible as CommunityPost[]).map(post => {
          const hidden = post.status === 'removido_moderacao';
          return <div key={post.id} className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{post.title || post.content || 'Publicação sem texto'}</p><p className="text-[11px] text-slate-400">{post.author_name || 'Autor desconhecido'} · {new Date(post.created_at).toLocaleString('pt-BR')} · {hidden ? 'Oculta' : post.status}</p></div><button onClick={() => void moderatePost(post, !hidden)} disabled={saving} className={`inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-2 text-xs ${hidden ? 'border-emerald-500/30 text-emerald-300' : 'border-rose-500/30 text-rose-300'}`}>{hidden ? <Undo2 className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}{hidden ? 'Restaurar' : 'Ocultar publicação'}</button></div>;
        })}
        {activeTab === 'history' && (visible as ModerationLog[]).map(item => <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs"><p className="font-semibold text-white">{item.action.replaceAll('_', ' ')} · {item.target_name || 'Alvo não disponível'}</p><p className="mt-1 text-slate-300">{item.reason}</p><p className="mt-1 text-[10px] text-slate-500">{item.performed_by_name || 'Administrador'} · {new Date(item.created_at).toLocaleString('pt-BR')}</p></div>)}
      </div>}
      {filtered.length > pageSize && <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-xs text-slate-400"><span>{filtered.length} resultados · página {page} de {pageCount}</span><div className="flex gap-2"><button onClick={() => setPage(v => Math.max(1, v - 1))} disabled={page === 1} className="rounded-lg border border-slate-700 px-3 py-1.5 disabled:opacity-40">Anterior</button><button onClick={() => setPage(v => Math.min(pageCount, v + 1))} disabled={page === pageCount} className="rounded-lg border border-slate-700 px-3 py-1.5 disabled:opacity-40">Próxima</button></div></div>}
      <p className="flex items-center gap-2 border-t border-slate-800 pt-3 text-[10px] text-slate-500"><Clock3 className="h-3.5 w-3.5" /> Cada seção é carregada somente quando aberta. Suspensões e ações permanecem registradas no banco.</p>
    </div>}
  </section>;
};
