'use client';

import React, { useState } from 'react';
import { useData, TipoServico } from '@/context/DataContext';
import { Plus, Package, Trash2, Edit2, X } from 'lucide-react';
import StandardModal from '@/components/StandardModal';
import { toast } from 'sonner';

export default function ServicosPage() {
  const { servicos, addServico, updateServico, deleteServico } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServico, setEditingServico] = useState<TipoServico | null>(null);
  const [formData, setFormData] = useState({ nome: '' });

  const handleOpenModal = (servico?: TipoServico) => {
    if (servico) {
      setEditingServico(servico);
      setFormData({ nome: servico.nome });
    } else {
      setEditingServico(null);
      setFormData({ nome: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome) return;

    if (editingServico) {
      updateServico(editingServico.id, formData);
    } else {
      addServico(formData.nome);
    }
    
    setIsModalOpen(false);
    setEditingServico(null);
    setFormData({ nome: '' });
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este tipo de serviço?')) {
      deleteServico(id);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--color-geolog-blue)]">Tipos de Serviço</h1>
          <p className="text-slate-500 font-medium text-sm">Defina os serviços oferecidos.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-[var(--color-geolog-blue)] text-white px-5 py-2.5 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all text-sm cursor-pointer shadow-lg shadow-blue-900/20"
        >
          <Plus size={18} />
          Novo Serviço
        </button>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200">
              <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400">Serviço</th>
              <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {servicos.length === 0 ? (
               <tr>
                <td colSpan={2} className="text-center py-20 text-slate-400 font-bold italic">Nenhum serviço cadastrado.</td>
               </tr>
            ) : (
              servicos.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                        <Package size={18} />
                      </div>
                      <span className="font-bold text-slate-800 text-sm">{s.nome}</span>
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleOpenModal(s)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                        title="Editar Serviço"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(s.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                        title="Excluir Serviço"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Criar/Editar Serviço */}
      {isModalOpen && (
        <StandardModal 
          onClose={() => setIsModalOpen(false)} 
          title={editingServico ? "Editar Tipo de Serviço" : "Novo Tipo de Serviço"} 
          subtitle={editingServico ? "Atualize as definições do serviço no catálogo" : "Definição de novo item no catálogo de serviços"}
          icon={<Package size={24} />}
          maxWidthClassName="max-w-2xl"
        >
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              <div className="flex items-center border-b-2 border-slate-100 pb-4">
                <h3 className="text-[17px] font-black text-slate-900 uppercase tracking-[0.1em] flex items-center gap-3">
                  <Package size={20} className="text-slate-500" /> Detalhes do Serviço
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Nome do Serviço</label>
                  <input 
                    required 
                    placeholder="Ex: Ônibus Sleep In" 
                    className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-sm text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm" 
                    value={formData.nome} 
                    onChange={e => setFormData({...formData, nome: e.target.value})} 
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all text-sm uppercase tracking-widest cursor-pointer"
              >
                Cancelar
              </button>
              <button className="flex-[2] py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-lg shadow-emerald-900/20 hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-widest cursor-pointer">
                {editingServico ? 'Salvar Alterações' : 'Criar Serviço'}
              </button>
            </div>
          </form>
        </StandardModal>
      )}
    </div>
  );
}
