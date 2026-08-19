import { useEffect, useRef, lazy, Suspense, type ComponentType } from "react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { trackPageView } from "@/lib/pixel";

// Páginas públicas prerenderizadas ficam ESTÁTICAS de propósito: o HTML delas
// já chega pronto do prerender, e um chunk lazy faria a página piscar para o
// spinner no primeiro paint. Logins também: são porta de entrada, pequenos, e
// não valem uma ida extra à rede no caminho crítico.
import Index from "./pages/Index";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import NotFound from "./pages/NotFound";
import CoursesIndexPage from "./pages/public/CoursesIndexPage";
import CategoryPage from "./pages/public/CategoryPage";
import PillarHubPage from "./pages/public/PillarHubPage";
import PlansPage from "./pages/public/PlansPage";
import { captureAffiliateRefFromUrl } from "./lib/affiliateRef";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MemberLoginPage from "./pages/MemberLoginPage";

// Code-splitting por rota, reintroduzido em 2026-08-19. O incidente de
// 2026-08-07 ("can't access lexical declaration before initialization") NÃO
// era causado pelo splitting: a forense achou um TDZ real no
// CourseDetailPage (useMemo lendo const declarada abaixo, corrigido em
// 04a183e) que quebrava com OU sem chunks — o madge confirma zero ciclo de
// import. Guardas de regressão: `npm run typecheck:refs` +
// src/test/lessonPlayerRender.test.tsx + build completo antes de todo deploy.
//
// Se um deploy trocar os hashes com um aluno navegando, o chunk antigo dá
// 404: aqui a página recarrega UMA vez sozinha (pega o index novo) em vez de
// morrer no error boundary com tela preta.
const RECARREGA_CHUNK = "om_chunk_reload";
const paginaLazy = (importar: () => Promise<{ default: ComponentType }>) =>
  lazy(() =>
    importar().then(
      (m) => {
        try { sessionStorage.removeItem(RECARREGA_CHUNK); } catch { /* sem storage, sem flag */ }
        return m;
      },
      (err) => {
        let jaRecarregou = true;
        try {
          jaRecarregou = sessionStorage.getItem(RECARREGA_CHUNK) === "1";
          if (!jaRecarregou) sessionStorage.setItem(RECARREGA_CHUNK, "1");
        } catch { /* sem storage não dá pra travar o loop — não recarrega */ }
        if (!jaRecarregou) {
          window.location.reload();
          // Segura o Suspense no spinner até o reload assumir.
          return new Promise<{ default: ComponentType }>(() => {});
        }
        throw err;
      },
    ),
  );

