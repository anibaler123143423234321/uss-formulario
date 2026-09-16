export type LikertRating = 'MUY BUENO' | 'BUENO' | 'REGULAR' | 'DEFICIENTE' | 'MUY DEFICIENTE';

export interface CapacitacionEvento {
  id: number;
  nombre: string;
  expositor: string;
  descripcion?: string;
  fecha_evento?: string;
  activo: boolean;
}

export interface MaestriaItem {
  id: number;
  nombre: string;
  activo?: boolean;
}

export interface FormParticipantAttributes {
  personaId?: number;
  capacitacionId?: number;
  maestriaId?: number;
  apellidosNombres: string;
  correo: string;
  expositor?: string;
  nombreCapacitacion?: string;
  esMasculino: boolean;
  edad: string | number;
  celular: string;
  maestria?: string;
  departamentoId: number;
  provinciaId: number;
  distritoId: number;

  // Metadata visual opcional para exportación
  sexo?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
}

export interface FormEvaluationAnswers {
  // Organización (Valores numéricos 1 a 5)
  organizacion_horario: number;
  organizacion_instalaciones: number;
  organizacion_audiovisuales: number;
  
  // El Capacitador (Valores numéricos 1 a 5)
  capacitador_tema: number;
  capacitador_dominio: number;
  capacitador_metodologia: number;
  capacitador_tiempo: number;
  
  // Documentación (Valores numéricos 1 a 5)
  documentacion_calidad: number;
  documentacion_contenido: number;
  
  // Satisfacción General y Sugerencias
  satisfaccion_general: number;
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
