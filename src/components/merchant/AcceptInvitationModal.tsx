import React, { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  Mail,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  X,
  LogIn,
  UserPlus,
  ArrowRight,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthModal } from '../auth/AuthModal';

interface AcceptInvitationModalProps {
  token: string;
  onClose: () => void;
  onAccepted: (restaurantId: string) => void;
}

interface InvitationPreviewData {
  valid: boolean;
  restaurant_id: string;
  restaurant_name: string;
  neighborhood: string;
  invited_email: string | null;
  expires_at: string;
}

export const AcceptInvitationModal: React.FC<AcceptInvitationModalProps> = ({
  token,
  onClose,
  onAccepted,
}) => {
  const { user, session, signOut, refreshSession } = useAuth();
  const [isPreviewLoading, setIsPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<InvitationPreviewData | null>(null);

  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [acceptSuccess, setAcceptSuccess] = useState(false);

  // Controle do modal de autenticação reutilizado
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');

  const viteEnv = typeof import.meta !== 'undefined' ? ((import.meta as any).env ?? {}) : {};
  const supabaseUrl = viteEnv.VITE_SUPABASE_URL || 'https://ortuxqmqtngkvynmgpch.supabase.co';
  const anonKey = viteEnv.VITE_SUPABASE_ANON_KEY as string | undefined;
  const functionUrl = `${supabaseUrl}/functions/v1/accept-invitation`;

  // 1. Carrega os dados prévios do convite com segurança para confirmação explícita
  useEffect(() => {
    let isMounted = true;

    async function loadPreview() {
      setIsPreviewLoading(true);
      setPreviewError(null);

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (anonKey) headers['apikey'] = anonKey;

        const response = await fetch(functionUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'preview',
            token: token.trim(),
          }),
        });

        let data: any = null;
        try {
          data = await response.json();
        } catch {
          // Erro de parse JSON
        }

        if (!isMounted) return;

        if (!response.ok || !data?.valid) {
          const errorMsg =
            data?.error ||
            (response.status === 404
              ? 'Convite não encontrado ou token inválido.'
              : response.status === 410
              ? 'Este convite já foi utilizado ou expirou.'
              : response.status === 409
              ? 'Esta lanchonete já possui um comerciante responsável.'
              : 'Não foi possível carregar os dados deste convite.');
          setPreviewError(errorMsg);
          setIsPreviewLoading(false);
          return;
        }

        setPreviewData(data as InvitationPreviewData);
      } catch (err: any) {
        if (isMounted) {
          setPreviewError(err?.message ? `Erro de conexão: ${err.message}` : 'Falha ao contatar o servidor.');
        }
      } finally {
        if (isMounted) setIsPreviewLoading(false);
      }
    }

    if (token) {
      loadPreview();
    } else {
      setPreviewError('Nenhum token de convite fornecido.');
      setIsPreviewLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [token, functionUrl, anonKey]);

  // Normalização para comparação segura de e-mails
  const userEmail = (user?.email || '').toLowerCase().trim();
  const invitedEmail = (previewData?.invited_email || '').toLowerCase().trim();
  const isManualInvitation = previewData?.invited_email === null;
  const isEmailMatching = Boolean(userEmail && invitedEmail && userEmail === invitedEmail);

  // 2. Confirmação explícita e chamada de vinculação à RPC
  const handleConfirmAcceptance = async () => {
    if (!previewData) return;
    if (!session?.access_token) {
      setAcceptError('Sessão expirada. Faça login novamente para aceitar o convite.');
      return;
    }

    if (!isManualInvitation && !isEmailMatching) {
      setAcceptError(`A conta conectada (${userEmail}) não corresponde ao e-mail convidado (${invitedEmail}).`);
      return;
    }

    setIsAccepting(true);
    setAcceptError(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      };
      if (anonKey) headers['apikey'] = anonKey;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'accept',
          token: token.trim(),
        }),
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        // Resposta sem JSON
      }

      if (!response.ok || data?.success !== true) {
        const errorMsg =
          data?.error ||
          (response.status === 401
            ? 'Sessão expirada. Faça login novamente para aceitar.'
            : 'Falha ao processar o vínculo com a lanchonete.');
        setAcceptError(errorMsg);
        setIsAccepting(false);
        return;
      }

      // Sucesso na aceitação!
      setAcceptSuccess(true);
      await refreshSession();
    } catch (err: any) {
      setAcceptError(err?.message ? `Erro de conexão: ${err.message}` : 'Falha de comunicação com o servidor.');
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-lg bg-[#13151f] border border-orange-500/30 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full bg-slate-800/80 hover:bg-slate-750 text-slate-400 hover:text-white transition-colors"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 1. Estado: Carregando prévia */}
        {isPreviewLoading && (
          <div className="py-12 text-center space-y-4">
            <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Validando convite...</h3>
              <p className="text-xs text-slate-400">
                Consultando informações seguras da lanchonete associada.
              </p>
            </div>
          </div>
        )}

        {/* 2. Estado: Erro na prévia (expirado, inválido, já usado) */}
        {!isPreviewLoading && previewError && (
          <div className="space-y-4 py-2">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-bold text-white">Convite Não Disponível</h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                {previewError}
              </p>
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-semibold transition-colors"
              >
                Voltar para o ZAP LANCHE
              </button>
            </div>
          </div>
        )}

        {/* 3. Estado: Sucesso ao aceitar o convite */}
        {!isPreviewLoading && acceptSuccess && previewData && (
          <div className="space-y-5 py-2 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-extrabold text-white font-display">
                Parabéns! Convite Aceito
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                Sua conta agora é a responsável oficial pelo estabelecimento{' '}
                <strong className="text-white font-bold">{previewData.restaurant_name}</strong>.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Perfil atualizado para comerciante no ZAP LANCHE.</span>
            </div>

            <button
              onClick={() => {
                onAccepted(previewData.restaurant_id);
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-extrabold text-xs transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-2"
            >
              <span>Ir para a Área do Comerciante</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 4. Estado: Confirmação Explícita com Detalhes da Lanchonete */}
        {!isPreviewLoading && !previewError && !acceptSuccess && previewData && (
          <div className="space-y-5">
            {/* Cabeçalho */}
            <div className="space-y-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 inline-block">
                Convite de Comerciante
              </span>
              <h2 className="text-xl font-bold text-white font-display">
                Assumir Gestão da Lanchonete
              </h2>
              <p className="text-xs text-slate-400">
                Você foi convidado pela administração para gerenciar este estabelecimento no ZAP LANCHE.
              </p>
            </div>

            {/* Cartão de Detalhes da Lanchonete */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-extrabold text-white text-base truncate">
                    {previewData.restaurant_name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span>{previewData.neighborhood || 'Bairro Parceiro'} · Rio de Janeiro</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  {isManualInvitation ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                      Convite manual (sem e-mail)
                    </>
                  ) : (
                    <>
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      Convidado: <strong className="text-slate-200">{previewData.invited_email}</strong>
                    </>
                  )}
                </span>
                <span className="text-[10px] text-slate-500">
                  {previewData.expires_at ? `Expira em 24h` : ''}
                </span>
              </div>
            </div>

            {/* Alerta de Erro de Aceitação */}
            {acceptError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 animate-fade-in">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span className="leading-relaxed">{acceptError}</span>
              </div>
            )}

            {/* Cenários de Autenticação */}

            {/* Cenário A: Usuário NÃO logado */}
            {!user && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3 text-xs">
                <div className="flex items-start gap-2 text-amber-300">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <p className="leading-relaxed">
                    {isManualInvitation
                      ? 'Entre ou crie uma conta para aceitar este convite manual.'
                      : <>Para aceitar este convite, é necessário entrar com o e-mail convidado:{' '}
                        <strong className="text-white underline">{previewData.invited_email}</strong>.</>}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => {
                      setAuthModalMode('login');
                      setIsAuthModalOpen(true);
                    }}
                    className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Fazer Login</span>
                  </button>
                  <button
                    onClick={() => {
                      setAuthModalMode('signup');
                      setIsAuthModalOpen(true);
                    }}
                    className="py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-orange-600/20"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Criar Conta</span>
                  </button>
                </div>
              </div>
            )}

            {/* Cenário B: Usuário logado com OUTRO e-mail */}
            {user && !isManualInvitation && !isEmailMatching && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-3 text-xs">
                <div className="flex items-start gap-2 text-rose-300">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <div className="space-y-1">
                    <p className="font-bold">E-mail incompatível com o convite</p>
                    <p className="text-[11px] leading-relaxed text-slate-300">
                      Você está conectado como <strong className="text-white">{user.email}</strong>, mas este convite foi emitido exclusivamente para{' '}
                      <strong className="text-amber-300">{previewData.invited_email}</strong>.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => signOut()}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-rose-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors border border-rose-500/30"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sair desta conta para conectar com a correta</span>
                </button>
              </div>
            )}

            {/* Cenário C: Usuário logado com o e-mail CORRETO */}
            {user && (isManualInvitation || isEmailMatching) && (
              <div className="space-y-4">
                {!session?.access_token && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                    Sessão expirada. Faça login novamente antes de aceitar o convite.
                  </div>
                )}
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {isManualInvitation
                      ? <>Conectado como <strong className="text-white">{user.email || 'usuário autenticado'}</strong>; este convite não exige e-mail específico.</>
                      : <>Conectado com o e-mail convidado: <strong className="text-white">{user.email}</strong></>}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <p className="text-slate-300 font-semibold">O que acontece ao confirmar?</p>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                    <li>Sua conta assume a titularidade da lanchonete selecionada.</li>
                    <li>Seu papel no sistema é promovido para comerciante.</li>
                    <li>Você poderá editar o cardápio e gerenciar a loja na Área do Lojista.</li>
                  </ul>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={onClose}
                    disabled={isAccepting}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs transition-colors"
                  >
                    Agora Não
                  </button>
                  <button
                    onClick={handleConfirmAcceptance}
                    disabled={isAccepting || !session?.access_token}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-extrabold text-xs transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isAccepting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Vinculando Lanchonete...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirmar e Assumir Lanchonete</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal de Autenticação Reutilizado */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          initialMode={authModalMode}
          customTitle="Entrar para Aceitar Convite"
          customSubtitle={
            previewData
              ? isManualInvitation
                ? 'Entre ou crie uma conta para assumir a lanchonete com este convite manual.'
                : `Entre com o e-mail ${previewData.invited_email} para assumir a lanchonete.`
              : 'Faça login com seu e-mail para prosseguir.'
          }
        />
      </div>
    </div>
  );
};
