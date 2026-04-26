const TOKEN = 'THISISMYSECURETOKEN';
const BASE = 'https://wppconnect.portalgeolog.com.br/api/bot_cnh';

async function req(path, method = 'GET', body) {
  const opts = { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${BASE}${path}`, opts);
  const t = await r.text();
  console.log(`${method} ${path} -> ${r.status}: ${t.substring(0, 500)}`);
}

await req('/check-connection-session');
await req('/start-session', 'POST', { session: 'bot_cnh', autoClose: false, browserArgs: ['--no-proxy-server'] });
