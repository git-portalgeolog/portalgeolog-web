'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import StandardModal from '@/components/StandardModal';
import { 
  Plus, 
  Truck, 
  User,
  UserPlus,
  Calendar,
  X,
  PlusCircle,
  FileText,
  MapPin,
  Clock,
  CheckCircle2,
  Navigation,
  ArrowRightLeft,
  Building,
  MoreVertical,
  Eye,
  Pencil,
  RotateCcw,
  XOctagon,
  MessageCircle,
  Users,
  AlertTriangle,
  ChevronDown,
  IdCard,
  Building2,
  Handshake,
  Car,
  Loader2,
  LayoutGrid,
  CalendarDays,
} from 'lucide-react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { useData, type OrderService, type ParceiroServico } from '@/context/DataContext';
import GeologSearchableSelect from '@/components/ui/GeologSearchableSelect';
import { DataTable } from '@/components/ui/DataTable';
import { toast } from 'sonner';
import RequiredAsterisk from '@/components/ui/RequiredAsterisk';
import OSCalendar from '@/components/OS/OSCalendar';

type FormPassenger = { id: string; solicitanteId: string; nome: string; };
type FormWaypoint = { label: string; lat: number | null; lng: number | null; passengers: FormPassenger[]; };
type OSFormData = {
  data: string;
  hora: string;
  horaExtra: string;
  os: string;
  clienteId: string;
  solicitante: string;
  motorista: string;
  veiculoId: string;
  centroCusto: string;
  valorBruto: number;
  custo: number;
  waypoints: FormWaypoint[];
};

type QuickAddDriverForm = {
  name: string;
  cpf: string;
  cnh: string;
  celular: string;
  vehicle_id: string;
  vinculo_tipo: 'interno' | 'parceiro';
  parceiro_id: string;
  tipo_documento: 'cpf' | 'passaporte';
};

type VehicleOption = {
  id: string;
  placa: string;
  modelo: string;
  marca: string;
};

const initialQuickAddDriverForm: QuickAddDriverForm = {
  name: '',
  cpf: '',
  cnh: '',
  celular: '',
  vehicle_id: '',
  vinculo_tipo: 'parceiro',
  parceiro_id: '',
  tipo_documento: 'cpf'
};

const formatDriverDocument = (value: string, tipo: 'cpf' | 'passaporte'): string => {
  if (tipo === 'cpf') {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }

  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 9);
};

const formatDriverCelular = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const validateDriverCNH = (value: string): boolean => {
  return value.replace(/\D/g, '').length === 11;
};

const validateDriverCPF = (value: string): boolean => {
  return value.replace(/\D/g, '').length === 11;
};

const validateDriverCelular = (value: string): boolean => {
  const digits = value.replace(/\D/g, '');
  return digits.length === 11 && digits[2] === '9';
};

const getDriverDocumentLabel = (tipo: 'cpf' | 'passaporte'): string => {
  return tipo === 'cpf' ? 'CPF' : 'Passaporte';
};

const getDriverDocumentPlaceholder = (tipo: 'cpf' | 'passaporte'): string => {
  return tipo === 'cpf' ? '000.000.000-00' : 'AA1234567';
};

const tipoDocumentoOptions = [
  { id: 'cpf', nome: 'CPF' },
  { id: 'passaporte', nome: 'Passaporte' }
];

const normalizeTextValue = (value: string): string => value.trim().toLowerCase();
const normalizeDigitsValue = (value: string): string => value.replace(/\D/g, '');

const MARCAS_VEICULOS = [
  { id: 'Acura', nome: 'Acura' }, { id: 'Alfa Romeo', nome: 'Alfa Romeo' }, { id: 'Aston Martin', nome: 'Aston Martin' },
  { id: 'Audi', nome: 'Audi' }, { id: 'Bentley', nome: 'Bentley' }, { id: 'BMW', nome: 'BMW' }, { id: 'BYD', nome: 'BYD' },
  { id: 'Caoa Chery', nome: 'Caoa Chery' }, { id: 'Chevrolet', nome: 'Chevrolet' }, { id: 'Chrysler', nome: 'Chrysler' },
  { id: 'Citroën', nome: 'Citroën' }, { id: 'Dodge', nome: 'Dodge' }, { id: 'Ferrari', nome: 'Ferrari' },
  { id: 'Fiat', nome: 'Fiat' }, { id: 'Ford', nome: 'Ford' }, { id: 'GWM', nome: 'GWM' }, { id: 'Honda', nome: 'Honda' },
  { id: 'Hyundai', nome: 'Hyundai' }, { id: 'Jac', nome: 'Jac' }, { id: 'Jaguar', nome: 'Jaguar' }, { id: 'Jeep', nome: 'Jeep' },
  { id: 'Kia', nome: 'Kia' }, { id: 'Lamborghini', nome: 'Lamborghini' }, { id: 'Land Rover', nome: 'Land Rover' },
  { id: 'Lexus', nome: 'Lexus' }, { id: 'Lifan', nome: 'Lifan' }, { id: 'Maserati', nome: 'Maserati' },
  { id: 'McLaren', nome: 'McLaren' }, { id: 'Mercedes-Benz', nome: 'Mercedes-Benz' }, { id: 'Mini', nome: 'Mini' },
  { id: 'Mitsubishi', nome: 'Mitsubishi' }, { id: 'Nissan', nome: 'Nissan' }, { id: 'Peugeot', nome: 'Peugeot' },
  { id: 'Porsche', nome: 'Porsche' }, { id: 'Ram', nome: 'Ram' }, { id: 'Renault', nome: 'Renault' },
  { id: 'Rolls-Royce', nome: 'Rolls-Royce' }, { id: 'Seat', nome: 'Seat' }, { id: 'Smart', nome: 'Smart' },
  { id: 'Subaru', nome: 'Subaru' }, { id: 'Suzuki', nome: 'Suzuki' }, { id: 'Tesla', nome: 'Tesla' },
  { id: 'Toyota', nome: 'Toyota' }, { id: 'Troller', nome: 'Troller' }, { id: 'Volkswagen', nome: 'Volkswagen' },
  { id: 'Volvo', nome: 'Volvo' }, { id: 'Outra', nome: 'Outra' },
];

const TIPOS_VEICULO_OS = [
  { id: 'carro', nome: 'Carro' }, { id: 'van', nome: 'Van' }, { id: 'onibus', nome: 'Ônibus' },
  { id: 'moto', nome: 'Moto' }, { id: 'caminhao', nome: 'Caminhão' }, { id: 'outro', nome: 'Outro' },
];

const formatarPlacaOS = (value: string): string => {
  const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 7);
  if (cleaned.length >= 5 && /[A-Z]/.test(cleaned[4])) return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  if (cleaned.length >= 4) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  return cleaned;
};

const validarPlacaOS = (placa: string): boolean => {
  const c = placa.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return /^[A-Z]{3}[0-9]{4}$/.test(c) || /^[A-Z]{3}[0-9]{1}[A-Z]{1}[0-9]{2}$/.test(c) || /^[A-Z]{3}[0-9]{2}[A-Z]{1}[0-9]{1}$/.test(c);
};

