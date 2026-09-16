import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { CapacitacionResponseRecord, MaestriaItem } from './types';
import { MAESTRIAS_FALLBACK } from './constants';

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

function recordToDatabaseRow(record: CapacitacionResponseRecord, personaId?: number | null) {
  return {
    persona_id: personaId ?? (record.personaId ? Number(record.personaId) : null),
    capacitacion_id: record.capacitacionId ? Number(record.capacitacionId) : null,
    maestria_id: record.maestriaId ? Number(record.maestriaId) : null,
    apellidos_nombres: record.apellidosNombres,
    correo: record.correo,
    es_masculino: typeof record.esMasculino === 'boolean' ? record.esMasculino : (record.sexo === 'MASCULINO'),
    edad: record.edad ? String(record.edad) : null,
    celular: record.celular,
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
    capacitacionId: row.capacitacion_id ? Number(row.capacitacion_id) : undefined,
    maestriaId: row.maestria_id ? Number(row.maestria_id) : undefined,
    apellidosNombres: row.apellidos_nombres || '',
    correo: row.correo || '',
    expositor: row.expositor || '',
    nombreCapacitacion: row.nombre_capacitacion || '',
    esMasculino: row.es_masculino ?? true,
    sexo: row.es_masculino === true ? 'MASCULINO' : 'FEMENINO',
    edad: row.edad || '',
    celular: row.celular || '',
    maestria: row.maestria_nombre || row.maestria || '',
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

export async function getMaestrias(): Promise<MaestriaItem[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return MAESTRIAS_FALLBACK;

  try {
    const { data, error } = await supabase
      .from('maestrias')
      .select('id, nombre')
      .eq('activo', true)
      .order('id', { ascending: true });

    if (!error && data && data.length > 0) {
      return data.map(m => ({ id: Number(m.id), nombre: m.nombre }));
    }
  } catch (e) {
    console.warn('Error al cargar maestrias de Supabase, usando catálogo local:', e);
  }

  return MAESTRIAS_FALLBACK;
}

export async function getEventoActivo(): Promise<{ id: number; nombre: string; expositor: string; fecha_evento?: string } | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('capacitaciones_eventos')
      .select('*')
      .eq('activo', true)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return {
        id: Number(data.id),
        nombre: data.nombre,
        expositor: data.expositor,
        fecha_evento: data.fecha_evento
      };
    }
  } catch (e) {
    console.warn('No se pudo obtener evento desde capacitaciones_eventos, usando default:', e);
  }

  return null;
}

