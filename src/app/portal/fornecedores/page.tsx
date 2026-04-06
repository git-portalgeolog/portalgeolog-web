'use client';

import React, { useState } from 'react';
import { useData, Fornecedor } from '@/context/DataContext';
import StandardModal from '@/components/StandardModal';
import { ShieldCheck, Trash2, Handshake, Edit2 } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/PageHeader';

export default function FornecedoresPage() {
  const { fornecedores, addFornecedor, deleteFornecedor } = useData();
  const { confirm, confirmState, closeConfirm, handleConfirm } = useConfirm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ nome: '', tipo: 'Transportadora', telefone: '' });

  const handleOpenModal = (fornecedor?: Fornecedor) => {
    if (fornecedor) {
      setEditingFornecedor(fornecedor);
      setFormData({ nome: fornecedor.nome, tipo: fornecedor.tipo, telefone: fornecedor.telefone });
    } else {
      setEditingFornecedor(null);
      setFormData({ nome: '', tipo: 'Transportadora', telefone: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome) return;

    try {
      if (editingFornecedor) {
        // TODO: Implement updateFornecedor
        toast.success('Fornecedor atualizado com sucesso!');
      } else {
        await addFornecedor(formData.nome, formData.tipo, formData.telefone);
      }
      
      setIsModalOpen(false);
      setEditingFornecedor(null);
      setFormData({ nome: '', tipo: 'Transportadora', telefone: '' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o fornecedor.');
    }
  };

  const handleDelete = async (id: string) => {
    const fornecedor = fornecedores.find(f => f.id === id);
    if (!fornecedor) return;
    
    const confirmed = await confirm({
      title: 'Excluir Fornecedor',
      message: `Tem certeza que deseja excluir o fornecedor "${fornecedor.nome}"? Esta ação não pode ser desfeita.`,
      confirmText: 'Sim, excluir',
      cancelText: 'Cancelar',
      type: 'danger'
    });
    
    if (confirmed) {
      deleteFornecedor(id);
      toast.success('Fornecedor excluído com sucesso!');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fornecedores"
        icon={<Handshake size={20} />}
        buttonText="Novo Fornecedor"
        onButtonClick={() => setIsModalOpen(true)}
      />

      <DataTable
        data={fornecedores}
        columns={[
          {
            key: 'nome',
            title: 'Nome / Empresa',
            render: (value: unknown) => (
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-800 text-base ml-3">{String(value)}</span>
              </div>
            )
          },
          {
            key: 'tipo',
            title: 'Tipo',
            render: (value: unknown) => (
              <span className="text-sm text-slate-500 font-medium">{String(value)}</span>
            )
          },
          {
            key: 'telefone',
            title: 'Contato',
            render: (value: unknown) => (
              <span className="text-sm font-bold text-slate-600">{String(value || '---')}</span>
            )
          },
          {
            key: 'acoes',
            title: 'Ações',
            align: 'right',
            render: (value: unknown, item: Fornecedor) => {
              void value;

              return (
              <div className="flex items-center justify-end gap-2">
                <button 
                  onClick={() => handleOpenModal(item)}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                  title="Editar Fornecedor"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(item.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                  title="Excluir Fornecedor"
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
        searchPlaceholder="Buscar por nome ou tipo..."
        emptyMessage="Nenhum fornecedor cadastrado."
        emptyIcon={<ShieldCheck size={48} />}
      />

      {isModalOpen && (
        <StandardModal 
          onClose={() => setIsModalOpen(false)} 
          title="Novo Fornecedor" 
          subtitle="Cadastro de empresa parceira ou autônomo"
          icon={<ShieldCheck size={24} />}
        >
          <form onSubmit={handleSubmit} className="space-y-8">
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
              {editingFornecedor ? 'Salvar Alterações' : 'Salvar Fornecedor'}
            </button>
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