export default function OSOperationalPage() {
  const { osList, clientes, solicitantes, passageiros, drivers, parceiros, addOS, updateOS, updateOSStatus, addPassageiro, getCentrosCustoByCliente, addCliente, addSolicitante, addCentroCusto, refreshData } = useData();
  const supabase = createClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuickPassengerModalOpen, setIsQuickPassengerModalOpen] = useState(false);
  const [quickPassengerTarget, setQuickPassengerTarget] = useState<{ waypointIndex: number; passengerId: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [editingOSId, setEditingOSId] = useState<string | null>(null);
  const [viewingOSId, setViewingOSId] = useState<string | null>(null);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const actionMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const passengerDraftIdRef = useRef(0);
  
  // Estados para cadastros rápidos
  const [quickAddModal, setQuickAddModal] = useState<'cliente' | 'motorista' | 'solicitante' | 'centroCusto' | null>(null);
  const [quickAddForm, setQuickAddForm] = useState({ nome: '' });
  const [quickAddDriverForm, setQuickAddDriverForm] = useState<QuickAddDriverForm>(initialQuickAddDriverForm);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [vehiclesUnavailable, setVehiclesUnavailable] = useState(false);
  const [quickAddedDriverOptions, setQuickAddedDriverOptions] = useState<{ id: string; nome: string }[]>([]);
  const [driverVehiclesAssoc, setDriverVehiclesAssoc] = useState<{ driver_id: string; vehicle_id: string }[]>([]);
  const [isOsVehicleQuickModalOpen, setIsOsVehicleQuickModalOpen] = useState(false);
  const [isSubmittingOsVehicle, setIsSubmittingOsVehicle] = useState(false);
  const [osVehicleQuickForm, setOsVehicleQuickForm] = useState({
    placa: '', modelo: '', marca: '',
    tipo: 'carro' as 'carro' | 'van' | 'onibus' | 'moto' | 'caminhao' | 'outro',
  });
  const [quickAddedSolicitantes, setQuickAddedSolicitantes] = useState<Array<{ id: string; nome: string; clienteId: string }>>([]);
  const [quickAddedCentrosCusto, setQuickAddedCentrosCusto] = useState<Array<{ id: string; nome: string; clienteId: string }>>([]);
  const parceiroOptions = useMemo(
    () => parceiros.map((parceiro: ParceiroServico) => ({ id: parceiro.id, nome: parceiro.razaoSocialOuNomeCompleto })),
    [parceiros]
  );

  const isAnyModalOpen = isModalOpen || isQuickPassengerModalOpen || Boolean(viewingOSId) || Boolean(cancelTargetId) || Boolean(quickAddModal) || isOsVehicleQuickModalOpen;

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isAnyModalOpen]);

  useEffect(() => {
    const fetchVehicles = async () => {
      const { data, error } = await supabase
        .from('veiculos')
        .select('id, placa, modelo, marca')
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

        console.error('Erro ao buscar veículos:', error);
        toast.error('Erro ao buscar veículos.');
        return;
      }

      setVehiclesUnavailable(false);
      setVehicles((data || []) as VehicleOption[]);
    };

    const fetchDriverVehicles = async () => {
      const { data } = await supabase
        .from('driver_vehicles')
        .select('driver_id, vehicle_id');
      if (data) setDriverVehiclesAssoc(data as { driver_id: string; vehicle_id: string }[]);
    };

    fetchVehicles();
    fetchDriverVehicles();

    const vehiclesChannel = supabase
      .channel('os-quick-add-vehicles-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'veiculos' },
        () => { fetchVehicles(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'driver_vehicles' },
        () => { fetchDriverVehicles(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(vehiclesChannel);
    };
  }, [supabase]);

  // Form State
  const initialForm: OSFormData = {
    data: new Date().toISOString().split('T')[0],
    hora: '',
    horaExtra: '',
    os: '',
    clienteId: '',
    solicitante: '',
    motorista: '',
    veiculoId: '',
    centroCusto: '',
    valorBruto: 0,
    custo: 0,
    waypoints: [
      { label: '', lat: null, lng: null, passengers: [] },
      { label: '', lat: null, lng: null, passengers: [] }
    ]
  };

  const resetMainModalState = () => {
    setIsModalOpen(false);
    setEditingOSId(null);
    setFormData(initialForm);
  };

  const handleOpenCreateOSModal = () => {
    setEditingOSId(null);
    setFormData(initialForm);
    setIsModalOpen(true);
  };

  const hydrateFormFromOS = (osItem: OrderService) => {
    setFormData({
      data: osItem.data,
      hora: osItem.hora || '',
      horaExtra: osItem.horaExtra || '',
      os: osItem.os,
      clienteId: osItem.clienteId,
      solicitante: osItem.solicitante,
      motorista: osItem.motorista,
      veiculoId: osItem.veiculoId || '',
      centroCusto: osItem.centroCustoId || '',
      valorBruto: osItem.valorBruto,
      custo: osItem.custo,
      waypoints: osItem.rota?.waypoints?.length
        ? osItem.rota.waypoints.map((waypoint, index) => ({
            label: waypoint.label,
            lat: waypoint.lat ?? null,
            lng: waypoint.lng ?? null,
            passengers: (waypoint.passengers || []).map((passenger, passengerIndex) => ({
              id: passenger.id || `${osItem.id}-${index}-${passengerIndex}`,
              solicitanteId: passenger.solicitanteId || '',
              nome: passenger.nome || ''
            }))
          }))
        : initialForm.waypoints
    });
  };

  const handleViewOS = (osId: string) => {
    setViewingOSId(osId);
    setOpenActionMenuId(null);
  };

  const handleEditOS = (osId: string) => {
    const targetOS = osList.find(os => os.id === osId);
    if (!targetOS) return;

    hydrateFormFromOS(targetOS);
    setEditingOSId(osId);
    setIsModalOpen(true);
    setOpenActionMenuId(null);
  };

  const handleReopenOS = (osId: string) => {
    updateOSStatus(osId, { operacional: 'Pendente' });
    setOpenActionMenuId(null);
  };

  const handleCancelOS = (osId: string) => {
    setCancelTargetId(osId);
    setOpenActionMenuId(null);
  };

  const confirmCancelOS = () => {
    if (!cancelTargetId) return;
    updateOSStatus(cancelTargetId, { operacional: 'Cancelado' });
    setCancelTargetId(null);
  };

  useEffect(() => {
    if (!openActionMenuId) return;

    const handleClickOutside = (event: MouseEvent) => {
      const currentMenu = actionMenuRefs.current[openActionMenuId];
      if (currentMenu && !currentMenu.contains(event.target as Node)) {
        setOpenActionMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openActionMenuId]);

  const [formData, setFormData] = useState(initialForm);
  const initialQuickPassengerForm = {
    nomeCompleto: '',
    celular: '',
    rotulo: 'RESIDENCIAL',
    referencia: '',
    enderecoCompleto: '',
    notificar: 'Sim'
  };
  const [quickPassengerForm, setQuickPassengerForm] = useState(initialQuickPassengerForm);
  const [quickPassengerErrors, setQuickPassengerErrors] = useState<{ celular?: string }>({});
  const [isAddressExpanded, setIsAddressExpanded] = useState(false);
  const driverOptions = useMemo(() => {
    const baseOptions = drivers.filter(d => d.status !== 'inactive').map(d => ({
      id: d.name,
      nome: d.name
    }));

    const mergedOptions = [...quickAddedDriverOptions, ...baseOptions];
    const seen = new Set<string>();

    return mergedOptions.filter((option) => {
      if (seen.has(option.id)) return false;
      seen.add(option.id);
      return true;
    });
  }, [drivers, quickAddedDriverOptions]);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    const part1 = digits.slice(0, 2);
    const part2 = digits.slice(2, 7);
    const part3 = digits.slice(7, 11);

    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${part1}) ${part2}`;
    return `(${part1}) ${part2}-${part3}`;
  };

  // Auto-update trecho preview from waypoints
  const trechoPreview = useMemo(() => {
    const validWaypoints = formData.waypoints
      .map(w => w.label.trim())
      .filter(label => label !== '');
    
    if (validWaypoints.length < 2) return validWaypoints[0] || '';
    return validWaypoints.join(' x ');
  }, [formData.waypoints]);

  const viewingOS = useMemo(() => osList.find(os => os.id === viewingOSId) || null, [osList, viewingOSId]);
  const cancelTargetOS = useMemo(() => osList.find(os => os.id === cancelTargetId) || null, [osList, cancelTargetId]);

  const operationalPassengerList = useMemo(() => {
    if (!viewingOS?.rota?.waypoints) return [];

    return viewingOS.rota.waypoints.flatMap((waypoint, waypointIndex) =>
      (waypoint.passengers || []).map((passenger, passengerIndex) => {
        const passengerRecord = passageiros.find(p => p.id === passenger.solicitanteId);
        return {
          key: `${waypointIndex}-${passenger.id}-${passengerIndex}`,
          waypointLabel: waypoint.label,
          nome: passenger.nome || passengerRecord?.nomeCompleto || 'Passageiro não identificado',
          celular: passengerRecord?.celular || 'Não informado',
          email: passengerRecord?.email || 'Não informado',
          endereco: passengerRecord?.enderecos?.[0]?.enderecoCompleto || 'Não informado',
        };
      })
    );
  }, [viewingOS, passageiros]);

  const driverFlow = useMemo(() => {
    const status = viewingOS?.status.operacional;
    return {
      received: Boolean(viewingOS),
      accepted: status === 'Aguardando' || status === 'Em Rota' || status === 'Finalizado',
      started: status === 'Em Rota' || status === 'Finalizado',
      finished: status === 'Finalizado'
    };
  }, [viewingOS]);

  const handleSwapRoute = () => {
    setFormData(prev => ({
      ...prev,
      waypoints: [...prev.waypoints].reverse()
    }));
  };

  const handleAddWaypoint = () => {
    setFormData(prev => ({
      ...prev,
      waypoints: [...prev.waypoints, { label: '', lat: null, lng: null, passengers: [] }]
    }));
  };

  const handleRemoveWaypoint = (index: number) => {
    if (formData.waypoints.length <= 2) return;
    setFormData(prev => ({
      ...prev,
      waypoints: prev.waypoints.filter((_, i) => i !== index)
    }));
  };

  const handleWaypointChange = (index: number, value: string) => {
    const newWaypoints = [...formData.waypoints];
    newWaypoints[index] = { ...newWaypoints[index], label: value };
    setFormData(prev => ({
      ...prev,
      waypoints: newWaypoints
    }));
  };

  const handleAddPassenger = (waypointIndex: number) => {
    const newWaypoints = [...formData.waypoints];
    const waypoint = { ...newWaypoints[waypointIndex] };
    passengerDraftIdRef.current += 1;
    waypoint.passengers = [...(waypoint.passengers || []), { id: `draft-passenger-${passengerDraftIdRef.current}`, solicitanteId: '', nome: '' }];
    newWaypoints[waypointIndex] = waypoint;
    setFormData(prev => ({ ...prev, waypoints: newWaypoints }));
  };

  const handleRemovePassenger = (waypointIndex: number, passengerId: string) => {
    const newWaypoints = [...formData.waypoints];
    const waypoint = { ...newWaypoints[waypointIndex] };
    waypoint.passengers = (waypoint.passengers || []).filter((p) => p.id !== passengerId);
    newWaypoints[waypointIndex] = waypoint;
    setFormData(prev => ({ ...prev, waypoints: newWaypoints }));
  };

  const handlePassengerChange = (waypointIndex: number, passengerId: string, novoPassageiroId: string) => {
    const newWaypoints = [...formData.waypoints];
    const waypoint = { ...newWaypoints[waypointIndex] };
    const passageiroSelecionado = passageiros.find(p => p.id === novoPassageiroId);
    waypoint.passengers = (waypoint.passengers || []).map((p) => 
      p.id === passengerId ? { ...p, solicitanteId: novoPassageiroId, nome: passageiroSelecionado?.nomeCompleto || '' } : p
    );
    newWaypoints[waypointIndex] = waypoint;
    setFormData(prev => ({ ...prev, waypoints: newWaypoints }));
  };

  const getWaypointInfo = (waypointIndex: number) => {
    const totalWaypoints = formData.waypoints.length;
    const isFirst = waypointIndex === 0;
    const isLast = waypointIndex === totalWaypoints - 1;
    
    if (isFirst) {
      return {
        type: 'ORIGEM',
        color: 'emerald',
        bgColor: 'bg-emerald-50',
        textColor: 'text-emerald-600',
        borderColor: 'border-emerald-200',
        description: 'Ponto de partida'
      };
    } else if (isLast) {
      return {
        type: 'DESTINO FINAL',
        color: 'blue',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-600',
        borderColor: 'border-blue-200',
        description: 'Ponto de chegada'
      };
    } else {
      return {
        type: 'PARADA',
        color: 'slate',
        bgColor: 'bg-slate-50',
        textColor: 'text-slate-600',
        borderColor: 'border-slate-200',
        description: 'Parada intermediária'
      };
    }
  };

  const openQuickPassengerModal = (waypointIndex: number, passengerId: string) => {
    setQuickPassengerTarget({ waypointIndex, passengerId });
    setQuickPassengerForm(initialQuickPassengerForm);
    setQuickPassengerErrors({});
    setIsAddressExpanded(false);
    setIsQuickPassengerModalOpen(true);
  };

  
  const handleQuickAddMotorista = () => {
    setQuickAddModal('motorista');
    setQuickAddForm({ nome: '' });
    setQuickAddDriverForm(initialQuickAddDriverForm);
  };

  const handleQuickAddSolicitante = () => {
    if (!formData.clienteId) {
      toast.error('Selecione primeiro uma empresa/cliente');
      return;
    }
    setQuickAddModal('solicitante');
    setQuickAddForm({ nome: '' });
  };

  const handleQuickAddCentroCusto = () => {
    if (!formData.clienteId) {
      toast.error('Selecione primeiro uma empresa/cliente');
      return;
    }
    setQuickAddModal('centroCusto');
    setQuickAddForm({ nome: '' });
  };

  const handleQuickAddVeiculo = () => {
    if (!formData.motorista) {
      toast.error('Selecione primeiro o motorista.');
      return;
    }
    setOsVehicleQuickForm({ placa: '', modelo: '', marca: '', tipo: 'carro' });
    setIsOsVehicleQuickModalOpen(true);
  };

  const handleOsVehicleQuickSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const driver = drivers.find(d => d.name === formData.motorista);
    if (!driver) {
      toast.error('Motorista não encontrado no sistema.');
      return;
    }
    setIsSubmittingOsVehicle(true);
    try {
      if (!validarPlacaOS(osVehicleQuickForm.placa)) {
        throw new Error('Formato de placa inválido. Use ABC-1234 ou Mercosul ABC-1D23.');
      }
      const plateNorm = osVehicleQuickForm.placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      if (vehicles.some(v => v.placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === plateNorm)) {
        throw new Error('Já existe um veículo com esta placa.');
      }
      const { data: newV, error: vehicleError } = await supabase
        .from('veiculos')
        .insert([{
          placa: osVehicleQuickForm.placa.trim().toUpperCase(),
          modelo: osVehicleQuickForm.modelo.trim(),
          marca: osVehicleQuickForm.marca.trim(),
          tipo: osVehicleQuickForm.tipo,
          status: 'ativo',
          ano: new Date().getFullYear(),
          renavam: '',
        }])
        .select('id, placa, modelo, marca')
        .single();
      if (vehicleError) throw vehicleError;
      const { error: linkError } = await supabase
        .from('driver_vehicles')
        .insert([{ driver_id: driver.id, vehicle_id: newV.id }]);
      if (linkError) throw linkError;
      setVehicles(prev => [...prev, { ...newV }]);
      setDriverVehiclesAssoc(prev => [...prev, { driver_id: driver.id, vehicle_id: newV.id }]);
      setFormData(prev => ({ ...prev, veiculoId: newV.id }));
      toast.success('Veículo cadastrado e vinculado ao motorista!');
      setIsOsVehicleQuickModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar veículo.');
    } finally {
      setIsSubmittingOsVehicle(false);
    }
  };

  const closeQuickAddModal = () => {
    setQuickAddModal(null);
    setQuickAddForm({ nome: '' });
    setQuickAddDriverForm(initialQuickAddDriverForm);
  };

  const handleQuickAddSubmit = async () => {
    if (!quickAddModal) return;

    if (quickAddModal !== 'motorista' && !quickAddForm.nome.trim()) return;

    try {
      switch (quickAddModal) {
        case 'cliente': {
          const newCliente = await addCliente(quickAddForm.nome.trim());
          toast.success('Empresa cadastrada com sucesso!');
          // Selecionar automaticamente
          setFormData(prev => ({ ...prev, clienteId: newCliente.id, solicitante: '', centroCusto: '' }));
          break;
        }
                case 'motorista': {
          const name = quickAddDriverForm.name.trim();
          const cnhDigits = quickAddDriverForm.cnh.replace(/\D/g, '');
          const cpfDigits = quickAddDriverForm.cpf.replace(/\D/g, '');
          const celularDigits = quickAddDriverForm.celular.replace(/\D/g, '');

          if (!name) {
            toast.error('Nome completo é obrigatório.');
            return;
          }

          if (cnhDigits.length !== 11) {
            toast.error(`CNH deve ter exatamente 11 dígitos numéricos. Você informou ${cnhDigits.length} dígitos.`);
            return;
          }

          if (!validateDriverCPF(quickAddDriverForm.cpf)) {
            toast.error(`CPF deve ter exatamente 11 dígitos. Você informou ${cpfDigits.length} dígitos.`);
            return;
          }

          if (celularDigits.length !== 11) {
            toast.error(`Celular deve ter exatamente 11 dígitos. Você informou ${celularDigits.length} dígitos.`);
            return;
          }

          if (celularDigits[2] !== '9') {
            toast.error('Celular deve iniciar com 9 após o DDD. Ex: (11) 91234-5678');
            return;
          }

          if (quickAddDriverForm.vinculo_tipo === 'parceiro' && !quickAddDriverForm.parceiro_id) {
            toast.error('Selecione o parceiro de serviço primeiro.');
            return;
          }

          if (!quickAddDriverForm.vehicle_id) {
            toast.error('Selecione um veículo para o motorista.');
            return;
          }

          const duplicateName = drivers.some((driver) => normalizeTextValue(driver.name) === normalizeTextValue(name));
          const duplicateCpf = drivers.some((driver) => normalizeDigitsValue(driver.cpf || '') === cpfDigits);
          const duplicateCnh = drivers.some((driver) => normalizeDigitsValue(driver.cnh || '') === cnhDigits);
          const duplicatePhone = drivers.some((driver) => normalizeDigitsValue(driver.phone || '') === celularDigits);

          if (duplicateName) {
            toast.error('Já existe um motorista com este nome.');
            return;
          }

          if (duplicateCpf) {
            toast.error('Já existe um motorista com este CPF.');
            return;
          }

          if (duplicateCnh) {
            toast.error('Já existe um motorista com esta CNH.');
            return;
          }

          if (duplicatePhone) {
            toast.error('Já existe um motorista com este celular.');
            return;
          }

          const insertData: Record<string, unknown> = {
            name,
            cpf: cpfDigits,
            cnh: cnhDigits,
            phone: celularDigits,
            vehicle_id: quickAddDriverForm.vehicle_id,
            status: 'active',
            vinculo_tipo: quickAddDriverForm.vinculo_tipo,
          };

          if (quickAddDriverForm.vinculo_tipo === 'parceiro') {
            insertData.parceiro_id = quickAddDriverForm.parceiro_id;
          }

          const { data, error } = await supabase
            .from('drivers')
            .insert([insertData])
            .select('id, name')
            .single();

          if (error) throw error;

          toast.success('Motorista cadastrado com sucesso!');
          if (data) {
            setQuickAddedDriverOptions((prev) => {
              if (prev.some((option) => option.id === data.id)) return prev;
              return [...prev, { id: data.id, nome: data.name }];
            });
            setFormData((prev) => ({ ...prev, motorista: data.name }));
          }
          void refreshData();
          break;
        }
        case 'solicitante': {
          const cleanName = quickAddForm.nome.trim();
          const duplicateSolicitante = availableSolicitantes.some(
            (solicitante) => normalizeTextValue(solicitante.nome) === normalizeTextValue(cleanName)
          );

          if (duplicateSolicitante) {
            toast.error('Já existe um solicitante com este nome para esta empresa.');
            return;
          }

          const newSolicitante = await addSolicitante(cleanName, formData.clienteId);
          toast.success('Solicitante cadastrado com sucesso!');
          setQuickAddedSolicitantes((prev) => {
            if (prev.some((item) => item.id === newSolicitante.id)) return prev;
            return [...prev, { id: newSolicitante.id, nome: newSolicitante.nome, clienteId: newSolicitante.clienteId }];
          });
          // Selecionar automaticamente
          setFormData(prev => ({ ...prev, solicitante: newSolicitante.nome }));
          break;
        }
        case 'centroCusto': {
          const cleanName = quickAddForm.nome.trim();
          const duplicateCentroCusto = availableCentrosCusto.some(
            (centroCusto) => normalizeTextValue(centroCusto.nome) === normalizeTextValue(cleanName)
          );

          if (duplicateCentroCusto) {
            toast.error('Já existe um centro de custo com este nome para esta empresa.');
            return;
          }

          const newCentroCusto = await addCentroCusto(cleanName, formData.clienteId);
          toast.success('Centro de custo cadastrado com sucesso!');
          setQuickAddedCentrosCusto((prev) => {
            if (prev.some((item) => item.id === newCentroCusto.id)) return prev;
            return [...prev, { id: newCentroCusto.id, nome: newCentroCusto.nome, clienteId: newCentroCusto.clienteId }];
          });
          // Selecionar automaticamente
          setFormData(prev => ({ ...prev, centroCusto: newCentroCusto.id }));
          break;
        }
      }
      closeQuickAddModal();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao cadastrar');
    }
  };

  const filteredQuickAddVehicles = useMemo(() => {
    // Como não há coluna proprietario_tipo, mostrar todos os veículos ativos
    return vehicles;
  }, [vehicles]);

  const handleQuickPassengerSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!quickPassengerTarget) return;

    const trimmedNome = quickPassengerForm.nomeCompleto.trim();
    const trimmedEndereco = quickPassengerForm.enderecoCompleto.trim();
    const phoneDigits = quickPassengerForm.celular.replace(/\D/g, '');

    const errors: { celular?: string } = {};
    if (phoneDigits.length !== 11) {
      errors.celular = 'Informe os 11 dígitos do celular';
    }

    if (!trimmedNome || !trimmedEndereco || Object.keys(errors).length > 0) {
      setQuickPassengerErrors(errors);
      return;
    }

    try {
      const novoPassageiro = await addPassageiro({
        nomeCompleto: trimmedNome,
        celular: quickPassengerForm.celular.trim(),
        notificar: quickPassengerForm.notificar === 'Sim',
        enderecos: [
          {
            rotulo: quickPassengerForm.rotulo.trim(),
            referencia: quickPassengerForm.referencia.trim(),
            enderecoCompleto: trimmedEndereco
          }
        ]
      });

      const newWaypoints = [...formData.waypoints];
      const waypoint = { ...newWaypoints[quickPassengerTarget.waypointIndex] };
      waypoint.passengers = (waypoint.passengers || []).map((p) =>
        p.id === quickPassengerTarget.passengerId
          ? { ...p, solicitanteId: novoPassageiro.id, nome: novoPassageiro.nomeCompleto }
          : p
      );
      newWaypoints[quickPassengerTarget.waypointIndex] = waypoint;
      setFormData(prev => ({ ...prev, waypoints: newWaypoints }));

      setIsQuickPassengerModalOpen(false);
      setQuickPassengerTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o passageiro.');
    }
  };

  const handleAddOS = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação dos campos obrigatórios
    if (!formData.data || !formData.clienteId || !formData.motorista || !formData.veiculoId ||
        !formData.valorBruto || formData.custo === undefined) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    
    if (formData.valorBruto <= 0 || formData.custo < 0) {
      toast.error('Valores inválidos. Verifique os campos financeiros.');
      return;
    }
    
    const finalData = {
      ...formData,
      trecho: trechoPreview,
      rota: { waypoints: formData.waypoints }
    };

    if (editingOSId) {
      updateOS(editingOSId, finalData);
      resetMainModalState();
      return;
    }

    try {
      addOS(finalData);
      resetMainModalState();
    } catch (error) {
      console.error('Error in handleAddOS:', error);
      toast.error(error instanceof Error ? error.message : 'Não foi possível criar a ordem de serviço.');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const currentImposto = formData.valorBruto * 0.15;
  const currentLucro = formData.valorBruto - currentImposto - formData.custo;

  const availableSolicitantes = useMemo(() => {
    if (!formData.clienteId) return [];
    const mergedSolicitantes = [
      ...solicitantes.filter((s) => s.clienteId === formData.clienteId),
      ...quickAddedSolicitantes.filter((s) => s.clienteId === formData.clienteId),
    ];
    const seenIds = new Set<string>();

    return mergedSolicitantes.filter((item) => {
      if (seenIds.has(item.id)) return false;
      seenIds.add(item.id);
      return true;
    });
  }, [formData.clienteId, solicitantes, quickAddedSolicitantes]);

  const selectedDriverVehicleOptions = useMemo(() => {
    if (!formData.motorista) return [];
    const driver = drivers.find(d => d.name === formData.motorista);
    if (!driver) return [];
    const vehicleIds = new Set(
      driverVehiclesAssoc
        .filter(dv => dv.driver_id === driver.id)
        .map(dv => dv.vehicle_id)
    );
    return vehicles
      .filter(v => vehicleIds.has(v.id))
      .map(v => ({ id: v.id, nome: `${v.marca} ${v.modelo} - ${v.placa}` }));
  }, [drivers, formData.motorista, driverVehiclesAssoc, vehicles]);

  const availableCentrosCusto = useMemo(() => {
    if (!formData.clienteId) return [];
    const mergedCentrosCusto = [
      ...getCentrosCustoByCliente(formData.clienteId),
      ...quickAddedCentrosCusto.filter((cc) => cc.clienteId === formData.clienteId),
    ];
    const seenIds = new Set<string>();

    return mergedCentrosCusto.filter((item) => {
      if (seenIds.has(item.id)) return false;
      seenIds.add(item.id);
      return true;
    });
  }, [formData.clienteId, getCentrosCustoByCliente, quickAddedCentrosCusto]);

  const handleClienteChange = (id: string) => {
    setFormData(prev => ({
      ...prev,
      clienteId: id,
      solicitante: '',
      centroCusto: ''
    }));
  };

  const filteredData = useMemo(() => {
    return osList.filter(item => {
      const clienteNome = clientes.find(c => c.id === item.clienteId)?.nome || '';
      const matchSearch = searchTerm === '' || 
        item.os.includes(searchTerm) || 
        clienteNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.trecho.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [osList, searchTerm, clientes]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'horaExtra') {
      // Permitir apenas dígitos
      const numericValue = value.replace(/\D/g, '');
      setFormData(prev => ({ ...prev, [name]: numericValue }));
      return;
    }

    if (name === 'hora') {
      let cleanValue = value.replace(/\D/g, '');
      if (cleanValue.length > 4) cleanValue = cleanValue.slice(0, 4);

      let hours = cleanValue.slice(0, 2);
      let minutes = cleanValue.slice(2, 4);

      if (hours && parseInt(hours) > 23) hours = '23';
      if (minutes && parseInt(minutes) > 59) minutes = '59';

      let formatted = hours;
      if (minutes) {
        formatted = `${hours}:${minutes}`;
      } else if (hours.length === 2 && cleanValue.length > 2) {
        formatted = `${hours}:`;
      }

      setFormData(prev => ({ ...prev, hora: formatted }));
      return;
    }
    
    if (name === 'data') {
      // Máscara DD/MM/AAAA
      let cleanValue = value.replace(/\D/g, '');
      if (cleanValue.length > 8) cleanValue = cleanValue.slice(0, 8);
      
      // Validações de valores
      let day = cleanValue.slice(0, 2);
      let month = cleanValue.slice(2, 4);
      let year = cleanValue.slice(4, 8);

      if (day && parseInt(day) > 31) day = '31';
      if (month && parseInt(month) > 12) month = '12';
      if (year && parseInt(year) > 5000) year = '5000';

      const validatedClean = day + month + year;
      
      let formatted = validatedClean;
      if (validatedClean.length > 2) formatted = `${validatedClean.slice(0, 2)}/${validatedClean.slice(2)}`;
      if (validatedClean.length > 4) formatted = `${validatedClean.slice(0, 2)}/${validatedClean.slice(2, 4)}/${validatedClean.slice(4)}`;
      
      if (validatedClean.length === 8) {
        const d = validatedClean.slice(0, 2);
        const m = validatedClean.slice(2, 4);
        const y = validatedClean.slice(4);
        setFormData(prev => ({ ...prev, data: `${y}-${m}-${d}` }));
      } else {
        setFormData(prev => ({ ...prev, data: formatted }));
      }
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: name === 'valorBruto' || name === 'custo' ? parseFloat(value) || 0 : value
    }));
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Pendente':
        return {
          icon: <Clock size={20} />,
          bg: 'bg-slate-50/50',
          border: 'border-slate-100',
          accent: 'bg-slate-500',
          shadow: 'shadow-slate-200',
          text: 'text-slate-700',
          label: 'Pendente'
        };
      case 'Aguardando': 
        return {
          icon: <Clock size={20} />,
          bg: 'bg-indigo-50/50',
          border: 'border-indigo-100',
          accent: 'bg-indigo-500',
          shadow: 'shadow-indigo-200',
          text: 'text-indigo-700',
          label: 'Aguardando'
        };
      case 'Em Rota': 
        return {
          icon: <Navigation size={20} />,
          bg: 'bg-blue-50/50',
          border: 'border-blue-100',
          accent: 'bg-blue-500',
          shadow: 'shadow-blue-200',
          text: 'text-blue-700',
          label: 'Em Rota'
        };
      case 'Finalizado': 
        return {
          icon: <CheckCircle2 size={20} />,
          bg: 'bg-emerald-50/50',
          border: 'border-emerald-100',
          accent: 'bg-emerald-500',
          shadow: 'shadow-emerald-200',
          text: 'text-emerald-700',
          label: 'Finalizado'
        };
      case 'Cancelado':
        return {
          icon: <X size={20} />,
          bg: 'bg-rose-50/50',
          border: 'border-rose-100',
          accent: 'bg-rose-500',
          shadow: 'shadow-rose-200',
          text: 'text-rose-700',
          label: 'Cancelado'
        };
      default: 
        return {
          icon: <FileText size={20} />,
          bg: 'bg-slate-50/50',
          border: 'border-slate-100',
          accent: 'bg-slate-500',
          shadow: 'shadow-slate-200',
          text: 'text-slate-700',
          label: 'N/A'
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Operational Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <OpStatCard label="Pendentes" value={osList.filter(o => o.status.operacional === 'Pendente').length} icon={<Clock className="text-slate-500" size={20} />} />
        <OpStatCard label="Aguardando" value={osList.filter(o => o.status.operacional === 'Aguardando').length} icon={<Clock className="text-indigo-500" size={20} />} />
        <OpStatCard label="Em Rota" value={osList.filter(o => o.status.operacional === 'Em Rota').length} icon={<Navigation className="text-blue-500" size={20} />} />
        <OpStatCard label="Finalizados" value={osList.filter(o => o.status.operacional === 'Finalizado').length} icon={<CheckCircle2 className="text-emerald-500" size={20} />} />
      </div>

      {/* Header com Toggle e Botão Nova OS */}
      <div className={`flex flex-col md:flex-row gap-3 items-stretch md:items-center ${viewMode === 'calendar' ? 'md:justify-end' : ''}`}>
        {/* Campo de busca (apenas em modo tabela) */}
        {viewMode === 'table' && (
          <div className="relative group flex-1">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.3-4.3"></path>
            </svg>
            <input
              type="text"
              placeholder="Pesquisar por Motorista, Trecho ou OS..."
              className="w-full pl-12 pr-6 py-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 font-bold text-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}

        {/* Toggle Tabela/Calendário */}
        <div className={`flex items-center bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm shrink-0 ${viewMode === 'calendar' ? 'md:ml-0' : ''}`}>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm uppercase tracking-widest transition-all cursor-pointer ${
              viewMode === 'table'
                ? 'bg-[var(--color-geolog-blue)] text-white shadow-md'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <LayoutGrid size={16} strokeWidth={2.5} />
            Tabela
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm uppercase tracking-widest transition-all cursor-pointer ${
              viewMode === 'calendar'
                ? 'bg-[var(--color-geolog-blue)] text-white shadow-md'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <CalendarDays size={16} strokeWidth={2.5} />
            Calendário
          </button>
        </div>

        {/* Botão Nova OS */}
        <button 
          onClick={handleOpenCreateOSModal}
          className="flex items-center justify-center gap-2 bg-[var(--color-geolog-blue)] text-white px-8 py-3.5 rounded-2xl font-black shadow-lg shadow-blue-900/10 hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-widest shrink-0 w-full md:w-auto cursor-pointer whitespace-nowrap"
        >
          <Plus size={18} strokeWidth={3} />
          Nova OS
        </button>
      </div>

      {/* Conteúdo: Tabela ou Calendário */}
      {viewMode === 'table' ? (
        <DataTable
          data={filteredData}
          columns={[
            {
              key: 'protocolo',
              title: 'Protocolo',
              render: (value: unknown, item: OrderService) => {
                void value;

                return (
                <div className="space-y-1">
                  <p className="font-black text-base text-slate-800 tracking-tight">{item.protocolo}</p>
                  <p className="text-sm font-semibold text-slate-400">{item.data.split('-').reverse().join('/')}</p>
                </div>
                );
              }
            },
            {
              key: 'os',
              title: 'OS',
              render: (value: unknown, item: OrderService) => {
                void value;

                return (
                <p className="font-black text-base text-slate-700">{item.os || '—'}</p>
                );
              }
            },
            {
              key: 'cliente',
              title: 'Cliente',
              width: '280px',
              render: (value: unknown, item: OrderService) => {
                void value;

                const clienteNome = clientes.find(c => c.id === item.clienteId)?.nome || 'N/A';
                return (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                    <Building size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-700">{clienteNome}</p>
                  </div>
                </div>
                );
              }
            },
            {
              key: 'trecho',
              title: 'Itinerário',
              width: '160px',
              render: (value: unknown, item: OrderService) => {
                void value;
                const waypointCount = item.rota?.waypoints?.filter((waypoint) => waypoint.label.trim() !== '').length ?? 0;
                const stopCount = waypointCount > 1 ? waypointCount - 2 : 0;
                const displayCount = waypointCount > 0 ? waypointCount : 1;
                
                return (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-lg">
                      <Navigation size={13} className="text-blue-600" />
                      <span className="text-sm font-extrabold text-blue-700">{displayCount}</span>
                    </div>
                    <span className="text-base font-medium text-slate-500">
                      {waypointCount <= 1 ? 'Direto' : stopCount === 1 ? '1 parada' : `${stopCount} paradas`}
                    </span>
                  </div>
                );
              }
            },
            {
              key: 'passageiros',
              title: 'Passageiros',
              width: '120px',
              align: 'center',
              render: (value: unknown, item: OrderService) => {
                void value;
                const passengerCount = item.rota?.waypoints?.reduce((total, waypoint) => {
                  return total + (waypoint.passengers?.length ?? 0);
                }, 0) ?? 0;
                
                return (
                  <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-xl border border-emerald-100">
                    <Users size={14} className="text-emerald-600" />
                    <span className="text-sm font-bold text-emerald-700">{passengerCount}</span>
                  </div>
                );
              }
            },
            {
              key: 'motorista',
              title: 'Motorista',
              width: '240px',
              render: (value: unknown, item: OrderService) => {
                void value;

                return (
                <div className="flex items-center gap-3">
                  <User size={14} className="text-blue-500" />
                  <span className="text-base font-bold">{String(item.motorista)}</span>
                </div>
              )
              }
            },
            {
              key: 'status',
              title: 'Status',
              align: 'center',
              width: '140px',
              render: (value: unknown, item: OrderService) => {
                void value;

                const config = getStatusConfig(item.status.operacional);
                return (
                  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs md:text-sm font-bold uppercase tracking-wide border ${config.bg} ${config.border} ${config.text}`}>
                    {config.icon}
                    {config.label}
                  </span>
                );
              }
            },
            {
              key: 'acoes',
              title: 'Ações',
              align: 'center',
              render: (value: unknown, item: OrderService) => {
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
                      setOpenActionMenuId((prev) => (prev === item.id ? null : item.id));
                    }}
                    className="inline-flex items-center justify-center w-10 h-10 rounded-2xl border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                    aria-haspopup="true"
                    aria-expanded={openActionMenuId === item.id}
                  >
                    <MoreVertical size={18} />
                  </button>
                  {openActionMenuId === item.id && (() => {
                    const rect = actionMenuRefs.current[item.id]?.getBoundingClientRect();
                    if (!rect) return null;
                    return (
                      <div 
                        className="fixed min-w-[200px] bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 space-y-1 z-[9999]"
                        style={{
                          top: rect.bottom + 8,
                          right: window.innerWidth - rect.right
                        }}
                      >
                        <button
                          onClick={() => handleViewOS(item.id)}
                          className="w-full px-4 py-2 text-left text-sm font-bold text-slate-700 rounded-xl hover:bg-slate-50 flex items-center gap-3 cursor-pointer"
                        >
                          <Eye size={16} className="text-slate-400" />
                          Visualizar
                        </button>
                        <button
                          onClick={() => handleEditOS(item.id)}
                          className="w-full px-4 py-2 text-left text-sm font-bold text-blue-600 rounded-xl hover:bg-blue-50 flex items-center gap-3 cursor-pointer"
                        >
                          <Pencil size={16} className="text-blue-400" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleReopenOS(item.id)}
                          className="w-full px-4 py-2 text-left text-sm font-bold text-emerald-600 rounded-xl hover:bg-emerald-50 flex items-center gap-3 cursor-pointer"
                        >
                          <RotateCcw size={16} className="text-emerald-400" />
                          Reabrir
                        </button>
                        <button
                          onClick={() => handleCancelOS(item.id)}
                          className="w-full px-4 py-2 text-left text-sm font-bold text-rose-600 rounded-xl hover:bg-rose-50 flex items-center gap-3 cursor-pointer"
                        >
                          <XOctagon size={16} className="text-rose-400" />
                          Cancelar
                        </button>
                      </div>
                    );
                  })()}
                </div>
                );
              }
            }
          ]}
          searchTerm=""
          onSearchChange={undefined}
          searchPlaceholder=""
          emptyMessage="Nenhuma OS encontrada."
          emptyIcon={<Truck size={48} />}
          showHeader={false}
        />
      ) : (
        <OSCalendar 
          osList={filteredData} 
          clientes={clientes}
          onEventClick={(osId: string) => handleViewOS(osId)}
        />
      )}

      {/* Modal Nova OS */}
      {isModalOpen && (
        <StandardModal
          onClose={resetMainModalState}
          title={editingOSId ? 'Editar Atendimento' : 'Novo Atendimento'}
          subtitle={editingOSId ? 'Atualização operacional Geolog' : 'Fluxo Operacional Geolog'}
          icon={editingOSId ? <Pencil className="w-6 h-6 md:w-7 md:h-7" /> : <PlusCircle className="w-6 h-6 md:w-7 md:h-7" />}
          maxWidthClassName="max-w-7xl"
          bodyClassName="p-6 md:p-10 pb-80 space-y-12"
          footer={
            <div className="p-8 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-5 shrink-0">
              <button
                type="button"
                onClick={resetMainModalState}
                className="px-6 py-4 text-slate-600 font-bold hover:text-slate-900 transition-colors text-sm uppercase tracking-widest cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="nova-os-form"
                className="px-12 py-4 bg-[var(--color-geolog-blue)] text-white font-black rounded-xl shadow-xl shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-widest cursor-pointer"
              >
                {editingOSId ? 'Salvar Alterações' : 'Confirmar OS'}
              </button>
            </div>
          }
        >
            <form id="nova-os-form" onSubmit={handleAddOS} className="min-h-0 relative">
               <div className="space-y-12" style={{ paddingTop: '0.5rem', paddingBottom: '2rem' }}>
                  
                  {/* 1. DETALHES DA EXECUÇÃO */}
                  <div className="space-y-8">
                     <div className="flex items-center border-b-2 border-slate-100 pb-4" style={{ paddingBottom: '1.25rem' }}>
                        <h3 className="text-[17px] font-black text-slate-900 uppercase tracking-[0.1em] flex items-center gap-3" style={{ lineHeight: '1.3' }}>
                          <Clock size={20} className="text-slate-500" /> Detalhes da Execução
                        </h3>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2.5">
                           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div className="relative space-y-1.5">
                                 <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-1 mt-2">Data <span className="text-rose-300 text-base">*</span></label>
                                 <input 
                                   type="text" 
                                   name="data" 
                                   required 
                                   value={formData.data.includes('-') ? formData.data.split('-').reverse().join('/') : formData.data} 
                                   onChange={handleInputChange} 
                                   placeholder="DD/MM/AAAA"
                                   className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm" 
                                 />
                                 <Calendar size={18} className="absolute right-5 top-1/2 text-slate-300 pointer-events-none" style={{ transform: 'translateY(15%)' }} />
                              </div>
                              <div className="space-y-1.5">
                                 <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-1 mt-2">Hora <span className="text-rose-300 text-base">*</span></label>
                                 <input 
                                   type="text" 
                                   name="hora" 
                                   value={formData.hora} 
                                   onChange={handleInputChange} 
                                   placeholder="HH:MM"
                                   maxLength={5}
                                   className="w-full px-6 py-4 bg-white border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm tracking-[0.2em] font-mono" 
                                 />
                              </div>
                              <div className="space-y-1.5">
                                 <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2 mt-[10px]">OS <span className="text-slate-400 text-xs font-normal normal-case tracking-normal">Opcional</span></label>
                                 <input 
                                   type="text" 
                                   name="os" 
                                   value={formData.os} 
                                   onChange={handleInputChange} 
                                   placeholder="Ex: 9988" 
                                   className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all uppercase placeholder:text-slate-300 shadow-sm" 
                                 />
                              </div>
                           </div>
                        </div>
                       <div className="space-y-2.5">
                          <GeologSearchableSelect 
                             label="Empresa / Cliente Final" 
                             options={clientes} 
                             value={formData.clienteId} 
                             onChange={handleClienteChange} 
                             required
                             className="mt-1"
                          />
                       </div>
                    </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <GeologSearchableSelect 
                           label="Solicitante Responsável" 
                           options={availableSolicitantes.map(s => ({ id: s.id, nome: s.nome }))} 
                           value={availableSolicitantes.find(s => s.nome === formData.solicitante)?.id || ''} 
                           onChange={(id) => { 
                             const opt = availableSolicitantes.find(s => s.id === id); 
                             setFormData(prev => ({ ...prev, solicitante: opt?.nome || '' })); 
                           }} 
                           disabled={!formData.clienteId} 
                           required
                           onQuickAdd={handleQuickAddSolicitante}
                        />
                        <GeologSearchableSelect 
                           label="Centro de Custo" 
                           options={availableCentrosCusto.map(c => ({ id: c.id, nome: c.nome }))} 
                           value={availableCentrosCusto.find(c => c.id === formData.centroCusto)?.id || ''} 
                           onChange={(id) => { 
                             setFormData(prev => ({ ...prev, centroCusto: id })); 
                           }} 
                           disabled={!formData.clienteId}
                           required
                           onQuickAdd={handleQuickAddCentroCusto}
                        />
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <GeologSearchableSelect 
                           label="Motorista Alocado" 
                           options={driverOptions} 
                           value={formData.motorista || ''} 
                           onChange={(id) => { 
                             const opt = driverOptions.find(m => m.id === id); 
                             setFormData(prev => ({ ...prev, motorista: opt?.nome || '', veiculoId: '' })); 
                           }} 
                           required
                           onQuickAdd={handleQuickAddMotorista}
                        />
                        <GeologSearchableSelect
                           label="Veículo de Uso"
                           options={selectedDriverVehicleOptions}
                           value={formData.veiculoId}
                           onChange={(id) => setFormData(prev => ({ ...prev, veiculoId: id }))}
                           required
                           disabled={!formData.motorista}
                           onQuickAdd={handleQuickAddVeiculo}
                        />
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     </div>
                  </div>

                  {/* 2. ITINERÁRIO */}
                  {/* 2. ITINERÁRIO DINÂMICO */}
                  <div className="space-y-8">
                     <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4" style={{ paddingBottom: '1.25rem' }}>
                        <h3 className="text-[17px] font-black text-slate-900 uppercase tracking-[0.1em] flex items-center gap-2" style={{ lineHeight: '1.3' }}>
                          <MapPin size={20} className="text-blue-600" /> Itinerário / Paradas
                        </h3>
                        <div className="flex gap-2">
                           <button type="button" onClick={handleSwapRoute} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all shadow-sm cursor-pointer">
                              <ArrowRightLeft size={16} /> Inverter
                           </button>
                           <button type="button" onClick={handleAddWaypoint} className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-200 transition-all shadow-sm cursor-pointer">
                              <Plus size={16} /> Adicionar Parada
                           </button>
                        </div>
                     </div>

                     <div className="relative pl-8 space-y-6">
                        {formData.waypoints.map((waypoint, index) => (
                           <div key={index} className="relative group">
                              {index < formData.waypoints.length - 1 && (
                                <div className="absolute -left-[1.125rem] top-8 -bottom-6 w-0.5 bg-slate-300" />
                              )}
                              {index === formData.waypoints.length - 1 && (waypoint.passengers?.length || 0) > 0 && (
                                <div 
                                  className="absolute -left-[1.125rem] top-8 w-0.5 bg-slate-300" 
                                  style={{ 
                                    height: `calc(100% - ${waypoint.passengers.length === 1 ? '94px' : waypoint.passengers.length === 2 ? '70px' : waypoint.passengers.length === 3 ? '82px' : '94px'})` 
                                  }}
                                />
                              )}
                              {/* Timeline Dot (Círculo) */}
                              <div className={`absolute -left-[1.625rem] top-2 w-4 h-4 rounded-full border-4 border-white shadow-sm ring-2 z-10 ${index === 0 ? 'bg-emerald-500 ring-emerald-100' : index === formData.waypoints.length - 1 ? 'bg-blue-600 ring-blue-100' : 'bg-slate-400 ring-slate-100'}`} />
                              
                              <div className="flex items-start gap-4">
                                 <div className="flex-1 space-y-4">
                                    <div className="flex items-end gap-4">
                                       <div className="flex-1 space-y-3">
                                          <label className="block text-[10px] font-black uppercase tracking-[0.25em] ml-1 mb-2">
                                             <div className={`inline-flex items-stretch rounded-xl overflow-hidden shadow-sm border text-[10px] md:text-[11px] ${index === 0 ? 'bg-emerald-500 border-emerald-400 text-white' : index === formData.waypoints.length - 1 ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                                                <span className={`px-3 py-1.5 flex items-center justify-center font-black text-sm ${index === 0 ? 'bg-emerald-600' : index === formData.waypoints.length - 1 ? 'bg-blue-700' : 'bg-slate-200 text-slate-700'}`}>
                                                   {index + 1}°
                                                </span>
                                                <span className="px-4 py-1.5 font-black tracking-wide text-[11px]">
                                                   {index === 0 ? 'ORIGEM' : index === formData.waypoints.length - 1 ? 'DESTINO FINAL' : 'PARADA INTERMEDIÁRIA'}
                                                </span>
                                             </div>
                                          </label>
                                          <div className="relative">
                                             <input 
                                                type="text" 
                                                required 
                                                value={waypoint.label} 
                                                onChange={(e) => handleWaypointChange(index, e.target.value)} 
                                                placeholder={index === 0 ? "Ex: Hotel H/Niterói" : "Próximo destino..."} 
                                                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm pr-12"
                                             />
                                             <MapPin size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" />
                                          </div>
                                       </div>
                                       
                                       <div className="flex items-center gap-2 mb-1 self-end">
                                          <button 
                                             type="button" 
                                             onClick={() => handleAddPassenger(index)}
                                             className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center shadow-sm border border-blue-100 cursor-pointer"
                                             title="Adicionar Passageiro"
                                          >
                                             <Plus size={20} />
                                          </button>
                                          {formData.waypoints.length > 2 && (
                                             <button 
                                                type="button" 
                                                onClick={() => handleRemoveWaypoint(index)}
                                                className="p-3 bg-red-50 text-red-400 rounded-xl hover:bg-red-100 transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center shadow-sm border border-red-100 cursor-pointer"
                                                title="Remover Parada"
                                             >
                                                <X size={20} />
                                             </button>
                                          )}
                                       </div>
                                    </div>

                                    {/* Linhas de Passageiros */}
                                    {waypoint.passengers && waypoint.passengers.length > 0 && (
                                       <div className="mt-4 border-t border-dashed border-slate-200">
                                          {waypoint.passengers.map((passenger, passengerIndex) => (
                                             <div key={passenger.id} className={`relative flex items-center gap-4 group/pass ${passengerIndex === 0 ? 'mt-6' : 'mt-5'} ${passengerIndex === waypoint.passengers.length - 1 ? 'mb-10' : 'mb-5'}`}>
                                                {/* Linha horizontal da trilha - começa na linha vertical */}
                                                <div className="absolute -left-[1.125rem] top-1/2 -translate-y-1/2 w-12 h-0.5 bg-slate-300 z-10" />
                                                
                                                {/* Trilhas de passageiro (quadrado) - no final da linha */}
                                                <div className={`absolute left-[1.375rem] top-1/2 -translate-y-1/2 w-4 h-4 rounded-sm border-4 border-white shadow-sm ring-2 z-20 ${index === 0 ? 'bg-emerald-500 ring-emerald-100' : index === formData.waypoints.length - 1 ? 'bg-blue-600 ring-blue-100' : 'bg-slate-400 ring-slate-100'}`} />
                                                
                                                <div className="flex-1 flex items-center gap-3 ml-8">
                                                   <div className="w-3/5 ml-6">
                                                      <div className="flex items-center gap-3">
                                                        <div className="flex-1">
                                                          <GeologSearchableSelect 
                                                             label=""
                                                             placeholder="Selecione o passageiro..."
                                                             options={passageiros.map(p => ({ 
                                                               id: p.id, 
                                                               nome: p.nomeCompleto,
                                                               sublabel: p.enderecos?.[0]?.rotulo || undefined
                                                             }))}
                                                             value={passenger.solicitanteId || ''}
                                                             onChange={(val) => handlePassengerChange(index, passenger.id, val)}
                                                          />
                                                        </div>
                                                        <div className="flex items-center justify-center h-[56px]">
                                                          <button
                                                            type="button"
                                                            onClick={() => openQuickPassengerModal(index, passenger.id)}
                                                            className="p-3 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-all opacity-0 group-hover/pass:opacity-100 flex items-center justify-center shadow-sm border border-blue-200 cursor-pointer"
                                                            style={{ marginBottom: '-5px' }}
                                                            title="Cadastrar passageiro"
                                                          >
                                                            <PlusCircle size={18} />
                                                          </button>
                                                        </div>
                                                      </div>
                                                   </div>
                                                   <div className="flex items-center justify-center h-[56px]">
                                                     <button
                                                        type="button"
                                                        onClick={() => handleRemovePassenger(index, passenger.id)}
                                                        className="p-3 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover/pass:opacity-100 cursor-pointer"
                                                        style={{ marginBottom: '-5px' }}
                                                        title="Remover Passageiro"
                                                     >
                                                        <X size={18} />
                                                     </button>
                                                   </div>
                                                </div>
                                             </div>
                                          ))}
                                       </div>
                                    )}
                                 </div>
                              </div>
                           </div>
                        ))}
                     </div>

                     <div className="p-6 bg-blue-50/70 rounded-2xl border-2 border-blue-100/50 shadow-inner">
                        <div className="flex items-center gap-3 mb-2">
                           <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                           <span className="text-[10px] font-black text-blue-600/80 uppercase tracking-[0.15em]">Visualização do Trecho Consolidado</span>
                        </div>
                        <p className="text-xl font-black text-slate-900 tracking-tight leading-none uppercase">
                          {trechoPreview || 'Aguardando definição do itinerário...'}
                        </p>
                     </div>
                  </div>

                  {/* 3. RESUMO FINANCEIRO */}
                  <div className="space-y-8">
                     <div className="flex items-center border-b-2 border-slate-100 pb-4">
                        <h3 className="text-[17px] font-black text-slate-900 uppercase tracking-[0.1em] flex items-center gap-3">
                          <FileText size={20} className="text-emerald-600" /> Resumo Financeiro
                        </h3>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                        <div className="flex flex-col gap-2">
                           <label className="text-sm font-bold text-slate-800 uppercase tracking-tight ml-1">Valor Bruto (R$)</label>
                           <div className="relative">
                              <input 
                                type="number" 
                                name="valorBruto" 
                                step="0.01" 
                                value={formData.valorBruto || ''} 
                                onChange={handleInputChange} 
                                className="w-full bg-slate-50 border-2 border-slate-200 px-6 h-[58px] rounded-xl font-bold text-lg text-blue-700 outline-none tabular-nums focus:bg-white focus:border-blue-600 transition-all shadow-sm" 
                              />
                           </div>
                        </div>

                        <div className="flex flex-col gap-2">
                           <label className="text-sm font-bold text-slate-800 uppercase tracking-tight ml-1">Custo Motorista (R$)</label>
                           <div className="relative">
                              <input 
                                type="number" 
                                name="custo" 
                                step="0.01" 
                                value={formData.custo || ''} 
                                onChange={handleInputChange} 
                                className="w-full bg-slate-50 border-2 border-slate-200 px-6 h-[58px] rounded-xl font-bold text-lg text-red-500 outline-none tabular-nums focus:bg-white focus:border-red-300 transition-all shadow-sm" 
                              />
                           </div>
                        </div>

                        <div className="flex flex-col gap-2">
                           <label className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Hora Extra</label>
                           <div className="relative">
                              <input 
                                type="time" 
                                name="horaExtra" 
                                value={formData.horaExtra} 
                                disabled
                                placeholder="Aguardando"
                                className="w-full lg:max-w-[10rem] px-6 h-[58px] bg-slate-100 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-400 outline-none cursor-not-allowed" 
                              />
                           </div>
                        </div>
                     </div>

                     <div className={`p-8 md:p-10 rounded-[2.5rem] ${currentLucro >= 0 ? 'bg-emerald-600 shadow-emerald-900/10' : 'bg-red-600 shadow-red-900/10'} text-white shadow-2xl transition-all duration-500`}>
                        <div className="flex justify-between items-center">
                           <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                 <span className="text-xs font-bold uppercase opacity-80 tracking-[0.2em]">Lucro Líquido Estimado</span>
                                 <div className="px-3 py-1.5 bg-white/20 rounded-full backdrop-blur-md">
                                    <span className="text-[12px] font-black">-15% taxa</span>
                                 </div>
                              </div>
                              <p className="text-4xl font-black tracking-tighter tabular-nums leading-none">{formatCurrency(currentLucro)}</p>
                           </div>
                           <div className="text-right space-y-2">
                              <span className="text-[10px] font-black uppercase opacity-60 block tracking-widest">Margem de Lucro</span>
                              <div className="px-5 py-2 bg-white/20 rounded-xl text-2xl font-black tabular-nums backdrop-blur-md">
                                 {formData.valorBruto > 0 ? ((currentLucro / formData.valorBruto) * 100).toFixed(1) : 0}%
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </form>
        </StandardModal>
      )}

      {isQuickPassengerModalOpen && (
        <StandardModal
          onClose={() => setIsQuickPassengerModalOpen(false)}
          title="Novo Passageiro Rápido"
          subtitle="Cadastro sintetizado direto no atendimento"
          icon={<User size={24} />}
          maxWidthClassName="max-w-5xl"
        >
          <form onSubmit={handleQuickPassengerSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-25 gap-6">
              <div className="space-y-2 md:col-span-14">
                <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">Nome completo <span className="text-rose-300 text-base">*</span></label>
                <input
                  required
                  value={quickPassengerForm.nomeCompleto}
                  onChange={(e) => setQuickPassengerForm(prev => ({ ...prev, nomeCompleto: e.target.value }))}
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                  placeholder="Ex: Lucas Vieira"
                />
              </div>
              <div className="space-y-2 md:col-span-6">
                <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">Celular <span className="text-rose-300 text-base">*</span></label>
                <input
                  required
                  value={quickPassengerForm.celular}
                  onChange={(e) => {
                    const formatted = formatPhone(e.target.value);
                    const digits = formatted.replace(/\D/g, '');
                    setQuickPassengerForm(prev => ({ ...prev, celular: formatted }));
                    setQuickPassengerErrors(prev => ({
                      ...prev,
                      celular: digits.length === 0 || digits.length === 11 ? undefined : 'Informe os 11 dígitos do celular'
                    }));
                  }}
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                  placeholder="(00) 00000-0000"
                />
                {quickPassengerErrors.celular && (
                  <p className="text-xs font-semibold text-rose-400 ml-1">{quickPassengerErrors.celular}</p>
                )}
              </div>
              <div className="space-y-2 md:col-span-5 mt-1">
                <GeologSearchableSelect
                  label="Notificar"
                  options={[
                    { id: 'Sim', nome: 'Sim' },
                    { id: 'Não', nome: 'Não' }
                  ]}
                  value={quickPassengerForm.notificar}
                  onChange={(value) => setQuickPassengerForm(prev => ({ ...prev, notificar: value }))}
                  required
                  disableSearch
                />
              </div>
            </div>

            <div className="relative rounded-[2rem] border-2 border-slate-200 bg-white p-6 shadow-sm">
              <button
                type="button"
                onClick={() => setIsAddressExpanded(!isAddressExpanded)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                title={isAddressExpanded ? "Recolher endereço" : "Expandir endereço"}
              >
                <ChevronDown 
                  size={20} 
                  className={`transition-transform duration-200 ${isAddressExpanded ? 'rotate-180' : ''}`}
                />
              </button>
              
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-10 h-10 rounded-xl ${quickPassengerTarget ? getWaypointInfo(quickPassengerTarget.waypointIndex).bgColor : 'bg-blue-50'} ${quickPassengerTarget ? getWaypointInfo(quickPassengerTarget.waypointIndex).textColor : 'text-blue-600'} flex items-center justify-center`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-map-pin" aria-hidden="true">
                    <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    {isAddressExpanded 
                      ? (quickPassengerTarget ? `${getWaypointInfo(quickPassengerTarget.waypointIndex).type} - Endereço` : "Endereço 1")
                      : (quickPassengerForm.enderecoCompleto || (quickPassengerTarget ? `Endereço vinculado à ${getWaypointInfo(quickPassengerTarget.waypointIndex).type}` : "Endereço vinculado ao roteiro"))
                    }
                  </p>
                  <p className={`text-base font-black ${quickPassengerTarget ? getWaypointInfo(quickPassengerTarget.waypointIndex).textColor : 'text-slate-800'}`}>
                    {isAddressExpanded 
                      ? (quickPassengerTarget ? getWaypointInfo(quickPassengerTarget.waypointIndex).description : "Ponto de apoio / destino recorrente")
                      : (quickPassengerForm.enderecoCompleto || (quickPassengerTarget ? getWaypointInfo(quickPassengerTarget.waypointIndex).type : "Origem, Parada ou Destino Final"))
                    }
                  </p>
                </div>
              </div>
              
              {isAddressExpanded && (
                <div className="space-y-6 animate-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">Rótulo <span className="text-rose-300 text-base">*</span></label>
                      <input 
                        value={quickPassengerForm.rotulo}
                        onChange={(e) => setQuickPassengerForm(prev => ({ ...prev, rotulo: e.target.value }))}
                        placeholder="RESIDENCIAL, BASE, HOTEL..." 
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Referência</label>
                      <input 
                        value={quickPassengerForm.referencia}
                        onChange={(e) => setQuickPassengerForm(prev => ({ ...prev, referencia: e.target.value }))}
                        placeholder="Portaria azul, torre B, etc" 
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2 mt-6">
                    <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">Endereço completo <span className="text-rose-300 text-base">*</span></label>
                    <input
                      required
                      value={quickPassengerForm.enderecoCompleto}
                      onChange={(e) => setQuickPassengerForm(prev => ({ ...prev, enderecoCompleto: e.target.value }))}
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                      placeholder="Rua, número, bairro, cidade - UF"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => setIsQuickPassengerModalOpen(false)}
                className="cursor-pointer px-6 py-3 text-slate-500 font-black rounded-xl border border-slate-200 hover:bg-slate-50 transition-all uppercase tracking-widest text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="cursor-pointer px-8 py-3 bg-emerald-600 text-white font-black rounded-xl shadow-lg shadow-emerald-900/20 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-xs"
              >
                Salvar Passageiro
              </button>
            </div>
          </form>
        </StandardModal>
      )}

      {viewingOS && (
        <StandardModal
          onClose={() => setViewingOSId(null)}
          title={`Visão Operacional ${viewingOS.os || 'Sem OS'}`}
          subtitle={`Protocolo ${viewingOS.protocolo}`}
          icon={<Eye size={24} />}
          maxWidthClassName="max-w-6xl"
          bodyClassName="p-6 md:p-10 space-y-8"
        >
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Cliente</p>
                <p className="mt-3 text-lg font-black text-slate-900">{clientes.find(c => c.id === viewingOS.clienteId)?.nome || 'N/A'}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Motorista</p>
                <p className="mt-3 text-lg font-black text-slate-900">{viewingOS.motorista || 'Não definido'}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Status</p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black uppercase tracking-wide border-slate-200 bg-white text-slate-700">
                  {getStatusConfig(viewingOS.status.operacional).icon}
                  {getStatusConfig(viewingOS.status.operacional).label}
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Financeiro</p>
                <p className="mt-3 text-lg font-black text-slate-900">{formatCurrency(viewingOS.valorBruto)}</p>
                <p className="text-sm font-semibold text-slate-500">Lucro {formatCurrency(viewingOS.lucro)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.9fr] gap-6">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 space-y-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-[0.08em]">Acompanhamento do Serviço</h3>
                    <p className="text-sm font-semibold text-slate-400">Visão consolidada do que o sistema já consegue inferir pelo status atual.</p>
                  </div>
                  <div className="px-4 py-2 rounded-2xl bg-blue-50 text-blue-700 text-xs font-black uppercase tracking-[0.2em]">
                    Tempo real visual
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-4 rounded-2xl bg-slate-50 border border-slate-100 p-4">
                    <div className={`mt-0.5 w-10 h-10 rounded-2xl flex items-center justify-center ${driverFlow.received ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                      <MessageCircle size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-slate-900 uppercase tracking-[0.12em]">Mensagem enviada ao motorista</p>
                      <p className="text-sm text-slate-500">O fluxo dispara um link automático para o motorista confirmar o atendimento.</p>
                    </div>
                    <span className={`text-xs font-black uppercase tracking-[0.18em] ${driverFlow.received ? 'text-emerald-600' : 'text-slate-400'}`}>{driverFlow.received ? 'Enviado' : 'Pendente'}</span>
                  </div>

                  <div className="flex items-start gap-4 rounded-2xl bg-slate-50 border border-slate-100 p-4">
                    <div className={`mt-0.5 w-10 h-10 rounded-2xl flex items-center justify-center ${driverFlow.accepted ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      <CheckCircle2 size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-slate-900 uppercase tracking-[0.12em]">Aceite do motorista</p>
                      <p className="text-sm text-slate-500">Considerado confirmado quando a OS sai de `Pendente` e entra em etapa operacional posterior.</p>
                    </div>
                    <span className={`text-xs font-black uppercase tracking-[0.18em] ${driverFlow.accepted ? 'text-emerald-600' : 'text-slate-500'}`}>{driverFlow.accepted ? 'Confirmado' : 'Aguardando clique'}</span>
                  </div>

                  <div className="flex items-start gap-4 rounded-2xl bg-slate-50 border border-slate-100 p-4">
                    <div className={`mt-0.5 w-10 h-10 rounded-2xl flex items-center justify-center ${driverFlow.started ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                      <Navigation size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-slate-900 uppercase tracking-[0.12em]">Início da rota</p>
                      <p className="text-sm text-slate-500">Quando o motorista aciona o link operacional de início, a frota entra em trânsito.</p>
                    </div>
                    <span className={`text-xs font-black uppercase tracking-[0.18em] ${driverFlow.started ? 'text-blue-600' : 'text-slate-400'}`}>{driverFlow.started ? 'Em deslocamento' : 'Não iniciado'}</span>
                  </div>

                  <div className="flex items-start gap-4 rounded-2xl bg-slate-50 border border-slate-100 p-4">
                    <div className={`mt-0.5 w-10 h-10 rounded-2xl flex items-center justify-center ${driverFlow.finished ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                      <FileText size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-slate-900 uppercase tracking-[0.12em]">Finalização operacional</p>
                      <p className="text-sm text-slate-500">Visível quando a OS é concluída e já pode seguir para validação administrativa/financeira.</p>
                    </div>
                    <span className={`text-xs font-black uppercase tracking-[0.18em] ${driverFlow.finished ? 'text-emerald-600' : 'text-slate-400'}`}>{driverFlow.finished ? 'Finalizado' : 'Em aberto'}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 space-y-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <Users className="text-blue-600" size={20} />
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-[0.08em]">Passageiros e Comunicação</h3>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600">Itinerário</p>
                    <p className="mt-2 text-sm font-bold text-slate-700 leading-relaxed">{viewingOS.trecho}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Solicitante</p>
                    <p className="mt-2 text-sm font-bold text-slate-700">{viewingOS.solicitante || 'Não informado'}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Centro de custo</p>
                    <p className="mt-2 text-sm font-bold text-slate-700">{clientes.find(c => c.id === viewingOS.clienteId)?.centrosCusto.find(cc => cc.id === viewingOS.centroCustoId)?.nome || 'Não informado'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-[0.08em]">Passageiros monitorados</h3>
                  <p className="text-sm font-semibold text-slate-400">Sempre que houver passageiro vinculado na rota, ele aparece aqui com visão de contato e engajamento do fluxo.</p>
                </div>
                <div className="px-4 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-black uppercase tracking-[0.18em] text-slate-600">
                  {operationalPassengerList.length} passageiro(s)
                </div>
              </div>

              {operationalPassengerList.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {operationalPassengerList.map((passenger) => (
                    <div key={passenger.key} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-black text-slate-900">{passenger.nome}</p>
                          <p className="text-sm font-semibold text-slate-500">Embarque relacionado: {passenger.waypointLabel}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-[0.16em] ${viewingOS.status.operacional === 'Pendente' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {viewingOS.status.operacional === 'Pendente' ? 'Aguardando contato' : 'Fluxo ativo'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-3 text-sm font-semibold text-slate-600">
                        <div className="flex items-center gap-3 rounded-2xl bg-white border border-slate-200 px-4 py-3">
                          <User size={16} className="text-slate-400" />
                          {passenger.email}
                        </div>
                        <div className="flex items-center gap-3 rounded-2xl bg-white border border-slate-200 px-4 py-3">
                          <MessageCircle size={16} className="text-slate-400" />
                          {passenger.celular}
                        </div>
                        <div className="flex items-center gap-2 rounded-2xl bg-white border border-slate-200 px-4 py-3">
                          <MapPin size={16} className="text-slate-400" />
                          {passenger.endereco}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3 flex items-center justify-between gap-3">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Interação do passageiro</p>
                        <span className={`text-xs font-black uppercase tracking-[0.16em] ${viewingOS.status.operacional === 'Pendente' ? 'text-slate-500' : 'text-emerald-600'}`}>
                          {viewingOS.status.operacional === 'Pendente' ? 'Mensagem aguardando ação' : 'Notificação considerada entregue no fluxo atual'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                  <p className="text-base font-black text-slate-700">Nenhum passageiro vinculado visualmente à rota desta OS.</p>
                  <p className="mt-2 text-sm font-semibold text-slate-400">Assim que houver passageiros adicionados nos waypoints, o painel mostrará contatos e situação do fluxo.</p>
                </div>
              )}
            </div>
          </div>
        </StandardModal>
      )}

      {cancelTargetOS && (
        <StandardModal
          onClose={() => setCancelTargetId(null)}
          title="Confirmar cancelamento"
          subtitle={`OS ${cancelTargetOS.os || cancelTargetOS.protocolo}`}
          icon={<AlertTriangle size={24} />}
          maxWidthClassName="max-w-2xl"
          bodyClassName="p-6 md:p-10 space-y-8"
          footer={
            <div className="p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => setCancelTargetId(null)}
                className="px-6 py-3 text-slate-500 font-black rounded-xl border border-slate-200 hover:bg-white transition-all uppercase tracking-widest text-xs"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={confirmCancelOS}
                className="px-8 py-3 bg-rose-600 text-white font-black rounded-xl shadow-lg shadow-rose-900/20 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-xs"
              >
                Confirmar cancelamento
              </button>
            </div>
          }
        >
          <div className="space-y-5">
            <div className="rounded-3xl border border-rose-100 bg-rose-50 p-6">
              <p className="text-base font-black text-rose-700">Tem certeza que deseja cancelar esta Ordem de Serviço?</p>
              <p className="mt-2 text-sm font-semibold text-rose-600/80">Essa ação altera o status operacional para cancelado e sinaliza visualmente para toda a operação.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Protocolo</p>
                <p className="mt-2 text-base font-black text-slate-900">{cancelTargetOS.protocolo}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Motorista</p>
                <p className="mt-2 text-base font-black text-slate-900">{cancelTargetOS.motorista || 'Não definido'}</p>
              </div>
            </div>
          </div>
        </StandardModal>
      )}

      {/* Modal Cadastro Rápido */}
      {quickAddModal && (
        <StandardModal
          onClose={closeQuickAddModal}
          title={`Novo ${quickAddModal === 'cliente' ? 'Empresa' : quickAddModal === 'motorista' ? 'Motorista' : quickAddModal === 'solicitante' ? 'Solicitante' : 'Centro de Custo'}`}
          subtitle="Cadastro rápido direto no atendimento"
          icon={quickAddModal === 'motorista' ? <UserPlus size={24} /> : <Plus size={24} />}
          maxWidthClassName={quickAddModal === 'motorista' ? 'max-w-6xl' : 'max-w-2xl'}
          bodyClassName={quickAddModal === 'motorista' ? 'p-6 md:p-10 pb-16 space-y-12' : undefined}
        >
          {quickAddModal === 'motorista' ? (
            <form onSubmit={(e) => { e.preventDefault(); handleQuickAddSubmit(); }} className="space-y-12">
              <section className="space-y-6">
                <div className="flex items-center border-b-2 border-slate-100 pb-4" style={{ paddingBottom: '1.25rem' }}>
                  <h3 className="text-[17px] font-black text-slate-900 uppercase tracking-[0.1em] flex items-center gap-3" style={{ lineHeight: '1.3' }}>
                    <IdCard size={20} className="text-slate-500" /> Informações do Motorista
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="space-y-2 flex-1">
                      <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                        Nome completo <RequiredAsterisk />
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: João Silva da Rocha"
                        value={quickAddDriverForm.name}
                        onChange={(e) => setQuickAddDriverForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                      />
                    </div>

                    <div className="space-y-2 md:mt-7">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setQuickAddDriverForm(prev => ({ ...prev, vinculo_tipo: 'interno', parceiro_id: '', vehicle_id: '', tipo_documento: 'cpf' }))}
                          className={`cursor-pointer flex items-center justify-center gap-2 px-4 py-4 rounded-xl border-2 font-black text-sm uppercase tracking-widest transition-all whitespace-nowrap ${
                            quickAddDriverForm.vinculo_tipo === 'interno'
                              ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                              : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600'
                          }`}
                        >
                          <Building2 size={16} /> Interno
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuickAddDriverForm(prev => ({ ...prev, vinculo_tipo: 'parceiro', parceiro_id: '', vehicle_id: '', tipo_documento: 'cpf' }))}
                          className={`cursor-pointer flex items-center justify-center gap-2 px-4 py-4 rounded-xl border-2 font-black text-sm uppercase tracking-widest transition-all whitespace-nowrap ${
                            quickAddDriverForm.vinculo_tipo === 'parceiro'
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
                    <div className="space-y-2 w-full md:w-56">
                      <GeologSearchableSelect
                        label="Tipo"
                        options={tipoDocumentoOptions}
                        value={quickAddDriverForm.tipo_documento}
                        onChange={(value) => setQuickAddDriverForm(prev => ({
                          ...prev,
                          tipo_documento: value as 'cpf' | 'passaporte',
                          cpf: formatDriverDocument(prev.cpf, value as 'cpf' | 'passaporte')
                        }))}
                        required
                      />
                    </div>

                    <div className="space-y-2 w-full md:w-52">
                      <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                        {getDriverDocumentLabel(quickAddDriverForm.tipo_documento)} <RequiredAsterisk />
                      </label>
                      <input
                        required
                        placeholder={getDriverDocumentPlaceholder(quickAddDriverForm.tipo_documento)}
                        value={quickAddDriverForm.cpf}
                        onChange={(e) => setQuickAddDriverForm(prev => ({ ...prev, cpf: formatDriverDocument(e.target.value, prev.tipo_documento) }))}
                        className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                      />
                    </div>

                    <div className="space-y-2 w-full md:w-60">
                      <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                        Celular <RequiredAsterisk />
                      </label>
                      <input
                        required
                        placeholder="(00) 9XXXX-XXXX"
                        value={formatDriverCelular(quickAddDriverForm.celular)}
                        onChange={(e) => {
                          const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 11);
                          setQuickAddDriverForm(prev => ({ ...prev, celular: digitsOnly }));
                        }}
                        className={`w-full px-4 py-4 bg-slate-50 border-2 rounded-xl font-bold text-base text-slate-900 outline-none focus:bg-white transition-all shadow-sm ${
                          quickAddDriverForm.celular && !validateDriverCelular(quickAddDriverForm.celular)
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-slate-200 focus:border-blue-600'
                        }`}
                      />
                    </div>

                    <div className="space-y-2 w-full md:w-52">
                      <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                        CNH <RequiredAsterisk />
                      </label>
                      <input
                        required
                        placeholder="11 dígitos numéricos"
                        value={quickAddDriverForm.cnh}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                          setQuickAddDriverForm(prev => ({ ...prev, cnh: value }));
                        }}
                        className={`w-full px-4 py-4 bg-slate-50 border-2 rounded-xl font-bold text-base text-slate-900 outline-none focus:bg-white transition-all shadow-sm ${
                          quickAddDriverForm.cnh && !validateDriverCNH(quickAddDriverForm.cnh)
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-slate-200 focus:border-blue-600'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {quickAddDriverForm.vinculo_tipo === 'parceiro' && (
                      <GeologSearchableSelect
                        label="Parceiro de serviço"
                        options={parceiroOptions}
                        value={quickAddDriverForm.parceiro_id}
                        onChange={(value) => setQuickAddDriverForm(prev => ({ ...prev, parceiro_id: value, vehicle_id: '' }))}
                        placeholder="Selecione o parceiro..."
                        required
                      />
                    )}

                    <div className={quickAddDriverForm.vinculo_tipo === 'parceiro' ? '' : 'md:col-span-2'}>
                      <GeologSearchableSelect
                        label="Veículo"
                        options={filteredQuickAddVehicles.map((vehicle) => ({
                          id: vehicle.id,
                          nome: `${vehicle.marca} ${vehicle.modelo} - ${vehicle.placa}`
                        }))}
                        value={quickAddDriverForm.vehicle_id}
                        onChange={(value) => setQuickAddDriverForm(prev => ({ ...prev, vehicle_id: value }))}
                        placeholder="Selecione o veículo..."
                        required
                        disabled={vehiclesUnavailable || filteredQuickAddVehicles.length === 0}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={closeQuickAddModal}
                  className="px-6 py-3 text-slate-500 font-black rounded-xl border border-slate-200 hover:bg-white transition-all uppercase tracking-widest text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-green-600 text-white font-black rounded-xl shadow-lg shadow-green-900/20 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-xs cursor-pointer"
                >
                  Salvar motorista
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); handleQuickAddSubmit(); }} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                    Nome <span className="text-rose-300 text-base">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={quickAddForm.nome}
                    onChange={(e) => setQuickAddForm(prev => ({ ...prev, nome: e.target.value }))}
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                    placeholder={quickAddModal === 'cliente' ? 'Ex: Empresa ABC Ltda' : quickAddModal === 'solicitante' ? 'Ex: Maria Santos' : 'Ex: Departamento Comercial'}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={closeQuickAddModal}
                  className="px-6 py-3 text-slate-500 font-black rounded-xl border border-slate-200 hover:bg-white transition-all uppercase tracking-widest text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-[var(--color-geolog-blue)] text-white font-black rounded-xl shadow-lg shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-xs cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </form>
          )}
        </StandardModal>
      )}

      {/* Modal Cadastro Rápido de Veículo */}
      {isOsVehicleQuickModalOpen && (
        <StandardModal
          onClose={() => setIsOsVehicleQuickModalOpen(false)}
          title="Cadastrar Veículo"
          subtitle="Cadastro rápido vinculado ao motorista selecionado"
          icon={<Car size={24} />}
          maxWidthClassName="max-w-5xl"
        >
          <form onSubmit={handleOsVehicleQuickSave} className="space-y-6">
            <div className="flex flex-wrap gap-3">
              <div className="w-[140px] space-y-2 flex-shrink-0">
                <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-1">Placa <RequiredAsterisk /></label>
                <input
                  required
                  value={osVehicleQuickForm.placa}
                  onChange={e => setOsVehicleQuickForm(prev => ({ ...prev, placa: formatarPlacaOS(e.target.value) }))}
                  className="max-w-[140px] px-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm mt-[4px] h-[60px]"
                  placeholder="ABC-1234"
                  maxLength={8}
                />
              </div>
              <div className="w-[220px] space-y-2 flex-shrink-0">
                <GeologSearchableSelect
                  label="Marca"
                  options={MARCAS_VEICULOS}
                  value={osVehicleQuickForm.marca}
                  onChange={value => setOsVehicleQuickForm(prev => ({ ...prev, marca: value }))}
                  required
                  triggerClassName="mt-[9px] h-[60px]"
                />
              </div>
              <div className="flex-1 space-y-2 min-w-[150px]">
                <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-1">Modelo <RequiredAsterisk /></label>
                <input
                  required
                  value={osVehicleQuickForm.modelo}
                  onChange={e => setOsVehicleQuickForm(prev => ({ ...prev, modelo: e.target.value }))}
                  className="w-full px-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm mt-[4px] h-[60px]"
                  placeholder="Ex: Corolla"
                />
              </div>
              <div className="w-[180px] space-y-2 flex-shrink-0">
                <GeologSearchableSelect
                  label="Tipo"
                  options={TIPOS_VEICULO_OS}
                  value={osVehicleQuickForm.tipo}
                  onChange={value => setOsVehicleQuickForm(prev => ({ ...prev, tipo: value as typeof osVehicleQuickForm.tipo }))}
                  required
                  disableSearch
                  triggerClassName="mt-[9px] h-[60px]"
                />
              </div>
            </div>
            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={() => setIsOsVehicleQuickModalOpen(false)}
                className="flex-1 py-4 border-2 border-slate-200 text-slate-500 font-black rounded-2xl hover:bg-slate-50 transition-all uppercase tracking-widest text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmittingOsVehicle}
                className="flex-1 py-4 bg-green-600 text-white font-black rounded-2xl hover:bg-green-500 shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 uppercase tracking-widest text-xs cursor-pointer"
              >
                {isSubmittingOsVehicle ? <Loader2 className="animate-spin" size={18} /> : 'Cadastrar Veículo'}
              </button>
            </div>
          </form>
        </StandardModal>
      )}
    </div>
  );
}


function OpStatCard({ label, value, icon }: { label: string, value: number, icon: React.ReactNode }) {
  return (
    <div className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm flex items-center gap-4">
      <div className="p-3 bg-slate-50 rounded-xl">{icon}</div>
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
        <h3 className="text-2xl font-black text-slate-800 tabular-nums">{value}</h3>
      </div>
    </div>
  );
}
