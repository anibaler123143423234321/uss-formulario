import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import confetti from 'canvas-confetti';
import {
  User,
  Mail,
  Phone,
  GraduationCap,
  MapPin,
  Building2,
  Award,
  FileText,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Send,
  CheckCircle2,
  RotateCcw,
  Info,
  AlertTriangle,
  Loader2,
  Lock
} from 'lucide-react';

import { MAESTRIAS_USS, MAESTRIAS_FALLBACK, CAPACITACION_DEFAULT, LIKERT_OPTIONS } from '../lib/constants';
import { getDepartamentos, getProvincias, getDistritos, LOCAL_DEPARTAMENTOS, type UbigeoItem } from '../lib/ubigeo';
import { submitCapacitacionResponse, getEventoActivo, getMaestrias, verificarRegistroPrevio } from '../lib/supabase';
import type { CapacitacionResponseRecord, MaestriaItem } from '../lib/types';

interface FormDataState {
  correo: string;
  sexo: 'MASCULINO' | 'FEMENINO' | '';
  nombres: string;
  apellidos: string;
  celular: string;
  edad: string;
  maestriaId: number | null;
  maestria: string;
  departamentoId: number | null;
  provinciaId: number | null;
  distritoId: number | null;
  departamento: string;
  provincia: string;
  distrito: string;

  // Paso 2: Organización (1-5)
  organizacion_horario: number;
  organizacion_instalaciones: number;
  organizacion_audiovisuales: number;

  // Paso 3: Capacitador (1-5)
  capacitador_tema: number;
  capacitador_dominio: number;
  capacitador_metodologia: number;
  capacitador_tiempo: number;

  // Paso 4: Documentación (1-5)
  documentacion_calidad: number;
  documentacion_contenido: number;

  // Paso 5: Satisfacción y Sugerencias
  satisfaccion_general: number;
  observaciones_sugerencias: string;
}

const INITIAL_FORM_DATA: FormDataState = {
  correo: '',
  sexo: '',
  nombres: '',
  apellidos: '',
  celular: '',
  edad: '',
  maestriaId: null,
  maestria: '',
  departamentoId: null,
  provinciaId: null,
  distritoId: null,
  departamento: '',
  provincia: '',
  distrito: '',

  organizacion_horario: 0,
  organizacion_instalaciones: 0,
  organizacion_audiovisuales: 0,

  capacitador_tema: 0,
  capacitador_dominio: 0,
  capacitador_metodologia: 0,
  capacitador_tiempo: 0,

  documentacion_calidad: 0,
  documentacion_contenido: 0,

  satisfaccion_general: 0,
  observaciones_sugerencias: ''
};

const STEPS = [
  { id: 1, title: 'Datos Generales', short: 'Generales', icon: User },
  { id: 2, title: 'Organización y Expositor', short: 'Organización y Expositor', icon: Building2 },
  { id: 3, title: 'Documentación y Envío', short: 'Materiales y Envío', icon: Sparkles }
];

