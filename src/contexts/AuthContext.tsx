import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, fetchMerchantRestaurant } from '../lib/supabase';
import { Restaurant } from '../types';
import { getAvatarById } from '../data/avatars';

export interface UserProfileRecord {
  id: string;
  full_name: string | null;
  username: string | null;
  role: string | null;
  created_at: string | null;
}

export interface AdminDiagnostic {
  isSessionActive: boolean;
  error: string | null;
  recordFound: boolean;
  roleValue: string | null;
  isAdminResult: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfileRecord | null;
  profileLoading: boolean;
  profileError: string | null;
  loading: boolean;
  isAdmin: boolean;
  isMerchant: boolean;
  merchantRestaurant: Restaurant | null;
  merchantStoreLoading: boolean;
  refreshMerchantStore: () => Promise<void>;
  adminDiagnostic: AdminDiagnostic | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: string | null; message?: string }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  updateOwnerProfile: (fullName: string) => Promise<{ error: string | null }>;
  updateUserAvatar: (avatarId: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfileRecord | null>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isMerchant, setIsMerchant] = useState<boolean>(false);
  const [merchantRestaurant, setMerchantRestaurant] = useState<Restaurant | null>(null);
  const [merchantStoreLoading, setMerchantStoreLoading] = useState<boolean>(false);
  const [adminDiagnostic, setAdminDiagnostic] = useState<AdminDiagnostic | null>(null);
  const [loading, setLoading] = useState(true);

  // Busca segura da loja vinculada ao comerciante via restaurants.owner_profile_id
  const fetchMerchantStore = async (userId: string) => {
    if (!isSupabaseConfigured || !supabase || !userId) {
      setMerchantRestaurant(null);
      return;
    }
    setMerchantStoreLoading(true);
    try {
      const store = await fetchMerchantRestaurant(userId);
      setMerchantRestaurant(store);
    } catch (err) {
      console.warn('Erro ao carregar loja do comerciante:', err);
      setMerchantRestaurant(null);
    } finally {
      setMerchantStoreLoading(false);
    }
  };

  const refreshMerchantStore = async () => {
    if (user?.id) {
      await fetchMerchantStore(user.id);
    }
  };

  // Busca segura do perfil em public.profiles e verificação de admin por ID (auth.uid())
  const fetchUserProfile = async (currentUser: User | null) => {
    if (!currentUser || !isSupabaseConfigured || !supabase) {
      setProfile(null);
      setIsAdmin(false);
      setIsMerchant(false);
      setMerchantRestaurant(null);
      setProfileError(null);
      setProfileLoading(false);
      setAdminDiagnostic({ isSessionActive: !!currentUser, error: 'Sem credenciais Supabase', recordFound: false, roleValue: null, isAdminResult: false });
      return;
    }

    setProfileLoading(true);
    setProfileError(null);
    const diagnostic: AdminDiagnostic = { isSessionActive: !!currentUser, error: null, recordFound: false, roleValue: null, isAdminResult: false };

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, role, created_at')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (error) {
        setProfileError('Erro ao consultar perfil: ' + error.message);
        setProfile(null);
        setIsAdmin(false);
        setIsMerchant(false);
        setMerchantRestaurant(null);
        diagnostic.error = error.message;
      } else if (!data) {
        setProfile(null);
        setProfileError(null);
        setIsAdmin(false);
        setIsMerchant(false);
        setMerchantRestaurant(null);
      } else {
        const rec = data as UserProfileRecord;
        setProfile(rec);
        setIsAdmin(rec.role === 'admin');
        const merchantRole = rec.role === 'comerciante';
        setIsMerchant(merchantRole);
        if (merchantRole) {
          await fetchMerchantStore(currentUser.id);
        } else {
          setMerchantRestaurant(null);
        }
        diagnostic.recordFound = true;
        diagnostic.roleValue = rec.role;
        diagnostic.isAdminResult = rec.role === 'admin';

        // Aplicação automática de código de indicação pendente
        const pendingCode = localStorage.getItem('pending_referral_code');
        if (pendingCode) {
          import('../lib/supabase').then(({ applyReferralCode }) => {
            applyReferralCode(pendingCode).then((res) => {
              if (res.success) {
                localStorage.removeItem('pending_referral_code');
                console.log('Convite vinculado com sucesso!');
              } else if (res.message.includes('autoindicação') || res.message.includes('inválido') || res.message.includes('perfil')) {
                localStorage.removeItem('pending_referral_code');
              }
            });
          }).catch(console.error);
        }
      }
    } catch (err: any) {
      console.warn('Erro ao consultar public.profiles:', err);
      setProfileError('Erro inesperado ao carregar perfil.');
      setProfile(null);
      setIsAdmin(false);
      setIsMerchant(false);
      setMerchantRestaurant(null);
      diagnostic.error = err.message || 'Erro inesperado';
    } finally {
      setAdminDiagnostic(diagnostic);
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      if (!isSupabaseConfigured || !supabase) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) console.warn('Erro ao recuperar sessão:', error.message);

        const currentUser = initialSession?.user ?? null;
        if (currentUser) await fetchUserProfile(currentUser);
        else { setProfile(null); setIsAdmin(false); }

        if (isMounted) {
          setSession(initialSession);
          setUser(currentUser);
          setLoading(false);
        }
      } catch (err) {
        console.warn('Exceção auth:', err);
        if (isMounted) setLoading(false);
      }
    }

    initAuth();

    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
        const currentUser = currentSession?.user ?? null;
        if (currentUser) {
          await fetchUserProfile(currentUser);
        } else {
          setProfile(null);
          setProfileError(null);
          setIsAdmin(false);
          setIsMerchant(false);
          setMerchantRestaurant(null);
          setAdminDiagnostic(null);
        }

        if (isMounted) {
          setSession(currentSession);
          setUser(currentUser);
          setLoading(false);
        }
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    }
    return () => { isMounted = false; };
  }, []);

  const translateAuthError = (err: AuthError | Error): string => {
    const msg = err.message.toLowerCase();
    if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) return 'E-mail ou senha incorretos.';
    if (msg.includes('user already registered') || msg.includes('already exists')) return 'Este e-mail já está cadastrado. Tente entrar.';
    if (msg.includes('password should be at least')) return 'A senha deve ter pelo menos 6 caracteres.';
    if (msg.includes('email not confirmed')) return 'E-mail ainda não confirmado. Verifique sua caixa de entrada.';
    if (msg.includes('network error') || msg.includes('fetch')) return 'Falha de conexão com o servidor. Verifique sua internet.';
    return err.message || 'Ocorreu um erro na autenticação.';
  };

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    if (!isSupabaseConfigured || !supabase) return { error: 'Serviço de autenticação não configurado no ambiente.' };
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) return { error: translateAuthError(error) };
      if (data.user) await fetchUserProfile(data.user);
      setSession(data.session);
      setUser(data.user);
      return { error: null };
    } catch (err: any) { return { error: translateAuthError(err) }; }
  };

  const signUp = async (email: string, password: string, name?: string): Promise<{ error: string | null; message?: string }> => {
    if (!isSupabaseConfigured || !supabase) return { error: 'Serviço de autenticação não configurado no ambiente.' };
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name?.trim() || '', name: name?.trim() || '', role: 'cliente' } },
      });
      if (error) return { error: translateAuthError(error) };
      if (data.user && !data.session) return { error: null, message: 'Cadastro realizado! Verifique seu e-mail para ativar a conta.' };
      if (data.user) await fetchUserProfile(data.user);
      setSession(data.session);
      setUser(data.user);
      return { error: null };
    } catch (err: any) { return { error: translateAuthError(err) }; }
  };

  const signOut = async (): Promise<void> => {
    if (!isSupabaseConfigured || !supabase) {
      setUser(null);
      setSession(null);
      setProfile(null);
      setProfileError(null);
      setIsAdmin(false);
      setIsMerchant(false);
      setMerchantRestaurant(null);
      setMerchantStoreLoading(false);
      setAdminDiagnostic(null);
      return;
    }
    try { await supabase.auth.signOut(); } catch (err) { console.warn('Erro ao encerrar sessão:', err); }
    finally {
      setUser(null);
      setSession(null);
      setProfile(null);
      setProfileError(null);
      setIsAdmin(false);
      setIsMerchant(false);
      setMerchantRestaurant(null);
      setMerchantStoreLoading(false);
      setAdminDiagnostic(null);
    }
  };

  const refreshSession = async (): Promise<void> => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
      if (refreshedSession && refreshedSession.user) {
        await fetchUserProfile(refreshedSession.user);
        setSession(refreshedSession);
        setUser(refreshedSession.user);
      }
    } catch (e) {
      console.warn('Erro ao atualizar sessão:', e);
    }
  };

  const updateOwnerProfile = async (fullName: string): Promise<{ error: string | null }> => {
    const trimmed = fullName.trim();
    if (!user?.id || !isSupabaseConfigured || !supabase) {
      return { error: 'Usuário não autenticado ou serviço Supabase indisponível.' };
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ full_name: trimmed })
        .eq('id', user.id)
        .select('id, full_name, username, role, created_at')
        .maybeSingle();

      if (error) {
        console.error('Erro ao atualizar perfil no Supabase:', error.message);
        return { error: error.message };
      }

      try {
        await supabase.auth.updateUser({
          data: { full_name: trimmed, name: trimmed },
        });
      } catch (authErr) {
        console.warn('Erro ao atualizar metadata do usuário:', authErr);
      }

      if (data) {
        setProfile(data as UserProfileRecord);
      } else {
        setProfile((prev) => (prev ? { ...prev, full_name: trimmed } : null));
      }

      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Erro inesperado ao atualizar perfil.' };
    }
  };

  const updateUserAvatar = async (avatarId: string): Promise<{ error: string | null }> => {
    if (!user?.id || !isSupabaseConfigured || !supabase) {
      return { error: 'Usuário não autenticado ou serviço indisponível.' };
    }

    const selected = getAvatarById(avatarId);
    try {
      // 1. Atualiza nos metadados do Supabase Auth (auth.users.raw_user_meta_data)
      const { data: updatedAuth, error: authErr } = await supabase.auth.updateUser({
        data: {
          avatar_id: selected.id,
          avatar_url: selected.dataUrl,
          picture: selected.dataUrl,
        },
      });

      if (authErr) {
        console.warn('Erro ao atualizar avatar nos metadados do usuário:', authErr.message);
        return { error: authErr.message };
      }

      if (updatedAuth?.user) {
        setUser(updatedAuth.user);
      }

      // 2. Cache local resiliente por usuário
      try {
        localStorage.setItem(`zap_lanche_avatar_${user.id}`, selected.id);
        localStorage.setItem(`zap_lanche_avatar_url_${user.id}`, selected.dataUrl);
      } catch {
        // Silencioso
      }

      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Erro inesperado ao salvar avatar.' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        profileLoading,
        profileError,
        loading,
        isAdmin,
        isMerchant,
        merchantRestaurant,
        merchantStoreLoading,
        refreshMerchantStore,
        adminDiagnostic,
        signIn,
        signUp,
        signOut,
        refreshSession,
        updateOwnerProfile,
        updateUserAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  return context;
};
