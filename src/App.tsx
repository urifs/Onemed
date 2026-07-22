import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";

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
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import DatabasePage from "./pages/DatabasePage";
import EmailCampaignPage from "./pages/EmailCampaignPage";
import SMSPage from "./pages/SMSPage";
import WhatsAppPage from "./pages/WhatsAppPage";
import NotFound from "./pages/NotFound";
import WhatsAppButton from "./components/WhatsAppButton";
import { KickedOutModal } from "./components/member/KickedOutModal";

const queryClient = new QueryClient();

const FbclidCapture = () => {
  useEffect(() => {
    const fbclid = new URLSearchParams(window.location.search).get('fbclid')
    if (fbclid) localStorage.setItem('om_fbclid', fbclid)
  }, [])
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
  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <FbclidCapture />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
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
);

export default App;
