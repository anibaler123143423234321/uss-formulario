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
  console.log('\n================================================================');
  console.log('🧪 SUITE DE PRUEBAS: ESQUEMA NORMALIZADO (IDs, BOOLEANO, LIKERT)');
  console.log('================================================================\n');

  // PRUEBA 1: Verificación de Tablas
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

  // PRUEBA 2: Consulta de IDs de Ubigeo
  console.log('\nTest 2: Consulta de IDs para Lambayeque / Chiclayo / Pimentel...');
  const { data: deptos } = await supabase
    .from('ubigeo_departamentos')
    .select('id, departamento')
    .ilike('departamento', 'LAMBAYEQUE')
    .limit(1);

  const deptoId = deptos?.[0]?.id;
  assert(deptoId !== undefined, `ID Departamento LAMBAYEQUE: ${deptoId}`);

  const { data: provs } = await supabase
    .from('ubigeo_provincias')
    .select('id, provincia')
    .eq('departamento_id', deptoId)
    .ilike('provincia', 'CHICLAYO')
    .limit(1);

  const provId = provs?.[0]?.id;
  assert(provId !== undefined, `ID Provincia CHICLAYO: ${provId}`);

  const { data: dists } = await supabase
    .from('ubigeo_distritos')
    .select('id, distrito')
    .eq('provincia_id', provId)
    .ilike('distrito', 'PIMENTEL')
    .limit(1);

  const distId = dists?.[0]?.id;
  assert(distId !== undefined, `ID Distrito PIMENTEL (Campus USS): ${distId}`);

  // PRUEBA 3: Inserción Normalizada
  console.log('\nTest 3: Inserción con Foreign Keys, Booleano y Likert 1-5...');
  const uniqueEmail = `docente.test.${Date.now()}@uss.edu.pe`;
  const mockNormalizedResponse = {
    apellidos_nombres: 'Chuman Lluen, Dagner',
    correo: uniqueEmail,
    puesto_trabajo: 'Ingeniero de Sistemas',
    expositor: 'Equipo de Calidad y Acreditación USS',
    nombre_capacitacion: 'Estándares ISO Core del Sistema: SGC USS, Modelo de SUNEDU',
    es_masculino: true, // Booleano para Sexo
    edad: 30,
    celular: '987654321',
    maestria: 'MAESTRÍA EN ADMINISTRACIÓN DE NEGOCIOS - MBA',

    // Relaciones por ID
    departamento_id: deptoId,
    provincia_id: provId,
    distrito_id: distId,

    // Escala Likert como enteros 1 a 5
    organizacion_horario: 5,
    organizacion_instalaciones: 4,
    organizacion_audiovisuales: 5,
    capacitador_tema: 5,
    capacitador_dominio: 5,
    capacitador_metodologia: 4,
    capacitador_tiempo: 5,
    documentacion_calidad: 5,
    documentacion_contenido: 5,
    satisfaccion_general: 5,
    observaciones_sugerencias: 'Excelente sesión formativa e infraestructura relacional.'
  };

  const { data: insertResult, error: insertError } = await supabase
    .from('respuestas_capacitacion')
    .insert([mockNormalizedResponse])
    .select();

  assert(!insertError, `Inserción exitosa (${insertError ? insertError.message : 'OK 201'})`);
  assert(insertResult && insertResult.length > 0, `ID generado: ${insertResult?.[0]?.id}`);

  // PRUEBA 4: Inserción con Femenino (es_masculino = false) y Puesto de Trabajo Opcional (null)
  console.log('\nTest 4: Inserción Femenino (es_masculino = false) y puesto opcional...');
  const mockFemale = {
    ...mockNormalizedResponse,
    correo: `docente.fem.${Date.now()}@uss.edu.pe`,
    es_masculino: false,
    puesto_trabajo: null
  };

  const { data: insertFemale, error: insertFemaleErr } = await supabase
    .from('respuestas_capacitacion')
    .insert([mockFemale])
    .select();

  assert(!insertFemaleErr, `Inserción Femenino exitosa (ID: ${insertFemale?.[0]?.id})`);
  assert(insertFemale?.[0]?.es_masculino === false, 'es_masculino guardado como false');

  // PRUEBA 5: Verificación de Consultas y Relaciones (JOIN con Ubigeos)
  console.log('\nTest 5: Verificación de Relaciones por ID con JOIN...');
  const { data: joinedRecord, error: joinErr } = await supabase
    .from('respuestas_capacitacion')
    .select(`
      id,
      correo,
      es_masculino,
      satisfaccion_general,
      ubigeo_departamentos (departamento),
      ubigeo_provincias (provincia),
      ubigeo_distritos (distrito)
    `)
    .eq('correo', uniqueEmail)
    .single();

  assert(!joinErr, `Consulta relacional JOIN exitosa (${joinErr ? joinErr.message : 'OK'})`);
  assert(joinedRecord?.ubigeo_departamentos?.departamento === 'LAMBAYEQUE', 'JOIN departamento: LAMBAYEQUE');
  assert(joinedRecord?.ubigeo_provincias?.provincia === 'CHICLAYO', 'JOIN provincia: CHICLAYO');
  assert(joinedRecord?.ubigeo_distritos?.distrito === 'PIMENTEL', 'JOIN distrito: PIMENTEL');
  assert(joinedRecord?.satisfaccion_general === 5, 'Satisfacción general guardada como numérico 5');

  console.log('\n================================================================');
  console.log(`📊 RESULTADOS: ${passedCount} pasadas, ${failedCount} fallidas`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

testSuite().catch((e) => {
  console.error('Error fatal durante las pruebas:', e);
  process.exit(1);
});
