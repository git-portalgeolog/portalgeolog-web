"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

interface PassengerConfirmButtonProps {
  token: string;
  alreadyAccepted: boolean;
}

export default function PassengerConfirmButton({
  token,
  alreadyAccepted,
}: PassengerConfirmButtonProps) {
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "already" | "error"
  >(alreadyAccepted ? "already" : "idle");
  const [message, setMessage] = useState("");

  const handleConfirm = async () => {
    setStatus("loading");
    try {
      const res = await fetch(
        `/api/passenger-accept?token=${encodeURIComponent(token)}`,
      );
      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        if (data.alreadyAccepted) {
          setStatus("already");
          setMessage(data.message || "Viagem já confirmada anteriormente.");
        } else {
          setStatus("success");
          setMessage(data.message || "Viagem confirmada com sucesso!");
        }
      } else {
        setStatus("error");
        setMessage(
          data?.error ||
            "Não foi possível confirmar a viagem. Tente novamente mais tarde.",
        );
      }
    } catch {
      setStatus("error");
      setMessage("Erro de conexão. Tente novamente mais tarde.");
    }
  };

  if (status === "success") {
    return (
      <div className="space-y-4 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
          <CheckCircle2 size={32} className="text-emerald-600" />
        </div>
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-wider">
          Viagem Confirmada
        </h2>
        <p className="text-sm font-semibold text-slate-500">{message}</p>
        <p className="text-xs font-medium text-slate-400">
          Obrigado por confirmar! O motorista foi notificado e já está se
          preparando para o trajeto.
        </p>
        <p className="text-xs font-medium text-slate-400">
          Aguarde a chegada do veículo no local combinado. Qualquer alteração,
          entraremos em contato pelo WhatsApp.
        </p>
      </div>
    );
  }

  if (status === "already") {
    return (
      <div className="space-y-4 text-center">
        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
          <CheckCircle2 size={32} className="text-blue-600" />
        </div>
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-wider">
          Já Confirmada
        </h2>
        <p className="text-sm font-semibold text-slate-500">{message}</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="space-y-4 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <AlertCircle size={32} className="text-red-600" />
        </div>
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-wider">
          Erro
        </h2>
        <p className="text-sm font-semibold text-slate-500">{message}</p>
        <button
          onClick={handleConfirm}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-6 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.01] active:scale-95"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="space-y-4 text-center">
        <Loader2 size={40} className="animate-spin text-emerald-600 mx-auto" />
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-wider">
          Processando
        </h2>
        <p className="text-sm font-semibold text-slate-500">
          Registrando confirmação...
        </p>
      </div>
    );
  }

  return (
    <button
      onClick={handleConfirm}
      className="inline-flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-6 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.01] active:scale-95"
    >
      Confirmar Viagem
    </button>
  );
}
