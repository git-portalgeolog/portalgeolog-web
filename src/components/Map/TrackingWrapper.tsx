'use client';

import dynamic from 'next/dynamic';

const LiveMap = dynamic(() => import('./LiveMap'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-48 bg-slate-100 animate-pulse flex items-center justify-center rounded-2xl border border-slate-200">
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Carregando Mapa...</span>
      </div>
    </div>
  )
});

interface TrackingWrapperProps {
  lat?: number;
  lng?: number;
  motorista?: string;
  rota?: {
    origem: { lat: number; lng: number; label: string };
    destino: { lat: number; lng: number; label: string };
  };
}

export default function TrackingWrapper(props: TrackingWrapperProps) {
  return (
    <div className="w-full h-56 relative block">
      <LiveMap {...props} />
    </div>
  );
}
