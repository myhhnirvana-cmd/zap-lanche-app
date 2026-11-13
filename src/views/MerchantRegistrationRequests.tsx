import React, { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, Building2, Clock3, Loader2, MapPin, Phone, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

type MerchantRequest = {
  id: string;
  profile_id: string;
  contact_email: string | null;
  store_name: string;
  owner_name: string;
  whatsapp: string;
  neighborhood: string;
  business_type: string;
  products_description: string;
  address: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

interface MerchantRegistrationRequestsProps {
  onRestaurantAdded?: () => void;
}

export const MerchantRegistrationRequests: React.FC<MerchantRegistrationRequestsProps> = ({ onRestaurantAdded }) => {
  const [requests, setRequests] = useState<MerchantRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) {
      setError('Conexão com o banco de dados indisponível.');
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from('merchant_registration_requests')
      .select('id,profile_id,contact_email,store_name,owner_name,whatsapp,neighborhood,business_type,products_description,address,status,created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (queryError) {
      setError('Não foi possível carregar as solicitações. Confirme se a migração do cadastro de comerciantes já foi aplicada.');
      setRequests([]);
    } else {
      setError(null);
      setRequests((data || []) as MerchantRequest[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadRequests(); }, [loadRequests]);

  const reviewRequest = async (request: MerchantRequest, decision: 'approve' | 'reject') => {
    if (!supabase) return;
    const actionLabel = decision === 'approve' ? 'aprovar e liberar esta loja' : 'recusar esta solicitação';
    if (!window.confirm('Confirma ' + actionLabel + '?')) return;

    setBusyId(request.id);
    setError(null);
    setNotice(null);
    const { data, error: reviewError } = await supabase.rpc('review_merchant_registration', {
      p_request_id: request.id,
      p_decision: decision,
    });

    if (reviewError) {
      setError(reviewError.message || 'Não foi possível concluir a análise.');
      setBusyId(null);
      return;
    }

    const result = data as { status?: string; restaurant_id?: string } | null;
    setNotice(decision === 'approve'
      ? 'Cadastro de ' + request.store_name + ' aprovado. A loja foi criada e o acesso comercial foi liberado.'
      : 'Solicitação de ' + request.store_name + ' recusada.');
    setBusyId(null);
    await loadRequests();
    if (decision === 'approve' && result?.restaurant_id) onRestaurantAdded?.();
  };

  const pending = requests.filter(request => request.status === 'pending');
  const reviewed = requests.filter(request => request.status !== 'pending');

  return (
    <section className="space-y-4 rounded-3xl border border-amber-500/25 bg-[#13151f] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-amber-500/15 p-2.5 text-amber-400"><Building2 className="h-5 w-5" /></span>
          <div>
            <h3 className="text-sm font-extrabold text-white">Solicitações para trazer lojas</h3>
            <p className="mt-0.5 text-xs text-slate-400">Analise os cadastros enviados pelos usuários antes de liberar uma loja.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">{pending.length} pendente(s)</span>
          <button type="button" onClick={() => void loadRequests()} disabled={loading} aria-label="Atualizar solicitações" className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800 disabled:opacity-50"><RefreshCw className={'h-4 w-4 ' + (loading ? 'animate-spin' : '')} /></button>
        </div>
      </div>

      {notice && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">{notice}</div>}
      {error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</div>}
      {loading ? (
        <div className="py-8 text-center text-xs text-slate-400"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Carregando solicitações...</div>
      ) : pending.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5 text-center">
          <ShieldCheck className="mx-auto h-7 w-7 text-emerald-400" />
          <p className="mt-2 text-sm font-semibold text-white">Nenhuma solicitação aguardando análise</p>
          <p className="mt-1 text-xs text-slate-500">Quando alguém enviar o cadastro da loja, ele aparecerá aqui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map(request => (
            <article key={request.id} className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h4 className="text-base font-extrabold text-white">{request.store_name}</h4>
                  <p className="mt-0.5 text-xs text-amber-300">{request.business_type}</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-300"><Clock3 className="h-3 w-3" /> Aguardando</span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-300 sm:grid-cols-2">
                <p><strong className="text-slate-500">Responsável:</strong> {request.owner_name}</p>
                <p className="flex items-center gap-1"><Phone className="h-3 w-3 text-slate-500" /> {request.whatsapp}</p>
                <p className="flex items-center gap-1"><MapPin className="h-3 w-3 text-slate-500" /> {request.neighborhood}</p>
                <p><strong className="text-slate-500">E-mail:</strong> {request.contact_email || 'Não informado'}</p>
              </div>
              <p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-900 p-3 text-xs leading-relaxed text-slate-300">{request.products_description}</p>
              {request.address && <p className="mt-2 text-xs text-slate-400">Referência: {request.address}</p>}
              <p className="mt-2 text-[10px] text-slate-500">Enviado em {new Date(request.created_at).toLocaleString('pt-BR')}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" disabled={busyId === request.id} onClick={() => void reviewRequest(request, 'reject')} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"><XCircle className="h-3.5 w-3.5" /> Recusar</button>
                <button type="button" disabled={busyId === request.id} onClick={() => void reviewRequest(request, 'approve')} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-extrabold text-slate-950 hover:bg-emerald-400 disabled:opacity-50">{busyId === request.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BadgeCheck className="h-3.5 w-3.5" />} Aprovar e liberar loja</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {reviewed.length > 0 && (
        <details className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
          <summary className="cursor-pointer text-xs font-semibold text-slate-400">Solicitações já analisadas ({reviewed.length})</summary>
          <div className="mt-3 space-y-2">
            {reviewed.slice(0, 20).map(request => (
              <div key={request.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-2 text-xs">
                <span className="text-slate-300">{request.store_name} · {request.owner_name}</span>
                <span className={request.status === 'approved' ? 'text-emerald-400' : 'text-rose-300'}>{request.status === 'approved' ? 'Aprovada' : 'Recusada'}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
};
