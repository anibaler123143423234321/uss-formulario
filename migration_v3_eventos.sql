-- ==============================================================================
-- MIGRACIÓN V3: TABLA NORMALIZADA DE EVENTOS / CAPACITACIONES Y RELACIÓN FK
-- Ejecutar en el SQL Editor de Supabase
-- ==============================================================================

-- 1. Crear tabla relacional de Eventos / Capacitaciones
CREATE TABLE IF NOT EXISTS public.capacitaciones_eventos (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  expositor TEXT NOT NULL,
  descripcion TEXT,
  fecha_evento DATE DEFAULT CURRENT_DATE,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar seguridad Row Level Security (RLS) y lectura para anon/authenticated
ALTER TABLE public.capacitaciones_eventos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica de capacitaciones_eventos" ON public.capacitaciones_eventos;
CREATE POLICY "Lectura publica de capacitaciones_eventos"
  ON public.capacitaciones_eventos
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 3. Insertar el evento oficial actual por defecto si no existe
INSERT INTO public.capacitaciones_eventos (nombre, expositor, descripcion, activo)
SELECT 
  'Estándares ISO Core del Sistema: SGC USS, Modelo de SUNEDU - Plan de Supervisión',
  'Equipo de Calidad y Acreditación USS',
  'Capacitación institucional del Sistema de Gestión de la Calidad (SGC USS).',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.capacitaciones_eventos 
  WHERE nombre = 'Estándares ISO Core del Sistema: SGC USS, Modelo de SUNEDU - Plan de Supervisión'
);

-- 4. Relacionar con la tabla respuestas_capacitacion mediante Foreign Key
ALTER TABLE public.respuestas_capacitacion
  ADD COLUMN IF NOT EXISTS capacitacion_id INTEGER REFERENCES public.capacitaciones_eventos(id) ON DELETE RESTRICT;

-- 5. Vincular registros históricos existentes al ID de la capacitación correspondiente
UPDATE public.respuestas_capacitacion r
SET capacitacion_id = ce.id
FROM public.capacitaciones_eventos ce
WHERE r.capacitacion_id IS NULL AND r.nombre_capacitacion = ce.nombre;

-- Fallback para cualquier fila huérfana restante
UPDATE public.respuestas_capacitacion
SET capacitacion_id = (SELECT id FROM public.capacitaciones_eventos WHERE activo = true ORDER BY id ASC LIMIT 1)
WHERE capacitacion_id IS NULL;

-- 6. Índice Único Compuesto (Regla de Oro): 
-- 1 sola encuesta por participante (correo) en el mismo evento (capacitacion_id)
-- Permite registrarse normalmente si es otro evento.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unico_correo_capacitacion 
ON public.respuestas_capacitacion (LOWER(TRIM(correo)), capacitacion_id);

-- 7. Vista Relacional Actualizada para Reportes y Excel
CREATE OR REPLACE VIEW public.v_respuestas_capacitacion AS
SELECT
  r.id,
  r.created_at,
  r.apellidos_nombres,
  r.correo,
  r.puesto_trabajo,
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

-- 8. Permisos a la vista y tablas
GRANT SELECT ON public.capacitaciones_eventos TO anon, authenticated;
GRANT SELECT ON public.v_respuestas_capacitacion TO anon, authenticated;