// Área do aluno
const MemberDashboardPage = paginaLazy(() => import("./pages/MemberDashboardPage"));
const CourseDetailPage = paginaLazy(() => import("./pages/CourseDetailPage"));
const CommunityPage = paginaLazy(() => import("./pages/CommunityPage"));
const StorePage = paginaLazy(() => import("./pages/StorePage"));
const ArchivePage = paginaLazy(() => import("./pages/ArchivePage"));
const StudyPlanPage = paginaLazy(() => import("./pages/StudyPlanPage"));
const MemberPlaylistsPage = paginaLazy(() => import("./pages/MemberPlaylistsPage"));
// Checkout e pós-pagamento
const CheckoutPage = paginaLazy(() => import("./pages/CheckoutPage"));
const PaymentSuccessPage = paginaLazy(() => import("./pages/PaymentSuccessPage"));
const PaymentErrorPage = paginaLazy(() => import("./pages/PaymentErrorPage"));
const PaymentPendingPage = paginaLazy(() => import("./pages/PaymentPendingPage"));
const ClaimAccessPage = paginaLazy(() => import("./pages/ClaimAccessPage"));
// Afiliados
const AffiliateRegisterPage = paginaLazy(() => import("./pages/affiliate/AffiliateRegisterPage"));
const AffiliateLoginPage = paginaLazy(() => import("./pages/affiliate/AffiliateLoginPage"));
const AffiliatePanelPage = paginaLazy(() => import("./pages/affiliate/AffiliatePanelPage"));
// Painel admin
const Dashboard = paginaLazy(() => import("./pages/Dashboard"));
const AccessManagement = paginaLazy(() => import("./pages/AccessManagement"));
const ContentAccessPage = paginaLazy(() => import("./pages/ContentAccessPage"));
const MembersPage = paginaLazy(() => import("./pages/MembersPage"));
const DriveSettings = paginaLazy(() => import("./pages/DriveSettings"));
const BuyersPage = paginaLazy(() => import("./pages/BuyersPage"));
const TrialUsersPage = paginaLazy(() => import("./pages/TrialUsersPage"));
const CouponsPage = paginaLazy(() => import("./pages/CouponsPage"));
const AdminCommunityPage = paginaLazy(() => import("./pages/AdminCommunityPage"));
const StudyPlansAdminPage = paginaLazy(() => import("./pages/StudyPlansAdminPage"));
const AffiliatesAdminPage = paginaLazy(() => import("./pages/AffiliatesAdminPage"));
const StoreAdminPage = paginaLazy(() => import("./pages/StoreAdminPage"));
const FlashcardsAdminPage = paginaLazy(() => import("./pages/FlashcardsAdminPage"));
const AcervoAdminPage = paginaLazy(() => import("./pages/AcervoAdminPage"));
const AnnouncementsPage = paginaLazy(() => import("./pages/AnnouncementsPage"));
const PanelAccountsPage = paginaLazy(() => import("./pages/PanelAccountsPage"));
const SecurityPage = paginaLazy(() => import("./pages/SecurityPage"));
const DatabasePage = paginaLazy(() => import("./pages/DatabasePage"));
const EmailCampaignPage = paginaLazy(() => import("./pages/EmailCampaignPage"));
const SMSPage = paginaLazy(() => import("./pages/SMSPage"));
const WhatsAppPage = paginaLazy(() => import("./pages/WhatsAppPage"));
import { PILLAR_HUBS, isNoIndexPath } from "@/seo/siteConfig";
import { Seo } from "@/seo/Seo";
import WhatsAppButton from "./components/WhatsAppButton";
import { KickedOutModal } from "./components/member/KickedOutModal";
import { AccessExpiredScreen } from "./components/member/AccessExpiredScreen";
import { useMemberStatus } from "@/hooks/useMemberStatus";
import { useIsAffiliate } from "@/hooks/useIsAffiliate";

const queryClient = new QueryClient();

// Área do aluno, painel admin e páginas de funil nunca podem ser indexadas:
// a primeira é conteúdo pago, a segunda é administrativa e a terceira encheria
// a busca de páginas de checkout sem conteúdo. O robots.txt já bloqueia o
// rastreamento, mas `noindex` é o que REMOVE do índice uma URL que já entrou —
// bloquear no robots sozinho não remove nada, só impede o Google de reler a
// página (e de ver o noindex).
const PrivateRouteSeo = () => {
  const location = useLocation();
  if (!isNoIndexPath(location.pathname)) return null;
  return (
    <Seo
      title="OneMed"
      description="Área restrita da plataforma OneMed."
      path={location.pathname}
      noindex
    />
  );
};

const FbclidCapture = () => {
  useEffect(() => {
    const fbclid = new URLSearchParams(window.location.search).get('fbclid')
    if (fbclid) localStorage.setItem('om_fbclid', fbclid)
  }, [])
  return null
}

// Speed Insights (Vercel) — mede a experiência REAL de carregamento dos
// alunos. Sem o `route`, cada URL vira uma linha própria no painel: são 403
// cursos e milhares de aulas, então o relatório viraria uma lista inútil de
// caminhos únicos. Aqui os trechos dinâmicos são normalizados para o padrão da
// rota (/membros/curso/[slug]), que é como a Vercel agrupa as medições.
const ROTAS_DINAMICAS: [RegExp, string][] = [
  [/^\/membros\/curso\/[^/]+$/, '/membros/curso/[slug]'],
  [/^\/cursos\/[^/]+$/, '/cursos/[categoria]'],
]

const SpeedInsightsRotas = () => {
  const location = useLocation()
  const rota = ROTAS_DINAMICAS.find(([re]) => re.test(location.pathname))?.[1] ?? location.pathname
  return <SpeedInsights route={rota} />
}

