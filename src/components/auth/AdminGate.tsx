import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, LogIn, Lock, HelpCircle, Bug, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthModal } from './AuthModal';

interface AdminGateProps {
  children: React.ReactNode;
  onOpenGitHubGuide?: () => void;
}

export const AdminGate: React.FC<AdminGateProps> = ({ children }) => {
  const { user, loading, isAdmin, signOut, refreshSession, adminDiagnostic } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showConfigHelp, setShowConfigHelp] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshSession();
    setIsRefreshing(false);
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400">Verificando credenciais e autorização...</p>
      </div>
    );
  }

  // 1. Visitante NÃO autenticado
  if (!user) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 sm:p-8 rounded-3xl bg-[#13151f] border border-orange-500/30 text-center space-y-5 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mx-auto text-orange-400">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-extrabold text-white font-display">
            Painel Administrativo Protegido
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Esta área é restrita aos moderadores e administradores do ZAP LANCHE. É necessário fazer login com uma conta administrativa para prosseguir.
          </p>
        </div>

        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-extrabold text-xs transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-2"
        >
          <LogIn className="w-4 h-4" />
          Fazer Login ou Criar Conta
        </button>

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          customTitle="Acesso Administrativo"
          customSubtitle="Entre com sua conta autorizada no Supabase Auth."
        />
      </div>
    );
  }

  // 2. Usuário autenticado, mas SEM privilégio de administrador
  if (!isAdmin) {
    return (
      <div className="max-w-lg mx-auto my-12 p-6 sm:p-8 rounded-3xl bg-[#13151f] border border-rose-500/30 text-center space-y-5 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-extrabold text-white font-display">
            Acesso Administrativo Restrito
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Você está conectado como <strong className="text-white">{user.email}</strong>, mas esta conta não possui o papel administrativo confirmado (<code className="text-amber-400 font-mono text-[11px]">public.profiles.role = 'admin'</code>).
          </p>
        </div>

        {/* Diagnostic Section */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-left text-xs text-slate-400 space-y-2.5">
          <button
            onClick={() => setShowDiagnostic(!showDiagnostic)}
            className="flex items-center justify-between w-full text-orange-400 font-semibold"
          >
            <div className="flex items-center gap-2">
              <Bug className="w-4 h-4" />
              Diagnóstico de Autorização
            </div>
            {showDiagnostic ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {showDiagnostic && adminDiagnostic && (
            <pre className="mt-2 p-3 rounded-lg bg-black text-amber-300 font-mono text-[10px] overflow-x-auto border border-slate-800">
              {JSON.stringify(adminDiagnostic, null, 2)}
            </pre>
          )}

          <div className="flex items-center gap-2 text-amber-400 font-bold mt-2">
            <ShieldCheck className="w-4 h-4" />
            Verificação de Perfil:
          </div>
          <p className="text-[11px] leading-relaxed">
            O acesso administrativo exige um registro correspondente na tabela <code className="text-slate-300">public.profiles</code> com <code className="text-amber-400">role = 'admin'</code> para o ID do usuário autenticado.
          </p>
          <button
            type="button"
            onClick={() => setShowConfigHelp(!showConfigHelp)}
            className="text-[11px] text-orange-400 hover:text-orange-300 font-semibold underline flex items-center gap-1 mt-1"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            {showConfigHelp ? 'Ocultar instrução' : 'Como verificar ou atualizar o cargo no Supabase?'}
          </button>

          {showConfigHelp && (
            <div className="mt-2 p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-[11px] text-slate-300 font-sans">
              <p>No painel do <strong>Supabase</strong> (SQL Editor), verifique ou atualize sua tabela:</p>
              <pre className="p-2.5 rounded-lg bg-black text-amber-300 font-mono text-[10px] overflow-x-auto leading-relaxed border border-slate-800">
{`UPDATE public.profiles
SET role = 'admin'
WHERE id = '${user.id}';`}
              </pre>
              <p className="text-slate-400 text-[10px]">
                Após atualizar o perfil, clique no botão <em>"Verificar Permissão Novamente"</em> abaixo.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-black text-xs font-bold transition-colors disabled:opacity-50"
          >
            {isRefreshing ? 'Verificando...' : 'Verificar Permissão Novamente'}
          </button>
          <button
            onClick={() => signOut()}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition-colors"
          >
            Sair da Conta
          </button>
        </div>
      </div>
    );
  }

  // 3. Usuário autenticado E confirmado como Administrador
  return <>{children}</>;
};
