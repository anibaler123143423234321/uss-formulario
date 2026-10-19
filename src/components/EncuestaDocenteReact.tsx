import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  User,
  GraduationCap,
  BookOpen,
  Calendar,
  Award,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Send,
  Star,
  RotateCcw,
  Loader2,
  Sparkles
} from 'lucide-react';
import {
  consultarAsignacionDocente,
  submitRespuestaDocente,
  getEventoActivo,
  getEventoPorId
} from '../lib/supabase';
import type { EncuestaDocenteAsignacion, CapacitacionEvento } from '../lib/types';

interface EncuestaDocenteProps {
  eventoId?: number;
}

const LIKERT_OPTIONS = [
  { value: 1, label: 'Nunca' },
  { value: 2, label: 'Rara vez' },
  { value: 3, label: 'A veces' },
  { value: 4, label: 'Frecuentemente' },
  { value: 5, label: 'Siempre' },
];

const PREGUNTAS = [
  {
    id: 'pregunta_a',
    letter: 'A',
    text: '¿El docente inicia sus clases puntualmente y cumple con el horario establecido?',
  },
  {
    id: 'pregunta_b',
    letter: 'B',
    text: '¿Explica los temas de manera clara y comprensible?',
  },
  {
    id: 'pregunta_c',
    letter: 'C',
    text: '¿Utiliza recursos didácticos y materiales que facilitan el aprendizaje?',
  },
  {
    id: 'pregunta_d',
    letter: 'D',
    text: '¿Fomenta la participación activa y muestra un trato respetuoso?',
  },
  {
    id: 'pregunta_e',
    letter: 'E',
    text: '¿Brinda orientación y retroalimentación oportuna sobre las dudas y tareas?',
  },
];

