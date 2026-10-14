import React, { useState, useEffect } from 'react';
import FormWizardReact from './FormWizardReact';
import EncuestaDocenteReact from './EncuestaDocenteReact';
import { getEventoActivo } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

export default function FormDispatcher() {
  const [loading, setLoading] = useState<boolean>(true);
  const [tipo, setTipo] = useState<'CAPACITACION' | 'ENCUESTA_DOCENTE'>('CAPACITACION');

  useEffect(() => {
    async function determineFormType() {
      // 1. Verificar si hay parámetro en URL (?tipo=encuesta o ?view=encuesta)
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const tipoParam = urlParams.get('tipo') || urlParams.get('view');
        if (tipoParam === 'encuesta' || tipoParam === 'docente') {
          setTipo('ENCUESTA_DOCENTE');
          setLoading(false);
          return;
        }
      }

      // 2. Consultar evento activo en Supabase
      try {
        const ev = await getEventoActivo();
        if (ev && ev.tipo_evento === 'ENCUESTA_DOCENTE') {
          setTipo('ENCUESTA_DOCENTE');
        } else {
          setTipo('CAPACITACION');
        }
      } catch (err) {
        console.warn('Error determinando tipo de evento activo:', err);
      } finally {
        setLoading(false);
      }
    }

    determineFormType();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
        <span className="text-xs font-bold uppercase tracking-wider">Cargando formulario institucional...</span>
      </div>
    );
  }

  if (tipo === 'ENCUESTA_DOCENTE') {
    return <EncuestaDocenteReact />;
  }

  return <FormWizardReact />;
}
