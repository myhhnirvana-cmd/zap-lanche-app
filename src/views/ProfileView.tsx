import React, { useState, useEffect } from 'react';
import {
  User,
  Award,
  AlertCircle,
  LogIn,
  LogOut,
  ArrowLeft,
  Pencil,
  Sparkles,
  Share2,
  Copy,
  Check,
  Store,
  Users,
  Gift,
  CheckCircle2,
  Camera,
  Info,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from '../components/auth/AuthModal';
import { AvatarGalleryModal } from '../components/profile/AvatarGalleryModal';
import { getAvatarById, DEFAULT_AVATAR_ID } from '../data/avatars';
import {
  supabase,
  isSupabaseConfigured,
  fetchLoyaltyPoints,
  lastLoyaltyError,
  fetchStoreLoyaltyBreakdown,
  fetchUserProfileReferralCode,
  applyReferralCode,
  fetchUserReferralsList,
  StorePointBreakdown,
  ReferralRecord,
} from '../lib/supabase';
import { QrCodeScannerModal } from '../components/loyalty/QrCodeScannerModal';
import { parseAndValidateRestaurantQr } from '../utils/qrCode';
import { MOCK_RESTAURANTS } from '../data/mockData';
import { ThemeSelector } from '../components/common/ThemeSelector';
import { GuideSection } from '../components/common/GuideSection';

interface ProfileViewProps {
  onSelectRestaurantById: (
    id: string,
    initialTab?: 'cardapio' | 'promocoes' | 'fidelidade' | 'publicacoes'
  ) => void;
  onOpenGitHubGuide: () => void;
  onBackToExplore?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  onSelectRestaurantById,
  onOpenGitHubGuide: _onOpenGitHubGuide,
  onBackToExplore,
}) => {
  const {
    user: authUser,
    profile,
    profileLoading,
    profileError,
    signOut,
    updateUserAvatar,
  } = useAuth();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  const [realPoints, setRealPoints] = useState<number | null>(null);
  const [loadingRealPoints, setLoadingRealPoints] = useState(true);
  const [errorRealPoints, setErrorRealPoints] = useState<string | null>(null);

  // Quadro de pontos por estabelecimento
  const [storePointsBreakdown, setStorePointsBreakdown] = useState<StorePointBreakdown[]>([]);

  // Sistema de Indicação de Amigos (15 pontos)
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralsList, setReferralsList] = useState<ReferralRecord[]>([]);
  const [hasCopiedCode, setHasCopiedCode] = useState(false);
  const [inputReferralCode, setInputReferralCode] = useState('');
  const [isApplyingCode, setIsApplyingCode] = useState(false);
  const [referralFeedback, setReferralFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Leitor de QR Code para check-in presencial no balcão (+5 pontos locais)
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkinResult, setCheckinResult] = useState<{
    status: 'success' | 'error' | 'warning';
    message: string;
    pointsAwarded?: number;
  } | null>(null);

  const handleBackToExplore = () => {
    if (onBackToExplore) {
      onBackToExplore();
      return;
    }

    const desktopExploreBtn = Array.from(
      document.querySelectorAll<HTMLButtonElement>('header nav button')
    ).find((btn) => btn.textContent?.includes('Explorar'));

    const mobileExploreBtn =
      document.querySelector<HTMLButtonElement>(
        'nav[aria-label="Navegação móvel principal"] button:first-child'
      );

    const headerLogoBtn =
      document.querySelector<HTMLButtonElement>('header button');

    if (desktopExploreBtn) {
      desktopExploreBtn.click();
    } else if (mobileExploreBtn) {
      mobileExploreBtn.click();
    } else if (headerLogoBtn) {
      headerLogoBtn.click();
    }

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    let isMounted = true;

    async function loadPoints() {
      if (!authUser?.id) {
        if (isMounted) {
          setRealPoints(null);
          setErrorRealPoints(null);
          setLoadingRealPoints(false);
        }
        return;
      }

      if (isMounted) {
        setLoadingRealPoints(true);
        setErrorRealPoints(null);
      }

      try {
        const [points, breakdownRes, codeRes, referralsRes] = await Promise.all([
          fetchLoyaltyPoints(authUser.id),
          fetchStoreLoyaltyBreakdown(authUser.id),
          fetchUserProfileReferralCode(authUser.id),
          fetchUserReferralsList(authUser.id),
        ]);

        if (!isMounted) return;

        if (breakdownRes?.data) {
          setStorePointsBreakdown(breakdownRes.data);
        }
        if (codeRes) {
          setReferralCode(codeRes);
        }
        if (referralsRes) {
          setReferralsList(referralsRes);
        }

        if (points === null) {
          setRealPoints(null);
          if (lastLoyaltyError) {
            if (lastLoyaltyError.code === '42501') {
              setErrorRealPoints(
                'Erro 42501 (Permissão negada): A tabela public.loyalty_transactions precisa do comando SQL: GRANT SELECT ON public.loyalty_transactions TO authenticated; no painel do Supabase.'
              );
            } else {
              const codeStr = lastLoyaltyError.code ? `[Cod: ${lastLoyaltyError.code}] ` : '';
              const msgStr = lastLoyaltyError.message || 'Erro desconhecido';
              const detailsStr = lastLoyaltyError.details ? ` (${lastLoyaltyError.details})` : '';
              setErrorRealPoints(`Não foi possível carregar o saldo real. ${codeStr}${msgStr}${detailsStr}`);
            }
          } else {
            setErrorRealPoints('Não foi possível carregar o saldo real.');
          }
        } else {
          setRealPoints(points);
          setErrorRealPoints(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorRealPoints('Falha de conexão ao carregar dados de fidelidade.');
        }
      } finally {
        if (isMounted) {
          setLoadingRealPoints(false);
        }
      }
    }

    loadPoints();

    return () => {
      isMounted = false;
    };
  }, [authUser]);

  const handleCopyReferralCode = () => {
    if (!referralCode) return;
    navigator.clipboard?.writeText(referralCode);
    setHasCopiedCode(true);
    setTimeout(() => setHasCopiedCode(false), 2500);
  };

  const handleShareWhatsApp = () => {
    if (!referralCode) return;
    const appUrl = window.location.origin;
    const message = encodeURIComponent(
      `Oi! Estou usando o ZAP LANCHE para pedir lanches nos melhores pontos de Jacarepaguá e acumular pontos de fidelidade. Use meu código de indicação ${referralCode} e ganhe pontos no seu primeiro check-in! Acesse: ${appUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${message}`, '_blank');
  };

  const handleApplyReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputReferralCode.trim()) return;

    setIsApplyingCode(true);
    setReferralFeedback(null);

    const res = await applyReferralCode(inputReferralCode.trim());
    setIsApplyingCode(false);

    if (res.success) {
      setReferralFeedback({ type: 'success', message: res.message });
      setInputReferralCode('');
    } else {
      setReferralFeedback({ type: 'error', message: res.message });
    }
  };

  const handleStartCheckin = () => {
    if (!authUser) {
      setIsAuthModalOpen(true);
      return;
    }
    setCheckinResult(null);
    setIsScannerOpen(true);
  };

  const handleScanQr = async (scannedText: string) => {
    setIsScannerOpen(false);

    // Validação rigorosa do QR Code (formato oficial zaplanche://restaurant/<UUID>)
    const parsed = parseAndValidateRestaurantQr(scannedText);
    if (!parsed.isValid || !parsed.restaurantId) {
      setCheckinResult({
        status: 'error',
        message: 'QR Code inválido. Aponte a câmera para o QR Code oficial do ZAP LANCHE.',
      });
      return;
    }

    if (!authUser?.id) {
      setCheckinResult({
        status: 'warning',
        message: 'Você precisa estar conectado como cliente para registrar seu check-in e acumular pontos reais. Faça login no sistema.',
      });
      return;
    }

    if (isSupabaseConfigured && supabase) {
      setIsCheckingIn(true);
      try {
        const { data, error } = await supabase.rpc('register_restaurant_checkin', {
          p_restaurant_id: parsed.restaurantId,
        });

        if (error) {
          console.error('Erro na RPC register_restaurant_checkin:', error);
          setCheckinResult({
            status: 'error',
            message: error.message || 'Não foi possível registrar o check-in. Tente novamente.',
          });
          return;
        }

        let result = data;
        if (typeof result === 'string') {
          try {
            result = JSON.parse(result);
          } catch {
            // mantém resultado se não for JSON string
          }
        }

        if (result && result.success === true) {
          const awarded = typeof result.points_awarded === 'number' ? result.points_awarded : 5;
          setCheckinResult({
            status: 'success',
            message: result.message || `Check-in realizado com sucesso! 🎉\nVocê ganhou ${awarded} pontos locais.`,
            pointsAwarded: awarded,
          });

          // Atualiza imediatamente saldo real e histórico por loja no perfil
          const [points, breakdownRes] = await Promise.all([
            fetchLoyaltyPoints(authUser.id),
            fetchStoreLoyaltyBreakdown(authUser.id),
          ]);
          if (points !== null) setRealPoints(points);
          if (breakdownRes?.data) setStorePointsBreakdown(breakdownRes.data);
        } else {
          setCheckinResult({
            status: 'error',
            message: result?.message || result?.reason || 'Check-in não autorizado pelo estabelecimento.',
          });
        }
      } catch (err: any) {
        console.error('Exceção ao registrar check-in:', err);
        setCheckinResult({
          status: 'error',
          message: err?.message || 'Erro inesperado ao conectar ao servidor de fidelidade.',
        });
      } finally {
        setIsCheckingIn(false);
      }
    }
  };

  if (!authUser) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 sm:p-8 rounded-3xl bg-[#13151f] border border-orange-500/30 text-center space-y-5 shadow-2xl animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mx-auto text-orange-400">
          <User className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-extrabold text-white font-display">
            Sua Conta ZAP LANCHE
          </h2>

          <p className="text-xs text-slate-400 leading-relaxed">
            Faça login com sua conta do Supabase Auth para acessar seu
            perfil pessoal e privilégios na comunidade.
          </p>
        </div>

        <div className="flex flex-col gap-2.5 pt-1">
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-extrabold text-xs transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            Fazer Login ou Criar Conta
          </button>

          <button
            onClick={handleBackToExplore}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-slate-700/80"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Explorar
          </button>
        </div>

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-3 animate-fade-in">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400">
          Carregando dados da sua conta...
        </p>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="max-w-lg mx-auto my-12 p-6 sm:p-8 rounded-3xl bg-[#13151f] border border-rose-500/30 text-center space-y-5 shadow-2xl animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-extrabold text-white font-display">
            Erro ao Carregar Perfil
          </h2>

          <p className="text-xs text-slate-300 leading-relaxed font-mono">
            {profileError}
          </p>
        </div>

        <button
          onClick={() => signOut()}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition-colors"
        >
          Sair da Conta e Tentar Novamente
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-lg mx-auto my-12 p-6 sm:p-8 rounded-3xl bg-[#13151f] border border-rose-500/30 text-center space-y-5 shadow-2xl animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-extrabold text-white font-display">
            Perfil não encontrado
          </h2>

          <p className="text-xs text-slate-300 leading-relaxed">
            Sua conta (
            <strong className="text-white">
              {authUser.email}
            </strong>
            ) está autenticada, mas nenhum registro correspondente foi
            localizado na tabela{' '}
            <code className="text-orange-400 font-mono text-[11px]">
              public.profiles
            </code>
            .
          </p>
        </div>

        <button
          onClick={() => signOut()}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition-colors"
        >
          Sair da Conta
        </button>
      </div>
    );
  }

  const displayName =
    profile.full_name ||
    authUser.email?.split('@')[0] ||
    'Morador';

  const displayUsername = profile.username
    ? profile.username.startsWith('@')
      ? profile.username
      : `@${profile.username}`
    : `@${authUser.email?.split('@')[0] || 'usuario'}`;

  const memberSinceFormatted = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric',
      })
    : 'Recente';

  const userAvatarId =
    (authUser.user_metadata?.avatar_id as string | undefined) ||
    (typeof window !== 'undefined' && authUser.id ? localStorage.getItem(`zap_lanche_avatar_${authUser.id}`) : null) ||
    DEFAULT_AVATAR_ID;

  const currentAvatarData = getAvatarById(userAvatarId);

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-16 animate-fade-in">
      {/* Dados da conta */}
      <div className="rounded-3xl bg-[#13151f] border border-slate-800 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl -mr-10 -mt-10" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar do Usuário com Ação de Troca */}
            <div className="relative group shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 p-0.5 shadow-lg">
                <div className="w-full h-full rounded-2xl bg-slate-900 overflow-hidden flex items-center justify-center">
                  <img
                    src={currentAvatarData.dataUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(true)}
                className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black shadow-md shadow-orange-500/30 transition-transform active:scale-95 flex items-center justify-center"
                title="Escolher avatar da galeria"
              >
                <Pencil className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white font-display">
                  {displayName}
                </h2>

                <span className="text-xs text-orange-400 font-medium font-mono">
                  {displayUsername}
                </span>
              </div>

              <p className="text-xs text-slate-400 font-mono">
                {authUser.email}
              </p>

              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 pt-1">
                <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-semibold border border-orange-500/30">
                  Cargo: {profile.role || 'cliente'}
                </span>

                <button
                  type="button"
                  onClick={() => setIsAvatarModalOpen(true)}
                  className="px-2 py-0.5 rounded-full bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 font-semibold border border-orange-500/30 flex items-center gap-1 transition-colors text-[10px]"
                >
                  <Sparkles className="w-3 h-3 text-orange-400" />
                  Trocar Avatar
                </button>

                <span>·</span>

                <span>
                  Membro desde {memberSinceFormatted}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => signOut()}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700/80 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-all"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            Sair da conta
          </button>
        </div>
      </div>

      {/* Pontos reais */}
      <div className="rounded-3xl bg-bg-surface border border-emerald-500/20 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-400" />
            Meus Pontos Globais da Rede
          </h3>

          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
            Validade: 180 dias
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Pontos globais acumulados por indicações de amigos (15 pontos por amigo após o 1º check-in validado dele). Podem ser utilizados para cobrir até 30% do valor de qualquer resgate na rede.
        </p>

        {loadingRealPoints ? (
          <div className="text-xs text-text-secondary text-center py-6">
            Carregando saldo...
          </div>
        ) : errorRealPoints ? (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 text-center space-y-2">
            <AlertCircle className="w-5 h-5 mx-auto text-rose-400" />
            <p>{errorRealPoints}</p>
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-center">
            <span className="block text-3xl font-extrabold text-emerald-400">
              {realPoints ?? 0}
            </span>

            <span className="block text-emerald-300/60 text-[10px] uppercase font-bold mt-1">
              Pontos Globais Disponíveis na Rede (Cobrem até 30% do Resgate)
            </span>
          </div>
        )}
      </div>

      {/* Saldo de Pontos por Estabelecimento */}
      <div className="rounded-3xl bg-bg-surface border border-slate-800 p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-bold text-text-primary">
              Pontos Locais por Estabelecimento
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleStartCheckin}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md transition-colors"
            >
              <Camera className="w-4 h-4" />
              Escanear QR Code (+5 pts)
            </button>
            <span className="text-[10px] bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/30 font-semibold">
              Regra 70% Local
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Os pontos locais pertencem exclusivamente a cada restaurante onde foram conquistados (check-ins de +5 pontos com intervalo de 2 horas). Para resgatar uma recompensa, você precisa de no mínimo 70% do custo em pontos da loja escolhida. Pontos de uma loja não podem ser usados em outra.
        </p>

        {loadingRealPoints ? (
          <p className="text-xs text-slate-500 text-center py-4">Calculando saldos por loja...</p>
        ) : storePointsBreakdown.length === 0 ? (
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
            <p className="text-xs text-slate-400">
              Você ainda não possui pontos acumulados em estabelecimentos específicos. Faça check-in pelo QR Code no balcão e ganhe 5 pontos!
            </p>
            <button
              type="button"
              onClick={handleStartCheckin}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-extrabold text-xs shadow-md shadow-orange-500/20 transition-all"
            >
              <Camera className="w-4 h-4" />
              Fazer Check-in no Balcão
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80 rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            {storePointsBreakdown.map((item) => (
              <div key={item.restaurant_id} className="p-3.5 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-white">{item.restaurant_name}</p>
                  <p className="text-[10px] text-slate-400">{item.transactions_count} registro(s) de fidelidade</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-orange-400">
                    {item.balance} <span className="text-[10px] font-semibold text-slate-400">pts</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Indicação de Amigos */}
      <div className="rounded-3xl bg-bg-surface border border-purple-500/20 p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-purple-400" />
            <h3 className="text-sm font-bold text-text-primary">
              Indique Amigos e Ganhe 15 Pontos Globais
            </h3>
          </div>
          <span className="text-[10px] bg-purple-500/10 text-purple-300 font-bold px-2 py-0.5 rounded-full border border-purple-500/30">
            Validade: 180 dias
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Compartilhe seu código exclusivo. Quando seu amigo convidado se cadastrar e realizar o <strong>primeiro check-in validado</strong> em qualquer lanchonete participante, você recebe <strong>15 pontos globais</strong> creditados na sua carteira! Os pontos de indicação têm validade de <strong>180 dias</strong> e podem cobrir até 30% do valor dos seus resgates.
        </p>

        {/* Meu Código e Compartilhamento */}
        <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">
            Seu Código Permanente de Indicação
          </span>

          <div className="flex items-center justify-between gap-3 bg-slate-900/90 border border-purple-500/40 rounded-xl px-4 py-2.5">
            <span className="text-base font-mono font-extrabold text-purple-300 tracking-wider">
              {referralCode || 'Carregando...'}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyReferralCode}
                className="px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-purple-500/30"
              >
                {hasCopiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>
        </div>

        {/* Inserir Código de um Amigo */}
        <form onSubmit={handleApplyReferral} className="space-y-2 pt-2 border-t border-slate-800">
          <label className="block text-[11px] font-semibold text-slate-300">
            Foi indicado por alguém? Insira o código do seu amigo:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputReferralCode}
              onChange={(e) => setInputReferralCode(e.target.value.toUpperCase())}
              placeholder="Ex: ZAP-A1B2C3"
              maxLength={15}
              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-xs text-white placeholder-slate-500 uppercase font-mono focus:border-purple-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isApplyingCode || !inputReferralCode.trim()}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold transition-colors"
            >
              {isApplyingCode ? 'Validando...' : 'Vincular'}
            </button>
          </div>

          {referralFeedback && (
            <p className={`text-[11px] ${referralFeedback.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
              {referralFeedback.message}
            </p>
          )}
        </form>

        {/* Lista de amigos indicados */}
        {referralsList.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-[11px] font-bold text-slate-300">
              Suas Indicações ({referralsList.length}):
            </span>
            <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
              {referralsList.map((ref) => (
                <div key={ref.id} className="p-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-slate-300 font-medium">
                      {ref.referred_name || 'Amigo convidado'}
                    </span>
                  </div>
                  <div>
                    {ref.status === 'completed' ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold border border-emerald-500/30">
                        +15 pts Creditados
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-semibold border border-amber-500/30">
                        Aguardando 1º check-in
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Aparência */}
      <div className="rounded-3xl bg-bg-surface border border-border-muted p-6 shadow-xl space-y-4">
        <ThemeSelector />
      </div>

      {/* Guia de Orientação por Perfil */}
      {profile.role === 'comerciante' ? (
        <GuideSection
          title="Guia do Comerciante ZAP LANCHE"
          steps={[
            "Disponibilize o QR Code no balcão: cada check-in concede 5 pontos locais (intervalo mínimo de 2 horas por cliente).",
            "Os pontos locais pertencem à sua loja; pontos globais de indicação são geridos e garantidos pela rede.",
            "Recompensas exigem no mínimo 70% em pontos da sua loja e até 30% globais (outras lojas nunca participam).",
            "Validação obrigatória: confira e dê baixa no código do voucher no seu painel antes de entregar a cortesia."
          ]}
        />
      ) : (
        <GuideSection
          title="Como Funciona a Fidelidade ZAP LANCHE"
          steps={[
            "Faça check-in via QR Code no balcão e ganhe 5 pontos (novo check-in a cada 2 horas no mesmo restaurante).",
            "Indique amigos com seu código: ganhe 15 pontos globais (validade de 180 dias) no 1º check-in validado deles.",
            "Pontos locais pertencem exclusivamente à lanchonete onde foram conquistados e não transferem entre lojas.",
            "Resgate prêmios com a Regra 70/30: no mínimo 70% em pontos da loja e até 30% em pontos globais da rede."
          ]}
        />
      )}

      {/* Modal da Galeria de Avatares */}
      <AvatarGalleryModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        currentAvatarId={userAvatarId}
        onSaveAvatar={updateUserAvatar}
      />

      {/* Leitor de QR Code para Check-in */}
      <QrCodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanQr}
        isProcessing={isCheckingIn}
      />

      {/* Modal de Feedback do Check-in */}
      {checkinResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-[#13151f] border border-orange-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="text-center space-y-3">
              {checkinResult.status === 'success' && (
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
              )}
              {checkinResult.status === 'warning' && (
                <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                  <Info className="w-10 h-10" />
                </div>
              )}
              {checkinResult.status === 'error' && (
                <div className="w-16 h-16 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
                  <AlertCircle className="w-10 h-10" />
                </div>
              )}

              <h3 className="text-lg font-bold text-white font-display">
                {checkinResult.status === 'success'
                  ? 'Check-in Confirmado!'
                  : checkinResult.status === 'warning'
                  ? 'Atenção'
                  : 'Check-in Não Realizado'}
              </h3>

              {checkinResult.pointsAwarded && (
                <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold text-xs border border-emerald-500/30">
                  +{checkinResult.pointsAwarded} pontos adicionados à sua carteira
                </div>
              )}

              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {checkinResult.message}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              {checkinResult.status === 'error' && (
                <button
                  onClick={() => {
                    setCheckinResult(null);
                    handleStartCheckin();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Tentar Novamente
                </button>
              )}
              <button
                onClick={() => setCheckinResult(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white font-semibold text-xs transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
