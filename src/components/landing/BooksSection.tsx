import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BookMarked, ChevronDown } from 'lucide-react';

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
    <section className="py-24 bg-background-paper">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-sm font-mono px-4 py-1.5 rounded-full mb-6">
            <BookMarked className="w-4 h-4" />
            +9.000 Livros Médicos
          </span>
          <h2 className="font-secondary text-4xl md:text-5xl font-bold text-foreground mb-4">
            Biblioteca Médica Completa
          </h2>
          <p className="text-muted-foreground text-lg">
            {bookCategories.length} especialidades — livros atualizados e traduzidos para o português
          </p>
        </div>

        <div className="flex flex-wrap gap-3 justify-center mb-8">
          {displayed.map((category, i) => (
            <span
              key={i}
              className="glass border border-border text-muted-foreground px-4 py-2 rounded-full text-sm hover:border-primary/30 hover:text-foreground transition-colors duration-200 cursor-default"
            >
              {category}
            </span>
          ))}
        </div>

        {!showAll && (
          <div className="text-center">
            <Button
              variant="outline"
              onClick={() => setShowAll(true)}
              className="border-border text-muted-foreground hover:text-foreground hover:bg-secondary gap-2"
            >
              Ver todas as especialidades ({bookCategories.length - 24} mais)
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default BooksSection;
