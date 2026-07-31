import { Route, Routes } from 'react-router-dom';
import Index from '@/pages/Index';
import TermsPage from '@/pages/TermsPage';
import PrivacyPage from '@/pages/PrivacyPage';
import CoursesIndexPage from '@/pages/public/CoursesIndexPage';
import CategoryPage from '@/pages/public/CategoryPage';
import PillarHubPage from '@/pages/public/PillarHubPage';
import PlansPage from '@/pages/public/PlansPage';
import { PILLAR_HUBS } from './siteConfig';

/**
 * Só as rotas públicas indexáveis, sem nenhum provider de sessão.
 *
 * Existe separado das rotas do `App.tsx` porque o prerender roda em Node: o
 * que estiver aqui precisa renderizar sem `window`, sem sessão e sem dados do
 * banco. As rotas listadas aqui têm que espelhar as públicas do App — o teste
 * em `src/test/seo.test.ts` compara as duas listas e falha se divergirem, que
 * é como uma página nova entraria no app sem nunca ser prerenderizada.
 */
export function PublicRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/cursos" element={<CoursesIndexPage />} />
      <Route path="/cursos/:categoria" element={<CategoryPage />} />
      <Route path="/planos" element={<PlansPage />} />
      {PILLAR_HUBS.map(hub => (
        <Route key={hub.slug} path={`/${hub.slug}`} element={<PillarHubPage slug={hub.slug} />} />
      ))}
      <Route path="/termos" element={<TermsPage />} />
      <Route path="/privacidade" element={<PrivacyPage />} />
    </Routes>
  );
}
