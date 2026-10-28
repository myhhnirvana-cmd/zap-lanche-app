import React, { useState, useEffect } from 'react';
import {
  User,
  Award,
  AlertCircle,
  LogIn,
  LogOut,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from '../components/auth/AuthModal';
import { fetchLoyaltyPoints, lastLoyaltyError } from '../lib/supabase';
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
  onSelectRestaurantById: _onSelectRestaurantById,
  onOpenGitHubGuide: _onOpenGitHubGuide,
  onBackToExplore,
}) => {
  const {
    user: authUser,
    profile,
    profileLoading,
    profileError,
    signOut,
  } = useAuth();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [realPoints, setRealPoints] = useState<number | null>(null);
  const [loadingRealPoints, setLoadingRealPoints] = useState(true);
  const [errorRealPoints, setErrorRealPoints] = useState<string | null>(null);

  const handleBackToExplore = () => {
    if (onBackToExplore) {
      onBackToExplore();
      return;
    }

    // Utiliza o mecanismo de navegação existente no Header e BottomNav
    // sem recarregar a página.
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

      const points = await fetchLoyaltyPoints(authUser.id);

      if (!isMounted) {
        return;
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
          setErrorRealPoints(
            'Não foi possível carregar o saldo real.'
          );
        }
      } else {
        // Zero é um saldo real válido e deve ser exibido normalmente.
        setRealPoints(points);
        setErrorRealPoints(null);
      }

      setLoadingRealPoints(false);
    }

    loadPoints();

    return () => {
      isMounted = false;
    };
  }, [authUser]);

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

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-16 animate-fade-in">
      {/* Dados da conta */}
      <div className="rounded-3xl bg-[#13151f] border border-slate-800 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl -mr-10 -mt-10" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 p-0.5 shadow-lg">
              <div className="w-full h-full rounded-2xl bg-slate-900 overflow-hidden flex items-center justify-center">
                <span className="font-extrabold text-2xl text-orange-400 font-display">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
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

              <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-semibold border border-orange-500/30">
                  Cargo: {profile.role || 'cliente'}
                </span>

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
            Meus Pontos
          </h3>

          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
            Saldo real
          </span>
        </div>

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
              Pontos Disponíveis
            </span>
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
          title="Como gerenciar no ZAP LANCHE"
          steps={[
            "Gerencie seu estabelecimento pelo painel do comerciante.",
            "Atualize cardápio, produtos e promoções pelas funções disponíveis.",
            "Acompanhe sua presença e informações no ZAP LANCHE.",
            "Use o aplicativo para manter seu comércio atualizado para os clientes."
          ]}
        />
      ) : (
        <GuideSection
          title="Como aproveitar o ZAP LANCHE"
          steps={[
            "Explore os bairros e encontre seus lanches favoritos.",
            "Acumule pontos reais fazendo check-in e consumindo.",
            "Troque seus pontos por recompensas exclusivas na loja.",
            "Apoie os negócios da sua vizinhança."
          ]}
        />
      )}
    </div>
  );
};
