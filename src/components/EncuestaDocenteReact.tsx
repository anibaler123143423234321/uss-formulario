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
  ArrowLeft,
  Check,
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
  const [step, setStep] = useState<'identificacion' | 'seleccion_curso' | 'preguntas' | 'exito'>('identificacion');
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
  const [asignaciones, setAsignaciones] = useState<EncuestaDocenteAsignacion[]>([]);
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

  // Paso 1: Consultar asignaciones por credencial
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

    if (result.success && result.evento && result.asignaciones && result.asignaciones.length > 0) {
      setAsignaciones(result.asignaciones);
      setEvento(result.evento);

      if (result.asignaciones.length > 1) {
        setStep('seleccion_curso');
      } else {
        setAsignacion(result.asignacion || result.asignaciones[0]);
        setStep('preguntas');
      }
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      setErrorMsg(result.error || 'No se encontró asignación para este usuario.');
    }
  };

  // Seleccionar un curso para evaluar
  const handleSeleccionarCurso = (item: EncuestaDocenteAsignacion) => {
    if (item.completado) return;
    setAsignacion(item);
    setRespuestas({
      pregunta_a: 0,
      pregunta_b: 0,
      pregunta_c: 0,
      pregunta_d: 0,
      pregunta_e: 0,
      pregunta_f: 5,
    });
    setComentarios('');
    setErrorMsg(null);
    setStep('preguntas');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
      setAsignaciones((prev) =>
        prev.map((a) => (a.id === asignacion.id ? { ...a, completado: true } : a))
      );
      setStep('exito');
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
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
              Correo institucional <span className="text-rose-600 font-bold">*</span>
            </label>

            <div className="flex rounded-xl border border-slate-300 bg-white overflow-hidden focus-within:border-[#4c1d95] focus-within:ring-2 focus-within:ring-purple-100 transition-all">
              <input
                type="text"
                required
                value={usuarioInput}
                onChange={(e) => setUsuarioInput(e.target.value.replace(/\s+/g, ''))}
                placeholder="tuusuario"
                className="flex-1 px-3.5 py-2.5 text-xs font-mono font-medium text-slate-900 outline-none"
              />
              <span className="px-3.5 py-2.5 bg-slate-50 text-slate-500 text-xs font-mono font-bold border-l border-slate-200 select-none flex items-center">
                @uss.edu.pe
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Ingresa tu nombre de usuario institucional sin el @uss.edu.pe.
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

      {/* PASO: Selección de Curso (cuando el alumno tiene 2 o más cursos) */}
      {step === 'seleccion_curso' && (
        <div className="space-y-3.5 animate-in fade-in">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-900 bg-purple-50 px-3 py-2 rounded-xl border border-purple-100">
              <User className="w-4 h-4 text-purple-700 shrink-0" />
              <span>
                Estudiante: <strong>{asignaciones[0]?.estudiante}</strong>
              </span>
            </div>
            <h2 className="text-sm font-bold text-slate-800 pt-1">
              Selecciona el curso que deseas evaluar
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tienes <strong>{asignaciones.length} cursos</strong> asignados en este periodo. Debes evaluar a cada docente de forma individual.
            </p>
          </div>

          <div className="space-y-3">
            {asignaciones.map((item, idx) => {
              const isCompletado = item.completado;
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl p-4 sm:p-5 border transition-all ${
                    isCompletado
                      ? 'bg-emerald-50/40 border-emerald-200/80'
                      : 'bg-white border-slate-200/90 hover:border-purple-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          Curso {idx + 1} de {asignaciones.length}
                        </span>
                        {isCompletado ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-700" />
                            Evaluado
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                            Pendiente
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-[#4c1d95] shrink-0" />
                        {item.curso}
                      </h3>

                      <div className="text-xs text-slate-600 space-y-0.5 pl-5">
                        <p>
                          Docente: <strong className="text-slate-800">{item.docente}</strong>
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Grupo / PEAD: <span className="font-semibold">{item.pead}</span> • Plan: <span className="font-semibold">{item.plan_estudio}</span>
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 pt-2 sm:pt-0">
                      {isCompletado ? (
                        <div className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 px-4 py-2 bg-emerald-100/60 rounded-xl">
                          <CheckCircle2 className="w-4 h-4" />
                          Completado
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSeleccionarCurso(item)}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#4c1d95] hover:bg-[#3b1277] text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <span>Evaluar docente</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={() => {
                setStep('identificacion');
                setUsuarioInput('');
                setAsignaciones([]);
                setAsignacion(null);
              }}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Cambiar de usuario
            </button>

            {asignaciones.every((a) => a.completado) && (
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Todos los cursos evaluados
              </span>
            )}
          </div>
        </div>
      )}

      {/* PASO 2: Ficha del Estudiante y Cuestionario */}
      {step === 'preguntas' && asignacion && (
        <form onSubmit={handleEnviar} className="space-y-4">
          {/* Navegación multi-curso si tiene más de 1 */}
          {asignaciones.length > 1 && (
            <div className="flex items-center justify-between bg-purple-50/80 border border-purple-200/80 px-4 py-2.5 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setStep('seleccion_curso');
                }}
                className="text-xs font-bold text-purple-900 hover:text-purple-950 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Ver todos mis cursos
              </button>
              <span className="text-[11px] font-bold text-purple-900 bg-white px-2.5 py-1 rounded-lg border border-purple-200 shadow-2xs">
                Curso {asignaciones.findIndex((a) => a.id === asignacion.id) + 1} de {asignaciones.length}
              </span>
            </div>
          )}

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
              onClick={() => {
                setErrorMsg(null);
                if (asignaciones.length > 1) {
                  setStep('seleccion_curso');
                } else {
                  setStep('identificacion');
                }
              }}
              className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-white transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{asignaciones.length > 1 ? '← Volver a cursos' : 'Cambiar usuario'}</span>
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
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs text-center space-y-5 animate-in fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-black text-slate-900">
              ¡Gracias por tu participación!
            </h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              Tu evaluación para el docente{' '}
              <strong className="text-slate-800">{asignacion?.docente}</strong> en el curso{' '}
              <strong className="text-slate-800">{asignacion?.curso}</strong> ha sido registrada con éxito.
            </p>
          </div>

          {/* Si quedan cursos pendientes */}
          {(() => {
            const pendientesRestantes = asignaciones.filter(
              (a) => a.id !== asignacion?.id && !a.completado
            );

            if (pendientesRestantes.length > 0) {
              const siguiente = pendientesRestantes[0];
              return (
                <div className="p-4 sm:p-5 rounded-2xl bg-purple-50/80 border border-purple-200 text-left space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-950 uppercase tracking-wider">
                      Curso pendiente por evaluar ({pendientesRestantes.length} restante{pendientesRestantes.length > 1 ? 's' : ''})
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      Pendiente
                    </span>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-purple-100 space-y-1">
                    <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-purple-700 shrink-0" />
                      {siguiente.curso}
                    </p>
                    <p className="text-xs text-slate-600 pl-5">
                      Docente: <strong className="text-slate-800">{siguiente.docente}</strong>
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSeleccionarCurso(siguiente)}
                      className="flex-1 px-5 py-2.5 rounded-xl bg-[#4c1d95] hover:bg-[#3b1277] text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Evaluar siguiente curso</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    {pendientesRestantes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMsg(null);
                          setStep('seleccion_curso');
                        }}
                        className="px-4 py-2.5 rounded-xl border border-purple-200 bg-white hover:bg-purple-100/50 text-purple-900 text-xs font-bold transition-all cursor-pointer"
                      >
                        Ver todos mis cursos
                      </button>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 text-xs font-medium">
                🎉 ¡Completaste satisfactoriamente la evaluación de todos tus cursos asignados ({asignaciones.length || 1})!
              </div>
            );
          })()}

          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setStep('identificacion');
                setUsuarioInput('');
                setAsignaciones([]);
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