export default function FormWizardReact() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [direction, setDirection] = useState<number>(1);
  const [formData, setFormData] = useState<FormDataState>(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [submittedTime, setSubmittedTime] = useState<string>('');

  // Evento Activo desde Supabase
  const [eventoActivo, setEventoActivo] = useState<{ id: number; nombre: string; expositor: string } | null>(null);
  const [checkingEmail, setCheckingEmail] = useState<boolean>(false);
  const [yaRegistradoEnEsteEvento, setYaRegistradoEnEsteEvento] = useState<boolean>(false);
  const [fechaRegistroPrevio, setFechaRegistroPrevio] = useState<string>('');

  // Estados de Ubigeo y Maestrias
  const [departamentos, setDepartamentos] = useState<UbigeoItem[]>([]);
  const [provincias, setProvincias] = useState<UbigeoItem[]>([]);
  const [distritos, setDistritos] = useState<UbigeoItem[]>([]);
  const [maestrias, setMaestrias] = useState<MaestriaItem[]>([]);
  const [loadingProvs, setLoadingProvs] = useState<boolean>(false);
  const [loadingDists, setLoadingDists] = useState<boolean>(false);

  useEffect(() => {
    async function loadInitial() {
      try {
        const [deptos, evento, listMaestrias] = await Promise.all([
          getDepartamentos(),
          getEventoActivo(),
          getMaestrias()
        ]);
        setDepartamentos(deptos);
        setMaestrias(listMaestrias);
        if (evento) {
          setEventoActivo(evento);
          const el = document.getElementById('header-evento-nombre');
          if (el && evento.nombre) {
            el.textContent = evento.nombre;
          }
        }
      } catch (err) {
        console.error('Error cargando datos iniciales:', err);
      }
    }
    loadInitial();
  }, []);

  // Poblar datos recuperados del usuario y precargar listas de ubigeo
  const poblarDatosRegistro = async (reg: CapacitacionResponseRecord, esMismoEvento: boolean) => {
    if (esMismoEvento) {
      setYaRegistradoEnEsteEvento(true);
      const fecha = reg.created_at ? new Date(reg.created_at).toLocaleString('es-PE') : '';
      setFechaRegistroPrevio(fecha);
      toast.error('Usted ya completó su evaluación para este evento' + (fecha ? ` el ${fecha}` : '') + '. El registro está bloqueado.', {
        duration: 6000
      });
    } else {
      setYaRegistradoEnEsteEvento(false);
      toast.success('¡Bienvenido de nuevo! Autocompletamos sus datos personales guardados.', {
        duration: 4000
      });
    }

    const partes = (reg.apellidosNombres || '').split(',');
    const ap = partes[0]?.trim() || '';
    const nom = partes[1]?.trim() || '';

    // Cargar listas y nombres de ubigeo si existen IDs
    const allDeptos = departamentos.length > 0 ? departamentos : LOCAL_DEPARTAMENTOS;
    let deptoName = reg.departamento || '';
    let provName = reg.provincia || '';
    let distName = reg.distrito || '';

    if (reg.departamentoId) {
      const dFound = allDeptos.find(d => Number(d.id) === Number(reg.departamentoId));
      if (dFound) deptoName = dFound.name;

      try {
        const provList = await getProvincias(reg.departamentoId);
        setProvincias(provList);

        if (reg.provinciaId) {
          const pFound = provList.find(p => Number(p.id) === Number(reg.provinciaId));
          if (pFound) provName = pFound.name;

          const distList = await getDistritos(reg.provinciaId, deptoName);
          setDistritos(distList);

          if (reg.distritoId) {
            const diFound = distList.find(di => Number(di.id) === Number(reg.distritoId));
            if (diFound) distName = diFound.name;
          }
        }
      } catch (ubigeoErr) {
        console.warn('Error precargando listas de ubigeo:', ubigeoErr);
      }
    }

    setFormData((prev) => ({
      ...prev,
      apellidos: ap || prev.apellidos,
      nombres: nom || prev.nombres,
      correo: reg.correo || prev.correo,
      celular: reg.celular || prev.celular,
      sexo: reg.esMasculino ? 'MASCULINO' : 'FEMENINO',
      edad: String(reg.edad || prev.edad || ''),
      maestriaId: reg.maestriaId || (maestrias.find(m => m.nombre.trim().toUpperCase() === (reg.maestria || '').trim().toUpperCase())?.id ?? prev.maestriaId),
      maestria: reg.maestria || prev.maestria || '',
      departamento: deptoName,
      departamentoId: reg.departamentoId || null,
      provincia: provName,
      provinciaId: reg.provinciaId || null,
      distrito: distName,
      distritoId: reg.distritoId || null,
      ...(esMismoEvento ? {
        organizacion_horario: reg.organizacion_horario,
        organizacion_instalaciones: reg.organizacion_instalaciones,
        organizacion_audiovisuales: reg.organizacion_audiovisuales,
        capacitador_tema: reg.capacitador_tema,
        capacitador_dominio: reg.capacitador_dominio,
        capacitador_metodologia: reg.capacitador_metodologia,
        capacitador_tiempo: reg.capacitador_tiempo,
        documentacion_calidad: reg.documentacion_calidad,
        documentacion_contenido: reg.documentacion_contenido,
        satisfaccion_general: reg.satisfaccion_general,
        observaciones_sugerencias: reg.observaciones_sugerencias || ''
      } : {})
    }));
  };

  // Validación y autocompletado inteligente por Celular y/o Correo
  const verificarRegistro = async (correoVal?: string, celularVal?: string) => {
    const email = (correoVal !== undefined ? correoVal : formData.correo).trim().toLowerCase();
    const phone = (celularVal !== undefined ? celularVal : formData.celular).replace(/\D/g, '').trim();

    const hasEmail = email.includes('@') && email.includes('.');
    const hasPhone = phone.length === 9;

    if (!hasEmail && !hasPhone) return;

    setCheckingEmail(true);
    try {
      const res = await verificarRegistroPrevio(
        email,
        phone,
        eventoActivo?.id,
        eventoActivo?.nombre || CAPACITACION_DEFAULT.nombre
      );

      if (res.yaRegistradoEnEsteEvento && res.registroEsteEvento) {
        await poblarDatosRegistro(res.registroEsteEvento, true);
      } else if (res.registroHistoricoUsuario) {
        await poblarDatosRegistro(res.registroHistoricoUsuario, false);
      } else {
        setYaRegistradoEnEsteEvento(false);
      }
    } catch (e) {
      console.warn('Error verificando registro:', e);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleDepartamentoChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const deptoName = e.target.value;
    const selectedOpt = e.target.selectedOptions[0];
    const deptoId = selectedOpt?.dataset.id ? Number(selectedOpt.dataset.id) : null;

    setFormData((prev) => ({
      ...prev,
      departamento: deptoName,
      departamentoId: deptoId,
      provincia: '',
      provinciaId: null,
      distrito: '',
      distritoId: null
    }));

    setProvincias([]);
    setDistritos([]);

    if (!deptoName || !deptoId) return;

    setLoadingProvs(true);
    try {
      const list = await getProvincias(deptoId);
      setProvincias(list);
    } catch (err) {
      console.error('Error cargando provincias:', err);
      toast.error('No se pudieron cargar las provincias');
    } finally {
      setLoadingProvs(false);
    }
  };

  const handleProvinciaChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provName = e.target.value;
    const selectedOpt = e.target.selectedOptions[0];
    const provId = selectedOpt?.dataset.id ? Number(selectedOpt.dataset.id) : null;

    setFormData((prev) => ({
      ...prev,
      provincia: provName,
      provinciaId: provId,
      distrito: '',
      distritoId: null
    }));

    setDistritos([]);

    if (!provName || !provId) return;

    setLoadingDists(true);
    try {
      const list = await getDistritos(provId, formData.departamento);
      setDistritos(list);
    } catch (err) {
      console.error('Error cargando distritos:', err);
      toast.error('No se pudieron cargar los distritos');
    } finally {
      setLoadingDists(false);
    }
  };

  const handleDistritoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const distName = e.target.value;
    const selectedOpt = e.target.selectedOptions[0];
    const distId = selectedOpt?.dataset.id ? Number(selectedOpt.dataset.id) : null;

    setFormData((prev) => ({
      ...prev,
      distrito: distName,
      distritoId: distId
    }));
  };

  const updateField = (field: keyof FormDataState, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (yaRegistradoEnEsteEvento) {
        toast.error('Usted ya completó su evaluación para este evento. No se permite continuar ni registrarse nuevamente.');
        return false;
      }
      const celClean = formData.celular.replace(/\D/g, '');
      if (celClean.length !== 9) {
        toast.error('El número de celular debe tener exactamente 9 dígitos numéricos.');
        return false;
      }
      if (!formData.correo || !formData.correo.includes('@')) {
        toast.error('Por favor, ingrese un correo válido.');
        return false;
      }
      if (!formData.sexo) {
        toast.error('Por favor, seleccione su género (Hombre o Mujer).');
        return false;
      }
      if (!formData.nombres.trim()) {
        toast.error('Por favor, complete sus nombres.');
        return false;
      }
      if (!formData.apellidos.trim()) {
        toast.error('Por favor, complete sus apellidos.');
        return false;
      }
      if (!formData.maestriaId && !formData.maestria) {
        toast.error('Seleccione su maestría.');
        return false;
      }
      if (!formData.departamento) {
        toast.error('Seleccione su departamento.');
        return false;
      }
      if (!formData.provincia) {
        toast.error('Seleccione su provincia.');
        return false;
      }
      if (!formData.distrito) {
        toast.error('Seleccione su distrito.');
        return false;
      }
    }

    if (step === 2) {
      if (
        formData.organizacion_horario === 0 ||
        formData.organizacion_instalaciones === 0 ||
        formData.organizacion_audiovisuales === 0
      ) {
        toast.error('Por favor, califique todos los aspectos de la Organización.');
        return false;
      }
      if (
        formData.capacitador_tema === 0 ||
        formData.capacitador_dominio === 0 ||
        formData.capacitador_metodologia === 0 ||
        formData.capacitador_tiempo === 0
      ) {
        toast.error('Por favor, califique todos los aspectos del Expositor.');
        return false;
      }
    }

    if (step === 3) {
      if (
        formData.documentacion_calidad === 0 ||
        formData.documentacion_contenido === 0
      ) {
        toast.error('Por favor, califique la Documentación y Materiales.');
        return false;
      }
      if (formData.satisfaccion_general === 0) {
        toast.error('Por favor, califique su nivel de Satisfacción General.');
        return false;
      }
    }

    return true;
  };

  const nextStep = () => {
    if (yaRegistradoEnEsteEvento) {
      toast.error('Usted ya completó su evaluación para este evento. El avance a los siguientes pasos está bloqueado.');
      return;
    }
    if (validateStep(currentStep)) {
      setDirection(1);
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const prevStep = () => {
    setDirection(-1);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const goToStep = (stepNumber: number) => {
    if (yaRegistradoEnEsteEvento && stepNumber > 1) {
      toast.error('Usted ya completó su evaluación para este evento. Los siguientes pasos están bloqueados.');
      return;
    }
    if (stepNumber < currentStep) {
      setDirection(-1);
      setCurrentStep(stepNumber);
    } else if (stepNumber > currentStep) {
      if (validateStep(currentStep)) {
        setDirection(1);
        setCurrentStep(stepNumber);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (yaRegistradoEnEsteEvento) {
      toast.error('Usted ya completó la evaluación para este evento. No se admiten registros duplicados.');
      return;
    }

    if (!validateStep(1)) {
      goToStep(1);
      return;
    }

    if (!validateStep(2)) {
      goToStep(2);
      return;
    }

    if (!validateStep(3)) {
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Guardando respuestas en Supabase...');

    const payload: CapacitacionResponseRecord = {
      capacitacionId: eventoActivo?.id,
      maestriaId: formData.maestriaId || undefined,
      apellidosNombres: `${formData.apellidos.trim()}, ${formData.nombres.trim()}`,
      correo: formData.correo.trim(),
      esMasculino: formData.sexo === 'MASCULINO',
      sexo: formData.sexo,
      edad: formData.edad || '',
      celular: formData.celular.trim(),
      maestria: formData.maestria,

      departamentoId: formData.departamentoId || 0,
      provinciaId: formData.provinciaId || 0,
      distritoId: formData.distritoId || 0,
      departamento: formData.departamento,
      provincia: formData.provincia,
      distrito: formData.distrito,

      organizacion_horario: formData.organizacion_horario,
      organizacion_instalaciones: formData.organizacion_instalaciones,
      organizacion_audiovisuales: formData.organizacion_audiovisuales,

      capacitador_tema: formData.capacitador_tema,
      capacitador_dominio: formData.capacitador_dominio,
      capacitador_metodologia: formData.capacitador_metodologia,
      capacitador_tiempo: formData.capacitador_tiempo,

      documentacion_calidad: formData.documentacion_calidad,
      documentacion_contenido: formData.documentacion_contenido,

      satisfaccion_general: formData.satisfaccion_general,
      observaciones_sugerencias: formData.observaciones_sugerencias.trim()
    };

    try {
      const res = await submitCapacitacionResponse(payload);
      if (!res.synced) {
        throw new Error(res.error || 'No se pudo registrar la respuesta.');
      }

      toast.success('¡Encuesta registrada con éxito!', { id: toastId });

      try {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (confErr) {}

      setSubmittedTime(new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setIsSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || 'Error al conectar con la base de datos', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData(INITIAL_FORM_DATA);
    setIsSubmitted(false);
    setCurrentStep(1);
  };

  // Selector Likert ultra compacto
  const LikertSelector = ({
    value,
    onChange,
    label,
    questionNumber
  }: {
    value: number;
    onChange: (val: number) => void;
    label: string;
    questionNumber?: number;
  }) => {
    return (
      <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200/90 shadow-2xs hover:border-blue-300 transition-all">
        <div className="flex items-start gap-2 mb-2">
          {questionNumber !== undefined && (
            <span className="flex-shrink-0 w-5 h-5 rounded-md bg-blue-50 text-blue-800 text-[11px] font-extrabold flex items-center justify-center border border-blue-200">
              {questionNumber}
            </span>
          )}
          <p className="text-xs font-semibold text-slate-800 leading-snug">{label}</p>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          {LIKERT_OPTIONS.map((opt) => {
            const isSelected = value === opt.score;
            return (
              <button
                key={opt.score}
                type="button"
                onClick={() => onChange(opt.score)}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs scale-[1.02]'
                    : 'bg-slate-50/80 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span className="text-base sm:text-lg leading-none mb-0.5">{opt.icon}</span>
                <span className={`text-[10px] font-bold tracking-tight leading-tight truncate w-full ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                  {opt.label.split(' ')[0]}
                </span>
                <span className={`text-[9px] font-semibold leading-none ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                  {opt.score} pts
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-2.5">
      <Toaster position="top-center" richColors />

      {/* Pantalla de Éxito */}
      {isSubmitted ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-6 sm:p-8 border border-emerald-100 shadow-xl text-center space-y-4 max-w-lg mx-auto"
        >
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-3xl border border-emerald-200 shadow-inner">
            🎉
          </div>

          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Sincronizado con Supabase
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              ¡Muchas Gracias por su Participación!
            </h2>
            <p className="text-slate-600 text-xs leading-relaxed">
              Su evaluación fue registrada a las <span className="font-bold text-slate-800">{submittedTime}</span>.
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 text-left space-y-1.5 text-xs">
            <div className="flex justify-between pb-1 border-b border-slate-200">
              <span className="text-slate-500">Participante:</span>
              <span className="font-bold text-slate-800">{formData.apellidos}, {formData.nombres}</span>
            </div>
            <div className="flex justify-between pb-1 border-b border-slate-200">
              <span className="text-slate-500">Maestría:</span>
              <span className="font-bold text-slate-800 truncate max-w-[220px]">{formData.maestria}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Ubicación:</span>
              <span className="font-bold text-slate-800">{formData.distrito}, {formData.provincia}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Llenar una nueva encuesta
          </button>
        </motion.div>
      ) : (
        <>
          {/* Stepper Superior Compacto */}
          <div className="bg-white rounded-xl p-2.5 sm:p-3 border border-slate-200 shadow-2xs">
            {/* Header del stepper con avance */}
            <div className="flex items-center justify-between gap-2 mb-2 px-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
                  Progreso
                </span>
              </div>
              <div className="text-[11px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                Paso {currentStep} de {STEPS.length} • {Math.round((currentStep / STEPS.length) * 100)}%
              </div>
            </div>

            {/* Barra de progreso animada delgada */}
            <div className="w-full bg-slate-100 h-1.5 rounded-full mb-2 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-600"
                initial={{ width: '33%' }}
                animate={{ width: `${(currentStep / STEPS.length) * 100}%` }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              />
            </div>

            {/* Pasos en fila compacta (3 Tabs) */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {STEPS.map((step) => {
                const IconComponent = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                const isBlocked = yaRegistradoEnEsteEvento && step.id > 1;

                return (
                  <button
                    key={step.id}
                    type="button"
                    disabled={isBlocked}
                    onClick={() => {
                      if (isBlocked) {
                        toast.error('Usted ya completó su evaluación para este evento. Avance bloqueado.');
                        return;
                      }
                      goToStep(step.id);
                    }}
                    className={`flex items-center justify-center sm:justify-start gap-1.5 p-1.5 rounded-lg text-left transition-all ${
                      isBlocked
                        ? 'opacity-40 cursor-not-allowed text-slate-400 bg-slate-50'
                        : isActive
                        ? 'bg-blue-50 text-blue-900 border border-blue-200 font-bold cursor-pointer'
                        : isCompleted
                        ? 'text-slate-600 hover:bg-slate-50 cursor-pointer'
                        : 'text-slate-400 hover:text-slate-600 cursor-pointer'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-extrabold flex-shrink-0 transition-all ${
                        isBlocked
                          ? 'bg-slate-200 text-slate-500'
                          : isActive
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : isCompleted
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isBlocked ? (
                        <Lock className="w-3.5 h-3.5 text-slate-500" />
                      ) : isCompleted ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <IconComponent className="w-3.5 h-3.5" />
                      )}
                    </span>
                    <span className={`hidden sm:inline text-xs truncate leading-tight ${isActive ? 'text-blue-950 font-bold' : isBlocked ? 'text-slate-400' : 'text-slate-600'}`}>
                      {step.short}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Formulario / Tarjeta de Paso Compacta */}
          <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: direction * 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -direction * 15 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center font-bold">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="text-sm font-extrabold text-slate-900 leading-tight">
                          Paso 1: Atributos Generales del Participante
                        </h2>
                        <p className="text-[11px] text-slate-500">
                          Información personal y filiación USS
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Correo y Género */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                    <div className="md:col-span-8">
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="block text-[11px] font-bold text-slate-700">
                          Correo Electrónico <span className="text-red-500">*</span>
                        </label>
                        {checkingEmail && formData.correo.includes('@') && (
                          <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> Verificando...
                          </span>
                        )}
                      </div>
                      <div className="relative flex items-center">
                        <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                        <input
                          type="email"
                          required
                          value={formData.correo}
                          onChange={(e) => {
                            updateField('correo', e.target.value);
                            if (yaRegistradoEnEsteEvento) setYaRegistradoEnEsteEvento(false);
                          }}
                          onBlur={() => {
                            if (formData.correo.includes('@') && formData.correo.includes('.')) {
                              verificarRegistro(formData.correo, formData.celular);
                            }
                          }}
                          placeholder="ejemplo@uss.edu.pe"
                          className="custom-input-light text-xs py-1.5"
                          style={{ paddingLeft: '2.25rem' }}
                        />
                      </div>
                      {yaRegistradoEnEsteEvento && (
                        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-300 flex items-start gap-2 text-xs text-amber-950 mt-1.5 animate-fadeIn shadow-2xs">
                          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="font-extrabold text-[11px] text-amber-950 leading-tight">Usted ya cuenta con un registro en este evento</p>
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded">
                                <Lock className="w-2.5 h-2.5 text-amber-800" />
                                Bloqueado
                              </span>
                            </div>
                            <p className="text-[10px] text-amber-800 leading-tight mt-0.5">
                              {fechaRegistroPrevio ? `Registrado el ${fechaRegistroPrevio}. ` : ''}Sus respuestas fueron cargadas. El avance y el reenvío están deshabilitados para evitar duplicados.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-4">
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        Género <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateField('sexo', 'MASCULINO')}
                          className={`py-1.5 px-2 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center ${
                            formData.sexo === 'MASCULINO'
                              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          Hombre
                        </button>
                        <button
                          type="button"
                          onClick={() => updateField('sexo', 'FEMENINO')}
                          className={`py-1.5 px-2 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center ${
                            formData.sexo === 'FEMENINO'
                              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          Mujer
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Nombres, Apellidos y Celular */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        Nombres <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.nombres}
                        onChange={(e) => updateField('nombres', e.target.value)}
                        placeholder="Ej. Juan Alberto"
                        className="custom-input-light text-xs py-1.5"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        Apellidos <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.apellidos}
                        onChange={(e) => updateField('apellidos', e.target.value)}
                        placeholder="Ej. Pérez García"
                        className="custom-input-light text-xs py-1.5"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="block text-[11px] font-bold text-slate-700">
                          Celular (9 dígitos) <span className="text-red-500">*</span>
                        </label>
                        {checkingEmail && formData.celular.length === 9 && (
                          <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> Verificando...
                          </span>
                        )}
                      </div>
                      <div className="relative flex items-center">
                        <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                        <input
                          type="tel"
                          inputMode="numeric"
                          required
                          maxLength={9}
                          value={formData.celular}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 9);
                            updateField('celular', val);
                            if (yaRegistradoEnEsteEvento) setYaRegistradoEnEsteEvento(false);
                            if (val.length === 9) {
                              verificarRegistro(formData.correo, val);
                            }
                          }}
                          onBlur={() => {
                            const val = formData.celular.replace(/\D/g, '');
                            if (val.length > 0 && val.length !== 9) {
                              toast.error('El número de celular debe tener exactamente 9 dígitos.');
                            } else if (val.length === 9) {
                              verificarRegistro(formData.correo, val);
                            }
                          }}
                          placeholder="999888777"
                          className="custom-input-light text-xs py-1.5"
                          style={{ paddingLeft: '2.25rem' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Edad y Maestría */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <div className="sm:col-span-4">
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        Edad
                      </label>
                      <input
                        type="number"
                        min="18"
                        max="99"
                        value={formData.edad}
                        onChange={(e) => updateField('edad', e.target.value)}
                        placeholder="30"
                        className="custom-input-light text-xs py-1.5"
                      />
                    </div>

                    <div className="sm:col-span-8">
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        Maestría USS <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={formData.maestriaId || ''}
                        onChange={(e) => {
                          const idNum = Number(e.target.value) || null;
                          const allM = maestrias.length > 0 ? maestrias : MAESTRIAS_FALLBACK;
                          const found = allM.find(m => m.id === idNum);
                          setFormData(prev => ({
                            ...prev,
                            maestriaId: idNum,
                            maestria: found ? found.nombre : ''
                          }));
                        }}
                        className="custom-input-light text-xs py-1.5"
                      >
                        <option value="">Seleccione Maestría...</option>
                        {(maestrias.length > 0 ? maestrias : MAESTRIAS_FALLBACK).map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Ubicación Geográfica en Cascada */}
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      <span>Ubicación Geográfica (Perú) <span className="text-red-500">*</span></span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <select
                          required
                          value={formData.departamento}
                          onChange={handleDepartamentoChange}
                          className="custom-input-light text-xs py-1.5"
                        >
                          <option value="">Dpto: Seleccionar</option>
                          {departamentos.map((d) => (
                            <option key={d.id} value={d.name} data-id={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <select
                          required
                          disabled={!formData.departamento || loadingProvs}
                          value={formData.provincia}
                          onChange={handleProvinciaChange}
                          className="custom-input-light text-xs py-1.5 disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          <option value="">
                            {!formData.departamento ? 'Elija Dpto primero' : 'Prov: Seleccionar'}
                          </option>
                          {provincias.map((p) => (
                            <option key={p.id} value={p.name} data-id={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <select
                          required
                          disabled={!formData.provincia || loadingDists}
                          value={formData.distrito}
                          onChange={handleDistritoChange}
                          className="custom-input-light text-xs py-1.5 disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          <option value="">
                            {!formData.provincia ? 'Elija Prov primero' : 'Dist: Seleccionar'}
                          </option>
                          {distritos.map((di) => (
                            <option key={di.id} value={di.name} data-id={di.id}>
                              {di.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, x: direction * 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -direction * 15 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center font-bold">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="text-sm font-extrabold text-slate-900 leading-tight">
                          Paso 2: Organización y Evaluación del Expositor
                        </h2>
                        <p className="text-[11px] text-slate-500">
                          Logística, equipamiento y desempeño del capacitador
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Contenedor en 2 columnas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Columna 1: Organización */}
                    <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-200/90 space-y-2">
                      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-1.5">
                        <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                          <Building2 className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h3 className="text-xs font-extrabold text-slate-900 leading-tight">
                            Organización de la Capacitación
                          </h3>
                          <p className="text-[10px] text-slate-500">
                            Aspectos logísticos y del entorno
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <LikertSelector
                          questionNumber={1}
                          label="El horario y duración de la capacitación."
                          value={formData.organizacion_horario}
                          onChange={(val) => updateField('organizacion_horario', val)}
                        />
                        <LikertSelector
                          questionNumber={2}
                          label="Las instalaciones donde se realizó la capacitación."
                          value={formData.organizacion_instalaciones}
                          onChange={(val) => updateField('organizacion_instalaciones', val)}
                        />
                        <LikertSelector
                          questionNumber={3}
                          label="Los medios audiovisuales y equipamiento tecnológico."
                          value={formData.organizacion_audiovisuales}
                          onChange={(val) => updateField('organizacion_audiovisuales', val)}
                        />
                      </div>
                    </div>

                    {/* Columna 2: Expositor */}
                    <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-200/90 space-y-2">
                      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-1.5">
                        <div className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
                          <Award className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h3 className="text-xs font-extrabold text-slate-900 leading-tight">
                            El Capacitador / Expositor
                          </h3>
                          <p className="text-[10px] text-slate-500">
                            Dominio, metodología y resolución de dudas
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <LikertSelector
                          questionNumber={1}
                          label="La selección del tema tratado por el expositor."
                          value={formData.capacitador_tema}
                          onChange={(val) => updateField('capacitador_tema', val)}
                        />
                        <LikertSelector
                          questionNumber={2}
                          label="El dominio del expositor sobre la materia."
                          value={formData.capacitador_dominio}
                          onChange={(val) => updateField('capacitador_dominio', val)}
                        />
                        <LikertSelector
                          questionNumber={3}
                          label="La metodología de trabajo y dinámicas aplicadas."
                          value={formData.capacitador_metodologia}
                          onChange={(val) => updateField('capacitador_metodologia', val)}
                        />
                        <LikertSelector
                          questionNumber={4}
                          label="El tiempo de participación y resolución de dudas."
                          value={formData.capacitador_tiempo}
                          onChange={(val) => updateField('capacitador_tiempo', val)}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, x: direction * 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -direction * 15 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center font-bold">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="text-sm font-extrabold text-slate-900 leading-tight">
                          Paso 3: Documentación, Satisfacción y Envío Final
                        </h2>
                        <p className="text-[11px] text-slate-500">
                          Recursos entregados, satisfacción general y confirmación
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Contenedor en 2 columnas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Columna 1: Documentación y Materiales */}
                    <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-200/90 space-y-2">
                      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-1.5">
                        <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h3 className="text-xs font-extrabold text-slate-900 leading-tight">
                            Documentación y Materiales
                          </h3>
                          <p className="text-[10px] text-slate-500">
                            Claridad y calidad de los recursos compartidos
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <LikertSelector
                          questionNumber={1}
                          label="La calidad de las diapositivas y recursos utilizados."
                          value={formData.documentacion_calidad}
                          onChange={(val) => updateField('documentacion_calidad', val)}
                        />

                        <LikertSelector
                          questionNumber={2}
                          label="El contenido y claridad conceptual de las diapositivas."
                          value={formData.documentacion_contenido}
                          onChange={(val) => updateField('documentacion_contenido', val)}
                        />
                      </div>
                    </div>

                    {/* Columna 2: Satisfacción y Sugerencias */}
                    <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-200/90 space-y-2 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-1.5">
                          <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                            <Sparkles className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <h3 className="text-xs font-extrabold text-slate-900 leading-tight">
                              Satisfacción Global y Sugerencias
                            </h3>
                            <p className="text-[10px] text-slate-500">
                              Califique su experiencia total con el evento
                            </p>
                          </div>
                        </div>

                        <LikertSelector
                          label="¿Cuál es su nivel de satisfacción general con la capacitación recibida?"
                          value={formData.satisfaccion_general}
                          onChange={(val) => updateField('satisfaccion_general', val)}
                        />

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                            Observaciones y/o Sugerencias de Mejora (Opcional)
                          </label>
                          <textarea
                            rows={2}
                            value={formData.observaciones_sugerencias}
                            onChange={(e) => updateField('observaciones_sugerencias', e.target.value)}
                            placeholder="Indique sugerencias o temas a profundizar..."
                            className="custom-input-light text-xs resize-none py-1.5"
                          />
                        </div>
                      </div>

                      <div className="bg-blue-50/80 rounded-lg p-2.5 border border-blue-200/80 text-xs text-slate-700 mt-1">
                        <div className="flex items-center gap-1.5 font-bold text-blue-900 mb-1 text-[11px]">
                          <Info className="w-3.5 h-3.5 text-blue-700" />
                          <span>Resumen del Registro</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-[11px]">
                          <p className="truncate"><span className="text-slate-500">Participante:</span> <span className="font-semibold">{formData.apellidos}, {formData.nombres}</span></p>
                          <p className="truncate"><span className="text-slate-500">Correo:</span> <span className="font-semibold">{formData.correo}</span></p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Barra de Navegación Inferior Compacta */}
            <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-200">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Anterior
                </button>
              ) : (
                <div />
              )}

              {currentStep < STEPS.length ? (
                yaRegistradoEnEsteEvento ? (
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-50 text-red-700 font-bold text-xs border border-red-200 cursor-not-allowed shadow-none"
                    title="Usted ya completó su evaluación para este evento. No se admiten registros duplicados."
                  >
                    <Lock className="w-3.5 h-3.5 text-red-600" />
                    Registro Ya Completado (Bloqueado)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs shadow-xs transition-all hover:scale-[1.01] cursor-pointer"
                  >
                    Siguiente Paso
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm transition-all hover:scale-[1.01] cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Enviar Encuesta
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </>
      )}
    </div>
  );
}
