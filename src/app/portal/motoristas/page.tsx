'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import StandardModal from '@/components/StandardModal';
import { UserPlus, Phone, IdCard, Loader2, Truck, FileText, Building2, Handshake, Eye, Edit2, Trash2, User } from 'lucide-react';
import DriverDocsModal from '@/components/DriverDocsModal';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import GeologSearchableSelect from '@/components/ui/GeologSearchableSelect';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';
import { toast } from 'sonner';
import { useData, type ParceiroServico } from '@/context/DataContext';

interface Driver {
  id: string;
  name: string;
  cpf: string;
  cnh: string;
  phone: string;
  email?: string;
  vehicle_id: string;
  status: 'active' | 'inactive';
  vinculo_tipo: 'interno' | 'parceiro';
  parceiro_id?: string;
  parceiro?: ParceiroServico;
  created_at: string;
}

interface VehicleOption {
  id: string;
  placa: string;
  modelo: string;
  marca: string;
  proprietario_tipo: 'interno' | 'parceiro';
  parceiro_id: string | null;
}

export default function MotoristasPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriverForDocs, setSelectedDriverForDocs] = useState<Driver | null>(null);
  const [viewingDriver, setViewingDriver] = useState<Driver | null>(null);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const { confirm, confirmState, closeConfirm, handleConfirm } = useConfirm();
  const supabase = createClient();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    cnh: '',
    email: '',
    celular: '',
    vehicle_id: '',
    vinculo_tipo: 'parceiro' as 'interno' | 'parceiro',
    parceiro_id: '',
    tipo_documento: 'cpf' as 'cpf' | 'passaporte',
  });

  const { parceiros } = useData();
  const parceiroOptions = parceiros.map(p => ({ id: p.id, nome: p.razaoSocialOuNomeCompleto }));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [vehiclesUnavailable, setVehiclesUnavailable] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isModalOpen) {
      setFormData({ name: '', cpf: '', cnh: '', email: '', celular: '', vehicle_id: '', vinculo_tipo: 'parceiro', parceiro_id: '', tipo_documento: 'cpf' });
    }
  }, [isModalOpen]);

  const filteredVehicles = useMemo(() => {
    if (formData.vinculo_tipo === 'interno') {
      return vehicles.filter((v) => v.proprietario_tipo === 'interno');
    }
    if (formData.vinculo_tipo === 'parceiro' && formData.parceiro_id) {
      return vehicles.filter((v) => v.proprietario_tipo === 'parceiro' && v.parceiro_id === formData.parceiro_id);
    }
    return [];
  }, [vehicles, formData.vinculo_tipo, formData.parceiro_id]);

  const formatDocumento = (value: string, tipo: 'cpf' | 'passaporte'): string => {
    if (tipo === 'cpf') {
      const digits = value.replace(/\D/g, '').slice(0, 11);
      return digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    if (tipo === 'passaporte') {
      return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 9);
    }
    return value;
  };

  const formatCelular = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) {
      return digits;
    }
    if (digits.length <= 7) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const validateCNH = (value: string): boolean => {
    const digits = value.replace(/\D/g, '');
    return digits.length === 11;
  };

  const validateCPF = (value: string): boolean => {
    const digits = value.replace(/\D/g, '');
    return digits.length === 11;
  };

  const validateCelular = (value: string): boolean => {
    const digits = value.replace(/\D/g, '');
    return digits.length === 11 && digits[2] === '9';
  };

  const getDocumentoLabel = (tipo: 'cpf' | 'passaporte'): string => {
    switch (tipo) {
      case 'cpf': return 'CPF';
      case 'passaporte': return 'Passaporte';
    }
  };

  const getDocumentoPlaceholder = (tipo: 'cpf' | 'passaporte'): string => {
    switch (tipo) {
      case 'cpf': return '000.000.000-00';
      case 'passaporte': return 'AA1234567';
    }
  };

  const tipoDocumentoOptions = [
    { id: 'cpf', nome: 'CPF' },
    { id: 'passaporte', nome: 'Passaporte' },
  ];

  const normalizeTextValue = (value: string): string => value.trim().toLowerCase();
  const normalizeDigitsValue = (value: string): string => value.replace(/\D/g, '');

  const hasDuplicateDriver = (
    field: 'name' | 'cpf' | 'cnh' | 'email' | 'phone',
    value: string,
    excludeId?: string
  ): boolean => {
    const normalizedValue = field === 'name' || field === 'email'
      ? normalizeTextValue(value)
      : normalizeDigitsValue(value);

    if (!normalizedValue) {
      return false;
    }

    return drivers.some((driver) => {
      if (excludeId && driver.id === excludeId) return false;
      const driverValue = driver[field] ?? '';
      const normalizedDriverValue = field === 'name' || field === 'email'
        ? normalizeTextValue(driverValue)
        : normalizeDigitsValue(driverValue);
      return normalizedDriverValue === normalizedValue;
    });
  };

  const getDuplicateDriverMessage = (driverData: typeof formData, excludeId?: string): string | null => {
    if (hasDuplicateDriver('name', driverData.name, excludeId)) {
      return 'Já existe um motorista com este nome.';
    }

    if (hasDuplicateDriver('cpf', driverData.cpf, excludeId)) {
      return 'Já existe um motorista com este CPF.';
    }

    if (hasDuplicateDriver('cnh', driverData.cnh, excludeId)) {
      return 'Já existe um motorista com esta CNH.';
    }

    if (driverData.email && hasDuplicateDriver('email', driverData.email, excludeId)) {
      return 'Já existe um motorista com este e-mail.';
    }

    if (hasDuplicateDriver('phone', driverData.celular, excludeId)) {
      return 'Já existe um motorista com este celular.';
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

    const fetchVehicles = async () => {
      const { data, error } = await supabase
        .from('veiculos')
        .select('id, placa, modelo, marca, proprietario_tipo, parceiro_id')
        .eq('status', 'ativo')
        .order('marca', { ascending: true })
        .order('modelo', { ascending: true });
      
      if (error) {
        const isMissingTable =
          error.code === '42P01' ||
          error.message?.toLowerCase().includes('veiculos') ||
          error.message?.toLowerCase().includes('does not exist');

        if (isMissingTable) {
          setVehiclesUnavailable(true);
          setVehicles([]);
          return;
        }

        console.error("Erro ao buscar veículos:", error);
        toast.error('Erro ao buscar veículos.');
      } else {
        setVehiclesUnavailable(false);
        setVehicles(data || []);
      }
    };

    fetchDrivers();
    fetchVehicles();

    // Set up real-time subscription
    const driversChannel = supabase
      .channel('drivers-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'drivers' },
        () => {
          fetchDrivers();
        }
      )
      .subscribe();

    const vehiclesChannel = supabase
      .channel('veiculos-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'veiculos' },
        () => {
          fetchVehicles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(driversChannel);
      supabase.removeChannel(vehiclesChannel);
    };
  }, [supabase]);

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validações de campos obrigatórios
      if (!formData.name.trim()) {
        toast.error('Nome completo é obrigatório.');
        setIsSubmitting(false);
        return;
      }

      const cnhDigits = formData.cnh.replace(/\D/g, '');
      if (cnhDigits.length !== 11) {
        toast.error(`CNH deve ter exatamente 11 dígitos numéricos. Você informou ${cnhDigits.length} dígitos.`);
        setIsSubmitting(false);
        return;
      }

      const cpfDigits = formData.cpf.replace(/\D/g, '');
      if (cpfDigits.length !== 11) {
        toast.error(`CPF deve ter exatamente 11 dígitos. Você informou ${cpfDigits.length} dígitos.`);
        setIsSubmitting(false);
        return;
      }

      const celularDigits = formData.celular.replace(/\D/g, '');
      if (celularDigits.length !== 11) {
        toast.error(`Celular deve ter exatamente 11 dígitos. Você informou ${celularDigits.length} dígitos.`);
        setIsSubmitting(false);
        return;
      }
      if (celularDigits[2] !== '9') {
        toast.error('Celular deve iniciar com 9 após o DDD. Ex: (11) 91234-5678');
        setIsSubmitting(false);
        return;
      }

      if (formData.vinculo_tipo === 'parceiro' && !formData.parceiro_id) {
        toast.error('Selecione o parceiro de serviço primeiro.');
        setIsSubmitting(false);
        return;
      }

      if (!formData.vehicle_id) {
        toast.error('Selecione um veículo para o motorista.');
        setIsSubmitting(false);
        return;
      }

      const duplicateMessage = getDuplicateDriverMessage(formData);

      if (duplicateMessage) {
        toast.error(duplicateMessage);
        setIsSubmitting(false);
        return;
      }

      const insertData: Record<string, unknown> = {
        name: formData.name.trim(),
        cpf: formData.cpf.replace(/\D/g, '').trim(),
        cnh: formData.cnh.replace(/\D/g, '').trim(),
        phone: formData.celular.replace(/\D/g, '').trim(),
        vehicle_id: formData.vehicle_id,
        status: 'active',
        vinculo_tipo: formData.vinculo_tipo,
      };

      // Só adiciona email se preenchido
      if (formData.email.trim()) {
        insertData.email = formData.email.trim().toLowerCase();
      }

      // Só adiciona parceiro_id se for de parceiro
      if (formData.vinculo_tipo === 'parceiro' && formData.parceiro_id) {
        insertData.parceiro_id = formData.parceiro_id;
      }

      const { error } = await supabase
        .from('drivers')
        .insert([insertData]);

      if (error) throw error;

      setIsModalOpen(false);
      setFormData({ name: '', cpf: '', cnh: '', email: '', celular: '', vehicle_id: '', vinculo_tipo: 'parceiro', parceiro_id: '', tipo_documento: 'cpf' });
    } catch (error) {
      console.error('Erro ao salvar motorista:', error);

      if (error instanceof Error) {
        toast.error(error.message);
      } else if (error && typeof error === 'object' && 'message' in error) {
        toast.error(String(error.message));
      } else {
        toast.error('Erro ao salvar motorista.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditModal = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name || '',
      cpf: formatDocumento(driver.cpf || '', 'cpf'),
      cnh: driver.cnh || '',
      email: driver.email || '',
      celular: driver.phone || '',
      vehicle_id: driver.vehicle_id || '',
      vinculo_tipo: driver.vinculo_tipo || 'parceiro',
      parceiro_id: driver.parceiro_id || '',
      tipo_documento: 'cpf',
    });
  };

  const handleEditDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver) return;
    setIsSubmitting(true);

    try {
      if (!formData.name.trim()) {
        toast.error('Nome completo é obrigatório.');
        setIsSubmitting(false);
        return;
      }

      const cnhDigits = formData.cnh.replace(/\D/g, '');
      if (cnhDigits.length !== 11) {
        toast.error(`CNH deve ter exatamente 11 dígitos numéricos. Você informou ${cnhDigits.length} dígitos.`);
        setIsSubmitting(false);
        return;
      }

      const cpfDigits = formData.cpf.replace(/\D/g, '');
      if (cpfDigits.length !== 11) {
        toast.error(`CPF deve ter exatamente 11 dígitos. Você informou ${cpfDigits.length} dígitos.`);
        setIsSubmitting(false);
        return;
      }

      const celularDigits = formData.celular.replace(/\D/g, '');
      if (celularDigits.length !== 11) {
        toast.error(`Celular deve ter exatamente 11 dígitos. Você informou ${celularDigits.length} dígitos.`);
        setIsSubmitting(false);
        return;
      }
      if (celularDigits[2] !== '9') {
        toast.error('Celular deve iniciar com 9 após o DDD. Ex: (11) 91234-5678');
        setIsSubmitting(false);
        return;
      }

      if (formData.vinculo_tipo === 'parceiro' && !formData.parceiro_id) {
        toast.error('Selecione o parceiro de serviço primeiro.');
        setIsSubmitting(false);
        return;
      }

      if (!formData.vehicle_id) {
        toast.error('Selecione um veículo para o motorista.');
        setIsSubmitting(false);
        return;
      }

      const duplicateMessage = getDuplicateDriverMessage(formData, editingDriver.id);

      if (duplicateMessage) {
        toast.error(duplicateMessage);
        setIsSubmitting(false);
        return;
      }

      const updateData: Record<string, unknown> = {
        name: formData.name.trim(),
        cpf: formData.cpf.replace(/\D/g, '').trim(),
        cnh: formData.cnh.replace(/\D/g, '').trim(),
        phone: formData.celular.replace(/\D/g, '').trim(),
        vehicle_id: formData.vehicle_id,
        vinculo_tipo: formData.vinculo_tipo,
        parceiro_id: formData.vinculo_tipo === 'parceiro' ? formData.parceiro_id : null,
      };

      // Atualiza email (limpa se vazio)
      updateData.email = formData.email.trim() ? formData.email.trim().toLowerCase() : null;

      const { error } = await supabase
        .from('drivers')
        .update(updateData)
        .eq('id', editingDriver.id);

      if (error) throw error;

      toast.success('Motorista atualizado com sucesso!');
      setEditingDriver(null);
      setFormData({ name: '', cpf: '', cnh: '', email: '', celular: '', vehicle_id: '', vinculo_tipo: 'parceiro', parceiro_id: '', tipo_documento: 'cpf' });
    } catch (error) {
      console.error('Erro ao atualizar motorista:', error);

      if (error instanceof Error) {
        toast.error(error.message);
      } else if (error && typeof error === 'object' && 'message' in error) {
        toast.error(String(error.message));
      } else {
        toast.error('Erro ao atualizar motorista.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDriver = async (id: string) => {
    const driver = drivers.find(d => d.id === id);
    if (!driver) return;

    const confirmed = await confirm({
      title: 'Excluir Motorista',
      message: `Tem certeza que deseja excluir o motorista "${driver.name}"? Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      type: 'danger',
    });

    if (!confirmed) return;

    const { error } = await supabase
      .from('drivers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir motorista:', error);
      toast.error('Erro ao excluir motorista.');
    } else {
      toast.success('Motorista excluído com sucesso!');
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
      />

      {/* Drivers List */}
      <DataTable
        data={filteredDrivers}
        loading={loading}
        actionButton={
          <button
            onClick={() => {
              setFormData({ name: '', cpf: '', cnh: '', email: '', celular: '', vehicle_id: '', vinculo_tipo: 'parceiro', parceiro_id: '', tipo_documento: 'cpf' });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-[var(--color-geolog-blue)] text-white px-5 py-3.5 rounded-2xl font-bold hover:scale-105 active:scale-95 transition-all text-sm cursor-pointer shadow-lg shadow-blue-900/20 whitespace-nowrap"
          >
            <UserPlus size={18} />
            Novo Motorista
          </button>
        }
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
            key: 'veiculo',
            title: 'Veículo',
            render: (value: unknown, item: Driver) => {
              void value;
              const vehicle = vehicles.find((option) => option.id === item.vehicle_id);
              
              if (!vehicle) {
                return (
                  <span className="inline-flex items-center px-3 py-1 rounded-lg bg-red-100 text-red-700 font-black text-sm border border-red-200">
                    Sem Veículo
                  </span>
                );
              }

              return (
                <div className="space-y-1">
                  <p className="font-black text-base text-slate-800 tracking-tight">{vehicle.modelo}</p>
                  <p className="text-sm font-semibold text-slate-400">{vehicle.placa} • {vehicle.marca}</p>
                </div>
              );
            }
          },
          {
            key: 'documentos',
            title: 'Documentos',
            render: (value: unknown, item: Driver) => {
              void value;

              return (
              <div className="space-y-1">
                <p className="text-base font-medium text-slate-500"><span className="font-semibold">CPF:</span> <span className="text-slate-600 font-normal">{formatDocumento(item.cpf || '', 'cpf')}</span></p>
                <p className="text-base font-medium text-slate-500"><span className="font-semibold">CNH:</span> <span className="text-slate-600 font-normal">{item.cnh}</span></p>
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
                <span className="text-base font-bold">{formatCelular(String(value)).replace('(', '').replace(')', ' ')}</span>
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
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => setViewingDriver(item)}
                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                    title="Visualizar Motorista"
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(item)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                    title="Editar Motorista"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => setSelectedDriverForDocs(item)}
                    className="p-2 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-all cursor-pointer"
                    title="Documentações"
                  >
                    <FileText size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteDriver(item.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                    title="Excluir Motorista"
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
        searchPlaceholder="Buscar por nome ou CPF..."
        emptyMessage="Nenhum motorista encontrado."
        emptyIcon={<Truck size={48} />}
      />

      {/* Modal de Cadastro */}
      {isModalOpen && (
        <StandardModal 
          onClose={() => {
            setIsModalOpen(false);
            setFormData({ name: '', cpf: '', cnh: '', email: '', celular: '', vehicle_id: '', vinculo_tipo: 'parceiro', parceiro_id: '', tipo_documento: 'cpf' });
          }}
          title="Novo Motorista" 
          subtitle="Cadastro de condutor para a frota Geolog"
          icon={<UserPlus size={24} />}
          maxWidthClassName="max-w-6xl"
          bodyClassName="p-6 md:p-10 pb-16 space-y-12"
        >
          <form onSubmit={handleAddDriver} className="space-y-12">
            <section className="space-y-6">
              <div className="flex items-center border-b-2 border-slate-100 pb-4" style={{ paddingBottom: '1.25rem' }}>
                <h3 className="text-[17px] font-black text-slate-900 uppercase tracking-[0.1em] flex items-center gap-3" style={{ lineHeight: '1.3' }}>
                  <IdCard size={20} className="text-slate-500" /> Informações do Motorista
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-6">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="space-y-2 w-full md:w-[48%]">
                    <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Nome completo <span className="text-rose-300 text-base">*</span></label>
                    <input
                      required
                      placeholder="Ex: João Silva da Rocha"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-2 w-full md:w-48">
                    <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">CNH <span className="text-rose-300 text-base">*</span></label>
                    <input
                      required
                      placeholder="11 dígitos numéricos"
                      value={formData.cnh}
                      onChange={e => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                        setFormData({...formData, cnh: value});
                      }}
                      className={`w-full px-4 py-4 bg-slate-50 border-2 rounded-xl font-bold text-base text-slate-900 outline-none focus:bg-white transition-all shadow-sm ${
                        formData.cnh && !validateCNH(formData.cnh) 
                          ? 'border-red-500 focus:border-red-500' 
                          : 'border-slate-200 focus:border-blue-600'
                      }`}
                    />
                  </div>
                  <div className="space-y-2 w-full md:w-auto">
                    <div className="flex gap-3 mt-7">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, vinculo_tipo: 'interno', parceiro_id: '', vehicle_id: '', tipo_documento: 'cpf'})}
                        className={`cursor-pointer flex items-center justify-center gap-2 px-4 py-4 rounded-xl border-2 font-black text-sm uppercase tracking-widest transition-all whitespace-nowrap ${
                          formData.vinculo_tipo === 'interno'
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600'
                        }`}
                      >
                        <Building2 size={16} /> Interno
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, vinculo_tipo: 'parceiro', parceiro_id: '', vehicle_id: '', tipo_documento: 'cpf'})}
                        className={`cursor-pointer flex items-center justify-center gap-2 px-4 py-4 rounded-xl border-2 font-black text-sm uppercase tracking-widest transition-all whitespace-nowrap ${
                          formData.vinculo_tipo === 'parceiro'
                            ? 'bg-teal-500 border-teal-500 text-white shadow-md'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-teal-300 hover:text-teal-600'
                        }`}
                      >
                        <Handshake size={16} /> Parceiro
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="space-y-2 w-full md:w-44">
                    <GeologSearchableSelect
                      label="Tipo"
                      options={tipoDocumentoOptions}
                      value={formData.tipo_documento}
                      onChange={(value) => setFormData({...formData, tipo_documento: value as 'cpf' | 'passaporte', cpf: formatDocumento(formData.cpf, value as 'cpf' | 'passaporte')})}
                      required
                    />
                  </div>
                  <div className="space-y-2 w-full md:w-44">
                    <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{getDocumentoLabel(formData.tipo_documento)} <span className="text-rose-300 text-base">*</span></label>
                    <input
                      required
                      placeholder={getDocumentoPlaceholder(formData.tipo_documento)}
                      value={formData.cpf}
                      onChange={e => setFormData({...formData, cpf: formatDocumento(e.target.value, formData.tipo_documento)})}
                      className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-2 flex-1">
                    <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">E-mail</label>
                    <input
                      type="email"
                      placeholder="exemplo@email.com"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value.toLowerCase()})}
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-2 w-full md:w-56">
                    <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Celular <span className="text-rose-300 text-base">*</span></label>
                    <input
                      required
                      placeholder="(00) 9XXXX-XXXX"
                      value={formatCelular(formData.celular)}
                      onChange={e => {
                        const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 11);
                        setFormData({...formData, celular: digitsOnly});
                      }}
                      className={`w-full px-4 py-4 bg-slate-50 border-2 rounded-xl font-bold text-base text-slate-900 outline-none focus:bg-white transition-all shadow-sm ${
                        formData.celular && !validateCelular(formData.celular) 
                          ? 'border-red-500 focus:border-red-500' 
                          : 'border-slate-200 focus:border-blue-600'
                      }`}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {formData.vinculo_tipo === 'parceiro' && (
                    <GeologSearchableSelect
                      label="Parceiro de serviço"
                      options={parceiroOptions}
                      value={formData.parceiro_id}
                      onChange={(value) => setFormData({...formData, parceiro_id: value, vehicle_id: ''})}
                      placeholder="Selecione o parceiro..."
                      required
                    />
                  )}
                  <div className={formData.vinculo_tipo === 'parceiro' ? '' : 'md:col-span-2'}>
                    <GeologSearchableSelect
                      label="Veículo"
                      options={filteredVehicles.map(vehicle => ({ 
                        id: vehicle.id, 
                        nome: `${vehicle.marca} ${vehicle.modelo} - ${vehicle.placa}` 
                      }))}
                      value={formData.vehicle_id}
                      onChange={(value) => setFormData({...formData, vehicle_id: value})}
                      placeholder="Selecione o veículo..."
                      required
                      disabled={filteredVehicles.length === 0}
                    />
                  </div>
                </div>
              </div>
            </section>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-12 py-4 bg-green-600 text-white font-black rounded-xl shadow-xl shadow-green-900/20 hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-widest disabled:opacity-50 flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Salvar motorista'}
              </button>
            </div>
          </form>
        </StandardModal>
      )}

      {/* Modal de Visualização */}
      {viewingDriver && (
        <StandardModal
          onClose={() => setViewingDriver(null)}
          title={viewingDriver.name}
          subtitle={`${viewingDriver.vinculo_tipo === 'interno' ? 'Motorista Interno' : 'Motorista de Parceiro'} · ${viewingDriver.status === 'active' ? 'Ativo' : 'Inativo'}`}
          icon={<User size={24} />}
          maxWidthClassName="max-w-3xl"
          bodyClassName="p-6 md:p-10 pb-10 space-y-8"
        >
          <div className="space-y-6">
            <h3 className="text-[13px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <IdCard size={14} className="text-blue-500" /> Dados Pessoais
            </h3>
            <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 py-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">CPF</p>
                    <p className="text-base font-bold text-slate-800">{formatDocumento(viewingDriver.cpf || '', 'cpf') || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">CNH</p>
                    <p className="text-base font-bold text-slate-800">{viewingDriver.cnh || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Celular</p>
                    <p className="text-base font-bold text-slate-800">{viewingDriver.phone ? formatCelular(viewingDriver.phone) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">E-mail</p>
                    <p className="text-base font-bold text-slate-800">{viewingDriver.email || '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-[13px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Truck size={14} className="text-blue-500" /> Veículo & Vínculo
            </h3>
            <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 py-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Veículo</p>
                    {(() => {
                      const vehicle = vehicles.find(v => v.id === viewingDriver.vehicle_id);
                      return vehicle 
                        ? <p className="text-base font-bold text-slate-800">{vehicle.marca} {vehicle.modelo} — {vehicle.placa}</p>
                        : <p className="text-base font-bold text-slate-400">Sem veículo</p>;
                    })()}
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Vínculo</p>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide border ${
                      viewingDriver.vinculo_tipo === 'interno'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-teal-50 text-teal-700 border-teal-200'
                    }`}>
                      {viewingDriver.vinculo_tipo === 'interno' ? <Building2 size={12} /> : <Handshake size={12} />}
                      {viewingDriver.vinculo_tipo === 'interno' ? 'Interno' : 'Parceiro'}
                    </span>
                  </div>
                  {viewingDriver.vinculo_tipo === 'parceiro' && viewingDriver.parceiro_id && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Parceiro</p>
                      <p className="text-base font-bold text-slate-800">
                        {parceiros.find(p => p.id === viewingDriver.parceiro_id)?.razaoSocialOuNomeCompleto || '—'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { const d = viewingDriver; setViewingDriver(null); handleOpenEditModal(d); }}
              className="px-6 py-3 bg-blue-50 text-blue-700 font-black rounded-xl hover:bg-blue-100 transition-all text-sm uppercase tracking-widest cursor-pointer flex items-center gap-2"
            >
              <Edit2 size={14} /> Editar
            </button>
            <button
              type="button"
              onClick={() => setViewingDriver(null)}
              className="px-8 py-3 bg-slate-100 text-slate-700 font-black rounded-xl hover:bg-slate-200 transition-all text-sm uppercase tracking-widest cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </StandardModal>
      )}

      {/* Modal de Edição */}
      {editingDriver && (
        <StandardModal 
          onClose={() => {
            setEditingDriver(null);
            setFormData({ name: '', cpf: '', cnh: '', email: '', celular: '', vehicle_id: '', vinculo_tipo: 'parceiro', parceiro_id: '', tipo_documento: 'cpf' });
          }}
          title="Editar Motorista" 
          subtitle={`Editando: ${editingDriver.name}`}
          icon={<Edit2 size={24} />}
          maxWidthClassName="max-w-6xl"
          bodyClassName="p-6 md:p-10 pb-16 space-y-12"
        >
          <form onSubmit={handleEditDriver} className="space-y-12">
            <section className="space-y-6">
              <div className="flex items-center border-b-2 border-slate-100 pb-4" style={{ paddingBottom: '1.25rem' }}>
                <h3 className="text-[17px] font-black text-slate-900 uppercase tracking-[0.1em] flex items-center gap-3" style={{ lineHeight: '1.3' }}>
                  <IdCard size={20} className="text-slate-500" /> Informações do Motorista
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-6">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="space-y-2 w-full md:w-[48%]">
                    <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Nome completo <span className="text-rose-300 text-base">*</span></label>
                    <input
                      required
                      placeholder="Ex: João Silva da Rocha"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-2 w-full md:w-48">
                    <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">CNH <span className="text-rose-300 text-base">*</span></label>
                    <input
                      required
                      placeholder="11 dígitos numéricos"
                      value={formData.cnh}
                      onChange={e => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                        setFormData({...formData, cnh: value});
                      }}
                      className={`w-full px-4 py-4 bg-slate-50 border-2 rounded-xl font-bold text-base text-slate-900 outline-none focus:bg-white transition-all shadow-sm ${
                        formData.cnh && !validateCNH(formData.cnh) 
                          ? 'border-red-500 focus:border-red-500' 
                          : 'border-slate-200 focus:border-blue-600'
                      }`}
                    />
                  </div>
                  <div className="space-y-2 w-full md:w-auto">
                    <div className="flex gap-3 mt-7">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, vinculo_tipo: 'interno', parceiro_id: '', vehicle_id: '', tipo_documento: 'cpf'})}
                        className={`cursor-pointer flex items-center justify-center gap-2 px-4 py-4 rounded-xl border-2 font-black text-sm uppercase tracking-widest transition-all whitespace-nowrap ${
                          formData.vinculo_tipo === 'interno'
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600'
                        }`}
                      >
                        <Building2 size={16} /> Interno
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, vinculo_tipo: 'parceiro', parceiro_id: '', vehicle_id: '', tipo_documento: 'cpf'})}
                        className={`cursor-pointer flex items-center justify-center gap-2 px-4 py-4 rounded-xl border-2 font-black text-sm uppercase tracking-widest transition-all whitespace-nowrap ${
                          formData.vinculo_tipo === 'parceiro'
                            ? 'bg-teal-500 border-teal-500 text-white shadow-md'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-teal-300 hover:text-teal-600'
                        }`}
                      >
                        <Handshake size={16} /> Parceiro
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="space-y-2 w-full md:w-44">
                    <GeologSearchableSelect
                      label="Tipo"
                      options={tipoDocumentoOptions}
                      value={formData.tipo_documento}
                      onChange={(value) => setFormData({...formData, tipo_documento: value as 'cpf' | 'passaporte', cpf: formatDocumento(formData.cpf, value as 'cpf' | 'passaporte')})}
                      required
                    />
                  </div>
                  <div className="space-y-2 w-full md:w-44">
                    <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{getDocumentoLabel(formData.tipo_documento)} <span className="text-rose-300 text-base">*</span></label>
                    <input
                      required
                      placeholder={getDocumentoPlaceholder(formData.tipo_documento)}
                      value={formData.cpf}
                      onChange={e => setFormData({...formData, cpf: formatDocumento(e.target.value, formData.tipo_documento)})}
                      className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-2 flex-1">
                    <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">E-mail</label>
                    <input
                      type="email"
                      placeholder="exemplo@email.com"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value.toLowerCase()})}
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-2 w-full md:w-56">
                    <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Celular <span className="text-rose-300 text-base">*</span></label>
                    <input
                      required
                      placeholder="(00) 9XXXX-XXXX"
                      value={formatCelular(formData.celular)}
                      onChange={e => {
                        const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 11);
                        setFormData({...formData, celular: digitsOnly});
                      }}
                      className={`w-full px-4 py-4 bg-slate-50 border-2 rounded-xl font-bold text-base text-slate-900 outline-none focus:bg-white transition-all shadow-sm ${
                        formData.celular && !validateCelular(formData.celular) 
                          ? 'border-red-500 focus:border-red-500' 
                          : 'border-slate-200 focus:border-blue-600'
                      }`}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {formData.vinculo_tipo === 'parceiro' && (
                    <GeologSearchableSelect
                      label="Parceiro de serviço"
                      options={parceiroOptions}
                      value={formData.parceiro_id}
                      onChange={(value) => setFormData({...formData, parceiro_id: value, vehicle_id: ''})}
                      placeholder="Selecione o parceiro..."
                      required
                    />
                  )}
                  <div className={formData.vinculo_tipo === 'parceiro' ? '' : 'md:col-span-2'}>
                    <GeologSearchableSelect
                      label="Veículo"
                      options={filteredVehicles.map(vehicle => ({ 
                        id: vehicle.id, 
                        nome: `${vehicle.marca} ${vehicle.modelo} - ${vehicle.placa}` 
                      }))}
                      value={formData.vehicle_id}
                      onChange={(value) => setFormData({...formData, vehicle_id: value})}
                      placeholder="Selecione o veículo..."
                      required
                      disabled={filteredVehicles.length === 0}
                    />
                  </div>
                </div>
              </div>
            </section>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-12 py-4 bg-blue-600 text-white font-black rounded-xl shadow-xl shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-widest disabled:opacity-50 flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Atualizar motorista'}
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
