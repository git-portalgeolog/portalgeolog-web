'use client';

export const runtime = 'edge';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, AlertCircle, Loader2, Car } from 'lucide-react';

interface PreviewData {
  os: {
    id: string;
    protocolo: string;
    os_number: string;
    data: string;
    hora: string;
  };
  vehicle: {
    marca: string;
    modelo: string;
    placa: string;
  } | null;
}

export default function AceitarViagemPage() {
  const params = useParams();
  const token = params.token as string;

  const [status, setStatus] = useState<'loading' | 'form' | 'submitting' | 'success' | 'already' | 'error'>('loading');
  const [message, setMessage] = useState('Carregando dados da viagem...');
  const [preview, setPreview] = useState<PreviewData | null>(null);

  useEffect(() => {
    if (!token) return;

    let isActive = true;

    const loadToken = async () => {
      try {
        const passengerRes = await fetch(`/api/passenger-accept?token=${encodeURIComponent(token)}`);
        const passengerData = await passengerRes.json().catch(() => null);

        if (passengerRes.ok) {
          if (!isActive) return;

          if (passengerData?.alreadyAccepted) {
            setStatus('already');
            setMessage(passengerData.message || 'Viagem já confirmada anteriormente.');
          } else {
            setStatus('success');
            setMessage(passengerData?.message || 'Viagem confirmada com sucesso! O motorista será notificado.');
          }
          return;
        }

        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);

        if (!isUUID || passengerRes.status === 404) {
          const driverRes = await fetch(`/api/os-driver-accept?os_id=${encodeURIComponent(token)}&preview=1`);
          const driverData = await driverRes.json();

          if (!isActive) return;

          if (driverRes.ok && driverData.success) {
            if (driverData.alreadyAccepted) {
              setStatus('already');
              setMessage(driverData.message || 'Viagem já aceita anteriormente.');
              return;
            }
            setPreview(driverData);
            setStatus('form');
            return;
          }

          // Se ambos falharam (404 no passageiro e erro no motorista), mostrar mensagem genérica de não encontrado.
          setStatus('error');
          setMessage('Link de confirmação inválido, expirado ou ordem de serviço não encontrada.');
          return;
        }

        if (!isActive) return;
        setStatus('error');
        setMessage(passengerData?.error || 'Não foi possível confirmar a viagem.');
      } catch {
        if (!isActive) return;
        setStatus('error');
        setMessage('Erro de conexão. Tente novamente mais tarde.');
      }
    };

    void loadToken();

    return () => {
      isActive = false;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setStatus('submitting');
    try {
      const res = await fetch('/api/os-driver-accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ os_id: token }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('success');
        setMessage(data.message || 'Viagem aceita com sucesso!');
      } else {
        setStatus('error');
        setMessage(data.error || 'Erro ao aceitar viagem.');
      }
    } catch {
      setStatus('error');
      setMessage('Erro de conexão. Tente novamente mais tarde.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/40 p-8 text-center space-y-6">
        {status === 'loading' && (
          <>
            <Loader2 size={48} className="animate-spin text-blue-600 mx-auto" />
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-wider">Aguarde</h1>
            <p className="text-sm font-semibold text-slate-500">{message}</p>
          </>
        )}

        {status === 'form' && preview && (
          <form onSubmit={handleSubmit} className="space-y-6 text-left">
            <div className="text-center space-y-2">
              <Car size={40} className="text-blue-600 mx-auto" />
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-wider">Confirmar Aceite</h1>
              <p className="text-sm font-semibold text-slate-500">OS {preview.os.os_number || preview.os.protocolo}</p>
              <p className="text-xs text-slate-400">
                {preview.os.data} {preview.os.hora || ''}
              </p>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white font-black text-sm uppercase tracking-widest py-4 rounded-2xl shadow-lg shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
            >
              Confirmar Aceite
            </button>
          </form>
        )}

        {status === 'submitting' && (
          <>
            <Loader2 size={48} className="animate-spin text-blue-600 mx-auto" />
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-wider">Processando</h1>
            <p className="text-sm font-semibold text-slate-500">Registrando aceite...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-wider">Viagem Confirmada</h1>
            <p className="text-sm font-semibold text-slate-500">{message}</p>
            <p className="text-xs font-medium text-slate-400 pt-2">Aguarde a próxima instrução no WhatsApp.</p>
          </>
        )}

        {status === 'already' && (
          <>
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} className="text-blue-600" />
            </div>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-wider">Já Confirmada</h1>
            <p className="text-sm font-semibold text-slate-500">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <AlertCircle size={32} className="text-red-600" />
            </div>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-wider">Erro</h1>
            <p className="text-sm font-semibold text-slate-500">{message}</p>
          </>
        )}
      </div>
    </div>
  );
}
