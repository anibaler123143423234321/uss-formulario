-- ==============================================================================
-- MIGRACIÓN V7: NORMALIZACIÓN RELACIONAL CON ENTIDAD tbl_personas
-- Proyecto: uss-formulario
-- Centro de Informática - Universidad Señor de Sipán
-- ==============================================================================

-- 1. Crear tabla central de personas si no existe aún
CREATE TABLE IF NOT EXISTS public.tbl_personas (
    id BIGSERIAL PRIMARY KEY,
    tipo_documento VARCHAR(20) NOT NULL DEFAULT 'DNI',
    numero_documento VARCHAR(20) UNIQUE,
    nombres VARCHAR(150) NOT NULL,
    apellidos VARCHAR(150) NOT NULL DEFAULT '',
    nombre_completo VARCHAR(300) GENERATED ALWAYS AS (
        TRIM(nombres || CASE WHEN apellidos IS NOT NULL AND apellidos <> '' THEN ' ' || apellidos ELSE '' END)
    ) STORED,
    correo_institucional VARCHAR(255) UNIQUE,
    correo_personal VARCHAR(255),
    telefono VARCHAR(30),
    genero VARCHAR(20) DEFAULT 'NO_ESPECIFICADO',
    foto_perfil_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS
ALTER TABLE public.tbl_personas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura publica de personas" ON public.tbl_personas;
CREATE POLICY "Permitir lectura publica de personas"
ON public.tbl_personas FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Permitir insercion publica de personas" ON public.tbl_personas;
CREATE POLICY "Permitir insercion publica de personas"
ON public.tbl_personas FOR INSERT TO anon, authenticated WITH CHECK (true);

-- 2. Agregar persona_id a respuestas_capacitacion
ALTER TABLE public.respuestas_capacitacion 
ADD COLUMN IF NOT EXISTS persona_id BIGINT REFERENCES public.tbl_personas(id) ON DELETE SET NULL;

-- 3. Migrar participantes existentes de respuestas_capacitacion hacia tbl_personas
DO $$
DECLARE
    r RECORD;
    split_names TEXT[];
    nombres_part TEXT;
    apellidos_part TEXT;
    genero_val TEXT;
BEGIN
    FOR r IN 
        SELECT DISTINCT ON (lower(trim(correo))) 
            apellidos_nombres, correo, celular, es_masculino 
        FROM public.respuestas_capacitacion 
        WHERE correo IS NOT NULL AND trim(correo) <> ''
    LOOP
        split_names := string_to_array(trim(r.apellidos_nombres), ' ');
        IF array_length(split_names, 1) > 2 THEN
            nombres_part := split_names[1] || ' ' || split_names[2];
            apellidos_part := array_to_string(split_names[3:], ' ');
        ELSIF array_length(split_names, 1) = 2 THEN
            nombres_part := split_names[1];
            apellidos_part := split_names[2];
        ELSE
            nombres_part := trim(r.apellidos_nombres);
            apellidos_part := '';
        END IF;

        genero_val := CASE 
            WHEN r.es_masculino = true THEN 'MASCULINO'
            WHEN r.es_masculino = false THEN 'FEMENINO'
            ELSE 'NO_ESPECIFICADO'
        END;

        INSERT INTO public.tbl_personas (nombres, apellidos, correo_institucional, telefono, genero)
        VALUES (nombres_part, apellidos_part, lower(trim(r.correo)), trim(r.celular), genero_val)
        ON CONFLICT (correo_institucional) DO UPDATE
        SET telefono = COALESCE(public.tbl_personas.telefono, EXCLUDED.telefono),
            genero = COALESCE(public.tbl_personas.genero, EXCLUDED.genero);
    END LOOP;
END $$;

-- 4. Vincular persona_id en respuestas_capacitacion
UPDATE public.respuestas_capacitacion rc
SET persona_id = p.id
FROM public.tbl_personas p
WHERE lower(trim(rc.correo)) = lower(trim(p.correo_institucional))
  AND rc.persona_id IS NULL;

-- 5. Crear índice para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_respuestas_persona_id ON public.respuestas_capacitacion (persona_id);
