import { Suspense, lazy, useEffect, useRef } from "react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { trackPageView } from "@/lib/pixel";

// Rotas públicas prerenderizadas ficam ESTÁTICAS: o HTML delas já vem pronto
// do build (scripts/prerender.mjs) e um chunk lazy trocaria esse conteúdo por
// um spinner até o download terminar — pior pra SEO e pra primeira visita.
import Index from "./pages/Index";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import NotFound from "./pages/NotFound";
import CoursesIndexPage from "./pages/public/CoursesIndexPage";
import CategoryPage from "./pages/public/CategoryPage";
import PillarHubPage from "./pages/public/PillarHubPage";
import PlansPage from "./pages/public/PlansPage";
import { captureAffiliateRefFromUrl } from "./lib/affiliateRef";

// Todo o resto (área de membros, admin, checkout, afiliados) é carregado sob
// demanda — sem isto o visitante da landing baixava um bundle único de ~1,9MB
// com painel admin, player de aula, Leaflet e tudo mais dentro.
//
// Depois de um deploy, quem ficou com a aba aberta pode pedir um chunk que já
// não existe no servidor (hash antigo → 404). Nesse caso recarrega a página
// UMA vez pra pegar o index novo, em vez de estourar tela branca; a trava em
// sessionStorage impede loop de reload se o erro persistir.
const lazyPage = (loader: () => Promise<{ default: React.ComponentType }>) =>
  lazy(() =>
    loader().catch((err) => {
      const key = "om_chunk_reload";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
        return new Promise<never>(() => {});
      }
      throw err;
    }),
  );

const LoginPage = lazyPage(() => import("./pages/LoginPage"));
const RegisterPage = lazyPage(() => import("./pages/RegisterPage"));
const MemberLoginPage = lazyPage(() => import("./pages/MemberLoginPage"));
const MemberDashboardPage = lazyPage(() => import("./pages/MemberDashboardPage"));
const CourseDetailPage = lazyPage(() => import("./pages/CourseDetailPage"));
const CommunityPage = lazyPage(() => import("./pages/CommunityPage"));
const Dashboard = lazyPage(() => import("./pages/Dashboard"));
const AccessManagement = lazyPage(() => import("./pages/AccessManagement"));
const MembersPage = lazyPage(() => import("./pages/MembersPage"));
const DriveSettings = lazyPage(() => import("./pages/DriveSettings"));
const CheckoutPage = lazyPage(() => import("./pages/CheckoutPage"));
const PaymentSuccessPage = lazyPage(() => import("./pages/PaymentSuccessPage"));
const PaymentErrorPage = lazyPage(() => import("./pages/PaymentErrorPage"));
const PaymentPendingPage = lazyPage(() => import("./pages/PaymentPendingPage"));
const ClaimAccessPage = lazyPage(() => import("./pages/ClaimAccessPage"));
const BuyersPage = lazyPage(() => import("./pages/BuyersPage"));
const TrialUsersPage = lazyPage(() => import("./pages/TrialUsersPage"));
const CouponsPage = lazyPage(() => import("./pages/CouponsPage"));
const AdminCommunityPage = lazyPage(() => import("./pages/AdminCommunityPage"));
const StorePage = lazyPage(() => import("./pages/StorePage"));
const ArchivePage = lazyPage(() => import("./pages/ArchivePage"));
const StudyPlanPage = lazyPage(() => import("./pages/StudyPlanPage"));
const StudyPlansAdminPage = lazyPage(() => import("./pages/StudyPlansAdminPage"));
const AffiliateRegisterPage = lazyPage(() => import("./pages/affiliate/AffiliateRegisterPage"));
const AffiliateLoginPage = lazyPage(() => import("./pages/affiliate/AffiliateLoginPage"));
const AffiliatePanelPage = lazyPage(() => import("./pages/affiliate/AffiliatePanelPage"));
const AffiliatesAdminPage = lazyPage(() => import("./pages/AffiliatesAdminPage"));
const StoreAdminPage = lazyPage(() => import("./pages/StoreAdminPage"));
const FlashcardsAdminPage = lazyPage(() => import("./pages/FlashcardsAdminPage"));
const AcervoAdminPage = lazyPage(() => import("./pages/AcervoAdminPage"));
const AnnouncementsPage = lazyPage(() => import("./pages/AnnouncementsPage"));
const DatabasePage = lazyPage(() => import("./pages/DatabasePage"));
const EmailCampaignPage = lazyPage(() => import("./pages/EmailCampaignPage"));
const SMSPage = lazyPage(() => import("./pages/SMSPage"));
const WhatsAppPage = lazyPage(() => import("./pages/WhatsAppPage"));
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
  const { user, loading, isAdmin } = useAuth();
  if (loading) return (
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
            <PrivateRouteSeo />
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

            {/* Protected admin routes */}
            <Route path="/admin" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/admin/access" element={<ProtectedRoute><AccessManagement /></ProtectedRoute>} />
            <Route path="/admin/membros" element={<ProtectedRoute><MembersPage /></ProtectedRoute>} />
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
