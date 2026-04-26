'use client';

export const runtime = 'edge';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function AceitarViagemPage() {
  const params = useParams();
  const token = params.token as string;

  const [status, setStatus] = useState<'loading' | 'success' | 'already' | 'error'>('loading');
  const [message, setMessage] = useState('Processando confirmação...');

  useEffect(() => {
    if (!token) return;

    // Se o token é um UUID, é o ID da OS (motorista)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);

    if (isUUID) {
      console.log('[Aceitar] Token é UUID, tentando motorista direto:', token);
      fetch(`/api/os-driver-accept?os_id=${encodeURIComponent(token)}`)
        .then(async (res) => {
          const data = await res.json();
          console.log('[Aceitar] motorista response:', data);
          if (data.success) {
            if (data.alreadyAccepted) {
              setStatus('already');
              setMessage(data.message || 'Viagem já aceita pelo motorista anteriormente.');
            } else {
              setStatus('success');
              setMessage(data.message || 'Viagem aceita!');
            }
          } else {
            setStatus('error');
            setMessage(data.error || 'Não foi possível confirmar a viagem.');
          }
        })
        .catch((err) => {
          console.error('[Aceitar] Erro motorista:', err);
          setStatus('error');
          setMessage('Erro de conexão. Tente novamente mais tarde.');
        });
      return;
    }

    // Caso contrário, tentar como token de passageiro
    console.log('[Aceitar] Token não é UUID, tentando passageiro:', token);
    fetch(`/api/passenger-accept?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        console.log('[Aceitar] passageiro response:', data);
        if (data.success) {
          if (data.alreadyAccepted) {
            setStatus('already');
            setMessage(data.message || 'Viagem já confirmada anteriormente.');
          } else {
            setStatus('success');
            setMessage(data.message || 'Viagem confirmada com sucesso! O motorista será notificado.');
          }
          return;
        }
        setStatus('error');
        setMessage(data.error || 'Não foi possível confirmar a viagem.');
      })
      .catch((err) => {
        console.error('[Aceitar] Erro passageiro:', err);
        setStatus('error');
        setMessage('Erro de conexão. Tente novamente mais tarde.');
      });
  }, [token]);

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
        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-wider">Viagem Confirmada</h1>
            <p className="text-sm font-semibold text-slate-500">{message}</p>
            <p className="text-xs font-medium text-slate-400 pt-2">Aguarde a próxima instrução.</p>
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
