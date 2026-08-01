/**
 * Fonte única de verdade do SEO: rotas públicas, textos de head e os silos.
 *
 * Este arquivo é lido em três lugares que precisam concordar entre si — as
 * páginas React, o prerender do build e o gerador de sitemap. Manter tudo
 * num lugar só é o que impede o caso clássico de uma rota existir no app e
 * não no sitemap (ou o contrário, sitemap apontando para 404).
 */

export const SITE_URL = 'https://onemedcursos.com.br';
export const SITE_NAME = 'OneMed';
export const SITE_LOGO = `${SITE_URL}/icons/admin-icon-512.png`;
export const DEFAULT_OG_IMAGE =
  'https://storage.googleapis.com/gpt-engineer-file-uploads/OnBiQ3FMCMcJfw1TwEusK1LzDSl1/social-images/social-1774301887126-Captura_de_tela_de_2026-03-23_18-37-48.webp';

// Números do acervo. Ficam aqui porque aparecem em title, description,
// heading e JSON-LD — repetir em cinco arquivos é como eles divergem.
export const COURSE_COUNT = 530;
export const BOOK_COUNT = 9000;

/**
 * Slug de categoria é URL: uma vez indexado, mudar custa redirect e perda de
 * autoridade. Por isso o mapa é EXPLÍCITO, não gerado por slugify em cima do
 * nome — assim renomear a categoria no painel não muda a URL silenciosamente.
 */
export const CATEGORY_SLUGS: Record<string, string> = {
  'Cardiologia & ECG': 'cardiologia-ecg',
  'Emergência, PS & Trauma': 'emergencia-ps-trauma',
  'Prescrições & Plantão': 'prescricoes-plantao',
  'Pediatria': 'pediatria',
  'Cirurgia & GO': 'cirurgia-go',
  'Radiologia & Imagem': 'radiologia-imagem',
  'Semiologia & Clínica': 'semiologia-clinica',
  'Farmacologia & Bioquímica': 'farmacologia-bioquimica',
  'Especialidades': 'especialidades',
  'Anatomia & Ciclo Básico': 'anatomia-ciclo-basico',
  'Resumos, Cards & Livros': 'resumos-cards-livros',
  'Banco de Questões & Simulados': 'banco-questoes-simulados',
  'Extensivo & Intensivo · Residência': 'extensivo-intensivo-residencia',
  'Revalida': 'revalida',
  'Intercâmbio & Carreira Internacional': 'intercambio-carreira-internacional',
  'Carreira, Gestão & Marketing': 'carreira-gestao-marketing',
  'Outros cursos': 'outros-cursos',
};

export const SLUG_TO_CATEGORY: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_SLUGS).map(([name, slug]) => [slug, name]),
);

export interface CategorySeo {
  /** Nome exibido, igual ao usado na biblioteca. */
  name: string;
  slug: string;
  /** <h1> — keyword principal de alta intenção. */
  h1: string;
  /** <title> — o limite de 60 é verificado em teste. */
  title: string;
  /** <meta description> — limite de 160, também verificado. */
  description: string;
  /** Parágrafo de abertura: é o texto que o Google lê como contexto do silo. */
  intro: string;
  /** <h2>/<h3> de cauda longa. */
  topics: { heading: string; body: string }[];
}

