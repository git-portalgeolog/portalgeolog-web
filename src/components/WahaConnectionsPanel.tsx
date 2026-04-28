'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Smartphone,
  Plus,
  Trash2,
  Power,
  PowerOff,
  QrCode,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Wifi,
  WifiOff,
  AlertTriangle,
  X,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import StandardModal from './StandardModal';

interface WahaSession {
  name: string;
  status: string;
  engine?: { state?: string | null } | null;
  me?: { id?: string | null; pushName?: string | null } | null;
  startTimestamp?: number | null;
}

interface SessionWithMeta extends WahaSession {
  isConnected: boolean;
  isConnecting: boolean;
  uptimeFormatted?: string;
}

export default function WahaConnectionsPanel() {
  const [sessions, setSessions] = useState<SessionWithMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [vpsHealth, setVpsHealth] = useState<'checking' | 'connected' | 'error'>('checking');
  const [vpsInfo, setVpsInfo] = useState('');
  const [wahaHealth, setWahaHealth] = useState<'checking' | 'connected' | 'error'>('checking');
  const [lastSyncAt, setLastSyncAt] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrSessionName, setQrSessionName] = useState('');
  const [qrImage, setQrImage] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [connectionSuccessModalOpen, setConnectionSuccessModalOpen] = useState(false);
  const [connectionSuccessLabel, setConnectionSuccessLabel] = useState('default');
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const qrPollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectionSuccessShownRef = useRef(false);
  const qrWasShownRef = useRef(false);
  const WAHA_SESSION_NAME = 'default';

  const getAccessToken = useCallback(async () => {
    const { data: { session } } = await import('@/lib/supabase/client').then((m) => {
      const client = m.createClient();
      return client.auth.getSession();
    });

    return session?.access_token ?? null;
  }, []);

  const checkVpsConnection = useCallback(async () => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      const res = await fetch('/api/ssh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ command: 'pwd' }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const output = String(data.stdout || '').trim();
      setVpsInfo(output);
      setVpsHealth(output.includes('/opt/waha') ? 'connected' : 'error');
    } catch (err) {
      console.error('Erro ao checar VPS:', err);
      setVpsHealth('checking');
      setVpsInfo('');
    }
  }, [getAccessToken]);

  const fetchSessions = useCallback(async () => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      const res = await fetch('/api/waha/sessions', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const mapped: SessionWithMeta[] = (data.sessions || []).map((s: WahaSession) => {
        const statusUpper = (s.status || '').toUpperCase();
        const engineState = (s.engine?.state || '').toUpperCase();
        const isConnected = statusUpper === 'WORKING' || statusUpper === 'CONNECTED' || engineState === 'CONNECTED';
        const isConnecting = ['STARTING', 'SCAN_QR_CODE', 'WAITING', 'CONNECTING'].includes(statusUpper);

        let uptimeFormatted: string | undefined;
        if (s.startTimestamp && isConnected) {
          const diff = Date.now() - s.startTimestamp;
          const hours = Math.floor(diff / 3600000);
          const mins = Math.floor((diff % 3600000) / 60000);
          const secs = Math.floor((diff % 60000) / 1000);
          uptimeFormatted = `${hours}h ${mins}m ${secs}s`;
        }

        return { ...s, isConnected, isConnecting, uptimeFormatted };
      });

      setSessions(mapped.filter((session) => session.name === WAHA_SESSION_NAME));
      setWahaHealth('connected');
      setLastSyncAt(new Date().toLocaleTimeString('pt-BR'));
    } catch (err) {
      console.error('Erro ao buscar sessões WAHA:', err);
      setWahaHealth('error');
    }
  }, [getAccessToken]);

  useEffect(() => {
    setLoading(true);
    void Promise.all([fetchSessions(), checkVpsConnection()]).finally(() => setLoading(false));

    pollIntervalRef.current = setInterval(() => {
      void fetchSessions();
    }, 3000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (qrPollIntervalRef.current) clearInterval(qrPollIntervalRef.current);
    };
  }, [checkVpsConnection, fetchSessions]);

  const handleCreateDefaultSession = async () => {
    const hasConnectedSession = sessions.some((s) => s.isConnected);
    if (hasConnectedSession) {
      toast.info('Já existe uma sessão WhatsApp conectada. Use a opção de reconectar se necessário.');
      return;
    }

    setIsCreating(true);
    try {
      connectionSuccessShownRef.current = false;
      qrWasShownRef.current = false;
      setConnectionSuccessModalOpen(false);
      setConnectionSuccessLabel(WAHA_SESSION_NAME);

      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error('Sessão expirada');

      const res = await fetch('/api/waha/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success('Sessão padrão criada com sucesso!');
      void fetchSessions();

      // Abrir QR code
      setTimeout(() => handleConnect(), 200);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar sessão');
    } finally {
      setIsCreating(false);
    }
  };

  const handleConnect = async () => {
    const sessionName = WAHA_SESSION_NAME;

    connectionSuccessShownRef.current = false;
    qrWasShownRef.current = false;
    setConnectionSuccessModalOpen(false);
    setConnectionSuccessLabel(sessionName);
    setActionLoading(prev => ({ ...prev, [sessionName]: true }));
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error('Sessão expirada');

      // Start session
      const startRes = await fetch(`/api/waha/sessions/${encodeURIComponent(sessionName)}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const startData = await startRes.json();
      if (!startData.success) throw new Error(startData.error);

      toast.success('Sessão iniciada. Escaneie o QR code.');
      setQrSessionName(sessionName);
      setQrModalOpen(true);
      setQrLoading(true);
      setQrImage('');

      // Poll QR code
      if (qrPollIntervalRef.current) clearInterval(qrPollIntervalRef.current);

      let attempts = 0;
      const maxAttempts = 180; // 90 seconds at 500ms interval

      const isConnectedSession = (session?: WahaSession | null) => {
        return Boolean(
          session &&
          (session.status === 'WORKING' || session.status === 'CONNECTED' || session.engine?.state === 'CONNECTED')
        );
      };

      const completeConnection = async (session?: WahaSession | null) => {
        if (connectionSuccessShownRef.current) return;

        connectionSuccessShownRef.current = true;
        setQrLoading(false);
        setQrImage('');
        setQrModalOpen(false);
        setConnectionSuccessLabel(session?.me?.pushName?.trim() || session?.name || sessionName);
        setConnectionSuccessModalOpen(true);

        if (qrPollIntervalRef.current) clearInterval(qrPollIntervalRef.current);
        toast.success('Sessão conectada com sucesso!');
        void fetchSessions();
      };

      const pollQrAndStatus = async () => {
        if (connectionSuccessShownRef.current) return;

        attempts++;
        if (attempts > maxAttempts) {
          if (qrPollIntervalRef.current) clearInterval(qrPollIntervalRef.current);
          setQrLoading(false);
          toast.error('Tempo expirado. Tente conectar novamente.');
          return;
        }

        try {
          const [qrRes, statusRes] = await Promise.all([
            fetch(`/api/waha/sessions/${encodeURIComponent(sessionName)}/qr`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            }),
            fetch('/api/waha/sessions', {
              headers: { Authorization: `Bearer ${accessToken}` },
            }),
          ]);

          const [qrData, statusData] = await Promise.all([
            qrRes.json(),
            statusRes.json(),
          ]);

          const session = (statusData.sessions || []).find((x: WahaSession) => x.name === sessionName) || null;

          if (isConnectedSession(session)) {
            void completeConnection(session);
            return;
          }

          if (qrData.success && qrData.qrCode) {
            setQrImage(qrData.qrCode);
            setQrLoading(false);
            qrWasShownRef.current = true;
          } else if (qrRes.status === 404 && qrWasShownRef.current) {
            void completeConnection(session);
            return;
          }
        } catch {
          // ignore polling errors
        }
      };

      void pollQrAndStatus();
      qrPollIntervalRef.current = setInterval(() => {
        void pollQrAndStatus();
      }, 500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao conectar');
    } finally {
      setActionLoading(prev => ({ ...prev, [sessionName]: false }));
    }
  };

  const handleDisconnect = async (name: string) => {
    setActionLoading(prev => ({ ...prev, [name]: true }));
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error('Sessão expirada');

      const res = await fetch(`/api/waha/sessions/${encodeURIComponent(name)}/stop`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success('Sessão desconectada');
      void fetchSessions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao desconectar');
    } finally {
      setActionLoading(prev => ({ ...prev, [name]: false }));
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Tem certeza que deseja excluir a sessão "${name}"?`)) return;

    setActionLoading(prev => ({ ...prev, [name]: true }));
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error('Sessão expirada');

      const res = await fetch(`/api/waha/sessions/${encodeURIComponent(name)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success('Sessão excluída');
      void fetchSessions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir');
    } finally {
      setActionLoading(prev => ({ ...prev, [name]: false }));
    }
  };

  const handleCopySessionName = (name: string) => {
    navigator.clipboard.writeText(name);
    toast.success('Nome copiado!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-8 md:p-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-green-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
              <Smartphone size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800">
                Conexões WhatsApp
              </h2>
              <p className="text-slate-500 font-bold">
                Gerencie sessões WAHA conectadas ao sistema.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-black uppercase tracking-[0.25em] text-slate-500">
              <Power size={14} />
              SSH: {vpsHealth === 'connected' ? <span className="text-green-600">online</span> : vpsHealth === 'error' ? <span className="text-red-600">erro</span> : <span className="text-slate-500">checando</span>}
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-black uppercase tracking-[0.25em] text-slate-500">
              <Wifi size={14} />
              WAHA: {wahaHealth === 'connected' ? <span className="text-green-600">online</span> : wahaHealth === 'error' ? <span className="text-red-600">erro</span> : <span className="text-slate-500">checando</span>}
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-black uppercase tracking-[0.25em] text-slate-500">
              <Smartphone size={14} />
              WhatsApp: {sessions.filter((s) => s.isConnected).length > 0 ? <span className="text-green-600">conectado</span> : sessions.filter((s) => s.isConnecting).length > 0 ? <span className="text-amber-600">conectando</span> : <span className="text-slate-500">desconectado</span>}
            </div>
            <button
              onClick={() => void handleCreateDefaultSession()}
              disabled={isCreating}
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-black text-sm hover:bg-green-700 hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
            >
              {isCreating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} strokeWidth={3} />}
              Nova Sessão
            </button>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-6 md:p-8">
          {sessions.length === 0 ? (
            <div className="text-center py-16">
              <Smartphone size={48} className="text-slate-300 mx-auto mb-4" />
              <p className="text-lg font-black text-slate-500">
                Nenhuma sessão configurada
              </p>
              <p className="text-sm text-slate-400 font-semibold mt-1">
                Clique em "Nova Sessão" para criar ou reconectar a sessão padrão.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.name}
                  className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border-2 transition-all ${
                    session.isConnected
                      ? 'bg-green-50/50 border-green-200'
                      : session.isConnecting
                      ? 'bg-amber-50/50 border-amber-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        session.isConnected
                          ? 'bg-green-100 text-green-600'
                          : session.isConnecting
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {session.isConnected ? (
                        <CheckCircle2 size={24} />
                      ) : session.isConnecting ? (
                        <Loader2 size={24} className="animate-spin" />
                      ) : (
                        <XCircle size={24} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-lg text-slate-800">
                          {session.name}
                        </h3>
                        <button
                          onClick={() => handleCopySessionName(session.name)}
                          className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                          title="Copiar nome"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {session.isConnected ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-lg text-xs font-black">
                            <Wifi size={12} />
                            Conectado
                          </span>
                        ) : session.isConnecting ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-black">
                            <Loader2 size={12} className="animate-spin" />
                            Conectando...
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-black">
                            <WifiOff size={12} />
                            Desconectado
                          </span>
                        )}
                        {session.me?.pushName && (
                          <span className="text-xs font-semibold text-slate-500">
                            {session.me.pushName}
                          </span>
                        )}
                      </div>
                      {session.uptimeFormatted && (
                        <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-green-600">
                          <Clock size={12} />
                          Conectado há {session.uptimeFormatted}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!session.isConnected && !session.isConnecting && (
                      <button
                        onClick={() => handleConnect()}
                        disabled={actionLoading[session.name]}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-black text-xs hover:bg-blue-700 transition-all disabled:opacity-50"
                      >
                        <Power size={14} />
                        Conectar
                      </button>
                    )}
                    {(session.isConnected || session.isConnecting) && (
                      <button
                        onClick={() => handleDisconnect(session.name)}
                        disabled={actionLoading[session.name]}
                        className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-xl font-black text-xs hover:bg-amber-700 transition-all disabled:opacity-50"
                      >
                        {actionLoading[session.name] ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <PowerOff size={14} />
                        )}
                        Desconectar
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(session.name)}
                      disabled={actionLoading[session.name]}
                      className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl font-black text-xs hover:bg-red-100 transition-all disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      {qrModalOpen && (
        <StandardModal
          title="Conectar WhatsApp"
          subtitle={`Sessão: ${qrSessionName}`}
          icon={<QrCode size={24} />}
          onClose={() => {
            setQrModalOpen(false);
            if (qrPollIntervalRef.current) clearInterval(qrPollIntervalRef.current);
          }}
          maxWidthClassName="max-w-md"
        >
          <div className="space-y-6 text-center">
            {qrLoading ? (
              <div className="py-8">
                <Loader2 size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
                <p className="font-black text-slate-700">
                  Aguardando QR Code...
                </p>
                <p className="text-sm text-slate-500 font-semibold mt-1">
                  Abrindo WhatsApp no celular
                </p>
              </div>
            ) : qrImage ? (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 inline-block">
                  <img
                    src={qrImage}
                    alt="QR Code WhatsApp"
                    className="w-64 h-64 object-contain"
                  />
                </div>
                <div className="flex items-center justify-center gap-2 text-amber-600 bg-amber-50 rounded-xl p-3 text-sm font-bold">
                  <AlertTriangle size={16} />
                  Escaneie o QR code com o WhatsApp do seu celular
                </div>
                <p className="text-xs text-slate-400 font-semibold">
                  O QR code expira em aproximadamente 1 minuto.
                </p>
              </div>
            ) : (
              <div className="py-8">
                <CheckCircle2 size={48} className="text-green-600 mx-auto mb-4" />
                <p className="font-black text-green-700">
                  Sessão conectada!
                </p>
                <p className="text-sm text-slate-500 font-semibold mt-1">
                  O QR code não é mais necessário.
                </p>
              </div>
            )}
          </div>
        </StandardModal>
      )}

      {connectionSuccessModalOpen && (
        <StandardModal
          title="Parabéns!"
          subtitle={`A sessão ${connectionSuccessLabel} foi conectada com sucesso.`}
          icon={<CheckCircle2 size={24} />}
          onClose={() => setConnectionSuccessModalOpen(false)}
          maxWidthClassName="max-w-md"
        >
          <div className="space-y-6 text-center py-4">
            <div className="mx-auto w-20 h-20 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
              <CheckCircle2 size={40} />
            </div>
            <div className="space-y-2">
              <p className="text-xl font-black text-slate-800">Conexão concluída com sucesso</p>
              <p className="text-sm font-semibold text-slate-500">
                O WhatsApp já está pronto para uso no sistema.
              </p>
            </div>
            <button
              onClick={() => setConnectionSuccessModalOpen(false)}
              className="w-full py-4 bg-green-600 text-white font-black rounded-xl shadow-lg hover:bg-green-700 hover:scale-[1.01] active:scale-[0.98] transition-all text-sm uppercase tracking-widest"
            >
              Continuar
            </button>
          </div>
        </StandardModal>
      )}

    </div>
  );
}
