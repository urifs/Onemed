import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

const bookCategories = [
  'Anatomia', 'Anestesiologia', 'Biofísica', 'Bioquímica', 'Biologia e Citologia',
  'Cardiologia', 'Casos Clínicos', 'Cirurgia', 'Clínica Médica', 'Dermatologia',
  'Dicionário Médico', 'Embriologia', 'Emergência e PS', 'Endocrinologia',
  'Epidemiologia', 'Exames Laboratoriais', 'Farmacologia', 'Fisiologia',
  'Gastroenterologia', 'Genética', 'Geriatria', 'Ginecologia e Obstetrícia',
  'Histologia', 'História da Medicina', 'Imunologia', 'Infectologia',
  'Internato Residência', 'Intervenção', 'Medicina Baseada em Evidências',
  'Medicina Complementar', 'Medicina de Família', 'Medicina do Esporte',
  'Medicina do Trabalho', 'Medicina Intensiva', 'Medicina Legal',
  'Medicina Nuclear', 'Metodologia Científica', 'Microbiologia',
  'Nefrologia', 'Neonatologia', 'Netter', 'Neurologia', 'Nutrologia',
  'Oftalmologia', 'Oncologia', 'Ortopedia', 'Otorrinolaringologia',
  'Parasitologia', 'Patologia', 'Pediatria', 'Pneumologia', 'Psiquiatria',
  'Radiologia', 'Reumatologia', 'Semiologia', 'SUS',
  'Toxicologia', 'Urologia', 'Resumos', 'Manuais e Artigos',
];

export const BooksSection = () => {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? bookCategories : bookCategories.slice(0, 24);

  return (
    <section className="py-24 bg-background">
      <div className="shell-page px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <h2 className="font-secondary text-3xl md:text-4xl font-bold text-foreground mb-2">
              Biblioteca médica completa
            </h2>
            <p className="text-muted-foreground text-sm">
              {bookCategories.length} especialidades, livros atualizados e traduzidos para o português.
            </p>
          </div>
          <span className="text-2xl font-secondary font-bold text-primary shrink-0">9.000+</span>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {displayed.map((category, i) => (
            <span
              key={i}
              className="border border-border text-muted-foreground px-3.5 py-1.5 rounded-lg text-sm hover:border-primary/40 hover:text-foreground transition-colors duration-150 cursor-default"
            >
              {category}
            </span>
          ))}
        </div>

        {!showAll && (
          <Button
            variant="outline"
            onClick={() => setShowAll(true)}
            className="border-border text-muted-foreground hover:text-foreground hover:bg-secondary gap-2"
          >
            Ver todas as especialidades ({bookCategories.length - 24} mais)
            <ChevronDown className="w-4 h-4" />
          </Button>
        )}
      </div>
    </section>
  );
};

export default BooksSection;
