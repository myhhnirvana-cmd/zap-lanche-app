import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, ChevronDown, ChevronLeft, ChevronRight, CheckCheck, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

type NotificationRow = {
  id: string;
  category: string;
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export const NotificationInbox: React.FC<{ heading?: string }> = ({ heading = 'Notificações' }) => {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) {
      setError('Conexão indisponível.');
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from('notifications')
      .select('id,category,title,body,created_at,read_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (queryError) {
      setError('Não foi possível carregar suas notificações.');
      setItems([]);
    } else {
      setError(null);
      setItems((data || []) as NotificationRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const unread = useMemo(() => items.filter((item) => !item.read_at).length, [items]);
  const pageCount = Math.max(1, Math.ceil(items.length / 2));
  const visible = items.slice(page * 2, page * 2 + 2);

  const markRead = async (id: string) => {
    if (!supabase) return;
    const now = new Date().toISOString();
    const { error: updateError } = await supabase.from('notifications').update({ read_at: now }).eq('id', id);
    if (!updateError) setItems((current) => current.map((item) => item.id === id ? { ...item, read_at: now } : item));
  };

  const markAllRead = async () => {
    if (!supabase || unread === 0) return;
    const { error: updateError } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
    if (!updateError) setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
  };

  return (
    <section className="rounded-3xl border border-slate-800 bg-[#13151f] p-4 sm:p-5 shadow-xl space-y-3">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}
          className="flex min-w-0 items-center gap-2 text-left">
          <span className="relative rounded-xl bg-orange-500/15 p-2 text-orange-400">
            <Bell className="h-4 w-4" />
            {unread > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-orange-500 px-1 text-center text-[9px] font-black text-white">{unread > 99 ? '99+' : unread}</span>}
          </span>
          <span className="text-sm font-bold text-white">{heading}</span>
          <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
        <div className="flex items-center gap-2">
          {unread > 0 && <button type="button" onClick={markAllRead} className="text-[10px] font-semibold text-orange-300 hover:text-orange-200">Marcar todas como lidas</button>}
          <button type="button" onClick={() => void load()} aria-label="Atualizar notificações" className="rounded-lg px-2 py-1 text-[10px] text-slate-400 hover:bg-slate-800">Atualizar</button>
        </div>
      </div>
      {expanded && (
        <div className="space-y-3 border-t border-slate-800 pt-3">
          {loading ? <div className="flex justify-center py-5"><Loader2 className="h-5 w-5 animate-spin text-orange-400" /></div>
            : error ? <p role="alert" className="text-xs text-rose-300">{error}</p>
            : items.length === 0 ? <p className="py-4 text-center text-xs text-slate-500">Você ainda não tem notificações.</p>
            : <>
              {visible.map((item) => (
                <article key={item.id} className={`rounded-2xl border p-3 ${item.read_at ? 'border-slate-800 bg-slate-900/40' : 'border-orange-500/30 bg-orange-500/5'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white">{item.title}</p>
                      <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-300">{item.body}</p>
                      <time className="mt-2 block text-[10px] text-slate-500">{new Date(item.created_at).toLocaleString('pt-BR')}</time>
                    </div>
                    {!item.read_at && <button type="button" onClick={() => void markRead(item.id)} className="shrink-0 text-[10px] font-bold text-orange-300 hover:text-orange-200">Marcar lida</button>}
                  </div>
                </article>
              ))}
              <div className="flex items-center justify-between pt-1">
                <button type="button" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-slate-300 disabled:opacity-30"><ChevronLeft className="h-3 w-3" /> Anterior</button>
                <span className="text-[10px] text-slate-500">{page + 1} / {pageCount}</span>
                <button type="button" disabled={page >= pageCount - 1} onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-slate-300 disabled:opacity-30">Próxima <ChevronRight className="h-3 w-3" /></button>
              </div>
            </>}
        </div>
      )}
    </section>
  );
};