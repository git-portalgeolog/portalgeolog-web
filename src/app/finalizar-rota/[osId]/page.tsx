'use client';

export const runtime = 'edge';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, AlertCircle, Loader2, Flag, Gauge } from 'lucide-react';

interface PreviewData {
  os: {
    id: string;
    protocolo: string;
    os_number: string;
    trecho: string;
  };
  alreadyFinished: boolean;
  canFinish: boolean;
}

export default function FinalizarRotaPage() {
  const params = useParams();
  const osId = params.osId as string;

  const [status, setStatus] = useState<'loading' | 'form' | 'submitting' | 'success' | 'already' | 'error'>('loading');
  const [message, setMessage] = useState('Carregando dados da rota...');
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [kmFinal, setKmFinal] = useState('');
  const [kmError, setKmError] = useState('');

  useEffect(() => {
    if (!osId) return;

    fetch(`/api/os-finish-route?os_id=${encodeURIComponent(osId)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.success) {
          setStatus('error');
          setMessage(data.error || 'Erro ao carregar dados da rota.');
          return;
        }
        if (data.alreadyFinished) {
          setStatus('already');
          setMessage(data.message || 'Rota já finalizada anteriormente.');
          return;
        }
        if (!data.canFinish) {
          setStatus('error');
          setMessage('A viagem ainda não foi iniciada.');
          return;
        }
        setPreview(data);
        setStatus('form');
      })
      .catch(() => {
        setStatus('error');
        setMessage('Erro de conexão. Tente novamente mais tarde.');
      });
  }, [osId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setKmError('');

    const km = Number(kmFinal);
    if (!kmFinal.trim() || Number.isNaN(km) || km < 0) {
      setKmError('Informe uma quilometragem final válida.');
      return;
    }

    setStatus('submitting');
    try {
      const res = await fetch('/api/os-finish-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ os_id: osId, km_final: km }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('success');
        setMessage(data.message || 'Rota finalizada com sucesso! Obrigado pela viagem.');
      } else {
        setStatus('error');
        setMessage(data.error || 'Não foi possível finalizar a rota.');
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
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <Flag size={32} className="text-emerald-600" />
              </div>
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-wider">Finalizar Rota</h1>
              <p className="text-sm font-semibold text-slate-500">
                OS {preview.os.os_number || preview.os.protocolo} — {preview.os.trecho}
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="km-final" className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <Gauge size={18} className="text-emerald-600" />
                Quilometragem Final
              </label>
              <input
                id="km-final"
                type="number"
                inputMode="numeric"
                min={0}
                value={kmFinal}
                onChange={(e) => setKmFinal(e.target.value)}
                placeholder="Ex: 45320"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                required
              />
              {kmError && <p className="text-xs font-bold text-rose-500">{kmError}</p>}
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 text-white font-black text-sm uppercase tracking-widest py-4 rounded-2xl shadow-lg shadow-emerald-600/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
            >
              Finalizar Viagem
            </button>
          </form>
        )}

        {status === 'submitting' && (
          <>
            <Loader2 size={48} className="animate-spin text-blue-600 mx-auto" />
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-wider">Processando</h1>
            <p className="text-sm font-semibold text-slate-500">Finalizando rota...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Flag size={32} className="text-green-600" />
            </div>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-wider">Rota Finalizada</h1>
            <p className="text-sm font-semibold text-slate-500">{message}</p>
            <p className="text-xs font-medium text-slate-400 pt-2">O sistema foi atualizado. Obrigado!</p>
          </>
        )}

        {status === 'already' && (
          <>
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} className="text-blue-600" />
            </div>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-wider">Já Finalizada</h1>
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