export async function verificarRegistroPrevio(
  correo?: string,
  celular?: string,
  capacitacionId?: number,
  nombreCapacitacion?: string
): Promise<{
  yaRegistradoEnEsteEvento: boolean;
  registroEsteEvento?: CapacitacionResponseRecord;
  registroHistoricoUsuario?: CapacitacionResponseRecord;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { yaRegistradoEnEsteEvento: false };
  }

  const cleanEmail = (correo || '').trim().toLowerCase();
  const cleanCelular = (celular || '').replace(/\D/g, '').trim();

  const hasEmail = cleanEmail.includes('@') && cleanEmail.includes('.');
  const hasPhone = cleanCelular.length === 9;

  if (!hasEmail && !hasPhone) {
    return { yaRegistradoEnEsteEvento: false };
  }

  try {
    // 1. Buscar si ya respondió ESTE evento en específico
    let queryEsteEvento = supabase
      .from('respuestas_capacitacion')
      .select('*');

    if (capacitacionId) {
      queryEsteEvento = queryEsteEvento.eq('capacitacion_id', capacitacionId);
    } else if (nombreCapacitacion) {
      queryEsteEvento = queryEsteEvento.eq('nombre_capacitacion', nombreCapacitacion);
    }

    if (hasEmail && hasPhone) {
      queryEsteEvento = queryEsteEvento.or(`correo.ilike.${cleanEmail},celular.eq.${cleanCelular}`);
    } else if (hasPhone) {
      queryEsteEvento = queryEsteEvento.eq('celular', cleanCelular);
    } else {
      queryEsteEvento = queryEsteEvento.ilike('correo', cleanEmail);
    }

    const { data: dataEsteEvento, error: errEste } = await queryEsteEvento.limit(1);

    if (!errEste && dataEsteEvento && dataEsteEvento.length > 0) {
      return {
        yaRegistradoEnEsteEvento: true,
        registroEsteEvento: databaseRowToRecord(dataEsteEvento[0])
      };
    }

    // 2. Si no ha respondido este evento, buscar si ya existe en un evento anterior para autocompletar su perfil
    let queryHistorico = supabase
      .from('respuestas_capacitacion')
      .select('*')
      .order('created_at', { ascending: false });

    if (hasEmail && hasPhone) {
      queryHistorico = queryHistorico.or(`correo.ilike.${cleanEmail},celular.eq.${cleanCelular}`);
    } else if (hasPhone) {
      queryHistorico = queryHistorico.eq('celular', cleanCelular);
    } else {
      queryHistorico = queryHistorico.ilike('correo', cleanEmail);
    }

    const { data: dataHistorico, error: errHist } = await queryHistorico.limit(1);

    if (!errHist && dataHistorico && dataHistorico.length > 0) {
      return {
        yaRegistradoEnEsteEvento: false,
        registroHistoricoUsuario: databaseRowToRecord(dataHistorico[0])
      };
    }

  } catch (e) {
    console.error('Error al verificar registro previo:', e);
  }

  return { yaRegistradoEnEsteEvento: false };
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
    const cleanEmail = record.correo?.trim().toLowerCase();
    const cleanCelular = (record.celular || '').replace(/\D/g, '').trim();
    const eventoId = record.capacitacionId ? Number(record.capacitacionId) : null;

    // 0. Validación de duplicidad por evento específico:
    // Si ya completó la encuesta para este evento, no permitir reenvío.
    // Salvo que sea otro evento distinto, en cuyo caso sí puede responder normalmente.
    if (eventoId) {
      let queryCheck = supabase
        .from('respuestas_capacitacion')
        .select('id, created_at')
        .eq('capacitacion_id', eventoId);

      if (cleanEmail && cleanCelular.length === 9) {
        queryCheck = queryCheck.or(`correo.ilike.${cleanEmail},celular.eq.${cleanCelular}`);
      } else if (cleanEmail) {
        queryCheck = queryCheck.ilike('correo', cleanEmail);
      } else if (cleanCelular.length === 9) {
        queryCheck = queryCheck.eq('celular', cleanCelular);
      }

      const { data: yaExiste } = await queryCheck.limit(1);
      if (yaExiste && yaExiste.length > 0) {
        return {
          success: false,
          synced: false,
          error: 'Usted ya completó la evaluación para este evento. No se admiten registros duplicados para la misma capacitación.'
        };
      }
    }

    let personaId: number | null = null;

    // 1. Normalización Relacional: Vincular con tbl_personas con rol estático 'ENCUESTADO'
    try {
      if (cleanEmail) {
        const { data: matchedPersona } = await supabase
          .from('tbl_personas')
          .select('id')
          .eq('correo_institucional', cleanEmail)
          .maybeSingle();

        if (matchedPersona?.id) {
          personaId = matchedPersona.id;
        } else if (record.apellidosNombres) {
          const parts = record.apellidosNombres.trim().split(' ');
          const nombres = parts.length > 2 ? `${parts[0]} ${parts[1]}` : parts[0];
          const apellidos = parts.length > 2 ? parts.slice(2).join(' ') : (parts[1] || '');

          let insertedPersona: any = null;
          try {
            const { data: newPersona, error: pErr } = await supabase
              .from('tbl_personas')
              .insert([
                {
                  nombres,
                  apellidos,
                  correo_institucional: cleanEmail,
                  telefono: record.celular || null,
                  genero: record.esMasculino === true ? 'MASCULINO' : 'FEMENINO',
                  rol: 'ENCUESTADO',
                }
              ])
              .select('id')
              .single();

            if (newPersona?.id) {
              insertedPersona = newPersona;
            } else if (pErr && pErr.message?.includes('rol')) {
              const { data: fallbackPersona } = await supabase
                .from('tbl_personas')
                .insert([
                  {
                    nombres,
                    apellidos,
                    correo_institucional: cleanEmail,
                    telefono: record.celular || null,
                    genero: record.esMasculino === true ? 'MASCULINO' : 'FEMENINO',
                  }
                ])
                .select('id')
                .single();
              if (fallbackPersona?.id) insertedPersona = fallbackPersona;
            }
          } catch { }

          if (insertedPersona?.id) {
            personaId = insertedPersona.id;
          }
        }
      }
    } catch (personaErr) {
      console.warn('Aviso: tbl_personas no disponible para relación en formulario:', personaErr);
    }

    const dbRow = recordToDatabaseRow(record, personaId);
    const { data, error } = await supabase.from('respuestas_capacitacion').insert([dbRow]).select();

    if (error) {
      console.error('Fallo al guardar en Supabase:', error.message);
      // Código de PostgreSQL 23505 = unique_violation
      if (error.code === '23505' || error.message.includes('unique') || error.message.includes('duplicate')) {
        return {
          success: false,
          synced: false,
          error: 'Usted ya cuenta con una respuesta registrada para este evento. No se admiten registros duplicados.'
        };
      }
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
