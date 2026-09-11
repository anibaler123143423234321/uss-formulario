import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { CapacitacionResponseRecord } from './types';

const STORAGE_KEY_RESPONSES = 'uss_capacitacion_responses';
const STORAGE_KEY_CONFIG = 'uss_supabase_config';

export function getStoredSupabaseConfig(): { url: string; anonKey: string } {
  const envUrl = (import.meta.env.PUBLIC_SUPABASE_URL as string) || (import.meta.env.VITE_SUPABASE_URL as string) || '';
  const envKey = (import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string) || (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

  if (typeof window === 'undefined') {
    return { url: envUrl, anonKey: envKey };
  }

  const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.url && parsed.anonKey) return parsed;
    } catch (e) {
      console.error('Error parsing stored supabase config', e);
    }
  }

  return { url: envUrl, anonKey: envKey };
}

export function saveStoredSupabaseConfig(url: string, anonKey: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify({ url, anonKey }));
  }
}

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getStoredSupabaseConfig();
  if (!url || !anonKey || url.includes('tu-proyecto')) {
    return null;
  }
  try {
    return createClient(url, anonKey);
  } catch (error) {
    console.warn('Error al inicializar cliente Supabase:', error);
    return null;
  }
}

export async function checkSupabaseTablesStatus(): Promise<{ connected: boolean; tablesExist: boolean; url: string; error?: string }> {
  const { url, anonKey } = getStoredSupabaseConfig();
  if (!url || !anonKey) {
    return { connected: false, tablesExist: false, url: '' };
  }

  try {
    const client = createClient(url, anonKey);
    const { error } = await client.from('ubigeo_departamentos').select('id').limit(1);
    if (error) {
      if (error.code === 'PGRST205' || error.message.includes('schema cache') || error.message.includes('does not exist')) {
        return { connected: true, tablesExist: false, url, error: 'Las tablas aún no han sido creadas en tu Supabase' };
      }
      return { connected: true, tablesExist: false, url, error: error.message };
    }
    return { connected: true, tablesExist: true, url };
  } catch (err: any) {
    return { connected: false, tablesExist: false, url, error: err.message };
  }
}

export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
  try {
    const client = createClient(url, anonKey);
    const { error } = await client.from('respuestas_capacitacion').select('id').limit(1);
    if (error) {
      return { success: false, message: `Error de Supabase: ${error.message}` };
    }
    return { success: true, message: '¡Conexión exitosa a Supabase y tabla encontrada!' };
  } catch (err: any) {
    return { success: false, message: `Error de conexión: ${err.message || err}` };
  }
}

// Local Storage helpers
export function getLocalResponses(): CapacitacionResponseRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY_RESPONSES);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error al leer respuestas locales', e);
    return [];
  }
}

export function saveLocalResponse(record: CapacitacionResponseRecord): void {
  if (typeof window === 'undefined') return;
  const current = getLocalResponses();
  current.unshift(record);
  localStorage.setItem(STORAGE_KEY_RESPONSES, JSON.stringify(current));
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
  const recordWithMeta: CapacitacionResponseRecord = {
    ...record,
    id: record.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'rec_' + Date.now()),
    created_at: new Date().toISOString(),
    sync_status: 'local_only'
  };

  // Guardar siempre en local storage primero como respaldo garantizado
  saveLocalResponse(recordWithMeta);

  // Intentar sincronizar con Supabase si está disponible
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: true, synced: false };
  }

  try {
    const dbRow = recordToDatabaseRow(recordWithMeta);
    const { error } = await supabase.from('respuestas_capacitacion').insert([dbRow]);
    if (error) {
      console.warn('Fallo al guardar en Supabase:', error.message);
      return { success: true, synced: false, error: error.message };
    }

    // Actualizar estado a synced en local
    const local = getLocalResponses();
    const idx = local.findIndex(r => r.id === recordWithMeta.id);
    if (idx !== -1) {
      local[idx].sync_status = 'synced';
      localStorage.setItem(STORAGE_KEY_RESPONSES, JSON.stringify(local));
    }

    return { success: true, synced: true };
  } catch (err: any) {
    console.warn('Excepción al conectar con Supabase:', err);
    return { success: true, synced: false, error: err.message };
  }
}

export async function fetchAllResponses(): Promise<{ records: CapacitacionResponseRecord[]; fromSupabase: boolean }> {
  const supabase = getSupabaseClient();
  if (supabase) {
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
      console.warn('Error al consultar Supabase, usando localStorage:', e);
    }
  }

  return { records: getLocalResponses(), fromSupabase: false };
}
