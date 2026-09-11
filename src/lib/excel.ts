import * as XLSX from 'xlsx';
import type { CapacitacionResponseRecord } from './types';

export function exportResponsesToExcel(records: CapacitacionResponseRecord[], filename = 'Respuestas_Capacitacion_USS.xlsx'): void {
  if (!records || records.length === 0) {
    alert('No hay registros disponibles para exportar a Excel.');
    return;
  }

  // Mapear filas a formato amigable para hoja de cálculo
  const rows = records.map((r, index) => {
    const dateFormatted = r.created_at
      ? new Date(r.created_at).toLocaleString('es-PE', { timeZone: 'America/Lima' })
      : '';

    return {
      'N°': index + 1,
      'Fecha y Hora': dateFormatted,
      'Apellidos y Nombres': r.apellidosNombres,
      'Correo': r.correo,
      'Celular': r.celular || 'No registrado',
      'Puesto de Trabajo': r.puestoTrabajo || 'No especificado',
      'Sexo / Género': r.sexo || '',
      'Edad': r.edad || '',
      'Maestría / Programa': r.maestria || '',
      'Departamento': r.departamento || '',
      'Provincia': r.provincia || '',
      'Distrito': r.distrito || '',
      'Capacitación': r.nombreCapacitacion || '',
      'Expositor': r.expositor || '',
      'Org: Horario y Duración': r.organizacion_horario || '',
      'Org: Instalaciones': r.organizacion_instalaciones || '',
      'Org: Medios Audiovisuales': r.organizacion_audiovisuales || '',
      'Capacitador: Tema': r.capacitador_tema || '',
      'Capacitador: Dominio': r.capacitador_dominio || '',
      'Capacitador: Metodología': r.capacitador_metodologia || '',
      'Capacitador: Tiempo': r.capacitador_tiempo || '',
      'Doc: Calidad Diapositivas': r.documentacion_calidad || '',
      'Doc: Contenido': r.documentacion_contenido || '',
      'Satisfacción General': r.satisfaccion_general || '',
      'Observaciones y Sugerencias': r.observaciones_sugerencias || '',
      'Estado Supabase': r.sync_status === 'synced' ? 'Sincronizado' : 'Solo Local'
    };
  });

  // Crear libro y hoja
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Auto-ajustar ancho de columnas
  const colWidths = [
    { wch: 5 },  // N°
    { wch: 18 }, // Fecha
    { wch: 28 }, // Apellidos y Nombres
    { wch: 26 }, // Correo
    { wch: 14 }, // Celular
    { wch: 22 }, // Puesto
    { wch: 14 }, // Sexo
    { wch: 8 },  // Edad
    { wch: 35 }, // Maestria
    { wch: 16 }, // Dpto
    { wch: 16 }, // Prov
    { wch: 18 }, // Distrito
    { wch: 30 }, // Capacitacion
    { wch: 25 }, // Expositor
    { wch: 20 }, // Org 1
    { wch: 20 }, // Org 2
    { wch: 20 }, // Org 3
    { wch: 20 }, // Cap 1
    { wch: 20 }, // Cap 2
    { wch: 20 }, // Cap 3
    { wch: 20 }, // Cap 4
    { wch: 22 }, // Doc 1
    { wch: 22 }, // Doc 2
    { wch: 20 }, // Satisfaccion
    { wch: 40 }, // Observaciones
    { wch: 16 }  // Estado
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Respuestas USS');

  // Descargar archivo .xlsx directamente
  XLSX.writeFile(workbook, filename);
}

export function exportResponsesToCSV(records: CapacitacionResponseRecord[], filename = 'Respuestas_Capacitacion_USS.csv'): void {
  if (!records || records.length === 0) {
    alert('No hay registros disponibles para exportar a CSV.');
    return;
  }

  const rows = records.map((r, index) => ({
    'N': index + 1,
    'Fecha': r.created_at ? new Date(r.created_at).toISOString() : '',
    'Apellidos_Nombres': r.apellidosNombres,
    'Correo': r.correo,
    'Celular': r.celular,
    'Puesto': r.puestoTrabajo,
    'Sexo': r.sexo,
    'Edad': r.edad,
    'Maestria': r.maestria,
    'Departamento': r.departamento,
    'Provincia': r.provincia,
    'Distrito': r.distrito,
    'Satisfaccion_General': r.satisfaccion_general,
    'Observaciones': (r.observaciones_sugerencias || '').replace(/[\r\n]+/g, ' ')
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

  // Crear Blob con BOM para soporte UTF-8 en Excel
  const blob = new Blob(['\uFEFF' + csvOutput], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