export const CATEGORY_SEO: CategorySeo[] = [
  {
    name: 'Cardiologia & ECG',
    slug: 'cardiologia-ecg',
    h1: 'Cursos de Cardiologia e ECG para Médicos e Estudantes',
    title: 'Cursos de Cardiologia e ECG | OneMed',
    description:
      'Cursos completos de Cardiologia e interpretação de ECG para residência médica e prática clínica. Videoaulas, resumos e questões comentadas.',
    intro:
      'Reunimos em um só lugar os cursos de Cardiologia e eletrocardiograma que os estudantes de medicina mais procuram: da leitura sistemática do ECG às arritmias, síndromes coronarianas e insuficiência cardíaca, com videoaulas, resumos e questões comentadas.',
    topics: [
      {
        heading: 'Interpretação de ECG do básico ao avançado',
        body: 'Leitura sistemática, eixo, bloqueios de ramo, sobrecargas e os traçados que mais caem em prova de residência.',
      },
      {
        heading: 'Arritmias e emergências cardiovasculares',
        body: 'Taquiarritmias, bradiarritmias, fibrilação atrial e conduta na síndrome coronariana aguda, com foco em plantão.',
      },
      {
        heading: 'Cardiologia para prova de residência médica',
        body: 'Aulas dirigidas ao que é cobrado nas principais bancas, acompanhadas de banco de questões e simulados.',
      },
    ],
  },
  {
    name: 'Emergência, PS & Trauma',
    slug: 'emergencia-ps-trauma',
    h1: 'Cursos de Emergência, Pronto-Socorro e Trauma',
    title: 'Cursos de Emergência, PS e Trauma | OneMed',
    description:
      'Cursos de medicina de emergência, pronto-socorro e atendimento ao trauma. Protocolos ATLS, ACLS, via aérea e condutas de plantão.',
    intro:
      'Conteúdo prático para quem vive o pronto-socorro: atendimento inicial ao politraumatizado, via aérea, choque, parada cardiorrespiratória e as condutas que não podem falhar no plantão.',
    topics: [
      {
        heading: 'Atendimento inicial ao trauma',
        body: 'Avaliação primária e secundária, trauma de tórax, abdome e extremidades, seguindo a lógica do ATLS.',
      },
      {
        heading: 'Via aérea e suporte avançado de vida',
        body: 'Manejo de via aérea difícil, sequência rápida de intubação, ressuscitação hemostática e algoritmos de parada.',
      },
      {
        heading: 'Condutas de plantão no pronto-socorro',
        body: 'Dor torácica, dispneia, rebaixamento de consciência e as urgências mais frequentes do PS.',
      },
    ],
  },
  {
    name: 'Prescrições & Plantão',
    slug: 'prescricoes-plantao',
    h1: 'Cursos de Prescrição Médica e Rotinas de Plantão',
    title: 'Cursos de Prescrição Médica e Plantão | OneMed',
    description:
      'Aprenda a prescrever com segurança: doses, diluições, ajustes e rotinas de plantão. Material objetivo para internato e primeiros plantões.',
    intro:
      'Prescrever é a primeira barreira real do internato e dos primeiros plantões. Estes cursos cobrem doses, diluições, ajuste por função renal e as prescrições mais usadas na enfermaria e na emergência.',
    topics: [
      {
        heading: 'Prescrição na enfermaria e na emergência',
        body: 'Modelos comentados de prescrição, analgesia, antibioticoterapia empírica e hidratação.',
      },
      {
        heading: 'Doses, diluições e ajustes',
        body: 'Cálculo de dose, diluição de drogas vasoativas e ajuste em disfunção renal e hepática.',
      },
      {
        heading: 'Rotinas para o primeiro plantão',
        body: 'Passagem de plantão, evolução e as intercorrências noturnas mais comuns.',
      },
    ],
  },
  {
    name: 'Pediatria',
    slug: 'pediatria',
    h1: 'Cursos de Pediatria para Residência e Prática Clínica',
    title: 'Cursos de Pediatria | OneMed',
    description:
      'Cursos de Pediatria com foco em residência médica: neonatologia, puericultura, urgências pediátricas e crescimento e desenvolvimento.',
    intro:
      'Da sala de parto ao ambulatório: neonatologia, puericultura, imunização, urgências pediátricas e os temas de Pediatria mais cobrados nas provas de residência.',
    topics: [
      {
        heading: 'Neonatologia e sala de parto',
        body: 'Reanimação neonatal, icterícia, prematuridade e cuidados nas primeiras horas de vida.',
      },
      {
        heading: 'Puericultura, crescimento e imunização',
        body: 'Acompanhamento do desenvolvimento, calendário vacinal e orientação aos pais.',
      },
      {
        heading: 'Urgências pediátricas',
        body: 'Desidratação, crise asmática, convulsão febril e o atendimento à criança grave.',
      },
    ],
  },
  {
    name: 'Cirurgia & GO',
    slug: 'cirurgia-go',
    h1: 'Cursos de Cirurgia e Ginecologia e Obstetrícia',
    title: 'Cursos de Cirurgia e Ginecologia e Obstetrícia | OneMed',
    description:
      'Cursos de Cirurgia Geral e de Ginecologia e Obstetrícia: técnica cirúrgica, pré e pós-operatório, pré-natal e urgências obstétricas.',
    intro:
      'Cirurgia Geral e Ginecologia e Obstetrícia reunidas: abdome agudo, pré e pós-operatório, técnica cirúrgica, pré-natal, parto e as urgências obstétricas que caem em prova e aparecem no plantão.',
    topics: [
      {
        heading: 'Cirurgia geral e abdome agudo',
        body: 'Apendicite, colecistite, obstrução intestinal e a decisão entre conduta clínica e cirúrgica.',
      },
      {
        heading: 'Pré-natal e assistência ao parto',
        body: 'Rotina de pré-natal, modificações do organismo materno, trabalho de parto e puerpério.',
      },
      {
        heading: 'Urgências em ginecologia e obstetrícia',
        body: 'Síndromes hipertensivas da gestação, hemorragias e abdome agudo na mulher.',
      },
    ],
  },
  {
    name: 'Radiologia & Imagem',
    slug: 'radiologia-imagem',
    h1: 'Cursos de Radiologia e Diagnóstico por Imagem',
    title: 'Cursos de Radiologia e Imagem | OneMed',
    description:
      'Cursos de radiologia para médicos: interpretação de raio-x, tomografia, ultrassonografia e ressonância aplicadas à clínica e à emergência.',
    intro:
      'Aprenda a ler o exame, não a decorar o laudo: raio-x de tórax, tomografia de crânio e abdome, ultrassonografia point-of-care e ressonância aplicadas à decisão clínica.',
    topics: [
      {
        heading: 'Raio-x de tórax e abdome na prática',
        body: 'Leitura sistemática, principais padrões e os achados que mudam a conduta na emergência.',
      },
      {
        heading: 'Tomografia e ressonância aplicadas',
        body: 'Indicações, achados essenciais em neuroimagem e imagem abdominal.',
      },
      {
        heading: 'Ultrassonografia à beira do leito',
        body: 'USG point-of-care, FAST no trauma e ultrassonografia em obstetrícia.',
      },
    ],
  },
  {
    name: 'Semiologia & Clínica',
    slug: 'semiologia-clinica',
    h1: 'Cursos de Semiologia e Clínica Médica',
    title: 'Cursos de Semiologia e Clínica Médica | OneMed',
    description:
      'Cursos de semiologia e clínica médica: anamnese, exame físico e raciocínio diagnóstico para o ciclo clínico e o internato.',
    intro:
      'A base do raciocínio clínico: anamnese, exame físico por sistemas e a construção do diagnóstico diferencial — o conteúdo que sustenta todo o ciclo clínico e o internato.',
    topics: [
      {
        heading: 'Anamnese e exame físico por sistemas',
        body: 'Técnica de exame cardiovascular, respiratório, abdominal e neurológico, passo a passo.',
      },
      {
        heading: 'Raciocínio diagnóstico e casos clínicos',
        body: 'Da queixa ao diagnóstico diferencial, com casos comentados como nas provas práticas.',
      },
      {
        heading: 'Clínica médica para o internato',
        body: 'Os grandes temas de clínica que acompanham o aluno da enfermaria à prova de residência.',
      },
    ],
  },
  {
    name: 'Farmacologia & Bioquímica',
    slug: 'farmacologia-bioquimica',
    h1: 'Cursos de Farmacologia e Bioquímica Médica',
    title: 'Cursos de Farmacologia e Bioquímica | OneMed',
    description:
      'Cursos de farmacologia e bioquímica para o ciclo básico: mecanismos de ação, classes de fármacos e vias metabólicas explicadas com clareza.',
    intro:
      'Farmacologia e bioquímica sem decoreba: mecanismos de ação, principais classes de fármacos, interações e as vias metabólicas que realmente caem em prova.',
    topics: [
      {
        heading: 'Farmacologia por sistemas',
        body: 'Cardiovascular, sistema nervoso central, anti-inflamatórios e antimicrobianos.',
      },
      {
        heading: 'Bioquímica aplicada à medicina',
        body: 'Metabolismo de carboidratos, lipídios e proteínas ligados à fisiopatologia.',
      },
      {
        heading: 'Farmacologia clínica e interações',
        body: 'Escolha racional do fármaco, efeitos adversos e interações medicamentosas relevantes.',
      },
    ],
  },
  {
    name: 'Especialidades',
    slug: 'especialidades',
    h1: 'Cursos de Especialidades Médicas',
    title: 'Cursos de Especialidades Médicas | OneMed',
    description:
      'Cursos de especialidades médicas em um só acervo: nefrologia, neurologia, endocrinologia, hematologia, reumatologia e mais.',
    intro:
      'Um acervo de especialidades para aprofundar depois do básico: nefrologia, neurologia, endocrinologia, hematologia, infectologia, reumatologia e outras áreas, com aulas completas.',
    topics: [
      {
        heading: 'Nefrologia, distúrbios hidroeletrolíticos e ácido-base',
        body: 'Injúria renal aguda, doença renal crônica, potássio e sódio e terapia de substituição renal.',
      },
      {
        heading: 'Neurologia e neurovascular',
        body: 'AVC isquêmico e hemorrágico, AIT, cefaleias e emergências neurológicas.',
      },
      {
        heading: 'Endocrinologia, hematologia e demais especialidades',
        body: 'Diabetes, tireoide, anemias e os temas de especialidade cobrados na residência.',
      },
    ],
  },
  {
    name: 'Anatomia & Ciclo Básico',
    slug: 'anatomia-ciclo-basico',
    h1: 'Cursos de Anatomia e Ciclo Básico de Medicina',
    title: 'Cursos de Anatomia e Ciclo Básico | OneMed',
    description:
      'Cursos de anatomia, fisiologia, histologia e embriologia para o ciclo básico de medicina. Ideal para os primeiros anos da faculdade.',
    intro:
      'Todo o ciclo básico em um só lugar: anatomia humana, fisiologia, histologia, embriologia e patologia — a fundação para o ciclo clínico e o internato.',
    topics: [
      {
        heading: 'Anatomia humana por regiões',
        body: 'Cabeça e pescoço, tórax, abdome, pelve e membros, com correlação clínica.',
      },
      {
        heading: 'Fisiologia e histologia',
        body: 'Funcionamento dos sistemas e a estrutura microscópica que o sustenta.',
      },
      {
        heading: 'Conteúdo para os primeiros anos da faculdade',
        body: 'Material organizado para quem está começando medicina e precisa de base sólida.',
      },
    ],
  },
  {
    name: 'Resumos, Cards & Livros',
    slug: 'resumos-cards-livros',
    h1: 'Resumos Médicos, Flashcards e Livros de Medicina',
    title: 'Resumos, Flashcards e Livros de Medicina | OneMed',
    description:
      'Mais de 9.000 livros médicos, resumos e flashcards de Anki para revisão rápida e memorização de longo prazo.',
    intro:
      'Material de revisão para consolidar o que foi estudado: resumos objetivos, baralhos de flashcards para repetição espaçada e uma biblioteca com mais de 9.000 livros médicos.',
    topics: [
      {
        heading: 'Biblioteca com mais de 9.000 livros médicos',
        body: 'Referências clássicas e atualizadas, organizadas por área, para consulta e estudo.',
      },
      {
        heading: 'Flashcards e repetição espaçada',
        body: 'Baralhos prontos de Anki para fixar o conteúdo que mais cai em prova.',
      },
      {
        heading: 'Resumos para revisão de véspera',
        body: 'Material enxuto para revisar grandes volumes pouco antes da prova.',
      },
    ],
  },
  {
    name: 'Banco de Questões & Simulados',
    slug: 'banco-questoes-simulados',
    h1: 'Banco de Questões e Simulados de Residência Médica',
    title: 'Banco de Questões e Simulados Médicos | OneMed',
    description:
      'Questões comentadas de residência médica por instituição e por estado, com simulados para treinar ritmo e revisar os erros.',
    intro:
      'Questão resolvida é o treino que mais aproxima da prova real: bancos por instituição e por estado, questões comentadas e simulados completos para medir o desempenho.',
    topics: [
      {
        heading: 'Questões comentadas por instituição',
        body: 'Provas das principais bancas de residência, resolvidas e comentadas item a item.',
      },
      {
        heading: 'Simulados completos cronometrados',
        body: 'Treino no formato e no tempo da prova, com análise de acertos por área.',
      },
      {
        heading: 'Revisão dirigida pelos erros',
        body: 'Identifique os temas fracos e volte para as aulas certas em vez de reestudar tudo.',
      },
    ],
  },
  {
    name: 'Extensivo & Intensivo · Residência',
    slug: 'extensivo-intensivo-residencia',
    h1: 'Cursos Extensivos e Intensivos para Residência Médica',
    title: 'Extensivo e Intensivo de Residência Médica | OneMed',
    description:
      'Cursos extensivos e intensivos de preparação para residência médica, com cronograma completo e revisão final para a prova.',
    intro:
      'A preparação estruturada para a prova de residência: extensivos que cobrem o programa inteiro ao longo do ano e intensivos de reta final para revisar o essencial.',
    topics: [
      {
        heading: 'Extensivo de residência médica',
        body: 'Programa completo por área, na sequência pensada para quem estuda durante o ano todo.',
      },
      {
        heading: 'Intensivo e revisão de reta final',
        body: 'Conteúdo condensado nos temas de maior incidência, para as semanas antes da prova.',
      },
      {
        heading: 'Cursos das principais preparatórias',
        body: 'Acervo com material de Estratégia Med, MedGrupo, Medway e outras referências do mercado.',
      },
    ],
  },
  {
    name: 'Revalida',
    slug: 'revalida',
    h1: 'Cursos Preparatórios para o Revalida',
    title: 'Cursos Preparatórios para Revalida | OneMed',
    description:
      'Preparação completa para o Revalida INEP: teoria, questões comentadas e treino para a prova prática de habilidades clínicas.',
    intro:
      'Material dedicado a quem vai revalidar o diploma no Brasil: conteúdo teórico das cinco grandes áreas, questões comentadas do INEP e treino específico para a segunda fase prática.',
    topics: [
      {
        heading: 'Revalida primeira fase: teoria e questões',
        body: 'Clínica médica, cirurgia, pediatria, ginecologia e obstetrícia e medicina preventiva.',
      },
      {
        heading: 'Revalida segunda fase: estações práticas',
        body: 'Treino de habilidades clínicas, comunicação e condutas nas estações da prova prática.',
      },
      {
        heading: 'Organização do estudo para o Revalida',
        body: 'Cronograma e priorização de temas para quem estuda conciliando trabalho.',
      },
    ],
  },
  {
    name: 'Intercâmbio & Carreira Internacional',
    slug: 'intercambio-carreira-internacional',
    h1: 'Carreira Médica Internacional e Intercâmbio',
    title: 'Carreira Médica Internacional e Intercâmbio | OneMed',
    description:
      'Cursos sobre carreira médica no exterior: USMLE, intercâmbio, revalidação de diploma e processos de aplicação internacional.',
    intro:
      'Para quem planeja atuar fora do Brasil: caminhos de revalidação, provas internacionais, intercâmbio durante a graduação e organização do processo de aplicação.',
    topics: [
      {
        heading: 'Provas e certificações internacionais',
        body: 'Panorama do USMLE e de outros exames exigidos para atuar no exterior.',
      },
      {
        heading: 'Intercâmbio durante a graduação',
        body: 'Como buscar estágios e observerships e o que preparar com antecedência.',
      },
      {
        heading: 'Revalidação de diploma em outros países',
        body: 'Etapas, documentação e prazos dos principais destinos.',
      },
    ],
  },
  {
    name: 'Carreira, Gestão & Marketing',
    slug: 'carreira-gestao-marketing',
    h1: 'Carreira Médica, Gestão de Consultório e Marketing',
    title: 'Carreira Médica, Gestão e Marketing | OneMed',
    description:
      'Cursos de carreira médica, gestão de consultório e marketing na saúde, dentro das normas do Conselho Federal de Medicina.',
    intro:
      'O lado que a faculdade não ensina: construir carreira, abrir e gerir consultório, precificar consultas e divulgar o trabalho respeitando as normas do CFM.',
    topics: [
      {
        heading: 'Gestão de consultório e finanças',
        body: 'Estrutura, precificação, convênios e organização financeira do consultório.',
      },
      {
        heading: 'Marketing médico dentro das normas do CFM',
        body: 'Presença digital e captação de pacientes respeitando o código de ética médica.',
      },
      {
        heading: 'Planejamento de carreira médica',
        body: 'Escolha de especialidade, transição para o mercado e desenvolvimento profissional.',
      },
    ],
  },
  {
    name: 'Outros cursos',
    slug: 'outros-cursos',
    h1: 'Outros Cursos de Medicina do Acervo OneMed',
    title: 'Outros Cursos de Medicina | OneMed',
    description:
      'Cursos complementares de medicina que não se encaixam nas demais áreas: temas transversais, ferramentas e conteúdos avulsos.',
    intro:
      'Conteúdos complementares do acervo: temas transversais, ferramentas de estudo e cursos avulsos que não se encaixam nas outras áreas.',
    topics: [
      {
        heading: 'Temas transversais da medicina',
        body: 'Conteúdos que atravessam várias áreas e apoiam a formação como um todo.',
      },
      {
        heading: 'Ferramentas e métodos de estudo',
        body: 'Como estudar medicina com mais eficiência ao longo da graduação.',
      },
    ],
  },
];

