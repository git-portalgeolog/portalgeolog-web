import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const WAHA_STATUS_TIMEOUT_MS = 8000;
const WAHA_SEND_TIMEOUT_MS = 15000;

function getWahaConfig() {
  return {
    url: process.env.WAHA_API_URL,
    key: process.env.WAHA_API_KEY,
    session: process.env.WAHA_SESSION || 'default',
  };
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

function getClientIp(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

export function checkRateLimit(
  request: Request,
  maxRequests = 5,
  windowSeconds = 60
): boolean {
  const ip = getClientIp(request);
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowSeconds * 1000 });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}

export function getRateLimitHeaders(request: Request, maxRequests = 5, windowSeconds = 60): Record<string, string> {
  const ip = getClientIp(request);
  const entry = rateLimitMap.get(ip);
  const remaining = entry ? Math.max(0, maxRequests - entry.count) : maxRequests;
  const reset = entry ? Math.ceil((entry.resetAt - Date.now()) / 1000) : windowSeconds;

  return {
    'X-RateLimit-Limit': String(maxRequests),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(reset),
  };
}

export function validatePhone(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (clean.length < 10) {
    throw new Error('Número de telefone inválido');
  }
  if (clean.length <= 11 && !clean.startsWith('55')) {
    return `55${clean}`;
  }
  return clean;
}

export function validateMessage(message: string): void {
  if (!message || message.trim().length === 0) {
    throw new Error('Mensagem não pode estar vazia');
  }
  if (message.length > 5000) {
    throw new Error('Mensagem muito longa (máximo 5000 caracteres)');
  }
}

export type WhatsAppConnectionState = 'open' | 'connecting' | 'close';

export interface WahaSessionSnapshot {
  sessionName: string;
  state: WhatsAppConnectionState;
  rawStatus: string | null;
  ownerJid: string | null;
  meId: string | null;
}

export function normalizeWahaConnectionState(
  rawStatus: string | null | undefined,
  rawEngineState: string | null | undefined
): WhatsAppConnectionState {
  const normalizedStatus = rawStatus?.toUpperCase() ?? '';
  const normalizedEngineState = rawEngineState?.toUpperCase() ?? '';

  if (
    normalizedStatus === 'WORKING' ||
    normalizedStatus === 'CONNECTED' ||
    normalizedEngineState === 'CONNECTED'
  ) {
    return 'open';
  }

  if (
    normalizedStatus === 'STARTING' ||
    normalizedStatus === 'SCAN_QR_CODE' ||
    normalizedStatus === 'WAITING' ||
    normalizedStatus === 'CONNECTING'
  ) {
    return 'connecting';
  }

  return 'close';
}

export async function fetchWahaSessionState(sessionName?: string): Promise<WahaSessionSnapshot> {
  const { url: WAHA_API_URL, key: WAHA_API_KEY, session: WAHA_SESSION } = getWahaConfig();
  const resolvedSession = sessionName ?? WAHA_SESSION;
  if (!WAHA_API_URL || !WAHA_API_KEY) {
    throw new Error('WAHA não configurada (faltam variáveis de ambiente)');
  }

  const url = `${WAHA_API_URL}/api/sessions?all=true`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Api-Key': WAHA_API_KEY,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(WAHA_STATUS_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Não foi possível consultar a sessão WAHA (${response.status}).`);
  }

  const payload = await response.json().catch(() => null);
  const sessions = (Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { sessions?: unknown[] } | null)?.sessions)
      ? (payload as { sessions: unknown[] }).sessions
      : []) as Array<{
    name?: string;
    status?: string;
    engine?: { state?: string | null } | null;
    me?: { id?: string | null } | null;
  }>;

  const session =
    sessions.find((item) => item?.name === resolvedSession) ??
    sessions.find((item) => item?.name === 'default') ??
    sessions[0];

  if (!session) {
    return {
      sessionName: resolvedSession,
      state: 'close',
      rawStatus: null,
      ownerJid: null,
      meId: null,
    };
  }

  const rawStatus = session.status ?? null;
  const rawEngineState = session.engine?.state ?? null;
  const meId = session.me?.id ?? null;

  return {
    sessionName: session.name ?? resolvedSession,
    state: normalizeWahaConnectionState(rawStatus, rawEngineState),
    rawStatus,
    ownerJid: meId,
    meId,
  };
}

