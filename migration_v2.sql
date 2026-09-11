-- ==============================================================================
-- MIGRACIÓN DE NORMALIZACIÓN: respuestas_capacitacion
-- Ejecutar en Supabase SQL Editor
-- ==============================================================================

-- 1. Limpiar o adaptar columnas de ubicación (FKs hacia ubigeo)
ALTER TABLE public.respuestas_capacitacion
  DROP COLUMN IF EXISTS departamento,
  DROP COLUMN IF EXISTS provincia,
  DROP COLUMN IF EXISTS distrito,
  ADD COLUMN IF NOT EXISTS departamento_id INTEGER REFERENCES public.ubigeo_departamentos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provincia_id INTEGER REFERENCES public.ubigeo_provincias(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS distrito_id INTEGER REFERENCES public.ubigeo_distritos(id) ON DELETE SET NULL;

-- 2. Sexo como booleano (true = Masculino, false = Femenino)
ALTER TABLE public.respuestas_capacitacion
  DROP COLUMN IF EXISTS sexo,
  ADD COLUMN IF NOT EXISTS es_masculino BOOLEAN;

-- 3. Escalas Likert normalizadas a numérico 1 a 5 (SMALLINT)
ALTER TABLE public.respuestas_capacitacion
  DROP COLUMN IF EXISTS organizacion_horario,
  DROP COLUMN IF EXISTS organizacion_instalaciones,
  DROP COLUMN IF EXISTS organizacion_audiovisuales,
  DROP COLUMN IF EXISTS capacitador_tema,
  DROP COLUMN IF EXISTS capacitador_dominio,
  DROP COLUMN IF EXISTS capacitador_metodologia,
  DROP COLUMN IF EXISTS capacitador_tiempo,
  DROP COLUMN IF EXISTS documentacion_calidad,
  DROP COLUMN IF EXISTS documentacion_contenido,
  DROP COLUMN IF EXISTS satisfaccion_general,

  ADD COLUMN IF NOT EXISTS organizacion_horario SMALLINT CHECK (organizacion_horario BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS organizacion_instalaciones SMALLINT CHECK (organizacion_instalaciones BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS organizacion_audiovisuales SMALLINT CHECK (organizacion_audiovisuales BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS capacitador_tema SMALLINT CHECK (capacitador_tema BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS capacitador_dominio SMALLINT CHECK (capacitador_dominio BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS capacitador_metodologia SMALLINT CHECK (capacitador_metodologia BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS capacitador_tiempo SMALLINT CHECK (capacitador_tiempo BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS documentacion_calidad SMALLINT CHECK (documentacion_calidad BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS documentacion_contenido SMALLINT CHECK (documentacion_contenido BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS satisfaccion_general SMALLINT CHECK (satisfaccion_general BETWEEN 1 AND 5);

-- 4. Índices para reportes y JOINs rápidos
CREATE INDEX IF NOT EXISTS idx_capacitacion_distrito ON public.respuestas_capacitacion(distrito_id);
CREATE INDEX IF NOT EXISTS idx_capacitacion_depto ON public.respuestas_capacitacion(departamento_id);

-- 5. Vista Relacional para Exportación en Excel/Reportes con Nombres de Ubigeo
CREATE OR REPLACE VIEW public.v_respuestas_capacitacion AS
SELECT
  r.id,
  r.created_at,
  r.apellidos_nombres,
  r.correo,
  r.puesto_trabajo,
  r.expositor,
  r.nombre_capacitacion,
  CASE WHEN r.es_masculino IS TRUE THEN 'MASCULINO' WHEN r.es_masculino IS FALSE THEN 'FEMENINO' ELSE NULL END AS sexo,
  r.es_masculino,
  r.edad,
  r.celular,
  r.maestria,
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
LEFT JOIN public.ubigeo_departamentos d ON r.departamento_id = d.id
LEFT JOIN public.ubigeo_provincias p ON r.provincia_id = p.id
LEFT JOIN public.ubigeo_distritos dst ON r.distrito_id = dst.id;

-- 6. Políticas de RLS en la Vista
GRANT SELECT ON public.v_respuestas_capacitacion TO anon, authenticated;
