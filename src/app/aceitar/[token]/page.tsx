'use client';

export const runtime = 'edge';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, AlertCircle, Loader2, Car, Gauge } from 'lucide-react';

interface PreviewData {
  os: {
    id: string;
    protocolo: string;
    os_number: string;
    trecho: string;
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
  const [kmInitial, setKmInitial] = useState('');
  const [kmError, setKmError] = useState('');

  useEffect(() => {
    if (!token) return;

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);

    if (!isUUID) {
      // Fluxo de passageiro — manter automático
      fetch(`/api/passenger-accept?token=${encodeURIComponent(token)}`)
        .then(async (res) => {
          const data = await res.json();
          if (data.success) {
            if (data.alreadyAccepted) {
              setStatus('already');
              setMessage(data.message || 'Viagem já confirmada anteriormente.');
            } else {
              setStatus('success');
              setMessage(data.message || 'Viagem confirmada com sucesso! O motorista será notificado.');
            }
          } else {
            setStatus('error');
            setMessage(data.error || 'Não foi possível confirmar a viagem.');
          }
        })
        .catch(() => {
          setStatus('error');
          setMessage('Erro de conexão. Tente novamente mais tarde.');
        });
      return;
    }

    // Fluxo de motorista — carregar preview
    fetch(`/api/os-driver-accept?os_id=${encodeURIComponent(token)}&preview=1`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.success) {
          setStatus('error');
          setMessage(data.error || 'Erro ao carregar dados da viagem.');
          return;
        }
        if (data.alreadyAccepted) {
          setStatus('already');
          setMessage(data.message || 'Viagem já aceita anteriormente.');
          return;
        }
        setPreview(data);
        setStatus('form');
      })
      .catch(() => {
        setStatus('error');
        setMessage('Erro de conexão. Tente novamente mais tarde.');
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setKmError('');

    const km = Number(kmInitial);
    if (!kmInitial.trim() || Number.isNaN(km) || km < 0) {
      setKmError('Informe uma quilometragem inicial válida.');
      return;
    }

    setStatus('submitting');
    try {
      const res = await fetch('/api/os-driver-accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ os_id: token, km_initial: km }),
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
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-wider">Confirmar Viagem</h1>
              <p className="text-sm font-semibold text-slate-500">
                OS {preview.os.os_number || preview.os.protocolo} — {preview.os.trecho}
              </p>
              <p className="text-xs text-slate-400">
                {preview.os.data} {preview.os.hora}
              </p>
            </div>

            {preview.vehicle && (
              <div className="bg-slate-50 rounded-2xl p-5 space-y-3 border border-slate-200">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Veículo Designado</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                    <Car size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800">{preview.vehicle.marca} {preview.vehicle.modelo}</p>
                    <p className="text-xs font-bold text-slate-500">Placa: {preview.vehicle.placa}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="km-initial" className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <Gauge size={18} className="text-blue-600" />
                Quilometragem Inicial
              </label>
              <input
                id="km-initial"
                type="number"
                inputMode="numeric"
                min={0}
                value={kmInitial}
                onChange={(e) => setKmInitial(e.target.value)}
                placeholder="Ex: 45230"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                required
              />
              {kmError && <p className="text-xs font-bold text-rose-500">{kmError}</p>}
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white font-black text-sm uppercase tracking-widest py-4 rounded-2xl shadow-lg shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
            >
              Aceitar Viagem
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