// O `fbq('track','PageView')` do index.html roda uma vez só, no carregamento
// do HTML. Como isto é uma SPA, ir de / para /checkout nunca contava
// visualização — a Meta enxergava uma fração do funil. Aqui cada troca de rota
// dispara o PageView seguinte (o primeiro continua sendo o do index.html, por
// isso o primeiro pathname é ignorado: senão a home contaria em dobro).
const PixelPageViews = () => {
  const location = useLocation()
  const firstPath = useRef(location.pathname + location.search)

  useEffect(() => {
    // Referência de afiliado (?ref=CUPOM) pode chegar em qualquer rota —
    // captura em toda navegação, inclusive na primeira.
    captureAffiliateRefFromUrl()
    const current = location.pathname + location.search
    if (current === firstPath.current) return
    trackPageView()
  }, [location.pathname, location.search])

  return null
}

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isAdmin, checkingRole } = useAuth();
  // `checkingRole` é indispensável logo depois do login: aí `loading` já é
  // false e o usuário já existe, mas o papel ainda está sendo consultado.
  // Decidir nessa janela lia "ainda não sei" como "não é admin" e devolvia
  // a pessoa pro /admin/login um instante depois de ela acertar a senha.
  if (loading || (user && checkingRole)) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user || !isAdmin) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
};

const MemberProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const { status, lastType, expiredAt, loading: statusLoading } = useMemberStatus();
  const isAffiliate = useIsAffiliate();

  const spinner = (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (loading) return spinner;
  if (!user) return <Navigate to="/login" replace />;
  if (statusLoading) return spinner;

  // Conta de afiliado é SEPARADA da de assinante — quem entrou só como
  // afiliado não tem acesso à plataforma. Em vez da tela de "adquira acesso",
  // manda direto pro painel de afiliado (a menos que a conta também seja
  // assinante ativa: aí passa como assinante normal). Espera o hook resolver
  // pra não piscar a tela de expirado antes de redirecionar.
  const semAcesso = status === 'expired' || status === 'none';
  if (semAcesso && isAffiliate === null) return spinner;
  if (semAcesso && isAffiliate) return <Navigate to="/afiliado" replace />;

  // A sessão do navegador sobrevive ao fim do teste grátis — sem isto, o
  // aluno fica dentro de uma plataforma vazia, sem explicação nem caminho
  // pra comprar. `status` nulo é consulta que falhou: deixa passar (o
  // conteúdo continua protegido pela RLS).
  if (semAcesso) {
    return <AccessExpiredScreen lastType={lastType} expiredAt={expiredAt} />;
  }

  return <>{children}</>;
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <FbclidCapture />
            <PixelPageViews />
            <SpeedInsightsRotas />
            <PrivateRouteSeo />
            {/* Fallback do carregamento de chunk lazy: mesmo spinner das rotas
                protegidas, pra troca de rota não piscar layout diferente. */}
            <Suspense
              fallback={
                <div className="flex min-h-screen items-center justify-center bg-background">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              }
            >
            <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />

            {/* Silo de SEO: hubs de pilar + índice e páginas de categoria.
                Os hubs são registrados um a um a partir de PILLAR_HUBS em vez
                de uma rota `/:hub` — uma rota de parâmetro na raiz casaria com
                QUALQUER caminho e engoliria o 404, fazendo toda URL errada
                responder 200 (soft 404, que o Google penaliza). */}
            <Route path="/cursos" element={<CoursesIndexPage />} />
            <Route path="/cursos/:categoria" element={<CategoryPage />} />
            <Route path="/planos" element={<PlansPage />} />
            {PILLAR_HUBS.map(hub => (
              <Route key={hub.slug} path={`/${hub.slug}`} element={<PillarHubPage slug={hub.slug} />} />
            ))}
            {/* Programa de afiliados */}
            <Route path="/afiliado/registro" element={<AffiliateRegisterPage />} />
            <Route path="/afiliado/login" element={<AffiliateLoginPage />} />
            <Route path="/afiliado" element={<AffiliatePanelPage />} />

            <Route path="/admin/login" element={<LoginPage />} />
            <Route path="/admin/register" element={<RegisterPage />} />

            {/* Member platform */}
            <Route path="/login" element={<MemberLoginPage />} />
            <Route path="/membros" element={<MemberProtectedRoute><MemberDashboardPage /></MemberProtectedRoute>} />
            <Route path="/membros/curso/:slug" element={<MemberProtectedRoute><CourseDetailPage /></MemberProtectedRoute>} />
            <Route path="/membros/comunidade" element={<MemberProtectedRoute><CommunityPage /></MemberProtectedRoute>} />
            <Route path="/membros/loja" element={<MemberProtectedRoute><StorePage /></MemberProtectedRoute>} />
            <Route path="/membros/acervo" element={<MemberProtectedRoute><ArchivePage /></MemberProtectedRoute>} />
            <Route path="/membros/cronograma" element={<MemberProtectedRoute><StudyPlanPage /></MemberProtectedRoute>} />
            <Route path="/membros/playlists" element={<MemberProtectedRoute><MemberPlaylistsPage /></MemberProtectedRoute>} />

            {/* Protected admin routes */}
            <Route path="/admin" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/admin/access" element={<ProtectedRoute><AccessManagement /></ProtectedRoute>} />
            <Route path="/admin/membros" element={<ProtectedRoute><MembersPage /></ProtectedRoute>} />
            <Route path="/admin/conteudos" element={<ProtectedRoute><ContentAccessPage /></ProtectedRoute>} />
            <Route path="/admin/drive" element={<ProtectedRoute><DriveSettings /></ProtectedRoute>} />
            <Route path="/admin/buyers" element={<ProtectedRoute><BuyersPage /></ProtectedRoute>} />
            <Route path="/admin/trials" element={<ProtectedRoute><TrialUsersPage /></ProtectedRoute>} />
            <Route path="/admin/coupons" element={<ProtectedRoute><CouponsPage /></ProtectedRoute>} />
            <Route path="/admin/comunidade" element={<ProtectedRoute><AdminCommunityPage /></ProtectedRoute>} />
            <Route path="/admin/loja" element={<ProtectedRoute><StoreAdminPage /></ProtectedRoute>} />
            <Route path="/admin/afiliados" element={<ProtectedRoute><AffiliatesAdminPage /></ProtectedRoute>} />
            <Route path="/admin/cronogramas" element={<ProtectedRoute><StudyPlansAdminPage /></ProtectedRoute>} />
            <Route path="/admin/flashcards" element={<ProtectedRoute><FlashcardsAdminPage /></ProtectedRoute>} />
            <Route path="/admin/acervo" element={<ProtectedRoute><AcervoAdminPage /></ProtectedRoute>} />
            <Route path="/admin/contas" element={<ProtectedRoute><PanelAccountsPage /></ProtectedRoute>} />
            <Route path="/admin/seguranca" element={<ProtectedRoute><SecurityPage /></ProtectedRoute>} />
            <Route path="/admin/avisos" element={<ProtectedRoute><AnnouncementsPage /></ProtectedRoute>} />
            <Route path="/admin/database" element={<ProtectedRoute><DatabasePage /></ProtectedRoute>} />
            <Route path="/admin/email-campaign" element={<ProtectedRoute><EmailCampaignPage /></ProtectedRoute>} />
            <Route path="/admin/sms" element={<ProtectedRoute><SMSPage /></ProtectedRoute>} />
            <Route path="/admin/whatsapp" element={<ProtectedRoute><WhatsAppPage /></ProtectedRoute>} />

            {/* Payment routes */}
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/payment/success" element={<PaymentSuccessPage />} />
            <Route path="/payment/error" element={<PaymentErrorPage />} />
            <Route path="/payment/pending" element={<PaymentPendingPage />} />
            <Route path="/claim-access" element={<ClaimAccessPage />} />

            {/* Legal */}
            <Route path="/termos" element={<TermsPage />} />
            <Route path="/privacidade" element={<PrivacyPage />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          <WhatsAppButton />
          <KickedOutModal />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
