'use client';

import React, { useState, useEffect } from 'react';
import { useAuth, UserProfile } from '@/context/AuthContext';
import { toast } from 'sonner';
import { 
  Shield, 
  UserCog, 
  Mail, 
  User, 
  History, 
  Settings, 
  ChevronRight, 
  Clock, 
  AlertCircle,
  LogOut,
  Fingerprint,
  ShieldCheck,
  Briefcase,
  Plus,
  Lock,
  Building,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GeologSearchableSelect from '@/components/ui/GeologSearchableSelect';
import StandardModal from '@/components/StandardModal';

type TabType = 'acesso' | 'perfil' | 'historico';

export default function ConfigPage() {
  const { user, profile, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('acesso');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUser, setNewUser] = useState({
    primeiroNome: '',
    sobrenome: '',
    email: '',
    password: '',
    tipo_usuario: 'interno',
    categoria: 'operador'
  });

  useEffect(() => {
    if (activeTab === 'acesso') {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao buscar usuários');
      setUsers(data || []);
    } catch (err: any) {
      toast.error('Erro ao carregar usuários: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, field: string, value: string) => {
    try {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, [field]: value } : u));
      
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, updates: { [field]: value } })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      toast.success('Permissão atualizada com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao atualizar permissão: ' + err.message);
      fetchUsers();
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCreatingUser(true);
      const nomeCompleto = `${newUser.primeiroNome.trim()} ${newUser.sobrenome.trim()}`;
      
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newUser,
          nome: nomeCompleto
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar usuário');
      
      toast.success('Usuário criado com sucesso!');
      setIsCreateModalOpen(false);
      setNewUser({ primeiroNome: '', sobrenome: '', email: '', password: '', tipo_usuario: 'interno', categoria: 'operador' });
      fetchUsers();
    } catch (err: any) {
      toast.error('Erro ao criar login: ' + err.message);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === user?.id) {
      toast.error('Você não pode excluir seu próprio acesso.');
      return;
    }

    if (!confirm('Tem certeza que deseja excluir permanentemente este acesso? Esta ação não pode ser desfeita.')) return;

    try {
      const res = await fetch(`/api/users?id=${userId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      toast.success('Acesso removido com sucesso.');
      fetchUsers();
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + err.message);
    }
  };

  const tabs = [
    { id: 'acesso', label: 'Gestão de Acessos', icon: Shield },
    { id: 'perfil', label: 'Meu Perfil', icon: User },
    { id: 'historico', label: 'Histórico de Logs', icon: History },
  ];

  return (
    <div className="max-w-[1600px] mx-auto space-y-10 py-6 px-4 md:px-10">
      {/* Tab Control */}
      <div className="flex gap-2 p-1.5 bg-slate-100/80 rounded-2xl w-fit border border-slate-200 shadow-sm backdrop-blur-sm">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`
                flex items-center gap-3 px-6 py-3 rounded-xl font-black text-sm transition-all cursor-pointer relative
                ${activeTab === tab.id 
                  ? 'bg-white text-blue-600 shadow-md ring-1 ring-slate-200' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                }
              `}
            >
              <Icon size={18} className={activeTab === tab.id ? 'text-blue-600' : 'text-slate-400'} />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="tab-pill"
                  className="absolute inset-0 bg-white rounded-xl -z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="min-h-[500px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'acesso' && (
              <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-8 md:p-10 space-y-8">
                <div className="flex items-center justify-between pb-6 border-b-2 border-slate-50">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                      <Shield size={28} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-800">Membros da Equipe</h2>
                      <p className="text-slate-500 font-bold">Gerencie {users.length} usuários ativos no sistema.</p>
                    </div>
                  </div>
                  {profile?.categoria === 'administrador' && (
                    <button 
                      onClick={() => setIsCreateModalOpen(true)}
                      className="flex items-center gap-2 bg-[var(--color-geolog-blue)] text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-blue-900/10 hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-widest cursor-pointer"
                    >
                      <Plus size={18} strokeWidth={3} />
                      Novo Login
                    </button>
                  )}
                </div>

                <div className="space-y-6">
                  {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                      <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                      <p className="text-slate-400 font-black italic uppercase tracking-widest text-sm">Carregando permissões...</p>
                    </div>
                  ) : (
                    <div className="grid gap-6">
                      {users.map((u) => (
                        <div key={u.id} className="p-6 bg-slate-50/50 rounded-3xl border-2 border-transparent hover:border-blue-100 hover:bg-white transition-all shadow-sm hover:shadow-xl group">
                          <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                            {/* User Info Capsule */}
                            <div className="flex items-center gap-5 min-w-[300px]">
                              <div className="w-16 h-16 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center text-2xl font-black text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
                                {u.nome.charAt(0).toUpperCase()}
                              </div>
                              <div className="space-y-1">
                              <div className="space-y-1">
                                <h3 className="text-lg font-black text-slate-800 uppercase leading-none">{u.nome}</h3>
                                <div className="flex items-center gap-2 text-slate-500 font-medium text-base">
                                  <Mail size={16} /> {u.email}
                                </div>
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-200 text-slate-600 rounded-md text-[10px] font-black uppercase tracking-tighter">
                                  UUID: {u.id.slice(0, 8)}...
                                </div>
                              </div>
                              </div>
                            </div>

                            {/* Selects Container */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                              <GeologSearchableSelect 
                                label="Tipo de Acesso"
                                options={[
                                  { id: 'interno', nome: 'Geolog', sublabel: 'Equipe Própria' },
                                  { id: 'gestor', nome: 'Gestor', sublabel: 'Externo/Terceiro' }
                                ]}
                                value={u.tipo_usuario}
                                onChange={(val) => updateUserRole(u.id, 'tipo_usuario', val)}
                              />

                              <GeologSearchableSelect 
                                label="Nível de Permissão"
                                disabled={u.tipo_usuario === 'gestor'}
                                options={[
                                  { id: 'administrador', nome: 'Administrador', sublabel: 'Total / Config' },
                                  { id: 'gestor', nome: 'Gestor', sublabel: 'Controle de Fluxo' },
                                  { id: 'operador', nome: 'Operador', sublabel: 'Lançamentos' },
                                  { id: 'financeiro', nome: 'Financeiro', sublabel: 'Faturamento' },
                                  { id: 'jovem aprendiz', nome: 'Jovem Aprendiz', sublabel: 'Visualização' }
                                ]}
                                value={u.categoria}
                                onChange={(val) => updateUserRole(u.id, 'categoria', val)}
                              />
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-3">
                              <button 
                                onClick={() => toast.info('Menu de logs do usuário em breve')}
                                className="w-12 h-12 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-600 transition-all shadow-sm cursor-pointer"
                              >
                                <History size={18} />
                              </button>
                              {profile?.categoria === 'administrador' && (
                                <button 
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="w-12 h-12 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-500 transition-all shadow-sm cursor-pointer"
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'perfil' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Profile Card */}
                <div className="md:col-span-1 space-y-8">
                  <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-10 text-center space-y-6">
                    <div className="relative inline-block">
                      <div className="w-32 h-32 bg-blue-600 rounded-[2.5rem] flex items-center justify-center text-5xl font-black text-white shadow-2xl shadow-blue-200 mx-auto transform -rotate-6">
                        {profile?.nome.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-500 rounded-2xl border-4 border-white flex items-center justify-center text-white shadow-lg">
                        <ShieldCheck size={20} />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <h2 className="text-3xl font-black text-slate-800">{profile?.nome}</h2>
                      <p className="text-blue-600 font-black uppercase tracking-widest text-xs italic">
                        {profile?.categoria} • {profile?.tipo_usuario}
                      </p>
                    </div>

                    <div className="pt-6 grid grid-cols-2 gap-3">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Logs</div>
                        <div className="text-xl font-black text-slate-800">42</div>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Desde</div>
                        <div className="text-xl font-black text-slate-800">2026</div>
                      </div>
                    </div>

                    <button 
                      onClick={logout}
                      className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-red-100 transition-all cursor-pointer border border-red-100 group"
                    >
                      <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                      Encerrar Sessão
                    </button>
                  </div>
                </div>

                {/* Details Area */}
                <div className="md:col-span-2 space-y-8">
                  <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-10 space-y-10">
                    <div className="flex items-center gap-4 pb-6 border-b-2 border-slate-50">
                      <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500">
                        <Fingerprint size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-800">Dados da Conta</h3>
                        <p className="text-slate-500 font-bold">Informações verificadas de acesso único.</p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-10">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">E-mail Corporativo</label>
                        <div className="flex items-center gap-4 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700">
                           <Mail size={18} className="text-slate-400" />
                           {user?.email}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Função Atual</label>
                        <div className="flex items-center gap-4 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 capitalize">
                           <Briefcase size={18} className="text-slate-400" />
                           {profile?.categoria}
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-blue-50/50 rounded-3xl border-2 border-blue-100 border-dashed flex items-start gap-4">
                      <AlertCircle className="text-blue-600 mt-1 flex-shrink-0" size={20} />
                      <div className="text-sm font-bold text-blue-900 leading-relaxed">
                        Seu perfil é gerenciado exclusivamente pelo administrador da Geolog Transportes. Para alterar sua senha ou nome de exibição, entre em contato com o suporte de TI interno.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'historico' && (
              <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-10 space-y-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center text-white shadow-lg">
                      <Clock size={28} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-800">Linha do Tempo</h2>
                      <p className="text-slate-500 font-bold">Registro de modificações recentes no sistema.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {['Todos', 'Clientes', 'OS', 'Acessos'].map(f => (
                      <button key={f} className="px-5 py-2.5 bg-slate-100 text-slate-500 rounded-xl font-black text-xs hover:bg-slate-200 transition-all cursor-pointer whitespace-nowrap">
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-6 before:w-1 before:bg-slate-100">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="relative pl-14 flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 group">
                      <div className="absolute left-[18px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-slate-300 border-4 border-white shadow-sm ring-4 ring-transparent group-hover:ring-blue-50 group-hover:bg-blue-600 transition-all" />
                      
                      <div className="space-y-1">
                        <div className="font-black text-slate-800 text-base">
                          {i % 2 === 0 ? 'Atualização de Base de Cliente' : 'Nova Ordem de Serviço lançada'}
                        </div>
                        <div className="text-sm text-slate-500 font-bold">
                           O usuário <span className="text-blue-600">Thorfinn</span> alterou os dados da empresa <span className="text-slate-800">Equinor Brasil</span>.
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                         <div className="text-xs font-black text-slate-400 uppercase tracking-widest">26 Mar 2026</div>
                         <div className="text-xs font-black text-slate-300">19:45:0{i}</div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="pt-4 text-center">
                    <button className="text-blue-600 font-black text-sm hover:underline cursor-pointer">Carregar períodos anteriores...</button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Modal Criar Usuário */}
      {isCreateModalOpen && (
        <StandardModal
          title="Novo Login de Acesso"
          subtitle="Criação direta no banco de dados"
          icon={<ShieldCheck size={24} />}
          onClose={() => setIsCreateModalOpen(false)}
          maxWidthClassName="max-w-2xl"
        >
          <form onSubmit={handleCreateUser} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nome</label>
                <div className="relative group">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input required type="text" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-base outline-none focus:border-blue-600 transition-colors" value={newUser.primeiroNome} onChange={(e) => setNewUser({...newUser, primeiroNome: e.target.value.replace(/\s/g, '')})} placeholder="Ex: Acacio" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Sobrenome</label>
                <div className="relative group">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input required type="text" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-base outline-none focus:border-blue-600 transition-colors" value={newUser.sobrenome} onChange={(e) => setNewUser({...newUser, sobrenome: e.target.value})} placeholder="Ex: Vieira" />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Operacional</label>
                <div className="relative group">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input required type="email" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-base outline-none focus:border-blue-600 transition-colors" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} placeholder="nome@empresa.com" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t-2 border-slate-50 mt-8 relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-xs font-black text-slate-300 uppercase tracking-widest">
                Controle de Acessos
              </div>
              <div className="space-y-2 z-10">
                <GeologSearchableSelect 
                  label="Tipo de Conta"
                  options={[
                    { id: 'interno', nome: 'Geolog', sublabel: 'Equipe Própria' },
                    { id: 'gestor', nome: 'Gestor', sublabel: 'Externo/Terceiro' }
                  ]}
                  value={newUser.tipo_usuario}
                  onChange={(val) => setNewUser({...newUser, tipo_usuario: val, categoria: val === 'gestor' ? 'operador' : newUser.categoria})}
                />
              </div>
              <div className="space-y-2 z-20">
                <GeologSearchableSelect 
                  label="Nível Inicial"
                  disabled={newUser.tipo_usuario === 'gestor'}
                  options={[
                    { id: 'administrador', nome: 'Administrador', sublabel: 'Total / Config' },
                    { id: 'gestor', nome: 'Gestor', sublabel: 'Controle de Fluxo' },
                    { id: 'operador', nome: 'Operador', sublabel: 'Lançamentos' },
                    { id: 'financeiro', nome: 'Financeiro', sublabel: 'Faturamento' },
                    { id: 'jovem aprendiz', nome: 'Jovem Aprendiz', sublabel: 'Visualização' }
                  ]}
                  value={newUser.categoria}
                  onChange={(val) => setNewUser({...newUser, categoria: val})}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isCreatingUser}
              className="w-full mt-10 py-4.5 bg-blue-600 text-white font-black rounded-xl shadow-lg hover:bg-blue-700 hover:scale-[1.01] active:scale-[0.98] transition-all text-sm uppercase tracking-widest cursor-pointer disabled:opacity-70 flex justify-center items-center gap-3 relative overflow-hidden group"
            >
              {isCreatingUser ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  Salvando Credenciais...
                </>
              ) : (
                <>
                  Registrar Usuário
                  <ChevronRight size={18} className="absolute right-6 opacity-0 group-hover:opacity-100 group-hover:right-4 transition-all" strokeWidth={3} />
                </>
              )}
            </button>
          </form>
        </StandardModal>
      )}
    </div>
  );
}