export const CATEGORY_BY_SLUG: Record<string, CategorySeo> = Object.fromEntries(
  CATEGORY_SEO.map(c => [c.slug, c]),
);

/**
 * Hubs de pilar: as buscas de maior volume e maior intenção. Cada um é a raiz
 * de um silo e concentra links para as categorias que o sustentam — é assim
 * que a autoridade interna se acumula em vez de se diluir por 17 páginas
 * soltas.
 */
export interface PillarHub {
  slug: string;
  h1: string;
  title: string;
  description: string;
  intro: string;
  /** Categorias que compõem o silo — vira o bloco de links internos. */
  categorySlugs: string[];
  topics: { heading: string; body: string }[];
  faq: { question: string; answer: string }[];
}

export const PILLAR_HUBS: PillarHub[] = [
  {
    slug: 'residencia-medica',
    h1: 'Residência Médica: Cursos, Questões e Simulados',
    title: 'Cursos para Residência Médica | OneMed',
    description:
      'Prepare-se para a residência médica com mais de 530 cursos, questões comentadas e simulados das principais bancas. Teste grátis por 10 minutos.',
    intro:
      'A preparação para a residência médica exige cobrir um programa extenso e treinar muita questão. Aqui você encontra extensivos e intensivos das principais preparatórias do país, banco de questões por instituição e simulados — tudo em um único acesso, sem comprar curso por curso.',
    categorySlugs: [
      'extensivo-intensivo-residencia',
      'banco-questoes-simulados',
      'semiologia-clinica',
      'cardiologia-ecg',
      'emergencia-ps-trauma',
      'pediatria',
      'cirurgia-go',
      'especialidades',
    ],
    topics: [
      {
        heading: 'Cursos extensivos e intensivos de residência',
        body: 'Programas completos para estudar o ano inteiro e revisões condensadas para a reta final da prova.',
      },
      {
        heading: 'Banco de questões comentadas por banca',
        body: 'Provas resolvidas das principais instituições, organizadas por estado e por área, com comentário item a item.',
      },
      {
        heading: 'As grandes áreas cobradas na prova',
        body: 'Clínica médica, cirurgia, pediatria, ginecologia e obstetrícia e medicina preventiva, com aulas dirigidas ao edital.',
      },
    ],
    faq: [
      {
        question: 'Quais cursos de residência médica estão inclusos no acesso?',
        answer:
          'O acervo reúne mais de 530 cursos completos, incluindo material de referências do mercado como Estratégia Med, MedGrupo e Medway, além de banco de questões e simulados. O acesso é único: não é preciso comprar curso por curso.',
      },
      {
        question: 'Dá para testar antes de assinar?',
        answer:
          'Sim. O teste gratuito de 10 minutos libera a plataforma completa, sem cartão de crédito, para você conferir o acervo antes de decidir.',
      },
      {
        question: 'O conteúdo é atualizado?',
        answer:
          'Sim. A biblioteca recebe atualizações mensais e, no plano Vitalício Pro, também semanais, acompanhando os lançamentos das principais preparatórias.',
      },
      {
        question: 'Em quantos dispositivos posso estudar ao mesmo tempo?',
        answer:
          'Depende do plano: o Mensal permite 1 tela, o Anual e o Vitalício 2 telas, o Vitalício Plus 4 telas e o Vitalício Pro 6 telas simultâneas.',
      },
    ],
  },
  {
    slug: 'revalida',
    h1: 'Revalida: Cursos Preparatórios e Questões Comentadas',
    title: 'Cursos Preparatórios para o Revalida | OneMed',
    description:
      'Preparação completa para o Revalida INEP: teoria das cinco grandes áreas, questões comentadas e treino para a prova prática. Teste grátis.',
    intro:
      'Revalidar o diploma no Brasil exige dominar as cinco grandes áreas na primeira fase e provar habilidade clínica na segunda. O acervo reúne o conteúdo teórico, as questões comentadas do INEP e o material de treino para as estações práticas.',
    categorySlugs: [
      'revalida',
      'banco-questoes-simulados',
      'semiologia-clinica',
      'cirurgia-go',
      'pediatria',
      'emergencia-ps-trauma',
      'intercambio-carreira-internacional',
    ],
    topics: [
      {
        heading: 'Primeira fase do Revalida: teoria e questões',
        body: 'Clínica médica, cirurgia, pediatria, ginecologia e obstetrícia e medicina preventiva, com provas anteriores comentadas.',
      },
      {
        heading: 'Segunda fase: estações de habilidades clínicas',
        body: 'Treino das estações práticas, com foco em anamnese dirigida, exame físico, comunicação e conduta.',
      },
      {
        heading: 'Estudo para quem concilia com o trabalho',
        body: 'Material organizado para estudo fracionado, com resumos e flashcards para revisão rápida.',
      },
    ],
    faq: [
      {
        question: 'O material cobre as duas fases do Revalida?',
        answer:
          'Sim. Há conteúdo teórico e questões comentadas para a primeira fase e material de treino de estações clínicas para a segunda fase prática.',
      },
      {
        question: 'Preciso comprar um curso específico de Revalida?',
        answer:
          'Não. O acesso à OneMed inclui o acervo inteiro, com os cursos de Revalida junto de todas as outras áreas.',
      },
      {
        question: 'Consigo estudar pelo celular?',
        answer:
          'Sim. A plataforma funciona no navegador do celular, tablet e computador, com o progresso das aulas sincronizado entre os dispositivos.',
      },
    ],
  },
  {
    slug: 'ciclo-basico',
    h1: 'Ciclo Básico de Medicina: Anatomia, Fisiologia e Bioquímica',
    title: 'Cursos do Ciclo Básico de Medicina | OneMed',
    description:
      'Cursos de anatomia, fisiologia, histologia, embriologia e bioquímica para os primeiros anos de medicina. Videoaulas, resumos e flashcards.',
    intro:
      'Os primeiros anos de medicina definem a base de tudo que vem depois. Reunimos anatomia, fisiologia, histologia, embriologia, bioquímica e farmacologia em um acervo único, com videoaulas, resumos e flashcards para revisão espaçada.',
    categorySlugs: [
      'anatomia-ciclo-basico',
      'farmacologia-bioquimica',
      'semiologia-clinica',
      'resumos-cards-livros',
    ],
    topics: [
      {
        heading: 'Anatomia humana com correlação clínica',
        body: 'Estudo por regiões, ligando cada estrutura ao que aparece depois na prática clínica.',
      },
      {
        heading: 'Fisiologia e bioquímica sem decoreba',
        body: 'Mecanismos explicados a partir da lógica do funcionamento do corpo, não de listas para memorizar.',
      },
      {
        heading: 'Como revisar o ciclo básico',
        body: 'Resumos e flashcards de repetição espaçada para não esquecer o básico no ciclo clínico.',
      },
    ],
    faq: [
      {
        question: 'O acervo serve para quem está no primeiro ano de medicina?',
        answer:
          'Sim. Há cursos completos de anatomia, fisiologia, histologia, embriologia e bioquímica, além de mais de 9.000 livros médicos para consulta.',
      },
      {
        question: 'Tem material de revisão além das videoaulas?',
        answer:
          'Sim. Além das aulas, o acervo inclui resumos, flashcards de Anki e livros, e a plataforma permite anotar por cima dos PDFs.',
      },
    ],
  },
  {
    slug: 'ciclo-clinico-internato',
    h1: 'Ciclo Clínico e Internato: Aulas Práticas e Condutas',
    title: 'Cursos de Ciclo Clínico e Internato | OneMed',
    description:
      'Aulas práticas de ciclo clínico e internato: semiologia, condutas de enfermaria, prescrição e rotinas de plantão para o dia a dia.',
    intro:
      'No ciclo clínico e no internato a cobrança muda: deixa de ser teoria e passa a ser conduta. Este silo reúne semiologia, raciocínio diagnóstico, prescrição e as rotinas práticas de enfermaria, ambulatório e plantão.',
    categorySlugs: [
      'semiologia-clinica',
      'prescricoes-plantao',
      'emergencia-ps-trauma',
      'radiologia-imagem',
      'especialidades',
      'cirurgia-go',
    ],
    topics: [
      {
        heading: 'Semiologia e raciocínio diagnóstico',
        body: 'Anamnese, exame físico por sistemas e construção do diagnóstico diferencial em casos reais.',
      },
      {
        heading: 'Prescrição e condutas de enfermaria',
        body: 'Prescrever com segurança, evoluir o paciente e conduzir as intercorrências mais comuns.',
      },
      {
        heading: 'Rotinas de plantão e emergência',
        body: 'Atendimento inicial, priorização e as condutas que o interno precisa dominar no PS.',
      },
    ],
    faq: [
      {
        question: 'O conteúdo ajuda no internato de verdade, no dia a dia?',
        answer:
          'Sim. Há cursos dedicados a prescrição, rotinas de plantão e condutas de enfermaria, além de semiologia aplicada, pensados para a prática e não só para a prova.',
      },
      {
        question: 'Consigo baixar as aulas e os materiais?',
        answer:
          'Sim. Cada aula e cada arquivo tem download individual pela própria plataforma, com o nome e a extensão originais.',
      },
    ],
  },
];

