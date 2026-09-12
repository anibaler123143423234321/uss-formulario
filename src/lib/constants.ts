import type { LikertRating, MaestriaItem } from './types';

export const MAESTRIAS_USS = [
  "MAESTRÍA EN PSICOLOGÍA CLÍNICA Y COMUNITARIA",
  "MAESTRÍA EN GESTIÓN DE LA INNOVACIÓN EN ESTOMATOLOGÍA",
  "MAESTRÍA EN GERENCIA DE SERVICIOS DE SALUD",
  "MAESTRÍA EN ENFERMERÍA Y GESTIÓN INTEGRAL DEL CUIDADO",
  "MAESTRÍA EN GOBIERNO Y GESTIÓN DE LA SALUD PÚBLICA",
  "MAESTRÍA EN TRIBUTACIÓN NACIONAL E INTERNACIONAL",
  "MAESTRÍA EN GESTIÓN DEL TALENTO HUMANO",
  "MAESTRÍA EN ADMINISTRACIÓN Y MARKETING DIGITAL",
  "MAESTRÍA EN ADMINISTRACIÓN DE NEGOCIOS - MBA",
  "MAESTRÍA EN DERECHO PENAL Y PROCESAL PENAL",
  "MAESTRÍA EN DERECHO LABORAL",
  "MAESTRÍA EN DERECHO NOTARIAL Y REGISTRAL",
  "MAESTRÍA EN DERECHO CIVIL Y PROCESAL CIVIL",
  "MAESTRÍA EN COACHING Y LIDERAZGO EDUCATIVO",
  "MAESTRÍA EN CIENCIAS DE LA EDUCACIÓN CON MENCIÓN EN GESTIÓN DE LA CALIDAD Y ACREDITACIÓN EDUCATIVA",
  "MAESTRÍA EN CIENCIAS DE LA EDUCACIÓN CON MENCIÓN EN GESTIÓN EDUCATIVA"
];

export const MAESTRIAS_FALLBACK: MaestriaItem[] = MAESTRIAS_USS.map((nombre, idx) => ({
  id: idx + 1,
  nombre
}));

export const CAPACITACION_DEFAULT = {
  nombre: 'Inducción Maestría USS 202602',
  expositor: 'Escuela de Posgrado USS'
};

export interface QuestionItem {
  id: string;
  name: string;
  label: string;
}

export interface QuestionSection {
  id: string;
  tabTitle: string;
  title: string;
  subtitle: string;
  icon: string;
  questions: QuestionItem[];
}

export const QUESTION_SECTIONS: QuestionSection[] = [
  {
    id: 'organizacion',
    tabTitle: '2. Organización',
    title: 'ORGANIZACIÓN DE LA CAPACITACIÓN',
    subtitle: 'Califique los aspectos logísticos y organizacionales del evento.',
    icon: '🏢',
    questions: [
      {
        id: 'q_horario',
        name: 'organizacion_horario',
        label: 'El horario y duración de la capacitación.'
      },
      {
        id: 'q_instalaciones',
        name: 'organizacion_instalaciones',
        label: 'Las instalaciones donde se realizó la capacitación.'
      },
      {
        id: 'q_audiovisuales',
        name: 'organizacion_audiovisuales',
        label: 'Los medios audiovisuales y equipamiento.'
      }
    ]
  },
  {
    id: 'capacitador',
    tabTitle: '3. El Capacitador',
    title: 'DESARROLLO DEL EVENTO: EL CAPACITADOR',
    subtitle: 'Evalúe el desempeño pedagógico y dominio del expositor.',
    icon: '👨‍🏫',
    questions: [
      {
        id: 'q_tema',
        name: 'capacitador_tema',
        label: 'La selección del tema tratado por el expositor.'
      },
      {
        id: 'q_dominio',
        name: 'capacitador_dominio',
        label: 'El dominio del expositor sobre la materia.'
      },
      {
        id: 'q_metodologia',
        name: 'capacitador_metodologia',
        label: 'La metodología de trabajo y dinámicas aplicadas.'
      },
      {
        id: 'q_tiempo',
        name: 'capacitador_tiempo',
        label: 'El tiempo de participación y resolución de dudas del expositor.'
      }
    ]
  },
  {
    id: 'documentacion',
    tabTitle: '4. Documentación',
    title: 'DOCUMENTACIÓN DE LA CAPACITACIÓN',
    subtitle: 'Evalúe los materiales y recursos educativos facilitados.',
    icon: '📑',
    questions: [
      {
        id: 'q_calidad_slides',
        name: 'documentacion_calidad',
        label: 'La calidad de las diapositivas y recursos utilizados.'
      },
      {
        id: 'q_contenido_slides',
        name: 'documentacion_contenido',
        label: 'El contenido y claridad de las diapositivas.'
      }
    ]
  }
];

export const LIKERT_OPTIONS: { label: LikertRating; score: number; color: string; bg: string; icon: string }[] = [
  { label: 'MUY BUENO', score: 5, color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', icon: '🌟' },
  { label: 'BUENO', score: 4, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', icon: '👍' },
  { label: 'REGULAR', score: 3, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', icon: '👌' },
  { label: 'DEFICIENTE', score: 2, color: '#f97316', bg: 'rgba(249, 115, 22, 0.12)', icon: '⚠️' },
  { label: 'MUY DEFICIENTE', score: 1, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', icon: '👎' }
];

export const LIKERT_SCORE_MAP: Record<string, number> = {
  'MUY BUENO': 5,
  'BUENO': 4,
  'REGULAR': 3,
  'DEFICIENTE': 2,
  'MUY DEFICIENTE': 1
};