export default function EncuestaDocenteReact({ eventoId }: EncuestaDocenteProps) {
  const [step, setStep] = useState<'identificacion' | 'preguntas' | 'exito'>('identificacion');
  const [usuarioInput, setUsuarioInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Determinar eventoId desde prop o query params
  const [targetId, setTargetId] = useState<number | undefined>(() => {
    if (eventoId) return eventoId;
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const val = p.get('id') || p.get('encuesta');
      return val ? Number(val) : undefined;
    }
    return undefined;
  });

  // Datos recuperados de la nómina y evento
  const [asignacion, setAsignacion] = useState<EncuestaDocenteAsignacion | null>(null);
  const [evento, setEvento] = useState<CapacitacionEvento | null>(null);

  // Respuestas del formulario
  const [respuestas, setRespuestas] = useState<Record<string, number>>({
    pregunta_a: 0,
    pregunta_b: 0,
    pregunta_c: 0,
    pregunta_d: 0,
    pregunta_e: 0,
    pregunta_f: 5, // Calificación global 1-5 estrellas (default 5)
  });
  const [comentarios, setComentarios] = useState('');

  // Cargar evento docente inicial (por ID o el activo de tipo ENCUESTA_DOCENTE)
  useEffect(() => {
    async function loadEventoInfo() {
      if (targetId) {
        const ev = await getEventoPorId(targetId);
        if (ev) setEvento(ev as CapacitacionEvento);
      } else {
        const ev = await getEventoActivo('ENCUESTA_DOCENTE');
        if (ev) {
          setEvento(ev as CapacitacionEvento);
          setTargetId(ev.id);
        }
      }
    }
    loadEventoInfo();
  }, [targetId]);

  // Paso 1: Consultar asignación por credencial
  const handleConsultar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const clean = usuarioInput.trim();
    if (!clean) {
      setErrorMsg('Por favor ingresa tu usuario institucional.');
      return;
    }

    setIsLoading(true);
    const result = await consultarAsignacionDocente(clean, targetId);
    setIsLoading(false);

    if (result.success && result.asignacion && result.evento) {
      setAsignacion(result.asignacion);
      setEvento(result.evento);
      setStep('preguntas');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setErrorMsg(result.error || 'No se encontró asignación para este usuario.');
    }
  };

  // Contar preguntas respondidas (A a E + F)
  const totalRespondidas =
    PREGUNTAS.filter((p) => respuestas[p.id] > 0).length + (respuestas.pregunta_f > 0 ? 1 : 0);
  const totalPreguntas = PREGUNTAS.length + 1; // 6 preguntas
  const porcentajeProgreso = Math.round((totalRespondidas / totalPreguntas) * 100);

  // Paso 2: Enviar respuestas
  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!asignacion || !evento) return;

    // Validar que todas las preguntas A-E estén respondidas
    const faltantes = PREGUNTAS.filter((p) => !respuestas[p.id]);
    if (faltantes.length > 0) {
      setErrorMsg(
        `Por favor responde la pregunta ${faltantes.map((f) => f.letter).join(', ')} antes de enviar.`
      );
      return;
    }

    setIsLoading(true);
    const result = await submitRespuestaDocente({
      evento_id: evento.id,
      asignacion_id: asignacion.id,
      correo: asignacion.correo,
      estudiante: asignacion.estudiante,
      curso: asignacion.curso,
      docente: asignacion.docente,
      pead: asignacion.pead,
      plan_estudio: asignacion.plan_estudio,
      pregunta_a: respuestas.pregunta_a,
      pregunta_b: respuestas.pregunta_b,
      pregunta_c: respuestas.pregunta_c,
      pregunta_d: respuestas.pregunta_d,
      pregunta_e: respuestas.pregunta_e,
      pregunta_f: respuestas.pregunta_f,
      comentarios: comentarios.trim() || undefined,
    });
    setIsLoading(false);

    if (result.success) {
      setStep('exito');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // Ignorar si confetti falla
      }
    } else {
      setErrorMsg(result.error || 'Ocurrió un error al registrar tu evaluación.');
    }
  };

  return (
    <div className="w-full max-w-[640px] mx-auto space-y-3.5 my-2">
      {/* TARJETA 1: Banner Morado USS - Idéntico a Google Forms */}
      <div className="bg-[#4c1d95] text-white rounded-2xl p-6 sm:p-7 text-center shadow-sm space-y-1">
        <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight leading-snug">
          ENCUESTA DE SATISFACCIÓN DOCENTE
        </h1>
        <p className="text-sm font-semibold tracking-wide text-purple-100 uppercase">
          {evento?.periodo || '2026 JUNIO'}
        </p>
        <p className="text-xs text-purple-200/90 font-normal pt-0.5">
          Tu participación es anónima y confidencial.
        </p>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="p-4 bg-white border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-start gap-2.5 font-medium shadow-xs animate-in fade-in"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <span className="leading-relaxed">{errorMsg}</span>
        </div>
      )}

      {/* PASO 1: Identificación por Correo / Usuario */}
      {step === 'identificacion' && (
        <form onSubmit={handleConsultar} className="space-y-4">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-3">
            <label className="block text-xs font-bold text-slate-800">
              Correo institucional o Usuario / Credencial <span className="text-rose-600 font-bold">*</span>
            </label>

            <div className="flex items-center rounded-xl border border-slate-300 bg-white overflow-hidden focus-within:border-[#4c1d95] focus-within:ring-2 focus-within:ring-purple-100 transition-all">
              <input
                type="text"
                required
                value={usuarioInput}
                onChange={(e) => setUsuarioInput(e.target.value.trim())}
                placeholder="ej. rosallatasrios0220, W20260731143618CI8 o tu correo completo"
                className="w-full px-3.5 py-2.5 text-xs font-mono font-medium text-slate-900 outline-none"
              />
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Puedes ingresar tu usuario institucional, tu credencial de matrícula o tu correo electrónico (ejemplos:{' '}
              <button
                type="button"
                onClick={() => setUsuarioInput('BABANTOLIZBETH')}
                className="text-[#4c1d95] font-bold hover:underline font-mono"
              >
                BABANTOLIZBETH
              </button>
              ,{' '}
              <button
                type="button"
                onClick={() => setUsuarioInput('rosallatasrios0220')}
                className="text-[#4c1d95] font-bold hover:underline font-mono"
              >
                rosallatasrios0220
              </button>
              ).
            </p>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isLoading || !usuarioInput.trim()}
              className="px-6 py-2.5 rounded-lg bg-[#4c1d95] hover:bg-[#3b1277] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verificando nómina...</span>
                </>
              ) : (
                <>
                  <span>Siguiente</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* PASO 2: Ficha del Estudiante y Cuestionario */}
      {step === 'preguntas' && asignacion && (
        <form onSubmit={handleEnviar} className="space-y-4">
          {/* Barra de progreso */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="font-semibold">Progreso de la encuesta</span>
              <span className="font-bold text-[#4c1d95] font-mono">
                {totalRespondidas}/{totalPreguntas} respondidas ({porcentajeProgreso}%)
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#4c1d95] transition-all duration-300"
                style={{ width: `${porcentajeProgreso}%` }}
              />
            </div>
          </div>

          {/* Ficha del Estudiante y Docente */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
            <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>📋</span> Información del Estudiante
            </p>

            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-slate-800 font-medium">
                <User className="w-4 h-4 text-slate-600 shrink-0" />
                <span>
                  <strong>Estudiante:</strong> {asignacion.estudiante}
                </span>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-slate-800 font-medium">
                <Calendar className="w-4 h-4 text-slate-600 shrink-0" />
                <span>
                  <strong>Plan de Estudio:</strong> {asignacion.plan_estudio} {asignacion.campus ? `· ${asignacion.campus}` : ''}
                </span>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-slate-800 font-medium">
                <BookOpen className="w-4 h-4 text-slate-600 shrink-0" />
                <span>
                  <strong>Curso:</strong> {asignacion.curso}
                </span>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-slate-800 font-medium">
                <Award className="w-4 h-4 text-slate-600 shrink-0" />
                <span>
                  <strong>PEAD:</strong> {asignacion.pead}
                </span>
              </div>

              <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 p-2.5 rounded-xl text-purple-950 font-bold shadow-2xs">
                <GraduationCap className="w-4 h-4 text-[#4c1d95] shrink-0" />
                <span>
                  <strong>Docente a Evaluar:</strong> {asignacion.docente}
                </span>
              </div>
            </div>
          </div>

          {/* Preguntas de Evaluación Likert (A a E) */}
          <div className="space-y-3">
            {PREGUNTAS.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3"
              >
                <p className="text-xs text-slate-900 font-bold leading-relaxed flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-[#4c1d95] text-[11px] font-black flex items-center justify-center shrink-0">
                    {p.letter}
                  </span>
                  <span>{p.text}</span>
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                  {LIKERT_OPTIONS.map((opt) => {
                    const isSelected = respuestas[p.id] === opt.value;
                    return (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() =>
                          setRespuestas((prev) => ({ ...prev, [p.id]: opt.value }))
                        }
                        className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all text-center flex flex-col items-center justify-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'bg-[#4c1d95] text-white border-[#4c1d95] shadow-xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-purple-50 hover:border-purple-200'
                        }`}
                      >
                        <span className="text-sm font-extrabold">{opt.value}</span>
                        <span className="text-[10px] leading-tight">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Pregunta F: Calificación Global de Estrellas */}
            <div className="bg-white rounded-2xl p-5 border border-purple-200 shadow-xs space-y-3">
              <p className="text-xs text-slate-900 font-bold leading-relaxed flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-[#4c1d95] text-white text-[11px] font-black flex items-center justify-center shrink-0">
                  F
                </span>
                <span>
                  En una escala de 1 a 5 estrellas, ¿cómo califica el desempeño general del docente?
                </span>
              </p>

              <div className="flex items-center justify-center gap-3 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() =>
                      setRespuestas((prev) => ({ ...prev, pregunta_f: star }))
                    }
                    className="p-1 hover:scale-125 transition-transform cursor-pointer"
                    title={`${star} estrellas`}
                  >
                    <Star
                      className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                        star <= respuestas.pregunta_f
                          ? 'text-amber-400 fill-amber-400 drop-shadow'
                          : 'text-slate-200'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-extrabold text-[#4c1d95] ml-2 font-mono">
                  {respuestas.pregunta_f} / 5
                </span>
              </div>
            </div>

            {/* Campo de observaciones / comentarios opcional */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Comentarios o sugerencias adicionales (Opcional):
              </label>
              <textarea
                rows={3}
                value={comentarios}
                onChange={(e) => setComentarios(e.target.value)}
                placeholder="Escribe tus observaciones constructivas sobre el curso o docente..."
                className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-800 focus:border-[#4c1d95] focus:ring-2 focus:ring-purple-100 outline-none transition-all shadow-inner"
              />
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep('identificacion')}
              className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-white transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Cambiar usuario</span>
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 rounded-lg bg-[#4c1d95] hover:bg-[#3b1277] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registrando evaluación...</span>
                </>
              ) : (
                <>
                  <span>Enviar evaluación</span>
                  <Send className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* PASO 3: Pantalla de Agradecimiento y Éxito */}
      {step === 'exito' && (
        <div className="bg-white rounded-2xl p-8 border border-slate-200/80 shadow-xs text-center space-y-4 animate-in fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-black text-slate-900">
              ¡Gracias por tu participación!
            </h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              Tus respuestas han sido registradas exitosamente. Tu opinión nos ayuda a
              mantener la calidad y excelencia académica en la Universidad Señor de Sipán.
            </p>
          </div>

          <div className="pt-3">
            <button
              type="button"
              onClick={() => {
                setStep('identificacion');
                setUsuarioInput('');
                setAsignacion(null);
                setRespuestas({
                  pregunta_a: 0,
                  pregunta_b: 0,
                  pregunta_c: 0,
                  pregunta_d: 0,
                  pregunta_e: 0,
                  pregunta_f: 5,
                });
                setComentarios('');
              }}
              className="px-5 py-2.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Realizar otra consulta</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
