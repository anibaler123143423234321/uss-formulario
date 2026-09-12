-- ==============================================================================
-- MIGRACIÓN UNIFICADA SUPABASE:
-- 1. Eliminar columna puesto_trabajo y regenerar vista v_respuestas_capacitacion
-- 2. Desactivar Evento 1 y crear/activar Evento 2: "Inducción Maestría USS 202602"
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PASO 1: Eliminar puesto_trabajo y actualizar la vista relacional
-- ------------------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_respuestas_capacitacion;

ALTER TABLE public.respuestas_capacitacion 
  DROP COLUMN IF EXISTS puesto_trabajo;

CREATE OR REPLACE VIEW public.v_respuestas_capacitacion AS
SELECT
  r.id,
  r.created_at,
  r.apellidos_nombres,
  r.correo,
  r.capacitacion_id,
  COALESCE(ce.nombre, r.nombre_capacitacion) AS nombre_capacitacion,
  COALESCE(ce.expositor, r.expositor) AS expositor,
  ce.fecha_evento,
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
LEFT JOIN public.capacitaciones_eventos ce ON r.capacitacion_id = ce.id
LEFT JOIN public.ubigeo_departamentos d ON r.departamento_id = d.id
LEFT JOIN public.ubigeo_provincias p ON r.provincia_id = p.id
LEFT JOIN public.ubigeo_distritos dst ON r.distrito_id = dst.id;

-- ------------------------------------------------------------------------------
-- PASO 2: Desactivar Evento 1 y registrar el Evento 2 (ID 2) como ACTIVO
-- ------------------------------------------------------------------------------
-- Desactiva el evento 1 anterior (los 26 registros históricos quedan intactos asociados a él)
UPDATE public.capacitaciones_eventos
SET activo = false
WHERE activo = true;

-- Inserta el nuevo evento, que tomará automáticamente el ID 2 como ACTIVO
INSERT INTO public.capacitaciones_eventos (
  nombre,
  expositor,
  descripcion,
  fecha_evento,
  activo
) VALUES (
  'Inducción Maestría USS 202602',
  'Escuela de Posgrado USS',
  'Evento oficial de Inducción para estudiantes de Maestría USS 2026-II.',
  CURRENT_DATE,
  true
);

-- ------------------------------------------------------------------------------
-- PASO 3: Verificación
-- ------------------------------------------------------------------------------
SELECT id, nombre, expositor, activo, fecha_evento 
FROM public.capacitaciones_eventos 
ORDER BY id ASC;
