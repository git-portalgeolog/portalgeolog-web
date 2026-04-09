'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import StandardModal from '@/components/StandardModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import RequiredAsterisk from '@/components/ui/RequiredAsterisk';
import { useConfirm } from '@/hooks/useConfirm';
import { Truck, Plus, MoreVertical, Loader2, Car, Settings, Users, Palette, Building2, Eye, Edit, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import GeologSearchableSelect from '@/components/ui/GeologSearchableSelect';
import { toast } from 'sonner';
import { useData, type ParceiroServico, type Vehicle } from '@/context/DataContext';

type VehicleType = Vehicle['tipo'];
type VehicleStatus = Vehicle['status'];

// Função para formatar Renavam
const formatarRenavam = (value: string): string => {
  // Remove caracteres não numéricos
  const cleaned = value.replace(/\D/g, '');
  
  // Limita a 11 dígitos
  const limited = cleaned.slice(0, 11);
  
  return limited;
};

// Função para validar Renavam
const validarRenavam = (renavam: string): boolean => {
  const cleaned = renavam.replace(/\D/g, '');
  
  // RENAVAM deve ter exatamente 11 dígitos
  return /^[0-9]{11}$/.test(cleaned);
};

// Função para formatar placa
const formatarPlaca = (value: string): string => {
  // Remove caracteres não alfanuméricos
  const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  
  // Limita a 7 caracteres
  const limited = cleaned.slice(0, 7);
  
  // Verifica se é formato Mercosul (ABC1D23) ou antigo (ABC1234)
  if (limited.length >= 5) {
    // Se o 5º caractere é letra, é formato Mercosul
    if (/[A-Z]/.test(limited[4])) {
      // Formato Mercosul: ABC1D23
      if (limited.length <= 4) return limited;
      if (limited.length === 5) return `${limited.slice(0, 4)}-${limited[4]}`;
      if (limited.length === 6) return `${limited.slice(0, 4)}-${limited.slice(4, 6)}`;
      return `${limited.slice(0, 4)}-${limited.slice(4)}`;
    } else {
      // Formato antigo: ABC1234
      if (limited.length <= 3) return limited;
      return `${limited.slice(0, 3)}-${limited.slice(3)}`;
    }
  }
  
  return limited;
};

// Função para validar placa
const validarPlaca = (placa: string): boolean => {
  const cleaned = placa.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  
  // Formato antigo: ABC1234
  const regexAntigo = /^[A-Z]{3}[0-9]{4}$/;
  
  // Formato Mercosul carro: ABC1D23
  const regexMercosulCarro = /^[A-Z]{3}[0-9]{1}[A-Z]{1}[0-9]{2}$/;
  
  // Formato Mercosul moto: ABC12D3
  const regexMercosulMoto = /^[A-Z]{3}[0-9]{2}[A-Z]{1}[0-9]{1}$/;
  
  return regexAntigo.test(cleaned) || regexMercosulCarro.test(cleaned) || regexMercosulMoto.test(cleaned);
};

export default function VeiculosPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const actionMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { confirm, confirmState, closeConfirm, handleConfirm } = useConfirm();
  const { updateVeiculo, deleteVeiculo } = useData();
  const supabase = createClient();

  // Form state
  const [formData, setFormData] = useState({
    placa: '',
    renavam: '',
    modelo: '',
    marca: '',
    ano: new Date().getFullYear(),
    cor: '',
    tipo: 'carro' as VehicleType,
    status: 'ativo',
    proprietario_tipo: 'parceiro' as 'interno' | 'parceiro',
    parceiro_id: '',
  });

  const { parceiros } = useData();

  const parceiroOptions = parceiros.map(p => ({ id: p.id, nome: p.razaoSocialOuNomeCompleto }));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tableUnavailable, setTableUnavailable] = useState(false);

  const normalizePlate = (plate: string): string => {
    return plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  };

  const resetForm = () => {
    setFormData({
      placa: '',
      renavam: '',
      modelo: '',
      marca: '',
      ano: new Date().getFullYear(),
      cor: '',
      tipo: 'carro',
      status: 'ativo',
      proprietario_tipo: 'parceiro',
      parceiro_id: '',
    });
  };

  const hasDuplicatePlate = (plate: string): boolean => {
    const normalizedPlate = normalizePlate(plate);
    if (!normalizedPlate) return false;

    return vehicles.some((vehicle) => {
      const vehiclePlate = normalizePlate(vehicle.placa);
      return vehiclePlate === normalizedPlate;
    });
  };

  useEffect(() => {
    const fetchVehicles = async () => {
      const { data, error } = await supabase
        .from('veiculos')
        .select('*')
        .order('marca', { ascending: true })
        .order('modelo', { ascending: true });
      
      if (error) {
        const isMissingTable =
          error.code === '42P01' ||
          error.message?.toLowerCase().includes('veiculos') ||
          error.message?.toLowerCase().includes('does not exist');

        if (isMissingTable) {
          setTableUnavailable(true);
          setVehicles([]);
          setLoading(false);
          return;
        }

        console.error('Erro ao buscar veículos:', error);
        toast.error('Erro ao buscar veículos.');
      } else {
        setTableUnavailable(false);
        setVehicles(data as Vehicle[]);
      }
      setLoading(false);
    };

    fetchVehicles();

    // Set up real-time subscription
    const channel = supabase
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
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validar formato da placa
      if (!validarPlaca(formData.placa)) {
        throw new Error('Formato de placa inválido. Use formato antigo (ABC-1234) ou Mercosul (ABC-1D23).');
      }

      // Validar formato do Renavam
      if (!validarRenavam(formData.renavam)) {
        throw new Error('RENAVAM inválido. Deve conter exatamente 11 dígitos numéricos.');
      }

      if (hasDuplicatePlate(formData.placa)) {
        throw new Error('Já existe um veículo com esta placa.');
      }

      const insertData: Record<string, unknown> = {
        placa: formData.placa.trim().toUpperCase(),
        renavam: formData.renavam.trim(),
        modelo: formData.modelo.trim(),
        marca: formData.marca.trim(),
        ano: formData.ano,
        cor: formData.cor.trim(),
        tipo: formData.tipo,
        status: formData.status,
        proprietario_tipo: formData.proprietario_tipo,
      };

      // Só adiciona parceiro_id se for de parceiro
      if (formData.proprietario_tipo === 'parceiro' && formData.parceiro_id) {
        insertData.parceiro_id = formData.parceiro_id;
      }

      const { error } = await supabase
        .from('veiculos')
        .insert([insertData]);

      if (error) throw error;

      setIsModalOpen(false);
      resetForm();
      toast.success('Veículo cadastrado com sucesso!');
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes('duplicate key value violates unique constraint')) {
        toast.error('Já existe um veículo com esta placa.');
      } else if (error instanceof Error) {
        toast.error(error.message);
      } else {
        console.error('Erro ao salvar veículo:', error);
        toast.error('Erro ao salvar no Supabase. Verifique as políticas de RLS.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredVehicles = vehicles.filter(v => 
    v.placa.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.marca.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'carro': return <Car size={16} />;
      case 'van': return <Users size={16} />;
      case 'onibus': return <Users size={16} />;
      case 'moto': return <Car size={16} />;
      case 'caminhao': return <Truck size={16} />;
      default: return <Settings size={16} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo': return 'bg-green-100 text-green-700 border-green-200';
      case 'inativo': return 'bg-red-100 text-red-700 border-red-200';
      case 'manutencao': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gerenciamento de Veículos"
        icon={<Truck size={20} />}
      />

      {tableUnavailable && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-amber-900 shadow-sm">
          <p className="font-black uppercase tracking-widest text-xs">Tabela de veículos indisponível</p>
          <p className="mt-2 text-sm font-medium">
            A estrutura do banco ainda não foi aplicada. Depois de sincronizar as migrations, os veículos aparecerão aqui.
          </p>
        </div>
      )}

      {/* Vehicles List */}
      <DataTable
        data={filteredVehicles}
        loading={loading}
        actionButton={
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-[var(--color-geolog-blue)] text-white px-5 py-3.5 rounded-2xl font-bold hover:scale-105 active:scale-95 transition-all text-sm cursor-pointer shadow-lg shadow-blue-900/20 whitespace-nowrap"
          >
            <Plus size={18} />
            Novo Veículo
          </button>
        }
        columns={[
          {
            key: 'veiculo',
            title: 'Veículo',
            render: (value: unknown, item: Vehicle) => (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-black">
                  {getTipoIcon(item.tipo)}
                </div>
                <div className="space-y-1">
                  <p className="font-black text-base text-slate-800 tracking-tight">{item.modelo}</p>
                  <p className="text-sm font-semibold text-slate-400">{item.marca} • {item.ano}</p>
                </div>
              </div>
            )
          },
          {
            key: 'placa',
            title: 'Placa',
            render: (value: unknown) => (
              <span className="inline-flex items-center px-3 py-1 rounded-lg bg-slate-100 text-slate-700 font-black text-sm border border-slate-200">
                {String(value).toUpperCase()}
              </span>
            )
          },
          {
            key: 'detalhes',
            title: 'Detalhes',
            render: (value: unknown, item: Vehicle) => {
              void value;
              return (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Palette size={14} className="text-slate-400" />
                    <span className="text-sm font-semibold text-slate-700">{item.cor || 'N/A'}</span>
                  </div>
                </div>
              );
            }
          },
          {
            key: 'status',
            title: 'Status',
            align: 'center',
            render: (value: unknown) => (
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs md:text-sm font-bold uppercase tracking-wide border ${getStatusColor(String(value))}`}>
                {String(value)}
              </span>
            )
          },
          {
            key: 'acoes',
            title: 'Ações',
            align: 'center' as const,
            render: (value: unknown, item: Vehicle) => {
              void value;

              const handleDelete = async () => {
                const confirmed = await confirm({
                  title: 'Excluir Veículo',
                  message: `Tem certeza que deseja excluir o veículo "${item.modelo}" (${item.placa})? Esta ação não pode ser desfeita.`,
                  confirmText: 'Sim, excluir',
                  cancelText: 'Cancelar',
                  type: 'danger'
                });

                if (confirmed) {
                  deleteVeiculo(item.id);
                  toast.success('Veículo excluído com sucesso.');
                }
              };

              const handleEdit = () => {
                setSelectedVehicle(item);
                setFormData({
                  placa: item.placa,
                  renavam: item.renavam,
                  modelo: item.modelo,
                  marca: item.marca,
                  ano: item.ano,
                  cor: item.cor || '',
                  tipo: item.tipo,
                  status: item.status,
                  proprietario_tipo: item.proprietario_tipo,
                  parceiro_id: item.parceiro_id || ''
                });
                setIsEditModalOpen(true);
              };

              const handleView = () => {
                setSelectedVehicle(item);
                setIsViewModalOpen(true);
              };

              return (
                <div className="flex items-center gap-2 justify-center">
                  <button
                    onClick={handleView}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    title="Visualizar"
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    onClick={handleEdit}
                    className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors cursor-pointer"
                    title="Editar"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Excluir"
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
        searchPlaceholder="Buscar por placa, modelo ou marca..."
        emptyMessage="Nenhum veículo encontrado."
        emptyIcon={<Truck size={48} />}
      />

      {/* Modal de Cadastro */}
      {isModalOpen && (
        <StandardModal 
          onClose={() => {
            setIsModalOpen(false);
            resetForm();
          }} 
          title="Novo Veículo" 
          subtitle="Cadastro de veículo para a frota Geolog"
          icon={<Truck size={24} />}
          maxWidthClassName="max-w-6xl"
        >
          <form onSubmit={handleAddVehicle} className="space-y-8">
            <div className="space-y-6">
              <div className="flex items-center border-b-2 border-slate-100 pb-4" style={{ paddingBottom: '1.25rem' }}>
                <h3 className="text-[17px] font-black text-slate-900 uppercase tracking-[0.1em] flex items-center gap-3" style={{ lineHeight: '1.3' }}>
                  <Car size={20} className="text-slate-500" /> Informações do Veículo
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="grid grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-1">Placa <RequiredAsterisk /></label>
                    <input
                      required
                      value={formData.placa}
                      onChange={e => {
                        const formatted = formatarPlaca(e.target.value);
                        setFormData({...formData, placa: formatted});
                      }}
                      className="w-full px-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm mt-[9px] h-[60px]"
                      placeholder="ABC-1234"
                      maxLength={8}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-1">Renavam <RequiredAsterisk /></label>
                    <input
                      required
                      value={formData.renavam}
                      onChange={e => {
                        const formatted = formatarRenavam(e.target.value);
                        setFormData({...formData, renavam: formatted});
                      }}
                      className="w-full px-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm mt-[9px] h-[60px]"
                      placeholder="00000000000"
                      maxLength={11}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-1">Ano <RequiredAsterisk /></label>
                    <input
                      required
                      type="number"
                      min="1900"
                      max={new Date().getFullYear() + 1}
                      value={formData.ano}
                      onChange={e => setFormData({...formData, ano: parseInt(e.target.value)})}
                      className="w-full px-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm mt-[9px] h-[60px]"
                    />
                  </div>
                  <div className="flex-[2.3] space-y-2">
                    <GeologSearchableSelect
                      label="Tipo"
                      options={[
                        { id: 'carro', nome: 'Carro' },
                        { id: 'van', nome: 'Van' },
                        { id: 'onibus', nome: 'Ônibus' },
                        { id: 'moto', nome: 'Moto' },
                        { id: 'caminhao', nome: 'Caminhão' },
                        { id: 'outro', nome: 'Outro' }
                      ]}
                      value={formData.tipo}
                      onChange={(value) => setFormData({...formData, tipo: value as VehicleType})}
                      required
                      disableSearch
                      triggerClassName="mt-[9px] h-[60px]"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-[4.85] space-y-2">
                    <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-1">Marca <RequiredAsterisk /></label>
                    <input
                      required
                      value={formData.marca}
                      onChange={e => setFormData({...formData, marca: e.target.value})}
                      className="w-full px-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm mt-[9px] h-[60px]"
                      placeholder="Ex: Volkswagen"
                    />
                  </div>
                  <div className="flex-[4.85] space-y-2">
                    <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-1">Modelo <RequiredAsterisk /></label>
                    <input
                      required
                      value={formData.modelo}
                      onChange={e => setFormData({...formData, modelo: e.target.value})}
                      className="w-full px-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm mt-[9px] h-[60px]"
                      placeholder="Ex: Gol"
                    />
                  </div>
                  <div className="flex-[2.3] space-y-2">
                    <GeologSearchableSelect
                      label="Cor"
                      options={[
                        { id: 'branco', nome: 'Branco' },
                        { id: 'preto', nome: 'Preto' },
                        { id: 'prata', nome: 'Prata' },
                        { id: 'cinza', nome: 'Cinza' },
                        { id: 'vermelho', nome: 'Vermelho' },
                        { id: 'azul', nome: 'Azul' },
                        { id: 'verde', nome: 'Verde' },
                        { id: 'amarelo', nome: 'Amarelo' },
                        { id: 'marrom', nome: 'Marrom' },
                        { id: 'bege', nome: 'Bege' },
                        { id: 'dourado', nome: 'Dourado' },
                        { id: 'roxo', nome: 'Roxo' },
                        { id: 'laranja', nome: 'Laranja' },
                        { id: 'outro', nome: 'Outro' }
                      ]}
                      value={formData.cor}
                      onChange={(value) => setFormData({...formData, cor: value})}
                      required
                      triggerClassName="mt-[15px] h-[60px]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t-2 border-slate-100"></div>

            <div className="space-y-6">
              <div className="flex items-center border-b-2 border-slate-100 pb-4" style={{ paddingBottom: '1.25rem' }}>
                <h3 className="text-[17px] font-black text-slate-900 uppercase tracking-[0.1em] flex items-center gap-3" style={{ lineHeight: '1.3' }}>
                  <Building2 size={20} className="text-slate-500" /> Proprietário
                </h3>
              </div>

              <div className="flex gap-6">
                <div className="w-[280px] space-y-2 flex-shrink-0">
                  <GeologSearchableSelect
                    label="Tipo de Proprietário"
                    options={[
                      { id: 'interno', nome: 'Frota Interna (Geolog)' },
                      { id: 'parceiro', nome: 'Parceiro de Serviço' }
                    ]}
                    value={formData.proprietario_tipo}
                    onChange={(value) => setFormData({...formData, proprietario_tipo: value as 'interno' | 'parceiro', parceiro_id: ''})}
                    required
                    disableSearch
                    triggerClassName="mt-[9px] h-[60px]"
                  />
                </div>

                {formData.proprietario_tipo === 'parceiro' && (
                  <div className="flex-1 space-y-2">
                    <GeologSearchableSelect
                      label="Parceiro de Serviço"
                      options={parceiroOptions}
                      value={formData.parceiro_id}
                      onChange={(value) => setFormData({...formData, parceiro_id: value})}
                      required={formData.proprietario_tipo === 'parceiro'}
                      triggerClassName="mt-[9px] h-[60px]"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-4 border-2 border-slate-200 text-slate-500 font-black rounded-2xl hover:bg-slate-50 transition-all uppercase tracking-widest text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                disabled={isSubmitting}
                className="flex-1 py-4 bg-green-600 text-white font-black rounded-2xl hover:bg-green-500 shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 uppercase tracking-widest text-xs cursor-pointer"
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : 'Salvar Veículo'}
              </button>
            </div>
          </form>
        </StandardModal>
      )}

      {isViewModalOpen && selectedVehicle && (
        <StandardModal
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedVehicle(null);
          }}
          title="Detalhes do Veículo"
          subtitle="Informações completas do veículo selecionado"
          icon={<Eye className="w-6 h-6 md:w-7 md:h-7" />}
          maxWidthClassName="max-w-6xl"
        >
          <div className="space-y-8 py-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <Car size={28} className="text-blue-600" />
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-[0.1em]">Informações do Veículo</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Placa</label>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-100 text-blue-700 font-black text-base border border-blue-200">
                      {selectedVehicle.placa}
                    </span>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Renavam</label>
                  <p className="text-lg font-bold text-slate-800 mt-2">{selectedVehicle.renavam}</p>
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Marca</label>
                  <p className="text-lg font-bold text-slate-800 mt-2">{selectedVehicle.marca}</p>
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Modelo</label>
                  <p className="text-lg font-bold text-slate-800 mt-2">{selectedVehicle.modelo}</p>
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Ano</label>
                  <p className="text-lg font-bold text-slate-800 mt-2">{selectedVehicle.ano}</p>
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Cor</label>
                  <div className="flex items-center gap-2 mt-2">
                    <Palette size={16} className="text-slate-400" />
                    <p className="text-lg font-bold text-slate-800">{selectedVehicle.cor || 'Não informado'}</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Tipo</label>
                  <div className="flex items-center gap-2 mt-2">
                    {getTipoIcon(selectedVehicle.tipo)}
                    <p className="text-lg font-bold text-slate-800">{selectedVehicle.tipo}</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Status</label>
                  <div className="mt-2">
                    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wide border ${getStatusColor(selectedVehicle.status)}`}>
                      {selectedVehicle.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6 mt-8">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <Building2 size={28} className="text-blue-600" />
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-[0.1em]">Proprietário</h3>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
                <div className="flex items-center gap-3">
                  {selectedVehicle.proprietario_tipo === 'interno' ? (
                    <Building2 size={24} className="text-blue-500" />
                  ) : (
                    <Building2 size={24} className="text-green-500" />
                  )}
                  <p className="text-lg font-bold text-slate-800">
                    {selectedVehicle.proprietario_tipo === 'interno' ? 'Frota Interna (Geolog)' : 'Parceiro de Serviço'}
                  </p>
                </div>
                {selectedVehicle.proprietario_tipo === 'parceiro' && selectedVehicle.parceiro_id && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Parceiro</p>
                    <p className="text-base font-bold text-slate-700">
                      {parceiros.find(p => p.id === selectedVehicle.parceiro_id)?.razaoSocialOuNomeCompleto || 'Não informado'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </StandardModal>
      )}

      {isEditModalOpen && (
        <StandardModal
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedVehicle(null);
            resetForm();
          }}
          title="Editar Veículo"
          subtitle="Atualize as informações do veículo"
          icon={<Edit size={24} />}
          maxWidthClassName="max-w-6xl"
        >
          <form onSubmit={async (e) => {
            e.preventDefault();
            setIsSubmitting(true);
            try {
              if (!validarPlaca(formData.placa)) {
                throw new Error('Formato de placa inválido. Use formato antigo (ABC-1234) ou Mercosul (ABC-1D23).');
              }
              if (!validarRenavam(formData.renavam)) {
                throw new Error('RENAVAM inválido. Deve conter exatamente 11 dígitos numéricos.');
              }
              if (hasDuplicatePlate(formData.placa) && selectedVehicle && selectedVehicle.placa !== formData.placa) {
                throw new Error('Já existe um veículo com esta placa.');
              }
              await updateVeiculo(selectedVehicle!.id, {
                placa: formData.placa,
                renavam: formData.renavam,
                modelo: formData.modelo,
                marca: formData.marca,
                ano: formData.ano,
                cor: formData.cor,
                tipo: formData.tipo,
                status: formData.status,
                proprietario_tipo: formData.proprietario_tipo,
                parceiro_id: formData.proprietario_tipo === 'parceiro' ? formData.parceiro_id : undefined,
              });
              setIsEditModalOpen(false);
              setSelectedVehicle(null);
              resetForm();
              toast.success('Veículo atualizado com sucesso!');
            } catch (error) {
              if (error instanceof Error) {
                toast.error(error.message);
              } else {
                toast.error('Erro ao atualizar veículo.');
              }
            } finally {
              setIsSubmitting(false);
            }
          }} className="space-y-8">
            <div className="space-y-6">
              <div className="flex items-center border-b-2 border-slate-100 pb-4" style={{ paddingBottom: '1.25rem' }}>
                <h3 className="text-[17px] font-black text-slate-900 uppercase tracking-[0.1em] flex items-center gap-3" style={{ lineHeight: '1.3' }}>
                  <Car size={20} className="text-slate-500" /> Informações do Veículo
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-6">
                <div className="grid grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-1">Placa <RequiredAsterisk /></label>
                    <input
                      required
                      value={formData.placa}
                      onChange={e => {
                        const formatted = formatarPlaca(e.target.value);
                        setFormData({...formData, placa: formatted});
                      }}
                      className="w-full px-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm mt-[9px] h-[60px]"
                      placeholder="ABC-1234"
                      maxLength={8}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-1">Renavam <RequiredAsterisk /></label>
                    <input
                      required
                      value={formData.renavam}
                      onChange={e => {
                        const formatted = formatarRenavam(e.target.value);
                        setFormData({...formData, renavam: formatted});
                      }}
                      className="w-full px-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm mt-[9px] h-[60px]"
                      placeholder="00000000000"
                      maxLength={11}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-1">Ano <RequiredAsterisk /></label>
                    <input
                      required
                      type="number"
                      min="1900"
                      max={new Date().getFullYear() + 1}
                      value={formData.ano}
                      onChange={e => setFormData({...formData, ano: parseInt(e.target.value)})}
                      className="w-full px-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm mt-[9px] h-[60px]"
                    />
                  </div>
                  <div className="flex-[2.3] space-y-2">
                    <GeologSearchableSelect
                      label="Tipo"
                      options={[
                        { id: 'carro', nome: 'Carro' },
                        { id: 'van', nome: 'Van' },
                        { id: 'onibus', nome: 'Ônibus' },
                        { id: 'moto', nome: 'Moto' },
                        { id: 'caminhao', nome: 'Caminhão' },
                        { id: 'outro', nome: 'Outro' }
                      ]}
                      value={formData.tipo}
                      onChange={(value) => setFormData({...formData, tipo: value as VehicleType})}
                      required
                      disableSearch
                      triggerClassName="mt-[9px] h-[60px]"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-[4.85] space-y-2">
                    <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-1">Marca <RequiredAsterisk /></label>
                    <input
                      required
                      value={formData.marca}
                      onChange={e => setFormData({...formData, marca: e.target.value})}
                      className="w-full px-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm mt-[9px] h-[60px]"
                      placeholder="Ex: Volkswagen"
                    />
                  </div>
                  <div className="flex-[4.85] space-y-2">
                    <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-1">Modelo <RequiredAsterisk /></label>
                    <input
                      required
                      value={formData.modelo}
                      onChange={e => setFormData({...formData, modelo: e.target.value})}
                      className="w-full px-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm mt-[9px] h-[60px]"
                      placeholder="Ex: Gol"
                    />
                  </div>
                  <div className="flex-[2.3] space-y-2">
                    <GeologSearchableSelect
                      label="Cor"
                      options={[
                        { id: 'branco', nome: 'Branco' },
                        { id: 'preto', nome: 'Preto' },
                        { id: 'prata', nome: 'Prata' },
                        { id: 'cinza', nome: 'Cinza' },
                        { id: 'vermelho', nome: 'Vermelho' },
                        { id: 'azul', nome: 'Azul' },
                        { id: 'verde', nome: 'Verde' },
                        { id: 'amarelo', nome: 'Amarelo' },
                        { id: 'marrom', nome: 'Marrom' },
                        { id: 'bege', nome: 'Bege' },
                        { id: 'dourado', nome: 'Dourado' },
                        { id: 'roxo', nome: 'Roxo' },
                        { id: 'laranja', nome: 'Laranja' },
                        { id: 'outro', nome: 'Outro' }
                      ]}
                      value={formData.cor}
                      onChange={(value) => setFormData({...formData, cor: value})}
                      required
                      triggerClassName="mt-[15px] h-[60px]"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t-2 border-slate-100"></div>
            <div className="space-y-6">
              <div className="flex items-center border-b-2 border-slate-100 pb-4" style={{ paddingBottom: '1.25rem' }}>
                <h3 className="text-[17px] font-black text-slate-900 uppercase tracking-[0.1em] flex items-center gap-3" style={{ lineHeight: '1.3' }}>
                  <Building2 size={20} className="text-slate-500" /> Proprietário
                </h3>
              </div>
              <div className="flex gap-6">
                <div className="flex-[1.5] space-y-2">
                  <GeologSearchableSelect
                    label="Tipo de Proprietário"
                    options={[
                      { id: 'interno', nome: 'Frota Interna (Geolog)' },
                      { id: 'parceiro', nome: 'Parceiro de Serviço' }
                    ]}
                    value={formData.proprietario_tipo}
                    onChange={(value) => setFormData({...formData, proprietario_tipo: value as 'interno' | 'parceiro', parceiro_id: ''})}
                    required
                    disableSearch
                    triggerClassName="mt-[9px] h-[60px]"
                  />
                </div>
                {formData.proprietario_tipo === 'parceiro' && (
                  <div className="flex-[3] space-y-2">
                    <GeologSearchableSelect
                      label="Parceiro de Serviço"
                      options={parceiroOptions}
                      value={formData.parceiro_id}
                      onChange={(value) => setFormData({...formData, parceiro_id: value})}
                      required={formData.proprietario_tipo === 'parceiro'}
                      triggerClassName="mt-[9px] h-[60px]"
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button 
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 py-4 border-2 border-slate-200 text-slate-500 font-black rounded-2xl hover:bg-slate-50 transition-all uppercase tracking-widest text-xs"
              >
                Cancelar
              </button>
              <button 
                disabled={isSubmitting}
                className="flex-1 py-4 bg-green-600 text-white font-black rounded-2xl hover:bg-green-500 shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 uppercase tracking-widest text-xs cursor-pointer"
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : 'Atualizar Veículo'}
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
