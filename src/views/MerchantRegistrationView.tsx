import React, { useEffect, useState } from 'react';
import { Store, CheckCircle2, Clock3, Send, RefreshCw, ArrowRight, MapPin, Phone, UserRound, Utensils, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

type RegistrationRequest = {
  id: string;
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

interface MerchantRegistrationViewProps {
  onOpenMerchantArea: () => void;
}

const inputClass = 'w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20';
const labelClass = 'mb-1.5 block text-xs font-semibold text-slate-300';

export const MerchantRegistrationView: React.FC<MerchantRegistrationViewProps> = ({ onOpenMerchantArea }) => {
  const { user, profile, isMerchant, isAdmin, refreshSession } = useAuth();
  const [latestRequest, setLatestRequest] = useState<RegistrationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState(profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || '');
  const [whatsapp, setWhatsapp] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [businessType, setBusinessType] = useState('Lanches e hambúrgueres');
  const [productsDescription, setProductsDescription] = useState('');
  const [address, setAddress] = useState('');

  const loadLatestRequest = async () => {
    if (!supabase || !user?.id) {
      setLoading(false);
      return;
    }
    setError(null);
    const { data, error: queryError } = await supabase
      .from('merchant_registration_requests')
      .select('id,store_name,owner_name,whatsapp,neighborhood,business_type,products_description,address,status,created_at')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (queryError) {
      setError('Não foi possível consultar sua solicitação. Verifique se a atualização do sistema já foi ativada.');
      setLatestRequest(null);
    } else {
      setLatestRequest(data as RegistrationRequest | null);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (profile?.full_name && !ownerName) setOwnerName(profile.full_name);
    void loadLatestRequest();
  }, [user?.id]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (!user || !supabase || !isSupabaseConfigured) {
      setError('Entre na sua conta para enviar o cadastro da loja.');
      return;
    }

    const phoneDigits = whatsapp.replace(/\D/g, '');
    if (storeName.trim().length < 2 || ownerName.trim().length < 2 || neighborhood.trim().length < 2 || productsDescription.trim().length < 5) {
      setError('Confira os campos obrigatórios antes de enviar.');
      return;
    }
    if (phoneDigits.length < 10 || phoneDigits.length > 13) {
      setError('Informe um WhatsApp válido com DDD.');
      return;
    }

    setSubmitting(true);
    const { data, error: insertError } = await supabase
      .from('merchant_registration_requests')
      .insert({
        profile_id: user.id,
        contact_email: user.email || null,
        store_name: storeName.trim(),
        owner_name: ownerName.trim(),
        whatsapp: phoneDigits,
        neighborhood: neighborhood.trim(),
        business_type: businessType,
        products_description: productsDescription.trim(),
        address: address.trim() || null,
      })
      .select('id,store_name,owner_name,whatsapp,neighborhood,business_type,products_description,address,status,created_at')
      .single();

    setSubmitting(false);
    if (insertError) {
      setError(insertError.code === '23505'
        ? 'Você já tem uma solicitação aguardando análise. Acompanhe o status nesta página.'
        : 'Não foi possível enviar agora. Tente novamente em instantes.');
      if (insertError.code === '23505') await loadLatestRequest();
      return;
    }

    setLatestRequest(data as RegistrationRequest);
    setSuccess(true);
    setStoreName('');
    setWhatsapp('');
    setNeighborhood('');
    setBusinessType('Lanches e hambúrgueres');
    setProductsDescription('');
    setAddress('');
  };

  const handleRefreshAccess = async () => {
    setRefreshing(true);
    await refreshSession();
    setRefreshing(false);
    onOpenMerchantArea();
  };

  if (!user) {
    return (
      <section className="mx-auto max-w-2xl rounded-3xl border border-amber-500/30 bg-[#13151f] p-6 text-center">
        <Store className="mx-auto h-10 w-10 text-amber-400" />
        <h1 className="mt-3 text-xl font-extrabold text-white">Traga sua loja para o ZAP Lanche</h1>
        <p className="mt-2 text-sm text-slate-400">Entre ou crie sua conta gratuita para apresentar seu negócio à nossa equipe.</p>
      </section>
    );
  }

  if (isMerchant || isAdmin) {
    return (
      <section className="mx-auto max-w-2xl rounded-3xl border border-emerald-500/30 bg-[#13151f] p-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
        <h1 className="mt-3 text-xl font-extrabold text-white">Sua conta já tem acesso de comerciante</h1>
        <p className="mt-2 text-sm text-slate-400">Acesse a área de comerciante para administrar seu estabelecimento.</p>
        <button type="button" onClick={onOpenMerchantArea} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-orange-400">
          Abrir área do comerciante <ArrowRight className="h-4 w-4" />
        </button>
      </section>
    );
  }

  if (!isSupabaseConfigured || !supabase) {
    return <div className="mx-auto max-w-2xl rounded-2xl border border-amber-500/30 bg-[#13151f] p-5 text-sm text-amber-200">O cadastro de novos estabelecimentos estará disponível quando a conexão oficial estiver ativa.</div>;
  }

  if (loading) {
    return <div className="py-16 text-center text-sm text-slate-400"><RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />Carregando suas solicitações...</div>;
  }

  if (latestRequest?.status === 'pending') {
    return (
      <section className="mx-auto max-w-2xl space-y-5 rounded-3xl border border-amber-500/30 bg-[#13151f] p-6 sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400"><Clock3 className="h-7 w-7" /></div>
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-400">Solicitação recebida</p>
          <h1 className="mt-2 text-2xl font-extrabold text-white">Estamos analisando sua loja!</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">Seus dados já estão na fila de análise do administrador. Assim que sua loja for aprovada, o acesso de comerciante será liberado.</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm">
          <p className="font-bold text-white">{latestRequest.store_name}</p>
          <p className="mt-1 text-xs text-slate-400">{latestRequest.business_type} · {latestRequest.neighborhood}</p>
          <p className="mt-2 text-xs text-slate-400">Enviado em {new Date(latestRequest.created_at).toLocaleDateString('pt-BR')}</p>
        </div>
        <button type="button" onClick={() => void loadLatestRequest()} className="mx-auto flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800"><RefreshCw className="h-3.5 w-3.5" /> Atualizar status</button>
      </section>
    );
  }

  if (latestRequest?.status === 'approved') {
    return (
      <section className="mx-auto max-w-2xl rounded-3xl border border-emerald-500/30 bg-[#13151f] p-6 text-center sm:p-8">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
        <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">Cadastro aprovado</p>
        <h1 className="mt-2 text-2xl font-extrabold text-white">Sua loja foi liberada!</h1>
        <p className="mt-2 text-sm text-slate-400">Atualize seu acesso para começar a organizar seu estabelecimento no ZAP Lanche.</p>
        <button type="button" disabled={refreshing} onClick={() => void handleRefreshAccess()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-60">
          {refreshing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Acessar minha loja
        </button>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="overflow-hidden rounded-3xl border border-amber-500/25 bg-[#13151f]">
        <div className="bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent p-6 sm:p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-500/10 text-amber-400"><Store className="h-7 w-7" /></div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-amber-400">ZAP Lanche para negócios locais</p>
          <h1 className="mt-2 max-w-xl text-3xl font-black leading-tight text-white">Traga sua loja para o ZAP Lanche!</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">Apresente seu negócio, alcance moradores do seu bairro e tenha seu cardápio e suas novidades em um só lugar. Preencha o formulário e nossa equipe analisará seu cadastro.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 border-t border-slate-800 p-5 sm:grid-cols-3">
          <div className="flex items-center gap-2 text-xs text-slate-300"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Cadastro gratuito para análise</div>
          <div className="flex items-center gap-2 text-xs text-slate-300"><Clock3 className="h-4 w-4 text-amber-400" /> Liberação após aprovação</div>
          <div className="flex items-center gap-2 text-xs text-slate-300"><Store className="h-4 w-4 text-amber-400" /> Área exclusiva do comerciante</div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-[#13151f] p-5 sm:p-7">
        <div className="mb-5">
          <h2 className="text-lg font-extrabold text-white">Conte para nós sobre sua loja</h2>
          <p className="mt-1 text-xs text-slate-400">Os campos com * são necessários para enviar sua solicitação.</p>
        </div>
        {success && <div role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Solicitação enviada! O administrador já pode analisá-la.</div>}
        {error && <div role="alert" className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200"><AlertCircle className="h-4 w-4 shrink-0" /> {error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass} htmlFor="merchant-store-name">Nome da loja *</label>
            <input id="merchant-store-name" required maxLength={120} value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="Ex.: Lanches da Praça" className={inputClass} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="merchant-owner-name">Nome do comerciante responsável *</label>
              <div className="relative"><UserRound className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500" /><input id="merchant-owner-name" required maxLength={120} value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Seu nome" className={inputClass + ' pl-9'} /></div>
            </div>
            <div>
              <label className={labelClass} htmlFor="merchant-whatsapp">WhatsApp com DDD *</label>
              <div className="relative"><Phone className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500" /><input id="merchant-whatsapp" required inputMode="tel" maxLength={20} value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="(21) 99999-9999" className={inputClass + ' pl-9'} /></div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="merchant-neighborhood">Bairro onde atua *</label>
              <div className="relative"><MapPin className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500" /><input id="merchant-neighborhood" required maxLength={80} value={neighborhood} onChange={e => setNeighborhood(e.target.value)} placeholder="Ex.: Campo Grande" className={inputClass + ' pl-9'} /></div>
            </div>
            <div>
              <label className={labelClass} htmlFor="merchant-business-type">Tipo de negócio *</label>
              <div className="relative"><Utensils className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500" /><select id="merchant-business-type" value={businessType} onChange={e => setBusinessType(e.target.value)} className={inputClass + ' pl-9'}><option>Lanches e hambúrgueres</option><option>Pizzas e massas</option><option>Salgados e pastéis</option><option>Doces e sobremesas</option><option>Refeições e comida caseira</option><option>Açaí e bebidas</option><option>Outro negócio de alimentação</option></select></div>
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="merchant-products">O que você produz ou vende? *</label>
            <textarea id="merchant-products" required minLength={5} maxLength={1000} rows={4} value={productsDescription} onChange={e => setProductsDescription(e.target.value)} placeholder="Conte um pouco sobre seus produtos, especialidades e o que as pessoas encontram na sua loja." className={inputClass + ' resize-y'} />
          </div>
          <div>
            <label className={labelClass} htmlFor="merchant-address">Endereço ou ponto de referência (opcional)</label>
            <input id="merchant-address" maxLength={250} value={address} onChange={e => setAddress(e.target.value)} placeholder="Rua, número ou referência do bairro" className={inputClass} />
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs leading-relaxed text-slate-400">Ao enviar, sua loja ainda não será publicada. A equipe do ZAP Lanche analisará as informações e só então poderá aprovar e liberar o acesso comercial.</div>
          <button type="submit" disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-5 py-3.5 text-sm font-extrabold text-slate-950 shadow-lg shadow-orange-500/10 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {submitting ? 'Enviando solicitação...' : 'Enviar cadastro para análise'}
          </button>
        </form>
      </section>
    </div>
  );
};
