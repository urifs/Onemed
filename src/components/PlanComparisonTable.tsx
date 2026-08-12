import { Check, X } from 'lucide-react';
import { PLAN_PRICES } from '@/lib/plans';

// Tabela comparativa dos planos — didática, uma verdade só. Os valores batem
// com PLAN_FEATURES/PLAN_PRICES (fonte) e com o enforcement real do servidor
// (arquivo baixa do Vitalício pra cima, aula só no Pro; IA 5/10/20/ilimitado; Mensal sem IA).
//
// Cada célula é: true (✓), false (✗) ou um texto curto. Texto vale como "tem,
// com esta condição".
type Celula = boolean | string;

const PLANOS = ['monthly', 'annual', 'lifetime', 'lifetime_plus', 'lifetime_pro'] as const;
const NOMES: Record<string, string> = {
  monthly: 'Mensal', annual: 'Anual', lifetime: 'Vitalício',
  lifetime_plus: 'Vitalício Plus', lifetime_pro: 'Vitalício Pro',
};

function preco(plano: string): string {
  const p = PLAN_PRICES[plano];
  const v = p % 1 === 0 ? p.toLocaleString('pt-BR') : p.toFixed(2).replace('.', ',');
  return `R$ ${v}${plano === 'monthly' ? '/mês' : ''}`;
}

// [rótulo, {monthly, annual, lifetime, lifetime_plus, lifetime_pro}]
const LINHAS: [string, Record<string, Celula>][] = [
  ['Duração do acesso', {
    monthly: '1 mês', annual: '1 ano', lifetime: 'Vitalício', lifetime_plus: 'Vitalício', lifetime_pro: 'Vitalício',
  }],
  ['Telas simultâneas', {
    monthly: '1', annual: '2', lifetime: '2', lifetime_plus: '4', lifetime_pro: '6',
  }],
  ['Todo o acervo atual da plataforma', {
    monthly: true, annual: true, lifetime: true, lifetime_plus: true, lifetime_pro: true,
  }],
  ['Atualizações de conteúdo', {
    monthly: false, annual: false,
    lifetime: 'Anuais (cursos básicos)',
    lifetime_plus: 'Anuais (cursos intermediários)',
    lifetime_pro: 'Mensais (95% do conteúdo) + novos cursos',
  }],
  ['Ferramentas de IA (flashcards, questões, cronograma, assistente)', {
    monthly: false,
    annual: 'Até 5 usos/dia em cada',
    lifetime: 'Até 10 usos/dia em cada',
    lifetime_plus: 'Até 20 usos/dia em cada',
    lifetime_pro: 'Uso ilimitado',
  }],
  ['Download de arquivos e apostilas (PDF, Anki e mais)', {
    monthly: false, annual: false, lifetime: true, lifetime_plus: true, lifetime_pro: true,
  }],
  ['Download das aulas em vídeo', {
    monthly: false, annual: false, lifetime: false, lifetime_plus: false, lifetime_pro: true,
  }],
  ['Backup no seu próprio Google Drive', {
    monthly: false, annual: false, lifetime: false, lifetime_plus: true, lifetime_pro: true,
  }],
  ['IA de diagnósticos Meduf', {
    monthly: false, annual: false, lifetime: false, lifetime_plus: false, lifetime_pro: true,
  }],
];

function Valor({ v }: { v: Celula }) {
  if (v === true) return <Check className="w-4 h-4 text-accent-success mx-auto" aria-label="incluído" />;
  if (v === false) return <X className="w-4 h-4 text-muted-foreground/40 mx-auto" aria-label="não incluído" />;
  return <span className="text-xs text-foreground leading-tight">{v}</span>;
}

export function PlanComparisonTable() {
  return (
    <div className="mt-12">
      <h3 className="font-secondary text-xl font-bold text-foreground text-center mb-1">Compare os planos</h3>
      <p className="text-muted-foreground text-sm text-center mb-6">Tudo que cada plano inclui, lado a lado</p>

      {/* scroll horizontal próprio no mobile — a página nunca rola de lado */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="text-left align-bottom p-3 w-[30%]" />
              {PLANOS.map(p => (
                <th
                  key={p}
                  className={`p-3 text-center align-bottom border-b border-border ${p === 'lifetime_pro' ? 'bg-primary/5 rounded-t-xl' : ''}`}
                >
                  <div className={`font-secondary font-bold ${p === 'lifetime_pro' ? 'text-primary' : 'text-foreground'}`}>{NOMES[p]}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{preco(p)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LINHAS.map(([rotulo, valores], i) => (
              <tr key={rotulo} className={i % 2 ? 'bg-secondary/30' : ''}>
                <td className="p-3 text-left text-foreground font-medium align-middle">{rotulo}</td>
                {PLANOS.map(p => (
                  <td key={p} className={`p-3 text-center align-middle ${p === 'lifetime_pro' ? 'bg-primary/5' : ''}`}>
                    <Valor v={valores[p]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
