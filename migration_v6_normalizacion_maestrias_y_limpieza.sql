-- ==============================================================================
-- MIGRACIÓN V6: NORMALIZACIÓN DE MAESTRÍAS Y LIMPIEZA DE COLUMNAS REDUNDANTES
-- Ejecutar en el SQL Editor de Supabase
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PASO 1: Crear tabla relacional de Maestrías USS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.maestrias (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS y lectura pública
ALTER TABLE public.maestrias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura publica de maestrias" ON public.maestrias;
CREATE POLICY "Lectura publica de maestrias"
  ON public.maestrias FOR SELECT
  TO anon, authenticated
  USING (true);

-- ------------------------------------------------------------------------------
-- PASO 2: Insertar el catálogo oficial de Maestrías USS (IDs del 1 al 16)
-- ------------------------------------------------------------------------------
INSERT INTO public.maestrias (nombre) VALUES
  ('MAESTRÍA EN PSICOLOGÍA CLÍNICA Y COMUNITARIA'),
  ('MAESTRÍA EN GESTIÓN DE LA INNOVACIÓN EN ESTOMATOLOGÍA'),
  ('MAESTRÍA EN GERENCIA DE SERVICIOS DE SALUD'),
  ('MAESTRÍA EN ENFERMERÍA Y GESTIÓN INTEGRAL DEL CUIDADO'),
  ('MAESTRÍA EN GOBIERNO Y GESTIÓN DE LA SALUD PÚBLICA'),
  ('MAESTRÍA EN TRIBUTACIÓN NACIONAL E INTERNACIONAL'),
  ('MAESTRÍA EN GESTIÓN DEL TALENTO HUMANO'),
  ('MAESTRÍA EN ADMINISTRACIÓN Y MARKETING DIGITAL'),
  ('MAESTRÍA EN ADMINISTRACIÓN DE NEGOCIOS - MBA'),
  ('MAESTRÍA EN DERECHO PENAL Y PROCESAL PENAL'),
  ('MAESTRÍA EN DERECHO LABORAL'),
  ('MAESTRÍA EN DERECHO NOTARIAL Y REGISTRAL'),
  ('MAESTRÍA EN DERECHO CIVIL Y PROCESAL CIVIL'),
  ('MAESTRÍA EN COACHING Y LIDERAZGO EDUCATIVO'),
  ('MAESTRÍA EN CIENCIAS DE LA EDUCACIÓN CON MENCIÓN EN GESTIÓN DE LA CALIDAD Y ACREDITACIÓN EDUCATIVA'),
  ('MAESTRÍA EN CIENCIAS DE LA EDUCACIÓN CON MENCIÓN EN GESTIÓN EDUCATIVA')
ON CONFLICT (nombre) DO NOTHING;

-- Asegurar que cualquier texto histórico existente en respuestas_capacitacion esté en el catálogo
INSERT INTO public.maestrias (nombre)
SELECT DISTINCT TRIM(maestria)
FROM public.respuestas_capacitacion
WHERE maestria IS NOT NULL AND TRIM(maestria) <> ''
ON CONFLICT (nombre) DO NOTHING;

-- ------------------------------------------------------------------------------
-- PASO 3: Agregar columna maestria_id y migrar los 26 registros existentes
-- ------------------------------------------------------------------------------
ALTER TABLE public.respuestas_capacitacion
  ADD COLUMN IF NOT EXISTS maestria_id INTEGER REFERENCES public.maestrias(id);

-- Actualizar registros históricos vinculándolos a su ID correspondiente
UPDATE public.respuestas_capacitacion r
SET maestria_id = m.id
FROM public.maestrias m
WHERE r.maestria_id IS NULL 
  AND TRIM(UPPER(r.maestria)) = TRIM(UPPER(m.nombre));

-- ------------------------------------------------------------------------------
-- PASO 4: Eliminar columnas redundantes
-- (nombre_capacitacion y expositor ya están en capacitaciones_eventos)
-- (puesto_trabajo ya no se solicita)
-- (maestria de texto pasa a ser relacional por maestria_id)
-- ------------------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_respuestas_capacitacion;

ALTER TABLE public.respuestas_capacitacion
  DROP COLUMN IF EXISTS puesto_trabajo,
  DROP COLUMN IF EXISTS nombre_capacitacion,
  DROP COLUMN IF EXISTS expositor,
  DROP COLUMN IF EXISTS maestria;

-- ------------------------------------------------------------------------------
-- PASO 5: Recrear la vista v_respuestas_capacitacion 100% normalizada
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_respuestas_capacitacion AS
SELECT
  r.id,
  r.created_at,
  r.apellidos_nombres,
  r.correo,
  r.capacitacion_id,
  ce.nombre AS nombre_capacitacion,
  ce.expositor AS expositor,
  ce.fecha_evento,
  CASE WHEN r.es_masculino IS TRUE THEN 'MASCULINO' WHEN r.es_masculino IS FALSE THEN 'FEMENINO' ELSE NULL END AS sexo,
  r.es_masculino,
  r.edad,
  r.celular,
  r.maestria_id,
  m.nombre AS maestria_nombre,
  r.departamento_id,
  d.departamento AS departamento_nombre,
  r.provincia_id,
  p.provincia AS provincia_nombre,
  r.distrito_id,
  dst.distrito AS distrito_nombre,
  r.organizacion_horario,
  r.organizacion_instalaciones,
  r.organizacion_audiovisuales,
  r.capacitador_tema,
  r.capacitador_dominio,
  r.capacitador_metodologia,
  r.capacitador_tiempo,
  r.documentacion_calidad,
  r.documentacion_contenido,
  r.satisfaccion_general,
  r.observaciones_sugerencias
FROM public.respuestas_capacitacion r
LEFT JOIN public.capacitaciones_eventos ce ON r.capacitacion_id = ce.id
LEFT JOIN public.maestrias m ON r.maestria_id = m.id
LEFT JOIN public.ubigeo_departamentos d ON r.departamento_id = d.id
LEFT JOIN public.ubigeo_provincias p ON r.provincia_id = p.id
LEFT JOIN public.ubigeo_distritos dst ON r.distrito_id = dst.id;

-- ------------------------------------------------------------------------------
-- PASO 6: Verificación de la migración
-- ------------------------------------------------------------------------------
SELECT 
  r.id,
  r.apellidos_nombres,
  r.correo,
  r.capacitacion_id,
  ce.nombre AS capacitacion,
  r.maestria_id,
  m.nombre AS maestria
FROM public.respuestas_capacitacion r
LEFT JOIN public.capacitaciones_eventos ce ON r.capacitacion_id = ce.id
LEFT JOIN public.maestrias m ON r.maestria_id = m.id
LIMIT 10;
