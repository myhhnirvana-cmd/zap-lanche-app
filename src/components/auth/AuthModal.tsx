import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, Lock, User as UserIcon, LogIn, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  customTitle?: string;
  customSubtitle?: string;
  /** Constrains the header login dialog to the visible viewport. */
  fitViewport?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  customTitle,
  customSubtitle,
  fitViewport = false,
}) => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Por favor, preencha o e-mail e a senha.');
      return;
    }

    if (mode === 'signup' && password.length < 6) {
      setErrorMessage('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          setErrorMessage(error);
        } else {
          onClose();
        }
      } else {
        const { error, message } = await signUp(email, password, name);
        if (error) {
          setErrorMessage(error);
        } else {
          if (message) {
            setSuccessMessage(message);
          } else {
            setSuccessMessage('Conta criada com sucesso! Você já está autenticado.');
            setTimeout(() => {
              onClose();
            }, 1500);
          }
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (newMode: 'login' | 'signup') => {
    setMode(newMode);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const modal = (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto p-4 bg-black/80 backdrop-blur-sm animate-fade-in ${fitViewport ? 'overscroll-contain' : ''}`}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md bg-[#13151f] border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl relative ${fitViewport ? 'my-auto max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão Fechar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-800/80 hover:bg-slate-750 text-slate-400 hover:text-white transition-colors border border-slate-700/60"
          title="Fechar formulário"
          aria-label="Fechar formulário"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Cabeçalho */}
        <div className="text-left space-y-1 pr-8">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-lg text-orange-400 font-display">
              {customTitle || (mode === 'login' ? 'Entrar no ZAP LANCHE' : 'Criar Nova Conta')}
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {customSubtitle ||
              (mode === 'login'
                ? 'Acesse com seu e-mail e senha para gerenciar sua conta e acessos.'
                : 'Cadastre-se para participar da comunidade gastronômica do bairro.')}
          </p>
        </div>

        {/* Abas Alternadoras com alta visibilidade */}
        <div className="flex rounded-2xl bg-slate-900/90 p-1.5 border border-slate-700/80 text-xs font-semibold shadow-inner">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              mode === 'login'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-black font-extrabold shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Entrar</span>
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              mode === 'signup'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-black font-extrabold shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Criar Conta</span>
          </button>
        </div>

        {/* Alertas */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Seu Nome Completo
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Ex: Maria Ferreira"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              E-mail
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                placeholder="seuemail@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Senha
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
          </div>

          {/* Botões de Ação com Cancelar Visível */}
          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white font-semibold text-xs transition-colors border border-slate-700/80 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-extrabold text-xs transition-all shadow-md shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Processando...</span>
              ) : mode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  Entrar
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Cadastrar Conta
                </>
              )}
            </button>
          </div>
        </form>

        {/* Texto de Alternância no Rodapé */}
        <div className="text-center pt-1 text-xs text-slate-400">
          {mode === 'login' ? (
            <span>
              Não tem uma conta?{' '}
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="text-orange-400 hover:text-orange-300 font-bold underline underline-offset-2 transition-colors ml-0.5"
              >
                Criar conta
              </button>
            </span>
          ) : (
            <span>
              Já tem uma conta?{' '}
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-orange-400 hover:text-orange-300 font-bold underline underline-offset-2 transition-colors ml-0.5"
              >
                Entrar
              </button>
            </span>
          )}
        </div>

        {/* Rodapé informativo */}
        <div className="text-center pt-2 border-t border-slate-800 text-[11px] text-slate-500">
          Autenticação direta e segura via Supabase Auth.
        </div>
      </div>
    </div>
  );

  // O login do cabeçalho é montado fora do sticky header para escapar
  // do stacking context criado por backdrop-filter.
  return fitViewport ? createPortal(modal, document.body) : modal;
};
