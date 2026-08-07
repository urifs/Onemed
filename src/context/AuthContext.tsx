import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { describeAuthError } from '@/lib/utils';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  // true para admin E para visualizador — é o que abre o painel (/admin/*).
  isAdmin: boolean;
  // true só para a conta VISUALIZADORA: painel em modo leitura (a escrita é
  // barrada no banco; edição de verdade só na Loja e na Área de Membros).
  isViewer: boolean;
  kickedOut: boolean;
  dismissKickedOut: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isViewer, setIsViewer] = useState(false);
  const [kickedOut, setKickedOut] = useState(false);
  const initialized = useRef(false);
  const hadSession = useRef(false);
  const manualSignOut = useRef(false);
  const lastUserId = useRef<string | null>(null);

  // admin OU visualizador entram no painel; o papel exato decide o aviso de
  // modo leitura (e o banco decide o que cada um pode escrever).
  const checkAdmin = async (userId: string): Promise<{ admin: boolean; viewer: boolean }> => {
    try {
      const { data: admin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
      if (admin) return { admin: true, viewer: false };
      const { data: viewer } = await supabase.rpc('has_role', { _user_id: userId, _role: 'viewer' as never });
      return { admin: !!viewer, viewer: !!viewer };
    } catch {
      return { admin: false, viewer: false };
    }
  };

  useEffect(() => {
    // Safety timeout — never stay loading more than 5s
    const timeout = setTimeout(() => setLoading(false), 5000);

    // Initial session load — wrapped so a thrown/rejected getSession() (seen
    // on some locked-down Safari setups, e.g. iPads with Private Browsing or
    // cookies blocked) can't skip past the failsafe above and leave the app
    // stuck on the loading spinner forever.
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        hadSession.current = !!session?.user;
        if (session?.user) {
          lastUserId.current = session.user.id;
          const papel = await checkAdmin(session.user.id);
          setIsAdmin(papel.admin);
          setIsViewer(papel.viewer);
        }
      } catch (err) {
        console.error('getSession failed', err);
      } finally {
        initialized.current = true;
        setLoading(false);
        clearTimeout(timeout);
      }
    })();

    // Listen for subsequent auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Skip the initial INITIAL_SESSION event — already handled by getSession
        if (!initialized.current) return;

        // A logged-in session that suddenly goes null without the user
        // clicking "Sair" only happens when the refresh token stops working —
        // in this app that's the 2-device limit kicking an older session out
        // when a 3rd device logs in. Surface that instead of silently
        // bouncing them to /login with no explanation.
        if (event === 'SIGNED_OUT' && hadSession.current && !manualSignOut.current) {
          setKickedOut(true);
        }
        manualSignOut.current = false;
        const prevUserId = hadSession.current ? lastUserId.current : null;
        hadSession.current = !!session?.user;

        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // NÃO await supabase dentro do callback do onAuthStateChange: o
          // supabase-js segura um lock interno enquanto o callback roda, e
          // chamar rpc/getUser aqui pode travar o cliente (deadlock em token
          // refresh / evento entre abas). Defere pra fora do callback. E só
          // recomputa o papel quando a identidade muda — não a cada
          // TOKEN_REFRESHED (de hora em hora) do mesmo usuário.
          const uid = session.user.id;
          if (uid !== prevUserId) {
            lastUserId.current = uid;
            setTimeout(() => {
              checkAdmin(uid).then(p => { setIsAdmin(p.admin); setIsViewer(p.viewer); });
            }, 0);
          }
        } else {
          lastUserId.current = null;
          setIsAdmin(false);
          setIsViewer(false);
        }
      }
    );

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err) {
      throw describeAuthError(err);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } }
      });
      if (error) throw error;
    } catch (err) {
      throw describeAuthError(err);
    }
  };

  const logout = async () => {
    manualSignOut.current = true;
    await supabase.auth.signOut();
  };

  const dismissKickedOut = () => setKickedOut(false);

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, isViewer, kickedOut, dismissKickedOut, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
