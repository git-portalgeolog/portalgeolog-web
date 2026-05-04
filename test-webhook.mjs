// Teste local da lógica do webhook - simula uma mensagem do motorista

const SUPABASE_URL = 'https://hzpgfapvjwqtjclriisz.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY env var');
  process.exit(1);
}

// Simular o payload que a WAHA envia
const testPayload = {
  event: 'message',
  session: 'default',
  payload: {
    from: '5522992495653@s.whatsapp.net',
    body: '1',
    text: '1',
    fromMe: false,
    replyTo: null,
  }
};

const fromJid = testPayload.payload.from;
const selectedText = testPayload.payload.body.trim();
const phoneDigits = fromJid.replace(/\D/g, '').replace(/@.*$/, '');

console.log('=== SIMULAÇÃO WEBHOOK ===');
console.log('fromJid:', fromJid);
console.log('selectedText:', selectedText);
console.log('phoneDigits:', phoneDigits, '(len=' + phoneDigits.length + ')');

// Testar query no Supabase
async function test() {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const last10 = phoneDigits.slice(-10);
  const last11 = phoneDigits.slice(-11);

  console.log('Buscando driver com phone ilike %' + last10 + '% ou %' + last11 + '%');

  const { data: drivers, error: dErr } = await supabase
    .from('drivers')
    .select('id, name, phone')
    .or(`phone.ilike.%${last10}%,phone.ilike.%${last11}%`)
    .limit(5);

  if (dErr) {
    console.error('Driver query error:', dErr);
    return;
  }

  console.log('Drivers encontrados:', drivers?.length || 0);
  drivers?.forEach(d => console.log('  -', d.name, '| phone:', d.phone));

  const driver = drivers?.find((d) => {
    const dPhone = (d.phone || '').replace(/\D/g, '');
    return dPhone === phoneDigits || dPhone.endsWith(last10) || dPhone.endsWith(last11);
  });

  console.log('Driver matched:', driver ? driver.name : 'NONE');

  if (!driver) {
    console.log('❌ Driver não encontrado - fluxo para aqui');
    return;
  }

  const expectedStates = ['awaiting_accept'];

  const { data: osList, error: osErr } = await supabase
    .from('ordens_servico')
    .select('id, status_operacional, motorista, veiculo_id, driver_whatsapp_state, protocolo, os_number, trecho')
    .eq('motorista', driver.name)
    .in('driver_whatsapp_state', expectedStates)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (osErr) {
    console.error('OS query error:', osErr);
    return;
  }

  console.log('OS encontradas:', osList?.length || 0);
  osList?.forEach(o => console.log('  - OS', o.id, '| state:', o.driver_whatsapp_state, '| motorista:', o.motorista));

  if (!osList?.[0]) {
    console.log('❌ Nenhuma OS no estado awaiting_accept - fluxo para aqui');
  } else {
    console.log('✅ OS encontrada:', osList[0].id, '→ processaria aceite');
  }
}

test().catch(console.error);
