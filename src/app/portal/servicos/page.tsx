'use client';

import React, { useState } from 'react';
import { useData } from '@/context/DataContext';
import { Plus, Package, DollarSign, Trash2 } from 'lucide-react';
import StandardModal from '@/components/StandardModal';

export default function ServicosPage() {
  const { servicos, addServico } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ nome: '', precoBase: 0 });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    addServico(formData.nome, formData.precoBase);
    setFormData({ nome: '', precoBase: 0 });
    setIsModalOpen(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--color-geolog-blue)]">Tipos de Serviço</h1>
          <p className="text-slate-500 font-medium text-sm">Defina os serviços oferecidos e seus preços base.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[var(--color-geolog-blue)] text-white px-5 py-2.5 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all text-sm"
        >
          <Plus size={18} />
          Novo Serviço
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Serviço</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Preço Base</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {servicos.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                      <Package size={18} />
                    </div>
                    <span className="font-bold text-slate-700">{s.nome}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <DollarSign size={14} strokeWidth={3} />
                    <span className="text-sm font-black">{formatCurrency(s.precoBase)}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <button className="p-2 text-slate-300 hover:text-red-500 transition-all">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Novo Serviço */}
      {isModalOpen && (
        <StandardModal 
          onClose={() => setIsModalOpen(false)} 
          title="Novo Tipo de Serviço" 
          subtitle="Definição de novo item no catálogo de serviços"
          icon={<Package size={24} />}
          maxWidthClassName="max-w-2xl"
        >
          <form onSubmit={handleCreate} className="space-y-8">
            <div className="space-y-6">
              <div className="flex items-center border-b-2 border-slate-100 pb-4" style={{ paddingBottom: '1.25rem' }}>
                <h3 className="text-[17px] font-black text-slate-900 uppercase tracking-[0.1em] flex items-center gap-3" style={{ lineHeight: '1.3' }}>
                  <Package size={20} className="text-slate-500" /> Detalhes do Serviço
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Nome do Serviço</label>
                  <input 
                    required 
                    placeholder="Ex: Ônibus Sleep In" 
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm" 
                    value={formData.nome} 
                    onChange={e => setFormData({...formData, nome: e.target.value})} 
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Preço Base Sugerido (R$)</label>
                  <div className="relative">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</div>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm" 
                      value={formData.precoBase || ''} 
                      onChange={e => setFormData({...formData, precoBase: parseFloat(e.target.value) || 0})} 
                    />
                  </div>
                </div>
              </div>
            </div>

            <button className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-lg shadow-emerald-900/20 hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-widest mt-4">
              Criar Serviço
            </button>
          </form>
        </StandardModal>
      )}
    </div>
  );
}
