'use client';

import React from 'react';
import { Truck, User, Calendar, Clock, Building } from 'lucide-react';
import { type OrderService } from '@/context/DataContext';

interface OSCardProps {
  os: OrderService;
  onClick: () => void;
}

export default function OSCard({ os, onClick }: OSCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'em_andamento': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'concluida': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg transition-all cursor-pointer"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <Truck size={20} className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">OS-{os.os}</h3>
            <p className="text-sm text-slate-500">{os.clienteId}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(os.status.operacional)}`}>
          {os.status.operacional}
        </span>
      </div>
      
      <div className="grid grid-cols-[auto_1fr] gap-3 text-sm">
        <div className="flex items-center gap-2 text-slate-600">
          <Calendar size={16} />
          <span>{os.data}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <Clock size={16} />
          <span>{os.hora}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <User size={16} />
          <span className="truncate">{os.motorista}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <Building size={16} />
          <span className="truncate">{os.centroCustoId || 'N/A'}</span>
        </div>
      </div>
    </div>
  );
}
