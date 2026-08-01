import { useEffect, useRef } from "react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { trackPageView } from "@/lib/pixel";

// Pages
import Index from "./pages/Index";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MemberLoginPage from "./pages/MemberLoginPage";
import MemberDashboardPage from "./pages/MemberDashboardPage";
import CourseDetailPage from "./pages/CourseDetailPage";
import CommunityPage from "./pages/CommunityPage";
import Dashboard from "./pages/Dashboard";
import AccessManagement from "./pages/AccessManagement";
import MembersPage from "./pages/MembersPage";
import DriveSettings from "./pages/DriveSettings";
import CheckoutPage from "./pages/CheckoutPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import PaymentErrorPage from "./pages/PaymentErrorPage";
import PaymentPendingPage from "./pages/PaymentPendingPage";
import ClaimAccessPage from "./pages/ClaimAccessPage";
import BuyersPage from "./pages/BuyersPage";
import TrialUsersPage from "./pages/TrialUsersPage";
import CouponsPage from "./pages/CouponsPage";
import AdminCommunityPage from "./pages/AdminCommunityPage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import DatabasePage from "./pages/DatabasePage";
import EmailCampaignPage from "./pages/EmailCampaignPage";
import SMSPage from "./pages/SMSPage";
import WhatsAppPage from "./pages/WhatsAppPage";
import NotFound from "./pages/NotFound";
import CoursesIndexPage from "./pages/public/CoursesIndexPage";
import CategoryPage from "./pages/public/CategoryPage";
import PillarHubPage from "./pages/public/PillarHubPage";
import PlansPage from "./pages/public/PlansPage";
import { PILLAR_HUBS, isNoIndexPath } from "@/seo/siteConfig";
import { Seo } from "@/seo/Seo";
import WhatsAppButton from "./components/WhatsAppButton";
import { KickedOutModal } from "./components/member/KickedOutModal";
import { AccessExpiredScreen } from "./components/member/AccessExpiredScreen";
import { useMemberStatus } from "@/hooks/useMemberStatus";

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

  const spinner = (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (loading) return spinner;
  if (!user) return <Navigate to="/login" replace />;
  if (statusLoading) return spinner;

  // A sessão do navegador sobrevive ao fim do teste grátis — sem isto, o
  // aluno fica dentro de uma plataforma vazia, sem explicação nem caminho
  // pra comprar. `status` nulo é consulta que falhou: deixa passar (o
  // conteúdo continua protegido pela RLS).
  if (status === 'expired' || status === 'none') {
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
            <Route path="/admin/login" element={<LoginPage />} />
            <Route path="/admin/register" element={<RegisterPage />} />

            {/* Member platform */}
            <Route path="/login" element={<MemberLoginPage />} />
            <Route path="/membros" element={<MemberProtectedRoute><MemberDashboardPage /></MemberProtectedRoute>} />
            <Route path="/membros/curso/:slug" element={<MemberProtectedRoute><CourseDetailPage /></MemberProtectedRoute>} />
            <Route path="/membros/comunidade" element={<MemberProtectedRoute><CommunityPage /></MemberProtectedRoute>} />

            {/* Protected admin routes */}
            <Route path="/admin" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/admin/access" element={<ProtectedRoute><AccessManagement /></ProtectedRoute>} />
            <Route path="/admin/membros" element={<ProtectedRoute><MembersPage /></ProtectedRoute>} />
            <Route path="/admin/drive" element={<ProtectedRoute><DriveSettings /></ProtectedRoute>} />
            <Route path="/admin/buyers" element={<ProtectedRoute><BuyersPage /></ProtectedRoute>} />
            <Route path="/admin/trials" element={<ProtectedRoute><TrialUsersPage /></ProtectedRoute>} />
            <Route path="/admin/coupons" element={<ProtectedRoute><CouponsPage /></ProtectedRoute>} />
            <Route path="/admin/comunidade" element={<ProtectedRoute><AdminCommunityPage /></ProtectedRoute>} />
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
          <WhatsAppButton />
          <KickedOutModal />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