export const HUB_BY_SLUG: Record<string, PillarHub> = Object.fromEntries(
  PILLAR_HUBS.map(h => [h.slug, h]),
);

/** Toda rota pública indexável. Alimenta o prerender e o sitemap. */
export interface PublicRoute {
  path: string;
  /** Peso relativo no sitemap. */
  priority: number;
  changefreq: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

export const PUBLIC_ROUTES: PublicRoute[] = [
  { path: '/', priority: 1.0, changefreq: 'daily' },
  { path: '/planos', priority: 0.9, changefreq: 'weekly' },
  { path: '/cursos', priority: 0.9, changefreq: 'weekly' },
  ...PILLAR_HUBS.map(h => ({
    path: `/${h.slug}`,
    priority: 0.9,
    changefreq: 'weekly' as const,
  })),
  ...CATEGORY_SEO.map(c => ({
    path: `/cursos/${c.slug}`,
    priority: 0.8,
    changefreq: 'weekly' as const,
  })),
  { path: '/termos', priority: 0.2, changefreq: 'yearly' },
  { path: '/privacidade', priority: 0.2, changefreq: 'yearly' },
];

/**
 * Rotas que NÃO podem ser indexadas: área do aluno (conteúdo pago), painel
 * admin e as páginas de retorno do pagamento. Indexar qualquer uma delas é
 * problema real — vaza conteúdo pago para o índice e enche a busca de
 * páginas de checkout sem valor.
 */
export const NOINDEX_PREFIXES = ['/admin', '/membros', '/payment', '/checkout', '/claim-access', '/login'];

export function isNoIndexPath(path: string): boolean {
  return NOINDEX_PREFIXES.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
}

export function canonicalUrl(path: string): string {
  if (path === '/') return `${SITE_URL}/`;
  return `${SITE_URL}${path.replace(/\/+$/, '')}`;
}
