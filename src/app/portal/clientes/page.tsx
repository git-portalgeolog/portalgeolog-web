'use client';

import React, { useState } from 'react';
import { useData, Cliente, Solicitante } from '@/context/DataContext';
import StandardModal from '@/components/StandardModal';
import { Plus, Search, Building, User, Trash2, ChevronRight, Mail, PlusCircle } from 'lucide-react';

export default function ClientesPage() {
  const { clientes, solicitantes, addCliente, addSolicitante } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isClienteModalOpen, setIsClienteModalOpen] = useState(false);
  const [isSolicitanteModalOpen, setIsSolicitanteModalOpen] = useState(false);
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);

  // Form states
  const [newCliente, setNewCliente] = useState({ nome: '', contato: '' });
  const [newSolicitante, setNewSolicitante] = useState({ nome: '', clienteId: '' });

  const filteredClientes = clientes.filter(c => 
    c.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateCliente = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCliente.nome) {
      addCliente(newCliente.nome, newCliente.contato);
      setNewCliente({ nome: '', contato: '' });
      setIsClienteModalOpen(false);
    }
  };

  const handleCreateSolicitante = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSolicitante.nome && newSolicitante.clienteId) {
      addSolicitante(newSolicitante.nome, newSolicitante.clienteId);
      setNewSolicitante({ nome: '', clienteId: '' });
      setIsSolicitanteModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--color-geolog-blue)]">Clientes & Solicitantes</h1>
          <p className="text-slate-500 font-medium text-sm">Gerencie sua base de clientes e os responsáveis por cada um.</p>
        </div>
        <button 
          onClick={() => setIsClienteModalOpen(true)}
          className="flex items-center gap-2 bg-[var(--color-geolog-blue)] text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:scale-105 active:scale-95 transition-all text-sm"
        >
          <Plus size={18} />
          Novo Cliente
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por cliente..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clientes List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Base de Clientes</h3>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {filteredClientes.map((cliente) => (
              <button
                key={cliente.id}
                onClick={() => setSelectedClienteId(cliente.id)}
                className={`w-full text-left p-5 transition-all flex items-center justify-between group ${
                  selectedClienteId === cliente.id ? 'bg-blue-50 border-r-4 border-blue-600' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-4">
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                     selectedClienteId === cliente.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                   }`}>
                     <Building size={20} />
                   </div>
                   <div>
                     <p className="font-black text-slate-700">{cliente.nome}</p>
                     <p className="text-xs text-slate-400 font-medium">{cliente.contato || 'Sem contato'}</p>
                   </div>
                </div>
                <ChevronRight size={16} className={`text-slate-300 transition-transform ${selectedClienteId === cliente.id ? 'translate-x-1 text-blue-400' : ''}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Solicitantes List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Solicitantes {selectedClienteId ? ` - ${clientes.find(c => c.id === selectedClienteId)?.nome}` : ''}
            </h3>
            {selectedClienteId && (
              <button 
                onClick={() => {
                  setNewSolicitante({ ...newSolicitante, clienteId: selectedClienteId });
                  setIsSolicitanteModalOpen(true);
                }}
                className="text-[10px] font-black text-blue-600 hover:text-blue-700 flex items-center gap-1 uppercase tracking-wider"
              >
                <Plus size={12} strokeWidth={3} /> Add Solicitante
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {!selectedClienteId ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3 grayscale opacity-50">
                <User size={48} strokeWidth={1} />
                <p className="text-sm font-bold tracking-tight">Selecione um cliente para ver os solicitantes.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {solicitantes.filter(s => s.clienteId === selectedClienteId).map(s => (
                  <div key={s.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 group">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-blue-600">
                         <User size={16} />
                       </div>
                       <span className="text-sm font-bold text-slate-700">{s.nome}</span>
                    </div>
                    <button className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                       <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {solicitantes.filter(s => s.clienteId === selectedClienteId).length === 0 && (
                  <p className="text-center py-8 text-slate-400 text-sm italic">Nenhum solicitante cadastrado para este cliente.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Novo Cliente */}
      {isClienteModalOpen && (
        <StandardModal 
          onClose={() => setIsClienteModalOpen(false)} 
          title="Novo Cliente" 
          subtitle="Cadastro de nova empresa parceira"
          icon={<Building size={24} />}
        >
          <form onSubmit={handleCreateCliente} className="space-y-8">
            <div className="space-y-6">
              <div className="flex items-center border-b-2 border-slate-100 pb-4" style={{ paddingBottom: '1.25rem' }}>
                <h3 className="text-[17px] font-black text-slate-900 uppercase tracking-[0.1em] flex items-center gap-3" style={{ lineHeight: '1.3' }}>
                  <Building size={20} className="text-slate-500" /> Dados da Empresa
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Nome da Empresa</label>
                  <input 
                    required
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                    placeholder="Ex: Oceanica"
                    value={newCliente.nome}
                    onChange={(e) => setNewCliente({ ...newCliente, nome: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">E-mail / Contato</label>
                  <input 
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                    placeholder="Ex: financeiro@empresa.com"
                    value={newCliente.contato}
                    onChange={(e) => setNewCliente({ ...newCliente, contato: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <button className="w-full py-4 bg-[var(--color-geolog-blue)] text-white font-black rounded-2xl shadow-lg shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-widest mt-4">
              Salvar Cliente
            </button>
          </form>
        </StandardModal>
      )}

      {/* Modal Novo Solicitante */}
      {isSolicitanteModalOpen && (
        <StandardModal 
          onClose={() => setIsSolicitanteModalOpen(false)} 
          title="Novo Solicitante" 
          subtitle="Responsável técnico ou operacional"
          icon={<User size={24} />}
        >
          <form onSubmit={handleCreateSolicitante} className="space-y-8">
            <div className="space-y-6">
              <div className="flex items-center border-b-2 border-slate-100 pb-4" style={{ paddingBottom: '1.25rem' }}>
                <h3 className="text-[17px] font-black text-slate-900 uppercase tracking-[0.1em] flex items-center gap-3" style={{ lineHeight: '1.3' }}>
                  <User size={20} className="text-slate-500" /> Informações Pessoais
                </h3>
              </div>

              <div className="space-y-6">
                 <div className="space-y-1.5 px-6 py-4 bg-blue-50 border-2 border-blue-100 rounded-xl">
                   <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Vinculado a:</span>
                   <p className="font-black text-slate-700 text-lg">{clientes.find(c => c.id === selectedClienteId)?.nome}</p>
                 </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Nome do Solicitante</label>
                  <input 
                    required
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                    placeholder="Ex: Niedja Oliveira"
                    value={newSolicitante.nome}
                    onChange={(e) => setNewSolicitante({ ...newSolicitante, nome: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <button className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-widest mt-4">
              Salvar Solicitante
            </button>
          </form>
        </StandardModal>
      )}
    </div>
  );
}
