'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import StandardModal from '@/components/StandardModal';
import { UserPlus, Phone, IdCard, MoreVertical, Loader2, Truck, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DriverDocsModal from '@/components/DriverDocsModal';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from 'sonner';

interface Driver {
  id: string;
  name: string;
  cpf: string;
  cnh: string;
  phone: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export default function MotoristasPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [selectedDriverForDocs, setSelectedDriverForDocs] = useState<Driver | null>(null);
  const actionMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const supabase = createClient();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    cnh: '',
    phone: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizeTextValue = (value: string): string => value.trim().toLowerCase();
  const normalizeDigitsValue = (value: string): string => value.replace(/\D/g, '');

  const hasDuplicateDriver = (field: 'name' | 'cpf' | 'cnh', value: string): boolean => {
    const normalizedValue = field === 'name' ? normalizeTextValue(value) : normalizeDigitsValue(value);

    if (!normalizedValue) {
      return false;
    }

    return drivers.some((driver) => {
      const driverValue = driver[field] ?? '';
      const normalizedDriverValue = field === 'name' ? normalizeTextValue(driverValue) : normalizeDigitsValue(driverValue);
      return normalizedDriverValue === normalizedValue;
    });
  };

  const getDuplicateDriverMessage = (driverData: typeof formData): string | null => {
    if (hasDuplicateDriver('name', driverData.name)) {
      return 'Já existe um motorista com este nome.';
    }

    if (hasDuplicateDriver('cpf', driverData.cpf)) {
      return 'Já existe um motorista com este CPF.';
    }

    if (hasDuplicateDriver('cnh', driverData.cnh)) {
      return 'Já existe um motorista com esta CNH.';
    }

    return null;
  };

  useEffect(() => {
    const fetchDrivers = async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        console.error("Erro ao buscar motoristas:", error);
      } else {
        setDrivers(data as Driver[]);
      }
      setLoading(false);
    };

    fetchDrivers();

    // Set up real-time subscription
    const channel = supabase
      .channel('drivers-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'drivers' },
        () => {
          fetchDrivers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const duplicateMessage = getDuplicateDriverMessage(formData);

      if (duplicateMessage) {
        throw new Error(duplicateMessage);
      }

      const { error } = await supabase
        .from('drivers')
        .insert([
          {
            name: formData.name.trim(),
            cpf: formData.cpf.trim(),
            cnh: formData.cnh.trim(),
            phone: formData.phone.trim(),
            status: 'active',
          }
        ]);

      if (error) throw error;

      setIsModalOpen(false);
      setFormData({ name: '', cpf: '', cnh: '', phone: '' });
    } catch (error) {
      const duplicateMessage = getDuplicateDriverMessage(formData);

      if (duplicateMessage) {
        toast.error(duplicateMessage);
      } else if (error instanceof Error && error.message.toLowerCase().includes('duplicate key value violates unique constraint')) {
        toast.error('Já existe um motorista com esses dados.');
      } else {
        console.error('Erro ao salvar motorista:', error);
        toast.error('Erro ao salvar no Supabase. Verifique as políticas de RLS.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.cpf.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gerenciamento de Motoristas"
        icon={<IdCard size={20} />}
        buttonText="Novo Motorista"
        onButtonClick={() => setIsModalOpen(true)}
        buttonIcon={<UserPlus size={18} />}
      />

      {/* Drivers List */}
      <DataTable
        data={filteredDrivers}
        loading={loading}
        columns={[
          {
            key: 'name',
            title: 'Motorista',
            render: (value: unknown, item: Driver) => (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-cyan-50 text-cyan-600 rounded-lg flex items-center justify-center font-black">
                  {String(value)[0]}
                </div>
                <div className="space-y-1">
                  <p className="font-black text-base text-slate-800 tracking-tight uppercase">{String(value)}</p>
                  <p className="text-sm font-semibold text-slate-400">ID: {item.id.substring(0, 8)}</p>
                </div>
              </div>
            )
          },
          {
            key: 'documentos',
            title: 'Documentos',
            render: (value: unknown, item: Driver) => {
              void value;

              return (
              <div className="space-y-1">
                <p className="text-base font-semibold text-slate-700"><span className="font-black text-slate-900">CPF:</span> {item.cpf}</p>
                <p className="text-base font-semibold text-slate-700"><span className="font-black text-slate-900">CNH:</span> {item.cnh}</p>
              </div>
              );
            }
          },
          {
            key: 'phone',
            title: 'Contato',
            render: (value: unknown) => (
              <div className="flex items-center gap-2 text-slate-700">
                <Phone size={14} className="text-cyan-500" />
                <span className="text-base font-bold">{String(value)}</span>
              </div>
            )
          },
          {
            key: 'status',
            title: 'Status',
            align: 'center',
            render: () => (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs md:text-sm font-bold uppercase tracking-wide border bg-green-100 text-green-700 border-green-200">
                ATIVO
              </span>
            )
          },
          {
            key: 'acoes',
            title: 'Ações',
            align: 'center',
            render: (value: unknown, item: Driver) => {
              void value;

              return (
              <div
                className="relative inline-block"
                ref={(el) => {
                  if (el) {
                    actionMenuRefs.current[item.id] = el;
                  } else {
                    delete actionMenuRefs.current[item.id];
                  }
                }}
              >
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveMenuId((prev) => (prev === item.id ? null : item.id));
                  }}
                  className="inline-flex items-center justify-center w-10 h-10 rounded-2xl border border-slate-200 text-slate-500 hover:text-cyan-600 hover:border-cyan-200 transition-all shadow-sm"
                  aria-haspopup="true"
                  aria-expanded={activeMenuId === item.id}
                >
                  <MoreVertical size={18} />
                </button>
                <AnimatePresence>
                  {activeMenuId === item.id && (
                    <>
                      <div 
                        className="fixed inset-0 z-[55]" 
                        onClick={() => setActiveMenuId(null)}
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className="absolute right-0 mt-2 min-w-[200px] bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 space-y-1 z-50"
                      >
                        <button
                          onClick={() => {
                            setSelectedDriverForDocs(item);
                            setActiveMenuId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm font-bold text-slate-700 rounded-xl hover:bg-slate-50 flex items-center gap-3"
                        >
                          <FileText size={16} className="text-cyan-500" />
                          Documentações
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
              );
            }
          }
        ]}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar por nome ou CPF..."
        emptyMessage="Nenhum motorista encontrado."
        emptyIcon={<Truck size={48} />}
      />

      {/* Modal de Cadastro */}
      {isModalOpen && (
        <StandardModal 
          onClose={() => setIsModalOpen(false)} 
          title="Novo Motorista" 
          subtitle="Cadastro de condutor para a frota Geolog"
          icon={<UserPlus size={24} />}
          maxWidthClassName="max-w-2xl"
        >
          <form onSubmit={handleAddDriver} className="space-y-8">
            <div className="space-y-6">
              <div className="flex items-center border-b-2 border-slate-100 pb-4" style={{ paddingBottom: '1.25rem' }}>
                <h3 className="text-[17px] font-black text-slate-900 uppercase tracking-[0.1em] flex items-center gap-3" style={{ lineHeight: '1.3' }}>
                  <IdCard size={20} className="text-slate-500" /> Informações do Condutor
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Nome Completo</label>
                  <input 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                    placeholder="Ex: João Silva da Rocha"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">CPF</label>
                    <input 
                      required
                      value={formData.cpf}
                      onChange={e => setFormData({...formData, cpf: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">CNH</label>
                    <input 
                      required
                      value={formData.cnh}
                      onChange={e => setFormData({...formData, cnh: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                      placeholder="Número da CNH"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Telefone (WhatsApp)</label>
                  <input 
                    required
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-4 border-2 border-slate-200 text-slate-500 font-black rounded-2xl hover:bg-slate-50 transition-all uppercase tracking-widest text-xs"
              >
                Cancelar
              </button>
              <button 
                disabled={isSubmitting}
                className="flex-1 py-4 bg-cyan-500 text-white font-black rounded-2xl hover:bg-cyan-400 shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 uppercase tracking-widest text-xs"
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : 'Salvar Motorista'}
              </button>
            </div>
          </form>
        </StandardModal>
      )}

       {selectedDriverForDocs && (
         <DriverDocsModal 
           driver={selectedDriverForDocs}
           isOpen={true}
           onClose={() => setSelectedDriverForDocs(null)}
         />
       )}
     </div>
   );
 }
