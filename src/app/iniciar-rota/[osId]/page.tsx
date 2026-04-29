'use client';

export const runtime = 'edge';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, AlertCircle, Loader2, Navigation } from 'lucide-react';

interface PreviewData {
  os: {
    id: string;
    protocolo: string;
    os_number: string;
    trecho: string;
  };
  alreadyStarted: boolean;
}

export default function IniciarRotaPage() {
  const params = useParams();
  const osId = params.osId as string;

  const [status, setStatus] = useState<'loading' | 'confirm' | 'submitting' | 'success' | 'already' | 'error'>('loading');
  const [message, setMessage] = useState('Carregando dados da rota...');
  const [preview, setPreview] = useState<PreviewData | null>(null);

  useEffect(() => {
    if (!osId) return;

    fetch(`/api/os-start-route?os_id=${encodeURIComponent(osId)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.success) {
          setStatus('error');
          setMessage(data.error || 'Erro ao carregar dados da rota.');
          return;
        }
        if (data.alreadyStarted) {
          setStatus('already');
          setMessage(data.message || 'Rota já iniciada anteriormente.');
          return;
        }
        setPreview(data);
        setStatus('confirm');
      })
      .catch(() => {
        setStatus('error');
        setMessage('Erro de conexão. Tente novamente mais tarde.');
      });
  }, [osId]);

  const handleStart = async () => {
    setStatus('submitting');
    try {
      const res = await fetch('/api/os-start-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ os_id: osId }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('success');
        setMessage(data.message || 'Rota iniciada com sucesso! Boa viagem e dirija com segurança.');
      } else {
        setStatus('error');
        setMessage(data.error || 'Não foi possível iniciar a rota.');
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

        {status === 'confirm' && preview && (
          <>
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
              <Navigation size={32} className="text-blue-600" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-wider">Iniciar Rota</h1>
              <p className="text-sm font-semibold text-slate-500">
                OS {preview.os.os_number || preview.os.protocolo} — {preview.os.trecho}
              </p>
            </div>
            <button
              onClick={handleStart}
              className="w-full bg-blue-600 text-white font-black text-sm uppercase tracking-widest py-4 rounded-2xl shadow-lg shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
            >
              Confirmar Início da Rota
            </button>
          </>
        )}

        {status === 'submitting' && (
          <>
            <Loader2 size={48} className="animate-spin text-blue-600 mx-auto" />
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-wider">Processando</h1>
            <p className="text-sm font-semibold text-slate-500">Iniciando rota...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Navigation size={32} className="text-green-600" />
            </div>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-wider">Rota Iniciada</h1>
            <p className="text-sm font-semibold text-slate-500">{message}</p>
            <p className="text-xs font-medium text-slate-400 pt-2">O sistema foi atualizado. Bom trabalho!</p>
          </>
        )}

        {status === 'already' && (
          <>
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} className="text-blue-600" />
            </div>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-wider">Já Iniciada</h1>
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
