import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  FolderOpen,
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  DollarSign,
  UserCheck,
  Tag,
  Database,
  AlertTriangle,
  Stethoscope,
  Mail,
  Smartphone,
  MessageCircle,
  MessagesSquare,
  GraduationCap,
  Megaphone,
  ShoppingBag,
  Layers,
  Handshake,
  CalendarClock,
  FolderUp,
  UserCog,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { AdminPWAHead } from '@/components/AdminPWAHead';
import { ThemeToggle } from '@/components/ThemeToggle';

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/access', label: 'Acessos', icon: UserCheck },
  { path: '/admin/membros', label: 'Área de Membros', icon: GraduationCap },
  { path: '/admin/conteudos', label: 'Gerenciar Conteúdos', icon: Lock },
  { path: '/admin/buyers', label: 'Compradores', icon: DollarSign },
  { path: '/admin/trials', label: 'Usuários Trial', icon: Users },
  { path: '/admin/coupons', label: 'Cupons', icon: Tag },
  { path: '/admin/comunidade', label: 'Comunidade', icon: MessagesSquare },
  { path: '/admin/avisos', label: 'Avisos', icon: Megaphone },
  { path: '/admin/loja', label: 'Loja', icon: ShoppingBag },
  { path: '/admin/afiliados', label: 'Afiliados', icon: Handshake },
  { path: '/admin/cronogramas', label: 'Cronogramas', icon: CalendarClock },
  { path: '/admin/flashcards', label: 'Flashcards & Questões', icon: Layers },
  { path: '/admin/acervo', label: 'Acervo Público', icon: FolderUp },
  { path: '/admin/drive', label: 'Google Drive', icon: FolderOpen },
  { path: '/admin/email-campaign', label: 'Campanha Email', icon: Mail },
  { path: '/admin/sms', label: 'SMS', icon: Smartphone },
  { path: '/admin/whatsapp', label: 'WhatsApp Business', icon: MessageCircle },
  { path: '/admin/database', label: 'Database', icon: Database },
  // Gestão das contas do painel — só admin de verdade vê (o item some pro
  // visualizador; a RPC e a Edge Function também recusam por trás).
  { path: '/admin/seguranca', label: 'Segurança', icon: ShieldAlert, adminOnly: true },
  { path: '/admin/contas', label: 'Contas do Painel', icon: UserCog, adminOnly: true },
];

export const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isViewer } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success('Logout realizado');
    navigate('/admin/login');
  };

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AdminPWAHead />
      {/* Conta visualizadora: aviso fixo — só Loja e Área de Membros editam;
          o resto é leitura (imposto no banco, não só na interface). */}
      {isViewer && (
        <div className="fixed bottom-0 left-0 right-0 z-[60] bg-accent-warning/95 text-black text-center text-xs font-semibold py-1.5 px-4">
          Modo visualização — você pode editar apenas Loja e Área de Membros. O restante é somente leitura.
        </div>
      )}
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 z-30 bg-background-paper border-r border-border
        flex flex-col transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:relative lg:flex
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-border flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-3 group min-w-0">
            <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
              <Stethoscope className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <span className="font-secondary font-bold text-foreground text-lg">OneMed</span>
              <p className="text-muted-foreground text-xs">Painel Admin</p>
            </div>
          </Link>
          <ThemeToggle />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.filter(item => !(item as { adminOnly?: boolean }).adminOnly || !isViewer).map(item => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-colors duration-150
                ${isActive(item.path)
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }
              `}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary text-xs font-bold uppercase">
                {user?.email?.[0] || 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user?.email}</p>
              <p className="text-xs text-muted-foreground">Admin</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex items-center gap-4 px-4 py-3 bg-background-paper/80 backdrop-blur-sm border-b border-border lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-muted-foreground hover:text-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary" />
            <span className="font-secondary font-bold text-foreground">OneMed</span>
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>

        {/* Page content */}
        {/* O painel tinha o problema OPOSTO ao da área de membros: era 100%
            fluido, então num monitor de 3440px as fileiras de 4 cards de
            métrica esticavam para ~740px cada, com o número num canto e o
            resto vazio. A casca põe um teto generoso (as tabelas de dados
            continuam ganhando espaço até 2240px) sem deixar esticar sem fim. */}
        <main className="flex-1 overflow-auto">
          <div className="shell-wide p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
