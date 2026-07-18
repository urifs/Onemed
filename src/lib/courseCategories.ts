import {
  HeartPulse, Siren, Pill, Baby, Scissors, ScanLine, Stethoscope, FlaskConical,
  Layers, Bone, BookMarked, ListChecks, GraduationCap, Globe2, Briefcase, FolderOpen,
  type LucideIcon,
} from 'lucide-react';

// Same order used by the member-sync-library edge function's categorizer,
// so dashboard rows read in a sensible, stable sequence.
export const CATEGORY_ORDER = [
  'Cardiologia & ECG',
  'Emergência, PS & Trauma',
  'Prescrições & Plantão',
  'Pediatria',
  'Cirurgia & GO',
  'Radiologia & Imagem',
  'Semiologia & Clínica',
  'Farmacologia & Bioquímica',
  'Especialidades',
  'Anatomia & Ciclo Básico',
  'Resumos, Cards & Livros',
  'Banco de Questões & Simulados',
  'Grandes Cursos · Extensivo R1',
  'Revalida & Internacional',
  'Carreira, Gestão & Marketing',
  'Outros cursos',
];

export const CATEGORY_ICON: Record<string, LucideIcon> = {
  'Cardiologia & ECG': HeartPulse,
  'Emergência, PS & Trauma': Siren,
  'Prescrições & Plantão': Pill,
  'Pediatria': Baby,
  'Cirurgia & GO': Scissors,
  'Radiologia & Imagem': ScanLine,
  'Semiologia & Clínica': Stethoscope,
  'Farmacologia & Bioquímica': FlaskConical,
  'Especialidades': Layers,
  'Anatomia & Ciclo Básico': Bone,
  'Resumos, Cards & Livros': BookMarked,
  'Banco de Questões & Simulados': ListChecks,
  'Grandes Cursos · Extensivo R1': GraduationCap,
  'Revalida & Internacional': Globe2,
  'Carreira, Gestão & Marketing': Briefcase,
  'Outros cursos': FolderOpen,
};
