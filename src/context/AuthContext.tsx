import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showDiagnosticBanner } from '@/lib/diagnosticBanner';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
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
  const [kickedOut, setKickedOut] = useState(false);
  const initialized = useRef(false);
  const hadSession = useRef(false);
  const manualSignOut = useRef(false);

  const checkAdmin = async (userId: string): Promise<boolean> => {
    try {
      const { data } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
      return !!data;
    } catch {
      return false;
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
          const admin = await checkAdmin(session.user.id);
          setIsAdmin(admin);
        }
      } catch (err: any) {
        console.error('getSession failed', err);
        showDiagnosticBanner(`Falha ao iniciar sessão: ${err?.message || err}`);
      } finally {
        initialized.current = true;
        setLoading(false);
        clearTimeout(timeout);
        showDiagnosticBanner('Auth resolvido');
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
        hadSession.current = !!session?.user;

        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          const admin = await checkAdmin(session.user.id);
          setIsAdmin(admin);
        } else {
          setIsAdmin(false);
        }
      }
    );

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const register = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }
    });
    if (error) throw error;
  };

  const logout = async () => {
    manualSignOut.current = true;
    await supabase.auth.signOut();
  };

  const dismissKickedOut = () => setKickedOut(false);

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, kickedOut, dismissKickedOut, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
