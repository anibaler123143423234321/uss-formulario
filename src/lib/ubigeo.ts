import ubigeosJson from './ubigeos_peru.json';
import { getSupabaseClient } from './supabase';

export interface UbigeoItem {
  id: number;
  name: string;
  ubigeo: string;
}

export interface RawUbigeoProvincia {
  name: string;
  ubigeo: string;
  distritos: UbigeoItem[];
}

export interface RawUbigeoDepartamento {
  name: string;
  ubigeo: string;
  provincias: Record<string, RawUbigeoProvincia>;
}

// Convertir objeto JSON con tipos seguros
const localData = ubigeosJson as unknown as Record<string, RawUbigeoDepartamento>;

// 1. Departamentos locales ordenados
export const LOCAL_DEPARTAMENTOS: UbigeoItem[] = Object.entries(localData)
  .map(([id, d]) => ({ id: Number(id), name: d.name, ubigeo: d.ubigeo }))
  .sort((a, b) => {
    if (a.name === 'LAMBAYEQUE') return -1;
    if (b.name === 'LAMBAYEQUE') return 1;
    if (a.name === 'LIMA') return -1;
    if (b.name === 'LIMA') return 1;
    return a.name.localeCompare(b.name);
  });

// 2. Consulta API con Supabase (con fallback automático a local)
export async function getDepartamentos(): Promise<UbigeoItem[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('ubigeo_departamentos')
        .select('id, departamento, ubigeo')
        .order('departamento', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map(d => ({
          id: Number(d.id),
          name: d.departamento,
          ubigeo: d.ubigeo
        })).sort((a, b) => {
          if (a.name === 'LAMBAYEQUE') return -1;
          if (b.name === 'LAMBAYEQUE') return 1;
          return a.name.localeCompare(b.name);
        });
      }
    } catch (e) {
      console.warn('[Supabase API] Error al consultar ubigeo_departamentos, usando datos locales:', e);
    }
  }

  return LOCAL_DEPARTAMENTOS;
}

export async function getProvincias(deptoNameOrId: string | number): Promise<UbigeoItem[]> {
  if (!deptoNameOrId) return [];

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      let deptoId: number | null = typeof deptoNameOrId === 'number'
        ? deptoNameOrId
        : (!isNaN(Number(deptoNameOrId)) && String(deptoNameOrId).trim() !== '' ? Number(deptoNameOrId) : null);

      if (!deptoId) {
        const { data: deptoData } = await supabase
          .from('ubigeo_departamentos')
          .select('id')
          .ilike('departamento', String(deptoNameOrId).trim())
          .limit(1);
        if (deptoData && deptoData.length > 0) {
          deptoId = Number(deptoData[0].id);
        }
      }

      if (deptoId) {
        const { data, error } = await supabase
          .from('ubigeo_provincias')
          .select('id, provincia, ubigeo')
          .eq('departamento_id', deptoId)
          .order('provincia', { ascending: true });

        if (!error && data && data.length > 0) {
          return data.map(p => ({
            id: Number(p.id),
            name: p.provincia,
            ubigeo: p.ubigeo
          })).sort((a, b) => {
            if (a.name === 'CHICLAYO') return -1;
            if (b.name === 'CHICLAYO') return 1;
            return a.name.localeCompare(b.name);
          });
        }
      }
    } catch (e) {
      console.warn('[Supabase API] Error al consultar provincias, usando local:', e);
    }
  }

  // Fallback local
  const deptoStr = String(deptoNameOrId).toUpperCase().trim();
  const deptoEntry = Object.entries(localData).find(([id, d]) => 
    d.name.toUpperCase() === deptoStr || id === String(deptoNameOrId)
  );
  if (!deptoEntry) return [];

  const [, depto] = deptoEntry;
  return Object.entries(depto.provincias)
    .map(([id, p]) => ({ id: Number(id), name: p.name, ubigeo: p.ubigeo }))
    .sort((a, b) => {
      if (a.name === 'CHICLAYO') return -1;
      if (b.name === 'CHICLAYO') return 1;
      return a.name.localeCompare(b.name);
    });
}

export async function getDistritos(provNameOrId: string | number, deptoName?: string): Promise<UbigeoItem[]> {
  if (!provNameOrId) return [];

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      let provId: number | null = typeof provNameOrId === 'number'
        ? provNameOrId
        : (!isNaN(Number(provNameOrId)) && String(provNameOrId).trim() !== '' ? Number(provNameOrId) : null);

      if (!provId) {
        const { data: provData } = await supabase
          .from('ubigeo_provincias')
          .select('id')
          .ilike('provincia', String(provNameOrId).trim())
          .limit(1);
        if (provData && provData.length > 0) {
          provId = Number(provData[0].id);
        }
      }

      if (provId) {
        const { data, error } = await supabase
          .from('ubigeo_distritos')
          .select('id, distrito, ubigeo')
          .eq('provincia_id', provId)
          .order('distrito', { ascending: true });

        if (!error && data && data.length > 0) {
          return data.map(d => ({
            id: Number(d.id),
            name: d.distrito,
            ubigeo: d.ubigeo
          })).sort((a, b) => {
            if (a.name.includes('PIMENTEL')) return -1;
            if (b.name.includes('PIMENTEL')) return 1;
            if (a.name === 'CHICLAYO') return -1;
            if (b.name === 'CHICLAYO') return 1;
            return a.name.localeCompare(b.name);
          });
        }
      }
    } catch (e) {
      console.warn('[Supabase API] Error al consultar distritos, usando local:', e);
    }
  }

  // Fallback local
  const provStr = String(provNameOrId).toUpperCase().trim();
  let foundProv: RawUbigeoProvincia | null = null;

  for (const depto of Object.values(localData)) {
    if (deptoName && depto.name.toUpperCase() !== deptoName.toUpperCase().trim()) continue;
    for (const [pId, p] of Object.entries(depto.provincias)) {
      if (p.name.toUpperCase() === provStr || pId === String(provNameOrId)) {
        foundProv = p;
        break;
      }
    }
    if (foundProv) break;
  }

  if (!foundProv) return [];

  return [...foundProv.distritos].sort((a, b) => {
    if (a.name.includes('PIMENTEL')) return -1;
    if (b.name.includes('PIMENTEL')) return 1;
    if (a.name === 'CHICLAYO') return -1;
    if (b.name === 'CHICLAYO') return 1;
    return a.name.localeCompare(b.name);
  });
}
