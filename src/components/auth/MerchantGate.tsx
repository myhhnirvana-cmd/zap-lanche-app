import React, { useState } from 'react';
import { Store, ShieldAlert, LogIn, Lock, AlertTriangle, ArrowLeft, RefreshCw, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { AuthModal } from './AuthModal';

interface MerchantGateProps {
  children: React.ReactNode;
  onBackToExplore?: () => void;
}

export const MerchantGate: React.FC<MerchantGateProps> = ({ children, onBackToExplore }) => {
  const {
    user,
    loading,
    isAdmin,
    isMerchant,
    profile,
    merchantRestaurant,
    merchantStoreLoading,
    refreshMerchantStore,
    signOut,
  } = useAuth();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modo offline/demonstrativo: se o Supabase não estiver configurado, preserva o acesso simulado
  if (!isSupabaseConfigured) {
    return <>{children}</>;
  }

  // 1. Carregamento inicial de autenticação ou da loja vinculada
  if (loading || merchantStoreLoading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400">Verificando credenciais de lojista e titularidade da loja...</p>
      </div>
    );
  }

  // 2. Visitante NÃO autenticado
  if (!user) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 sm:p-8 rounded-3xl bg-[#13151f] border border-amber-500/30 text-center space-y-5 shadow-2xl animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
          <Store className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-extrabold text-white font-display">
            Área do Lojista Protegida
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Esta área é restrita aos comerciantes parceiros credenciados do ZAP LANCHE. É necessário fazer login com a conta associada à sua lanchonete para gerenciar cardápio, pedidos e fidelidade.
          </p>
        </div>

        <div className="flex flex-col gap-2.5 pt-1">
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-extrabold text-xs transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Fazer Login ou Criar Conta</span>
          </button>

          {onBackToExplore && (
            <button
              onClick={onBackToExplore}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-slate-700/80"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar para Explorar</span>
            </button>
          )}
        </div>

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          customTitle="Acesso do Comerciante"
          customSubtitle="Entre com a conta vinculada à sua lanchonete no Supabase."
        />
      </div>
    );
  }

  // 3. Usuário autenticado, mas SEM perfil de comerciante nem de admin (ex: conta com role 'cliente')
  if (!isMerchant && !isAdmin) {
    return (
      <div className="max-w-lg mx-auto my-12 p-6 sm:p-8 rounded-3xl bg-[#13151f] border border-amber-500/30 text-center space-y-5 shadow-2xl animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-extrabold text-white font-display">
            Acesso Restrito ao Comerciante
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Você está conectado como <strong className="text-white">{user.email}</strong>, mas esta conta possui perfil de morador/cliente (<code className="text-amber-400 font-mono text-[11px]">role = '{profile?.role || 'cliente'}'</code>).
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300 text-left space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>Como gerenciar uma lanchonete no bairro?</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Para assumir a gestão de uma lanchonete oficial, acesse o link exclusivo de convite enviado pela moderação do ZAP LANCHE ou contate a administração pelo painel.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          {onBackToExplore && (
            <button
              onClick={onBackToExplore}
              className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar para Explorar</span>
            </button>
          )}
          <button
            onClick={() => signOut()}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border border-slate-700/80"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair da Conta</span>
          </button>
        </div>
      </div>
    );
  }

  // 4. Usuário é comerciante, mas nenhuma loja foi encontrada com seu owner_profile_id (e não é admin)
  if (isMerchant && !merchantRestaurant && !isAdmin) {
    const handleRetry = async () => {
      setIsRefreshing(true);
      await refreshMerchantStore();
      setIsRefreshing(false);
    };

    return (
      <div className="max-w-lg mx-auto my-12 p-6 sm:p-8 rounded-3xl bg-[#13151f] border border-amber-500/30 text-center space-y-5 shadow-2xl animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-extrabold text-white font-display">
            Nenhuma Lanchonete Vinculada
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Sua conta possui o cargo de comerciante (<code className="text-amber-400 font-mono text-[11px]">{user.email}</code>), mas não encontramos nenhum estabelecimento ativo associado ao seu perfil na tabela <code className="text-slate-300 font-mono text-[11px]">public.restaurants</code>.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400 text-left space-y-1.5">
          <p className="text-slate-300 font-semibold">O que fazer?</p>
          <p className="text-[11px] leading-relaxed">
            Se você recebeu um convite recente, abra diretamente o link do convite fornecido pelo administrador para confirmar a vinculação do seu estabelecimento comercial.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <button
            onClick={handleRetry}
            disabled={isRefreshing}
            className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-black text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Verificando...' : 'Verificar Vínculo Novamente'}</span>
          </button>
          {onBackToExplore && (
            <button
              onClick={onBackToExplore}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border border-slate-700/80"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Explorar</span>
            </button>
          )}
          <button
            onClick={() => signOut()}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-rose-300 hover:text-rose-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border border-slate-700/80"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>
      </div>
    );
  }

  // 5. Usuário autorizado: comerciante com loja vinculada OU administrador
  return <>{children}</>;
};
