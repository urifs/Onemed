import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { GraduationCap, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

const allCourses: Record<string, string[]> = {
  'Estratégia Med': [
    'Extensivo 2025', 'Intensivo 2025', 'Exclusive 2025', 'Curso Prático 2025',
    'Material Complementar 2025', 'Memorex e Rastreamentos 2025', 'Cronogramas e Guia Estatístico',
    'R+ GO Intensivo 2024', 'Sprint Revalida INEP 2025', 'Curso Multimídia',
    'Atualizações para Prova de Residência', 'FlashCards', 'Mentoria Pré-Edital 2025',
    'OSCE Prova Prática', 'Psicopatologia e Psiquiatria', 'Semiologia do Zero',
    '+20mil Banco de Questões', 'Questões por Matéria', 'Questões por Área', 'Simulados',
  ],
  'MedGrupo / MedCurso': [
    'MEDCurso 2025 Completo', 'MedCurso Intensivão', 'Intensivão R1 2024', 'Intensivão R+ 2024',
    'CPMED 2024', 'MedEletro 2024', 'MedFoco 2024', 'MedImagem 2024', 'MedATB',
    'VentilaMed 2024', 'Apostilas e Questões por Bloco', 'Fichas', 'Mapas Mentais',
    'Resumos', 'Slides', 'Resumo Hack', '+4mil Simulados por Ano', '+80mil Banco de Questões',
    'TEP R+ Cirurgia', 'TEP R+ Clínica Médica', 'TEP R+ GO', 'TEP R+ Pediatria',
    'TEP R+ TED Dermatologia', 'TEP R4 GO', 'TEP Pediatria Completo', 'Revalida MedGrupo',
    'FluidMed Super Planner + MedPlanner', 'PED/PREV',
  ],
  'Medway': [
    'Extensivo 2025', 'Intensivo SP 2025', 'CR Medway', 'Pronto Socorro 2025',
    'ECG', 'Gasometria', 'Radiologia 2025', 'Provas de Instituições',
    'Guia de Antibioticoterapia (Papo de Clínica)', 'Simulados por Instituição',
  ],
  'Medcof': [
    'Extensivo 2025', 'R+ CLM 2024', 'R3 Cirurgia 2024', 'HIIT 2024', 'HIIT Cirurgia 2023',
    'ECG, USG e Endoscopia', 'Prescrições 2025', 'Check-list', 'Revisão de Véspera R1 e R+',
    '+5mil Questões',
  ],
  'Medcel / Afya': [
    'Extensivo Afya', 'Emergências Clínicas', 'Habilidades Médicas', 'Terapia Intensiva',
    'Cirurgia - Urgências e Emergências', 'GO Papers Afya 2024', 'IA para Médicos',
  ],
  'Sanar': [
    'SanarFlix Completo 2025', 'SanarFlix Extensivo R1', 'Ciclo Básico Completo',
    'Pré Internato', 'Radiologia e Imagens', 'Resumos', 'Ética Médica',
  ],
  'HardWork': [
    'Curso Completo', 'Hard Topics', 'Lives', 'Revalida', 'Complementos',
  ],
  'Eu Médico Residente': [
    'Extensivo 2024', 'Semi Extensivo R1', 'Revisão R1', 'Eletro, Antibiótico e Imagem',
  ],
  'Cardiologia': [
    'CardioClub Intensivo ECG XIV - Rhanderson', 'CardioClub Rhanderson Cardoso',
    'Cardiopapers Curso de Consultório 2024', 'Cardiopapers ECG', 'Cardiopapers MBE',
    'Curso de Diabetes', 'Curso de Dislipidemias', 'Curso de Produtividade',
    'Cardiologia na Prática 2.0 - Emergências', 'ECG na Prática - Bárbara Valente',
    'InCor Eletrocardiograma', 'Facilitando Eletro', 'Dr Neif ECG', 'MedNeif Infarto',
    'Intensivo de Metas Rhanderson 2023', 'Questões em Cardiologia - Emergências',
  ],
  'Emergência e UTI': [
    'UTI Online HCFMUSP 2ª Edição', 'UTI Papers Guia de Bolso', 'Medicina Intensiva USP',
    'Medicina de Emergência USP', 'Escola de Emergência 2024 - Grupo Mover',
    'MeuStaff Capacitação em Emergência', 'Emergências Herlon',
    'Raciocínio Clínico na Emergência', 'Treinamento em Emergência - Victor Galvão',
    'Manejo de Sangramento em Pacientes Graves', 'Manole Terapia Intensiva',
  ],
  'PS Zerado': [
    'Curso Regular 3.0', 'Extras', 'Curso Avançado de Trauma',
    'Treinamento de Sutura e Manejo de Feridas', 'PS Zerado 2025',
  ],
  'Ventilação Mecânica': [
    'Dr Thiago Chaves Pacote Completo', 'Ventilação Danielle Bastos',
    'VentilaMed MedGrupo', 'Manole Ventilação Mecânica',
  ],
  'Pediatria': [
    'Pediatria 360', 'SBP Pediatria 4ª Edição', 'Método AEP - Academia Emergência Pediátrica',
    'Pronto Atendimento Pediátrico na Prática',
  ],
  'Cirurgia e Suturas': [
    'Descomplicando a Sutura - Dra Flávia Ju', 'Jaleko Curso de Sutura - Pedro Bertelli',
    'Medcel Urgências e Emergências Cirúrgicas',
  ],
  'Ginecologia e Obstetrícia': [
    'Manole GO 9ª Edição', 'Jaleko Ginecologia', 'GO Papers Afya 2024',
  ],
  'Clínica Médica': [
    'Manole Clínica Médica 3ª Edição', 'Semiologia Clínica USP', 'Semiologia do Zero',
    'Base do Exame Clínico - Celmo Porto', 'Tá de Clinicagem Antibioticoterapia',
    'Tá de Clinicagem Pronto Atendimento',
  ],
  'Neurologia': [
    'NeuroPost Completo 2024', 'Neuroanatomia Aplicada',
  ],
  'Psiquiatria': [
    'Psiquiatria na Prática', 'Psiquiatria em 12 Tópicos', 'Psicopatologia EstratégiaMed',
  ],
  'Infectologia': [
    'Infectoflix 2024', 'SOS Antibiótico', 'Curso de Antibiótico Tá de Clinicagem',
    'Guia de Antibioticoterapia Papo de Clínica + Medway',
  ],
  'Nefrologia': [
    'NefroFlix Aprenda Nefro', 'Nefropapers Eletrólitos e Ácido Base',
    'Aprenda Nefro Distúrbios Hidroeletrolíticos', 'Aprenda Nefro Gasometria',
  ],
  'Pneumologia': [
    'Descomplicando a Pneumologia - Dr Megda',
  ],
  'Dermatologia': [
    'Dermatopapers 2023', 'Emerg.SIMM Dermato no PS',
  ],
  'Endocrinologia': [
    'Endocrinopapers Completo', 'Endocrinologia Ambulatorial 2025',
  ],
  'Ortopedia': [
    'Ortoacademy 2025', 'Ortopedia para o Clínico',
  ],
  'Radiologia e Imagem': [
    'Você Radiologista Radiografia', 'Você Radiologista Tomografia',
    'Você Radiologista USG', 'RadioPosts Radiologia', 'RadioPosts Tomografia na Emergência',
    'USG Master Dr. Mauricio Magalhães', 'MedImagem R 2024',
  ],
  'Farmacologia': [
    'Farmacologia Mapeada Instituto INCAF', 'Farmacologia na Prática - Interações',
    'Além da Farmacologia',
  ],
  'Semiologia': [
    'Semiologia Clínica USP', 'Semiologia do Zero', 'Base do Exame Clínico Celmo Porto',
  ],
  'Anatomia e Ciclo Básico': [
    'AnatomyFlix Anatomia', 'Anatomia MuscleFlix', 'MedSimple Anatomia',
    'MedSimple Ciclo Básico Completo', 'Dominando a Bioquímica',
    'SanarFlix Ciclo Básico', 'Jaleko Gasometria',
  ],
  'Revalida': [
    'Estratégia Med Sprint Revalida INEP 2025', 'HardWork Revalida',
    'MedGrupo Revalida', 'RedBook Revalida 3ª Edição', 'Mundo Revalida Intensivo 2025',
    'Foco no CRM Revalidação BR', 'Mentoria Revalidei Prático', 'Provas Revalida 2011-2023',
  ],
  'Preparatório Residência': [
    'Aristo + JJ Mentoria', 'JJ Mentoria', 'Currículo Médico Mundo Afora 2024',
    'Programa PPA Clara Aragão', 'Planilhas para Residência', 'Saúde da Família Mentoria',
    '+100 Compilados Provas Residência', 'Provas Anteriores Instituições',
  ],
  'Plantão e Prescrição': [
    'Manole Prescrição no Plantão 2ª Edição', 'Jaleko Prescrição Médica',
    'Plantão Sempre Tranquilo', 'Prescrições UBS e PA 2025', 'Prescrições de Plantão 2025',
    'Medicações no PS', 'Mais Frequentes Plantão', 'Emerg.SIMM Dominando o Dia-Dia',
  ],
  'Intubação e Procedimentos': [
    'Dr Thiago Chaves Intubação', 'Intubaclass 2024', 'Sala de Parada Academy',
  ],
  'Medicina do Esporte': [
    'Paulo Muzy Performance com Saúde',
  ],
  'Medicina Legal e Perícia': [
    'Perícia Médica sem Segredos 2025', 'Direito Médico Prof. Isadora',
  ],
  'Inglês Médico': [
    'Med Idiomas Inglês para Médicos 2025', 'Você Médico nos EUA - RD Medicine',
    'CV Premium EUA', 'O que Você Precisa Saber USMLE', 'O que Você Precisa Saber Reino Unido',
    'Estágios Medicina EUA - Letícia Pretti',
  ],
  'Livros e Materiais': [
    '+9.000 Livros Médicos', 'MedLivros 1.0 e 2.0', 'Apostilas Conceitos Matadores',
    'Amo Resumos', 'Decoreba e Memorex', 'Mapas Mentais e Resumos', 'FlashCards Anki',
    'MedCards Atualizado', 'MedResumos 2025', 'MedRout PDFs', 'Super Planilha para Estudos',
  ],
  'Bancos de Questões': [
    '+100.000 Questões Estratégia', '+80.000 Questões MedGrupo', '+56.000 Questões MED',
    'Banco Questões CasalMed', 'MedQ Resumos e Simulados', 'Questões Comentadas por Estado',
    'Simulados MedFoco', 'Simulados Enamed MedReview',
  ],
  'Apps Premium': [
    'Whitebook Premium Android', 'WeMeds Premium', 'Apps Modificados',
  ],
  'Outros Cursos': [
    'AHA ACLS', 'Academia Praxys', 'AlphaMed', 'Análise Laboratorial RevisaMed 2025',
    'Anamnese e Receitas 2025', 'AnestReview', 'APS101 2024', 'Bora Salvar 24hrs',
    'Casal Med 2025', 'Comunidade Medicina Intuitiva', 'Comunidade Padrão Total',
    'Descomplicando a Medicina', 'Empreendedorismo e Medicina', 'Marketing Médico',
    'Instagram para Médicos', 'Med Neif Completo 2025', 'Médico na Prática 2024',
    'MemoriMED 2.0 2025', 'PROGEB', 'Raciocínio Clínico Vitor Borin',
    'Renda na Faculdade', 'Sons Littmann na Ausculta',
  ],
};

export const CoursesSection = () => {
  const [openPlatform, setOpenPlatform] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const platforms = Object.keys(allCourses);
  const displayed = showAll ? platforms : platforms.slice(0, 6);
  const totalCourses = Object.values(allCourses).reduce((sum, c) => sum + c.length, 0);

  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="font-mono text-xs uppercase tracking-widest text-primary mb-4">Conteúdo</p>
          <h2 className="font-secondary text-4xl md:text-5xl font-bold text-foreground mb-4">
            +530 Cursos Médicos
          </h2>
          <p className="text-muted-foreground text-lg">
            As melhores plataformas médicas do Brasil em um só lugar — {platforms.length} categorias, +{totalCourses} cursos
          </p>
        </div>

        <div className="space-y-3 max-w-4xl mx-auto">
          {displayed.map(platform => (
            <Collapsible
              key={platform}
              open={openPlatform === platform}
              onOpenChange={(open) => setOpenPlatform(open ? platform : null)}
            >
              <CollapsibleTrigger className="w-full glass rounded-xl px-5 py-4 flex items-center justify-between hover:border-primary/30 transition-colors duration-200 group border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <GraduationCap className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-secondary font-semibold text-foreground">{platform}</span>
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                    {allCourses[platform].length} cursos
                  </span>
                </div>
                {openPlatform === platform ? (
                  <ChevronUp className="w-4 h-4 text-primary" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="glass rounded-b-xl border border-t-0 border-border px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    {allCourses[platform].map((course, i) => (
                      <span
                        key={i}
                        className="text-xs bg-secondary text-muted-foreground border border-border px-3 py-1 rounded-full hover:text-foreground hover:border-primary/30 transition-colors"
                      >
                        {course}
                      </span>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>

        {!showAll && platforms.length > 6 && (
          <div className="text-center mt-6">
            <Button
              variant="outline"
              onClick={() => setShowAll(true)}
              className="border-border text-muted-foreground hover:text-foreground hover:bg-secondary gap-2"
            >
              Ver todas as {platforms.length} categorias
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default CoursesSection;
