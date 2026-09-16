-- ==============================================================================
-- MIGRACIÓN V8: ROLES CENTRALIZADOS EN tbl_personas Y RESET DE TELEMETRÍA A 0
-- Ecosistema CINF USS (ecosistema-cinf, uss-flyer-generator, uss-formulario)
-- Centro de Informática - Universidad Señor de Sipán
-- ==============================================================================

-- 1. Agregar columna rol e índices a tbl_personas si aún no existen
ALTER TABLE public.tbl_personas 
ADD COLUMN IF NOT EXISTS rol VARCHAR(50) DEFAULT 'ESTUDIANTE';

CREATE INDEX IF NOT EXISTS idx_personas_rol ON public.tbl_personas(rol);

-- 2. Asignar rol a los 5 administradores y especialistas del sistema (tbl_usuarios)
UPDATE public.tbl_personas p
SET rol = CASE 
    WHEN u.role_id = 1 THEN 'COORDINADOR'
    WHEN u.role_id = 2 THEN 'ESPECIALISTA'
    WHEN u.role_id = 3 THEN 'SOPORTE'
    ELSE 'COORDINADOR'
END
FROM public.tbl_usuarios u
WHERE u.persona_id = p.id;

-- 3. Asignar rol 'FLYER' a los docentes registrados en uss-flyer-generator (tbl_docentes_flyers)
UPDATE public.tbl_personas p
SET rol = 'FLYER'
FROM public.tbl_docentes_flyers f
WHERE f.persona_id = p.id 
  AND p.rol NOT IN ('COORDINADOR', 'ESPECIALISTA', 'SOPORTE');

-- 4. Asignar rol 'ENCUESTADO' a los participantes de encuestas y capacitaciones (respuestas_capacitacion)
UPDATE public.tbl_personas p
SET rol = 'ENCUESTADO'
FROM public.respuestas_capacitacion r
WHERE r.persona_id = p.id 
  AND p.rol NOT IN ('COORDINADOR', 'ESPECIALISTA', 'SOPORTE', 'FLYER');

-- 5. Eliminar personas y datos temporales generados durante pruebas automatizadas
DELETE FROM public.tbl_estudiantes 
WHERE student_email LIKE 'test.unique%' 
   OR student_email LIKE 'alumno.regular%' 
   OR student_email LIKE 'experiencia.laboral%';

DELETE FROM public.tbl_personas 
WHERE correo_institucional LIKE 'test.unique%' 
   OR correo_institucional LIKE 'especialista.test%' 
   OR correo_institucional LIKE 'alumno.regular%' 
   OR correo_institucional LIKE 'experiencia.laboral%';

-- 6. RESET TOTAL DE TELEMETRÍA DE CLICKS PARA INICIAR DESDE 0
TRUNCATE TABLE public.tbl_telemetria_clicks RESTART IDENTITY;

-- 7. RESET DE ESTUDIANTES PARA EMPEZAR DE 0 LIMPIO DESDE EL CHATBOT
TRUNCATE TABLE public.tbl_estudiantes CASCADE;

-- 8. Actualizar vista unificada si existía
CREATE OR REPLACE VIEW public.v_personas_roles AS
SELECT 
    p.id AS persona_id,
    p.rol,
    p.nombre_completo,
    COALESCE(p.correo_institucional, p.correo_personal) AS email,
    p.telefono,
    p.numero_documento,
    u.id AS usuario_id,
    u.role_id AS usuario_role_id,
    p.created_at
FROM public.tbl_personas p
LEFT JOIN public.tbl_usuarios u ON u.persona_id = p.id
ORDER BY p.id ASC;

COMMENT ON COLUMN public.tbl_personas.rol IS 'Rol en el ecosistema: ESTUDIANTE (chatbot), FLYER (generador flyer), ENCUESTADO (formularios), COORDINADOR/ESPECIALISTA/SOPORTE (panel admin)';
