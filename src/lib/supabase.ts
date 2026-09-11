import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { CapacitacionResponseRecord } from './types';

// Obtener cliente oficial de Supabase estrictamente desde variables de entorno
export function getSupabaseClient(): SupabaseClient | null {
  const url = (import.meta.env.PUBLIC_SUPABASE_URL as string) || (import.meta.env.VITE_SUPABASE_URL as string) || '';
  const anonKey = (import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string) || (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

  if (!url || !anonKey) {
    console.error('Faltan variables de entorno: PUBLIC_SUPABASE_URL o PUBLIC_SUPABASE_ANON_KEY');
    return null;
  }

  try {
    return createClient(url, anonKey);
  } catch (error) {
    console.error('Error al inicializar cliente Supabase:', error);
    return null;
  }
}

// Map frontend camelCase to snake_case for Supabase
function recordToDatabaseRow(record: CapacitacionResponseRecord) {
  return {
    apellidos_nombres: record.apellidosNombres,
    correo: record.correo,
    puesto_trabajo: record.puestoTrabajo || null,
    expositor: record.expositor,
    nombre_capacitacion: record.nombreCapacitacion,
    es_masculino: typeof record.esMasculino === 'boolean' ? record.esMasculino : (record.sexo === 'MASCULINO'),
    edad: record.edad ? String(record.edad) : null,
    celular: record.celular,
    maestria: record.maestria,
    departamento_id: record.departamentoId ? Number(record.departamentoId) : null,
    provincia_id: record.provinciaId ? Number(record.provinciaId) : null,
    distrito_id: record.distritoId ? Number(record.distritoId) : null,
    organizacion_horario: Number(record.organizacion_horario),
    organizacion_instalaciones: Number(record.organizacion_instalaciones),
    organizacion_audiovisuales: Number(record.organizacion_audiovisuales),
    capacitador_tema: Number(record.capacitador_tema),
    capacitador_dominio: Number(record.capacitador_dominio),
    capacitador_metodologia: Number(record.capacitador_metodologia),
    capacitador_tiempo: Number(record.capacitador_tiempo),
    documentacion_calidad: Number(record.documentacion_calidad),
    documentacion_contenido: Number(record.documentacion_contenido),
    satisfaccion_general: Number(record.satisfaccion_general),
    observaciones_sugerencias: record.observaciones_sugerencias || null
  };
}

function databaseRowToRecord(row: any): CapacitacionResponseRecord {
  return {
    id: row.id,
    created_at: row.created_at,
    sync_status: 'synced',
    apellidosNombres: row.apellidos_nombres || '',
    correo: row.correo || '',
    puestoTrabajo: row.puesto_trabajo || '',
    expositor: row.expositor || '',
    nombreCapacitacion: row.nombre_capacitacion || '',
    esMasculino: row.es_masculino ?? true,
    sexo: row.es_masculino === true ? 'MASCULINO' : 'FEMENINO',
    edad: row.edad || '',
    celular: row.celular || '',
    maestria: row.maestria || '',
    departamentoId: row.departamento_id,
    provinciaId: row.provincia_id,
    distritoId: row.distrito_id,
    departamento: row.departamento || row.departamento_nombre || '',
    provincia: row.provincia || row.provincia_nombre || '',
    distrito: row.distrito || row.distrito_nombre || '',
    organizacion_horario: Number(row.organizacion_horario) || 5,
    organizacion_instalaciones: Number(row.organizacion_instalaciones) || 5,
    organizacion_audiovisuales: Number(row.organizacion_audiovisuales) || 5,
    capacitador_tema: Number(row.capacitador_tema) || 5,
    capacitador_dominio: Number(row.capacitador_dominio) || 5,
    capacitador_metodologia: Number(row.capacitador_metodologia) || 5,
    capacitador_tiempo: Number(row.capacitador_tiempo) || 5,
    documentacion_calidad: Number(row.documentacion_calidad) || 5,
    documentacion_contenido: Number(row.documentacion_contenido) || 5,
    satisfaccion_general: Number(row.satisfaccion_general) || 5,
    observaciones_sugerencias: row.observaciones_sugerencias || ''
  };
}

export async function submitCapacitacionResponse(record: CapacitacionResponseRecord): Promise<{ success: boolean; synced: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      success: false,
      synced: false,
      error: 'No se encontraron las variables PUBLIC_SUPABASE_URL o PUBLIC_SUPABASE_ANON_KEY configuradas.'
    };
  }

  try {
    const dbRow = recordToDatabaseRow(record);
    const { data, error } = await supabase.from('respuestas_capacitacion').insert([dbRow]).select();

    if (error) {
      console.error('Fallo al guardar en Supabase:', error.message);
      return { success: false, synced: false, error: error.message };
    }

    return { success: true, synced: true };
  } catch (err: any) {
    console.error('Excepción al conectar con Supabase:', err);
    return { success: false, synced: false, error: err.message || String(err) };
  }
}

export async function fetchAllResponses(): Promise<{ records: CapacitacionResponseRecord[]; fromSupabase: boolean }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { records: [], fromSupabase: false };
  }

  try {
    const { data, error } = await supabase
      .from('respuestas_capacitacion')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const records = data.map(databaseRowToRecord);
      return { records, fromSupabase: true };
    }
  } catch (e) {
    console.error('Error al consultar Supabase:', e);
  }

  return { records: [], fromSupabase: false };
}
