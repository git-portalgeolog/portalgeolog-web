'use client';

import React, { useState } from 'react';
import { useData } from '@/context/DataContext';
import StandardModal from '@/components/StandardModal';
import { Plus, Search, ShieldCheck, Mail, Phone, Trash2 } from 'lucide-react';

export default function FornecedoresPage() {
  const { fornecedores, addFornecedor } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ nome: '', tipo: 'Transportadora', telefone: '' });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    addFornecedor(formData.nome, formData.tipo, formData.telefone);
    setFormData({ nome: '', tipo: 'Transportadora', telefone: '' });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--color-geolog-blue)]">Fornecedores & Parceiros</h1>
          <p className="text-slate-500 font-medium text-sm">Empresas e prestadores de serviço externos.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[var(--color-geolog-blue)] text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:scale-105 active:scale-95 transition-all text-sm"
        >
          <Plus size={18} />
          Novo Fornecedor
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Nome / Empresa</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Contato</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {fornecedores.map((f) => (
              <tr key={f.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                      <ShieldCheck size={18} />
                    </div>
                    <span className="font-bold text-slate-700">{f.nome}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500 font-medium">{f.tipo}</td>
                <td className="px-6 py-4 text-sm text-slate-500 font-bold">{f.telefone || '---'}</td>
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

      {isModalOpen && (
        <StandardModal 
          onClose={() => setIsModalOpen(false)} 
          title="Novo Fornecedor" 
          subtitle="Cadastro de empresa parceira ou autônomo"
          icon={<ShieldCheck size={24} />}
        >
          <form onSubmit={handleCreate} className="space-y-8">
            <div className="space-y-6">
              <div className="flex items-center border-b-2 border-slate-100 pb-4" style={{ paddingBottom: '1.25rem' }}>
                <h3 className="text-[17px] font-black text-slate-900 uppercase tracking-[0.1em] flex items-center gap-3" style={{ lineHeight: '1.3' }}>
                  <ShieldCheck size={20} className="text-slate-500" /> Dados cadastrais
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Nome / Razão Social</label>
                  <input 
                    required 
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm" 
                    value={formData.nome} 
                    onChange={e => setFormData({...formData, nome: e.target.value})} 
                    placeholder="Ex: Transportadora Silva LTDA"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Tipo de Parceiro</label>
                    <select 
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm appearance-none cursor-pointer" 
                      value={formData.tipo} 
                      onChange={e => setFormData({...formData, tipo: e.target.value})}
                    >
                      <option>Transportadora</option>
                      <option>Freelance</option>
                      <option>Cooperativa</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Telefone de Contato</label>
                    <input 
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm" 
                      value={formData.telefone} 
                      onChange={e => setFormData({...formData, telefone: e.target.value})} 
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button className="w-full py-4 bg-[var(--color-geolog-blue)] text-white font-black rounded-2xl shadow-lg shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-widest mt-4">
              Salvar Fornecedor
            </button>
          </form>
        </StandardModal>
      )}
    </div>
  );
}
