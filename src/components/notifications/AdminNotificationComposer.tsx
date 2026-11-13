import React, { useEffect, useState } from 'react';
import { BellRing, Loader2, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

type MerchantOption = { id: string; name: string; neighborhood: string | null };

export const AdminNotificationComposer: React.FC = () => {
  const [target, setTarget] = useState<'all' | 'individual' | 'neighborhood'>('all');
  const [merchants, setMerchants] = useState<MerchantOption[]>([]);
  const [selectedMerchant, setSelectedMerchant] = useState('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase || !isSupabaseConfigured) { setLoadingOptions(false); return; }
      const { data } = await supabase.from('restaurants').select('owner_profile_id,name,neighborhood').eq('status','ativo').not('owner_profile_id','is',null).order('name');
      if (!active) return;
      setMerchants((data || []).map((row: any) => ({ id: row.owner_profile_id, name: row.name, neighborhood: row.neighborhood })));
      setLoadingOptions(false);
    }
    void load();
    return () => { active = false; };
  }, []);

  const neighborhoods = Array.from(new Set(merchants.map((item) => item.neighborhood).filter((item): item is string => Boolean(item)))).sort((a,b) => a.localeCompare(b,'pt-BR'));

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    if (!supabase || !isSupabaseConfigured) { setFeedback({ok:false,text:'Conexão indisponível.'}); return; }
    setSending(true);
    const { data, error } = await supabase.rpc('send_merchant_notification', {
      p_target_type: target,
      p_title: title.trim(),
      p_body: body.trim(),
      p_target_profile_id: target === 'individual' ? selectedMerchant : null,
      p_neighborhood: target === 'neighborhood' ? selectedNeighborhood : null,
    });
    setSending(false);
    if (error) { setFeedback({ok:false,text:error.message || 'Não foi possível enviar.'}); return; }
    const count = Number((data as any)?.sent ?? 0);
    setFeedback({ok:true,text:count ? `Comunicado enviado para ${count} comerciante(s).` : 'Nenhum comerciante ativo encontrado para esse destino.'});
    if (count) { setTitle(''); setBody(''); }
  };

  return (
    <section className="rounded-3xl border border-orange-500/25 bg-[#13151f] p-5 shadow-xl space-y-4">
      <div className="flex items-center gap-2">
        <span className="rounded-xl bg-orange-500/15 p-2 text-orange-400"><BellRing className="h-5 w-5" /></span>
        <div><h3 className="text-sm font-bold text-white">Central de notificações aos comerciantes</h3><p className="text-[11px] text-slate-400">Comunicados internos. Moradores não recebem mensagens administrativas.</p></div>
      </div>
      <form onSubmit={send} className="space-y-3">
        <div><label className="mb-1 block text-xs font-semibold text-slate-300">Enviar para</label>
          <select value={target} onChange={(e) => setTarget(e.target.value as typeof target)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-white">
            <option value="all">Todos os comerciantes</option><option value="individual">Um comerciante específico</option><option value="neighborhood">Comerciantes de um bairro</option>
          </select>
        </div>
        {target === 'individual' && <div><label className="mb-1 block text-xs font-semibold text-slate-300">Comerciante / loja</label><select required value={selectedMerchant} onChange={(e) => setSelectedMerchant(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-white"><option value="">Selecione</option>{merchants.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>}
        {target === 'neighborhood' && <div><label className="mb-1 block text-xs font-semibold text-slate-300">Bairro da loja</label><select required value={selectedNeighborhood} onChange={(e) => setSelectedNeighborhood(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-white"><option value="">Selecione</option>{neighborhoods.map((n) => <option key={n} value={n}>{n}</option>)}</select></div>}
        <div><label className="mb-1 block text-xs font-semibold text-slate-300">Título</label><input required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Atualização importante" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-white placeholder:text-slate-600" /></div>
        <div><label className="mb-1 block text-xs font-semibold text-slate-300">Mensagem</label><textarea required maxLength={1000} rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escreva o comunicado para os comerciantes..." className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-white placeholder:text-slate-600" /><p className="mt-1 text-right text-[10px] text-slate-500">{body.length}/1000</p></div>
        <button type="submit" disabled={sending || loadingOptions || !title.trim() || !body.trim() || (target === 'individual' && !selectedMerchant) || (target === 'neighborhood' && !selectedNeighborhood)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-xs font-extrabold text-black hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enviar comunicado</button>
      </form>
      {loadingOptions && <p className="text-[10px] text-slate-500">Carregando comerciantes...</p>}
      {feedback && <div role="status" className={`flex items-center gap-2 rounded-xl p-3 text-xs ${feedback.ok ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>{feedback.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}{feedback.text}</div>}
    </section>
  );
};