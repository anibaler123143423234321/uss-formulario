export type LikertRating = 'MUY BUENO' | 'BUENO' | 'REGULAR' | 'DEFICIENTE' | 'MUY DEFICIENTE';

export interface FormParticipantAttributes {
  apellidosNombres: string;
  correo: string;
  puestoTrabajo: string;
  expositor: string;
  nombreCapacitacion: string;
  sexo: string;
  edad: string;
  celular: string;
  maestria: string;
  departamento: string;
  provincia: string;
  distrito: string;
}

export interface FormEvaluationAnswers {
  // Organización
  organizacion_horario: LikertRating | '';
  organizacion_instalaciones: LikertRating | '';
  organizacion_audiovisuales: LikertRating | '';
  
  // El Capacitador
  capacitador_tema: LikertRating | '';
  capacitador_dominio: LikertRating | '';
  capacitador_metodologia: LikertRating | '';
  capacitador_tiempo: LikertRating | '';
  
  // Documentación
  documentacion_calidad: LikertRating | '';
  documentacion_contenido: LikertRating | '';
  
  // Satisfacción General y Sugerencias
  satisfaccion_general: LikertRating | '';
  observaciones_sugerencias: string;
}

export interface CapacitacionResponseRecord extends FormParticipantAttributes, FormEvaluationAnswers {
  id?: string;
  created_at?: string;
  sync_status?: 'synced' | 'local_only';
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  tableName: string;
}
