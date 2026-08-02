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
  { path: '/admin/buyers', label: 'Compradores', icon: DollarSign },
  { path: '/admin/trials', label: 'Usuários Trial', icon: Users },
  { path: '/admin/coupons', label: 'Cupons', icon: Tag },
  { path: '/admin/comunidade', label: 'Comunidade', icon: MessagesSquare },
  { path: '/admin/avisos', label: 'Avisos', icon: Megaphone },
  { path: '/admin/loja', label: 'Loja', icon: ShoppingBag },
  { path: '/admin/flashcards', label: 'Flashcards', icon: Layers },
  { path: '/admin/drive', label: 'Google Drive', icon: FolderOpen },
  { path: '/admin/email-campaign', label: 'Campanha Email', icon: Mail },
  { path: '/admin/sms', label: 'SMS', icon: Smartphone },
  { path: '/admin/whatsapp', label: 'WhatsApp Business', icon: MessageCircle },
  { path: '/admin/database', label: 'Database', icon: Database },
];

export const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
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
          {navItems.map(item => (
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
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
