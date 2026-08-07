import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Regressão do incidente 2026-08-07 (TDZ no render). Renderiza CADA página do
// painel admin de verdade — executa os hooks/useMemo no render e falha se
// alguma referenciar um const declarado abaixo ("before initialization").

// ── Infra comum mockada ──────────────────────────────────────────────────────
const qb: any = {
  select: () => qb, insert: () => qb, update: () => qb, delete: () => qb, upsert: () => qb,
  eq: () => qb, neq: () => qb, is: () => qb, in: () => qb, not: () => qb, gte: () => qb, lte: () => qb,
  order: () => qb, limit: () => qb, range: () => qb, single: () => new Promise(() => {}),
  maybeSingle: () => new Promise(() => {}), then: () => new Promise(() => {}),
};
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => qb,
    rpc: () => new Promise(() => {}),
    functions: { invoke: () => new Promise(() => {}) },
    channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}), unsubscribe: () => {} }),
    removeChannel: () => {},
    auth: { getSession: () => new Promise(() => {}), getUser: () => new Promise(() => {}) },
  },
}));
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'a@a.com' }, session: { access_token: 't' }, isAdmin: true, isViewer: false, loading: false }),
}));
vi.mock('@/components/AdminLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
// Componentes/hoolks pesados (mapas, gráficos, realtime) viram stubs.
vi.mock('@/components/admin/OnlineMembersCard', () => ({ OnlineMembersCard: () => null }));
vi.mock('@/components/admin/MemberLocationsMap', () => ({ MemberLocationsMap: () => null }));
vi.mock('@/components/admin/MemberLocationsList', () => ({ MemberLocationsList: () => null }));
vi.mock('@/components/admin/MetaPixelHealthCard', () => ({ MetaPixelHealthCard: () => null }));
vi.mock('@/components/admin/StorageAccountsCard', () => ({ StorageAccountsCard: () => null }));
vi.mock('@/components/admin/EgressChart', () => ({ EgressChart: () => null, default: () => null }));
vi.mock('@/components/EgressChart', () => ({ EgressChart: () => null, default: () => null }));
vi.mock('@/hooks/useOnlineMembers', () => ({ useOnlineMembers: () => ({ members: [], onlineIds: new Set(), onlineCount: 0, loading: false, loadError: false, refetch: () => {} }) }));
vi.mock('@/hooks/useVisibleMemberLocations', () => ({ useVisibleMemberLocations: () => ({ visible: [], online: [], offline: [], totalOnlineCount: 0, locationGroups: [], loading: false, loadError: false }) }));
vi.mock('@/hooks/useMemberLocationsMap', () => ({ useMemberLocationsMap: () => ({ points: [], loading: false, loadError: false, refetch: () => {} }) }));

// ── Páginas admin ────────────────────────────────────────────────────────────
import Dashboard from '@/pages/Dashboard';
import MembersPage from '@/pages/MembersPage';
import BuyersPage from '@/pages/BuyersPage';
import TrialUsersPage from '@/pages/TrialUsersPage';
import CouponsPage from '@/pages/CouponsPage';
import AccessManagement from '@/pages/AccessManagement';
import DriveSettings from '@/pages/DriveSettings';
import AdminCommunityPage from '@/pages/AdminCommunityPage';
import AcervoAdminPage from '@/pages/AcervoAdminPage';
import AnnouncementsPage from '@/pages/AnnouncementsPage';
import EmailCampaignPage from '@/pages/EmailCampaignPage';
import SMSPage from '@/pages/SMSPage';
import WhatsAppPage from '@/pages/WhatsAppPage';
import DatabasePage from '@/pages/DatabasePage';
import StudyPlansAdminPage from '@/pages/StudyPlansAdminPage';
import FlashcardsAdminPage from '@/pages/FlashcardsAdminPage';
import AffiliatesAdminPage from '@/pages/AffiliatesAdminPage';
import StoreAdminPage from '@/pages/StoreAdminPage';
import PanelAccountsPage from '@/pages/PanelAccountsPage';

const PAGES: [string, React.ComponentType][] = [
  ['Dashboard', Dashboard],
  ['MembersPage', MembersPage],
  ['BuyersPage', BuyersPage],
  ['TrialUsersPage', TrialUsersPage],
  ['CouponsPage', CouponsPage],
  ['AccessManagement', AccessManagement],
  ['DriveSettings', DriveSettings],
  ['AdminCommunityPage', AdminCommunityPage],
  ['AcervoAdminPage', AcervoAdminPage],
  ['AnnouncementsPage', AnnouncementsPage],
  ['EmailCampaignPage', EmailCampaignPage],
  ['SMSPage', SMSPage],
  ['WhatsAppPage', WhatsAppPage],
  ['DatabasePage', DatabasePage],
  ['StudyPlansAdminPage', StudyPlansAdminPage],
  ['FlashcardsAdminPage', FlashcardsAdminPage],
  ['AffiliatesAdminPage', AffiliatesAdminPage],
  ['StoreAdminPage', StoreAdminPage],
  ['PanelAccountsPage', PanelAccountsPage],
];

describe('Páginas admin — regressão de TDZ no render (incidente 2026-08-07)', () => {
  beforeEach(() => cleanup());

  for (const [nome, Page] of PAGES) {
    it(`${nome} renderiza sem "before initialization"`, () => {
      const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      let err: unknown = null;
      try {
        render(
          <QueryClientProvider client={qc}>
            <MemoryRouter><Page /></MemoryRouter>
          </QueryClientProvider>,
        );
      } catch (e) { err = e; }
      // Só reprovamos o TDZ especificamente — outros erros de mock não contam.
      const msg = err instanceof Error ? err.message : String(err ?? '');
      expect(msg).not.toMatch(/before initialization|Cannot access/i);
    });
  }
});