export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<unknown> {
  const { url: WAHA_API_URL, key: WAHA_API_KEY, session: WAHA_SESSION } = getWahaConfig();
  if (!WAHA_API_URL || !WAHA_API_KEY) {
    throw new Error('WAHA não configurada (faltam variáveis de ambiente)');
  }

  const cleanPhone = validatePhone(phone);
  validateMessage(message);

  const currentState = await fetchWahaSessionState();

  if (currentState.state !== 'open') {
    throw new Error(
      `Sessão WAHA indisponível no momento (${currentState.state}). Refaça a conexão antes de enviar.`
    );
  }

  const url = `${WAHA_API_URL}/api/sendText`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': WAHA_API_KEY,
    },
    body: JSON.stringify({
      session: WAHA_SESSION,
      chatId: `${cleanPhone}@c.us`,
      text: message,
    }),
    signal: AbortSignal.timeout(WAHA_SEND_TIMEOUT_MS),
  });

  const responseText = await response.text().catch(() => '');
  let data: Record<string, unknown> | string = {};

  if (responseText) {
    try {
      data = JSON.parse(responseText) as Record<string, unknown>;
    } catch {
      data = responseText;
    }
  }

  if (!response.ok) {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    throw new Error(
      response.status === 524
        ? 'WAHA demorou demais para responder (524). Verifique se a sessão está conectada e se o endpoint da WAHA está saudável.'
        : `WAHA error ${response.status}: ${payload}`
    );
  }

  return data;
}

export async function startWahaSession(sessionName?: string): Promise<WahaSessionSnapshot> {
  const { url: WAHA_API_URL, key: WAHA_API_KEY, session: WAHA_SESSION } = getWahaConfig();
  const resolvedSession = sessionName ?? WAHA_SESSION;
  if (!WAHA_API_URL || !WAHA_API_KEY) {
    throw new Error('WAHA não configurada (faltam variáveis de ambiente)');
  }

  const startSession = async (endpoint: string, body: unknown) => {
    return fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': WAHA_API_KEY,
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(WAHA_STATUS_TIMEOUT_MS),
    });
  };

  let response = await startSession(
    `${WAHA_API_URL}/api/sessions/${encodeURIComponent(resolvedSession)}/start`,
    {}
  );

  if (response.status === 404) {
    response = await startSession(`${WAHA_API_URL}/api/sessions/start`, {
      name: resolvedSession,
    });
  }

  if (!response.ok && response.status !== 422) {
    const text = await response.text().catch(() => '');
    throw new Error(`Não foi possível iniciar a sessão WAHA (${response.status}): ${text || 'sem detalhes'}`);
  }

  return fetchWahaSessionState(resolvedSession);
}

export async function validateAuth(request: Request): Promise<{ userId: string } | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return null;
    }

    return { userId: data.user.id };
  } catch {
    return null;
  }
}

export function unauthorizedResponse(request: Request, maxRequests = 5, windowSeconds = 60): NextResponse {
  return NextResponse.json(
    { success: false, error: 'Não autorizado' },
    {
      status: 401,
      headers: getRateLimitHeaders(request, maxRequests, windowSeconds),
    }
  );
}

export function rateLimitResponse(request: Request, maxRequests = 5, windowSeconds = 60): NextResponse {
  return NextResponse.json(
    { success: false, error: 'Muitas requisições. Aguarde um momento.' },
    {
      status: 429,
      headers: getRateLimitHeaders(request, maxRequests, windowSeconds),
    }
  );
}
