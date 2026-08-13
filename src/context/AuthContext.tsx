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
  // true enquanto o papel do usuário AINDA está sendo consultado. Quem decide
  // se a rota abre precisa esperar isso: `isAdmin` começa false, e tratar
  // "ainda não sei" como "não é admin" devolve a pessoa pro login logo depois
  // de ela acertar a senha.
  checkingRole: boolean;
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
  const [checkingRole, setCheckingRole] = useState(false);
  const [kickedOut, setKickedOut] = useState(false);
  const initialized = useRef(false);
  const hadSession = useRef(false);
  const manualSignOut = useRef(false);
  const lastUserId = useRef<string | null>(null);

  // admin OU visualizador entram no painel; o papel exato decide o aviso de
  // modo leitura (e o banco decide o que cada um pode escrever).
  // Uma falha de REDE aqui (VPN, bloqueador, extensão de privacidade, oscilação
  // da operadora) fazia o painel concluir "não é admin" e devolver a pessoa
  // pro login — sem diferença nenhuma entre "não tem o papel" e "não deu pra
  // perguntar". Três tentativas antes de desistir: quem tem o papel entra
  // mesmo com um tropeço de rede no meio, e quem não tem continua fora (a
  // resposta que vale é a do banco, não a ausência de resposta).
  const perguntarPapel = async (userId: string, papel: string): Promise<{ respondeu: boolean; tem: boolean }> => {
    let ultimoErro: unknown = null;
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      try {
        const { data, error } = await supabase.rpc('has_role', { _user_id: userId, _role: papel as never });
        if (!error) return { respondeu: true, tem: !!data };
        ultimoErro = error;
      } catch (err) {
        ultimoErro = err;
      }
      if (tentativa < 2) await new Promise(r => setTimeout(r, 400 * (tentativa + 1)));
    }
    console.error('has_role não respondeu', ultimoErro);
    return { respondeu: false, tem: false };
  };

  const checkAdmin = async (userId: string): Promise<{ admin: boolean; viewer: boolean }> => {
    const admin = await perguntarPapel(userId, 'admin');
    if (admin.tem) return { admin: true, viewer: false };
    // Sem resposta na checagem de admin, a de viewer cairia no mesmo buraco —
    // não adianta gastar mais três tentativas.
    if (!admin.respondeu) return { admin: false, viewer: false };
    const viewer = await perguntarPapel(userId, 'viewer');
    return { admin: viewer.tem, viewer: viewer.tem };
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
        let { data: { session } } = await supabase.auth.getSession();

        // getSession() só lê o que está guardado no navegador — não pergunta
        // nada ao servidor. Com a sessão já encerrada do outro lado, o token
        // continua "válido" pela assinatura por até 1h: o app abria normal e
        // TODA chamada voltava 401 ("Sessão inválida" no player), ou pior —
        // sem sessão, `my_member_status` respondia como anônimo e um aluno
        // VITALÍCIO via a tela de "seu teste grátis expirou".
        //
        // Decide pelo RESULTADO, não pelo código do erro: numa sessão apagada
        // o supabase-js limpa o armazenamento por conta própria e o erro nem
        // sempre traz `status` — checar 401/403 deixava passar exatamente o
        // caso que precisava pegar. Se o servidor não devolve usuário, não há
        // sessão. Falha de REDE é o único caso que não derruba: quem está sem
        // sinal não pode ser deslogado.
        if (session?.user) {
          const { data: quem, error: sessaoErr } = await supabase.auth.getUser();
          const semRede = /failed to fetch|networkerror|network request failed|aborted|timeout|load failed/i
            .test(String(sessaoErr?.message || ''));
          if (!quem?.user && !semRede) {
            await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
            session = null;
          }
        }

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
            // Marcado ANTES de sair do callback: entre o SIGNED_IN e a resposta
            // do has_role existe uma janela em que o usuário já está setado e
            // `isAdmin` ainda é false. Sem esta bandeira, quem protege a rota
            // lia isso como "não é admin" e mandava de volta pro login — o
            // login funcionava e a pessoa via a tela de login de novo.
            setCheckingRole(true);
            setTimeout(() => {
              checkAdmin(uid)
                .then(p => { setIsAdmin(p.admin); setIsViewer(p.viewer); })
                .finally(() => setCheckingRole(false));
            }, 0);
          }
        } else {
          lastUserId.current = null;
          setIsAdmin(false);
          setIsViewer(false);
          setCheckingRole(false);
        }
      }
    );

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    // Uma segunda tentativa só quando a RESPOSTA não chegou. Já aconteceu de o
    // login ser aceito no servidor (last_sign_in_at gravado) e a resposta se
    // perder no caminho — pra quem está na tela, isso é "não loga". Credencial
    // errada não melhora com insistência, e repetir gastaria o rate limit do
    // GoTrue à toa, então esse caso sai do laço na hora.
    let ultimoErro: unknown = null;
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error) return;
        ultimoErro = error;
      } catch (err) {
        ultimoErro = err;
      }
      const msg = ultimoErro instanceof Error ? ultimoErro.message : String(ultimoErro ?? '');
      if (!/failed to fetch|networkerror|network request failed|aborted/i.test(msg)) break;
      if (tentativa === 0) await new Promise(r => setTimeout(r, 800));
    }
    throw describeAuthError(ultimoErro);
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
    <AuthContext.Provider value={{ user, session, loading, isAdmin, isViewer, checkingRole, kickedOut, dismissKickedOut, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
