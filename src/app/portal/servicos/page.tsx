'use client';

import React, { useState } from 'react';
import { useData, TipoServico } from '@/context/DataContext';
import { Bus, Trash2, Edit2 } from 'lucide-react';
import StandardModal from '@/components/StandardModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';
import { toast } from 'sonner';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';

export default function ServicosPage() {
  const { servicos, addServico, updateServico, deleteServico } = useData();
  const { confirm, confirmState, closeConfirm, handleConfirm } = useConfirm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServico, setEditingServico] = useState<TipoServico | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome) return;

    try {
      if (editingServico) {
        await updateServico(editingServico.id, formData);
      } else {
        await addServico(formData.nome);
      }
      
      setIsModalOpen(false);
      setEditingServico(null);
      setFormData({ nome: '' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o serviço.');
    }
  };

  const handleDelete = async (id: string) => {
    const servico = servicos.find(s => s.id === id);
    if (!servico) return;
    
    const confirmed = await confirm({
      title: 'Excluir Tipo de Serviço',
      message: `Tem certeza que deseja excluir o serviço "${servico.nome}"? Esta ação não pode ser desfeita.`,
      confirmText: 'Sim, excluir',
      cancelText: 'Cancelar',
      type: 'danger'
    });
    
    if (confirmed) {
      deleteServico(id);
    }
  };


  return (
    <div className="space-y-6">
      <PageHeader
        title="Tipos de Serviço"
        icon={<Bus size={20} />}
        buttonText="Novo Serviço"
        onButtonClick={() => handleOpenModal()}
      />

      <DataTable
        data={servicos}
        columns={[
          {
            key: 'nome',
            title: 'Serviço',
            render: (value: unknown) => (
              <span className="font-bold text-slate-800 text-base ml-3">{String(value)}</span>
            )
          },
          {
            key: 'acoes',
            title: 'Ações',
            align: 'right',
            render: (value: unknown, item: TipoServico) => {
              void value;

              return (
              <div className="flex items-center justify-end gap-2">
                <button 
                  onClick={() => handleOpenModal(item)}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                  title="Editar Serviço"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(item.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                  title="Excluir Serviço"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              );
            }
          }
        ]}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar por serviço..."
        emptyMessage="Nenhum serviço cadastrado."
        emptyIcon={<Bus size={48} />}
      />

      {/* Modal Criar/Editar Serviço */}
      {isModalOpen && (
        <StandardModal 
          onClose={() => setIsModalOpen(false)} 
          title={editingServico ? "Editar Tipo de Serviço" : "Novo Tipo de Serviço"} 
          subtitle="Catálogo de serviços"
          icon={<Bus size={24} />}
          maxWidthClassName="max-w-2xl"
        >
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              <div className="flex items-center border-b-2 border-slate-100 pb-4">
                <h3 className="text-[17px] font-black text-slate-900 uppercase tracking-[0.1em] flex items-center gap-3">
                  <Bus size={20} className="text-slate-500" /> Detalhes do Serviço
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-base font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Nome do Serviço</label>
                  <input 
                    required 
                    placeholder="Ex: Ônibus Sleep In" 
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm" 
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
      
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onClose={closeConfirm}
        onConfirm={handleConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        type={confirmState.type}
      />
    </div>
  );
}
