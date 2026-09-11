import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xeiddxudvaazmevzmmlr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_tlVHfHLiKpW71PcTHdtrTQ_1-lRRhsp';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedCount++;
  }
}

async function testSuite() {
  console.log('\n======================================================');
  console.log('🧪 SUITE DE PRUEBAS UNITARIAS: SUPABASE & FORMULARIO');
  console.log('======================================================\n');

  // PRUEBA 1: Conexión con Supabase
  console.log('Test 1: Verificación de Tablas en Supabase...');
  const tables = [
    'respuestas_capacitacion',
    'ubigeo_departamentos',
    'ubigeo_provincias',
    'ubigeo_distritos'
  ];

  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    assert(!error && count !== null, `Tabla [${table}] accesible (registros: ${count})`);
  }

  // PRUEBA 2: Consulta de Ubigeos
  console.log('\nTest 2: Integridad de Ubigeo Peruano...');
  const { data: deptos, error: errDeptos } = await supabase
    .from('ubigeo_departamentos')
    .select('id, departamento, ubigeo')
    .ilike('departamento', 'LAMBAYEQUE')
    .limit(1);

  assert(!errDeptos && deptos?.length === 1, 'Departamento LAMBAYEQUE encontrado');
  const lambayequeId = deptos?.[0]?.id;

  if (lambayequeId) {
    const { data: provs, error: errProvs } = await supabase
      .from('ubigeo_provincias')
      .select('id, provincia')
      .eq('departamento_id', lambayequeId);

    assert(!errProvs && provs?.some(p => p.provincia === 'CHICLAYO'), 'Provincia CHICLAYO encontrada en Lambayeque');
    const chiclayoId = provs?.find(p => p.provincia === 'CHICLAYO')?.id;

    if (chiclayoId) {
      const { data: dists, error: errDists } = await supabase
        .from('ubigeo_distritos')
        .select('id, distrito')
        .eq('provincia_id', chiclayoId);

      assert(!errDists && dists?.some(d => d.distrito === 'PIMENTEL'), 'Distrito PIMENTEL (Campus USS) encontrado en Chiclayo');
    }
  }

  // PRUEBA 3: Inserción de Respuesta Completa
  console.log('\nTest 3: Inserción en tabla [respuestas_capacitacion]...');
  const uniqueEmail = `test.unitario.${Date.now()}@uss.edu.pe`;
  const mockFormResponse = {
    apellidos_nombres: 'García Pérez, Ana María',
    correo: uniqueEmail,
    puesto_trabajo: 'Docente Investigador',
    expositor: 'Equipo de Calidad y Acreditación USS',
    nombre_capacitacion: 'Estándares ISO Core del Sistema: SGC USS, Modelo de SUNEDU - Plan de Supervisión',
    sexo: 'Femenino',
    edad: 42,
    celular: '974829103',
    maestria: 'MAESTRÍA EN ADMINISTRACIÓN DE NEGOCIOS - MBA',
    departamento: 'LAMBAYEQUE',
    provincia: 'CHICLAYO',
    distrito: 'PIMENTEL',

    organizacion_horario: 'MUY BUENO',
    organizacion_instalaciones: 'BUENO',
    organizacion_audiovisuales: 'MUY BUENO',

    capacitador_tema: 'MUY BUENO',
    capacitador_dominio: 'MUY BUENO',
    capacitador_metodologia: 'MUY BUENO',
    capacitador_tiempo: 'BUENO',

    documentacion_calidad: 'MUY BUENO',
    documentacion_contenido: 'MUY BUENO',

    satisfaccion_general: 'MUY BUENO',
    observaciones_sugerencias: 'Excelente capacitación, la organización y contenido fueron impecables.'
  };

  const { data: insertResult, error: insertError } = await supabase
    .from('respuestas_capacitacion')
    .insert([mockFormResponse])
    .select();

  assert(!insertError, `Inserción exitosa sin errores (${insertError ? insertError.message : 'OK'})`);
  assert(insertResult && insertResult.length > 0, `ID generado: ${insertResult?.[0]?.id}`);

  // PRUEBA 4: Inserción con Puesto de Trabajo Opcional (Vacío)
  console.log('\nTest 4: Inserción con Puesto de Trabajo omitido (Opcional)...');
  const mockWithoutPuesto = {
    ...mockFormResponse,
    correo: `test.sinpuesto.${Date.now()}@uss.edu.pe`,
    puesto_trabajo: null
  };

  const { data: insertNoPuesto, error: insertNoPuestoErr } = await supabase
    .from('respuestas_capacitacion')
    .insert([mockWithoutPuesto])
    .select();

  assert(!insertNoPuestoErr, `Inserción sin puesto de trabajo exitosa (ID: ${insertNoPuesto?.[0]?.id})`);

  // PRUEBA 5: Lectura y Verificación de Datos Guardados
  console.log('\nTest 5: Verificación de persistencia y lectura en Supabase...');
  const { data: readRecord, error: readError } = await supabase
    .from('respuestas_capacitacion')
    .select('*')
    .eq('correo', uniqueEmail)
    .single();

  assert(!readError && readRecord !== null, 'Lectura del registro por correo electrónico');
  assert(readRecord?.departamento === 'LAMBAYEQUE', 'Campo departamento persistido correctamente');
  assert(readRecord?.distrito === 'PIMENTEL', 'Campo distrito persistido correctamente');
  assert(readRecord?.satisfaccion_general === 'MUY BUENO', 'Satisfacción general registrada');

  console.log('\n======================================================');
  console.log(`📊 RESULTADOS: ${passedCount} pasadas, ${failedCount} fallidas`);
  console.log('======================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

testSuite().catch((e) => {
  console.error('Error fatal durante la suite de pruebas:', e);
  process.exit(1);
});
