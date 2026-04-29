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
  Edit2,
  RotateCcw,
  XOctagon,
  MessageCircle,
  MessageSquareMore,
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
  Trash2,
  Mail,
  Smartphone,
  Bell,
  Send,
  Filter,
  FilterX,
} from 'lucide-react';
import { useData, type OrderService, type ParceiroServico } from '@/context/DataContext';
import { fetchOSById, fetchOSPage } from '@/lib/supabase/queries';
import { useServerPaginatedTable } from '@/hooks/useServerPaginatedTable';
import GeologSearchableSelect from '@/components/ui/GeologSearchableSelect';
import { DataTable } from '@/components/ui/DataTable';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { toast } from 'sonner';
import RequiredAsterisk from '@/components/ui/RequiredAsterisk';
import OSCalendar from '@/components/OS/OSCalendar';
import { useConfirm } from '@/hooks/useConfirm';

type FormPassenger = { id: string; solicitanteId: string; nome: string; };
type FormWaypoint = { label: string; lat: number | null; lng: number | null; comment: string; passengers: FormPassenger[]; };
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
  celular: string;
  vehicle_ids: string[];
  vinculo_tipo: 'interno' | 'parceiro';
  parceiro_id: string;
  tipo_documento: 'cpf' | 'passaporte';
};

type VehicleOption = {
  id: string;
  placa: string;
  modelo: string;
  marca: string;
  tipo?: 'carro' | 'van' | 'onibus' | 'moto' | 'caminhao' | 'outro';
};

const initialQuickAddDriverForm: QuickAddDriverForm = {
  name: '',
  cpf: '',
  celular: '',
  vehicle_ids: [],
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
  const { osList, clientes, solicitantes, passageiros, drivers, parceiros, addOS, updateOS, updateOSStatus, deleteOS, addPassageiro, getCentrosCustoByCliente, addCliente, addSolicitante, addCentroCusto, addParceiro, refreshData, impostoPercentual, loading: dataLoading } = useData();
  const supabase = createClient();
  const { confirm, confirmState, closeConfirm, handleConfirm } = useConfirm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuickPassengerModalOpen, setIsQuickPassengerModalOpen] = useState(false);
  const [quickPassengerTarget, setQuickPassengerTarget] = useState<{ waypointIndex: number; passengerId: string } | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [calendarMenuPosition, setCalendarMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [editingOSId, setEditingOSId] = useState<string | null>(null);
  const [viewingOSId, setViewingOSId] = useState<string | null>(null);
  const [viewingOSLive, setViewingOSLive] = useState<OrderService | null>(null);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [driverNotificationSentByOS, setDriverNotificationSentByOS] = useState<Record<string, boolean>>({});
  const actionMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const calendarMenuRef = useRef<HTMLDivElement | null>(null);
  const passengerDraftIdRef = useRef(0);
  const viewingOSPollRef = useRef<NodeJS.Timeout | null>(null);

  type AdvancedFilters = {
    osNumber: string;
    clienteId: string;
    centroCustoId: string;
    solicitante: string;
    motorista: string;
    veiculoId: string;
    passageiro: string;
    dataInicio: string;
    dataFim: string;
    statusOperacional: '' | 'Pendente' | 'Aguardando' | 'Em Rota' | 'Finalizado' | 'Cancelado';
    statusFinanceiro: '' | 'Pendente' | 'Pago' | 'Faturado';
  };

  const defaultAdvancedFilters: AdvancedFilters = {
    osNumber: '',
    clienteId: '',
    centroCustoId: '',
    solicitante: '',
    motorista: '',
    veiculoId: '',
    passageiro: '',
    dataInicio: '',
    dataFim: '',
    statusOperacional: '',
    statusFinanceiro: '',
  };

  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(defaultAdvancedFilters);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [clientPage, setClientPage] = useState(1);
  const osTable = useServerPaginatedTable(fetchOSPage, 10, false);

  useEffect(() => {
    if (!viewingOSId) {
      setViewingOSLive(null);
      if (viewingOSPollRef.current) {
        clearInterval(viewingOSPollRef.current);
        viewingOSPollRef.current = null;
      }
      return;
    }

    let isActive = true;

    const syncViewingOS = async () => {
      try {
        const latest = await fetchOSById(viewingOSId);
        if (isActive) {
          setViewingOSLive(latest);
        }
      } catch (error) {
        console.error('Erro ao sincronizar OS aberta:', error);
      }
    };

    void syncViewingOS();

    if (viewingOSPollRef.current) {
      clearInterval(viewingOSPollRef.current);
    }

    viewingOSPollRef.current = setInterval(() => {
      void syncViewingOS();
    }, 2000);

    const channel = supabase
      .channel(`os-live-${viewingOSId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ordens_servico', filter: `id=eq.${viewingOSId}` },
        () => {
          void syncViewingOS();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'os_waypoints', filter: `ordem_servico_id=eq.${viewingOSId}` },
        () => {
          void syncViewingOS();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'os_waypoint_passengers' },
        () => {
          void syncViewingOS();
        }
      )
      .subscribe();

    return () => {
      isActive = false;
      if (viewingOSPollRef.current) {
        clearInterval(viewingOSPollRef.current);
        viewingOSPollRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [supabase, viewingOSId]);

  useEffect(() => {
    if (!viewingOSId) return;

    const latestFromList = osList.find((os) => os.id === viewingOSId);
    if (latestFromList) {
      setViewingOSLive(latestFromList);
    }
  }, [osList, viewingOSId]);

  // Resetar paginação cliente quando filtros ou busca mudam
  useEffect(() => {
    setClientPage(1);
  }, [advancedFilters, osTable.searchTerm]);

  // Estados para cadastros rápidos
  const [quickAddModal, setQuickAddModal] = useState<'cliente' | 'motorista' | 'solicitante' | 'centroCusto' | null>(null);
  const [quickAddForm, setQuickAddForm] = useState({ nome: '' });
  const [quickAddDriverForm, setQuickAddDriverForm] = useState<QuickAddDriverForm>(initialQuickAddDriverForm);

  // Estados para cadastro rápido de parceiro dentro do modal de motorista
  type QuickParceiroContato = { setor: string; celular: string; email: string; responsavel: string };
  type QuickParceiroForm = {
    pessoaTipo: 'fisica' | 'juridica';
    documento: string;
    razaoSocialOuNomeCompleto: string;
    contatos: QuickParceiroContato[];
  };
  const [isQuickParceiroModalOpen, setIsQuickParceiroModalOpen] = useState(false);
  const [quickParceiroForm, setQuickParceiroForm] = useState<QuickParceiroForm>({
    pessoaTipo: 'juridica',
    documento: '',
    razaoSocialOuNomeCompleto: '',
    contatos: [{ setor: '', celular: '', email: '', responsavel: '' }],
  });

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

  // Estados para modal de veículo dentro do cadastro rápido de motorista
  type QuickVehicleMode = { mode: 'create'; rowIndex: number } | { mode: 'edit'; rowIndex: number; vehicleId: string };
  const [quickVehicleModal, setQuickVehicleModal] = useState<QuickVehicleMode | null>(null);
  const [isSubmittingQuickVehicle, setIsSubmittingQuickVehicle] = useState(false);
  const [vehicleQuickForm, setVehicleQuickForm] = useState({
    placa: '', modelo: '', marca: '',
    tipo: 'carro' as 'carro' | 'van' | 'onibus' | 'moto' | 'caminhao' | 'outro',
  });

  const hasDuplicatePlateQuick = (placa: string, excludeId?: string): boolean => {
    const n = placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    return vehicles.some(v => v.id !== excludeId && v.placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === n);
  };

  const [quickAddedSolicitantes, setQuickAddedSolicitantes] = useState<Array<{ id: string; nome: string; clienteId: string }>>([]);
  const [quickAddedCentrosCusto, setQuickAddedCentrosCusto] = useState<Array<{ id: string; nome: string; clienteId: string }>>([]);
  
  // Status WhatsApp: Realtime (instant via webhook) + polling leve (fallback para detectar queda)
  const [wppStatus, setWppStatus] = useState<'open' | 'close' | 'connecting' | 'loading'>('loading');
  const whatsappSessionName = process.env.NEXT_PUBLIC_WAHA_SESSION || 'default';

  useEffect(() => {
    const applyState = (s: string) => {
      if (s === 'open') setWppStatus('open');
      else if (s === 'connecting') setWppStatus('connecting');
      else setWppStatus('close');
    };

    // Leitura inicial imediata do banco (estado já sincronizado pelo webhook)
    const loadInitial = async () => {
      try {
        const { data } = await supabase
          .from('whatsapp_status')
          .select('state')
          .eq('instance_name', whatsappSessionName)
          .maybeSingle();
        if (data?.state) applyState(data.state);
      } catch { /* fallback para poll/realtime */ }
    };
    loadInitial();

    // Polling leve a cada 30s — checa WAHA e sincroniza tabela Supabase
    const pollStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const res = await fetch('/api/whatsapp/status', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        });
        const json = await res.json();
        if (json.success) applyState(json.instance?.state ?? 'close');
      } catch { /* Realtime é a fonte primária, poll é fallback */ }
    };
    pollStatus();
    const interval = setInterval(pollStatus, 30000);

    // Realtime: atualizações instantâneas via webhook → tabela → cliente
    const channel = supabase
      .channel('whatsapp-status')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_status', filter: `instance_name=eq.${whatsappSessionName}` },
        (payload) => applyState((payload.new as { state: string }).state)
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [supabase, whatsappSessionName]);

  const parceiroOptions = useMemo(
    () => parceiros.map((parceiro: ParceiroServico) => ({ id: parceiro.id, nome: parceiro.razaoSocialOuNomeCompleto })),
    [parceiros]
  );

  const formatParceiroDocument = (value: string, pessoaTipo: 'fisica' | 'juridica'): string => {
    const digits = value.replace(/\D/g, '').slice(0, pessoaTipo === 'juridica' ? 14 : 11);
    if (pessoaTipo === 'juridica') {
      return digits
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const formatParceiroPhone = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 10) return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
    return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
  };

  const validateParceiroCPF = (cpf: string): boolean => {
    const cpfClean = cpf.replace(/\D/g, '');
    if (cpfClean.length !== 11) return false;
    if (/(\d)\1{10}/.test(cpfClean)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(cpfClean.charAt(i)) * (10 - i);
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpfClean.charAt(9))) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(cpfClean.charAt(i)) * (11 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    return remainder === parseInt(cpfClean.charAt(10));
  };

  const validateParceiroCNPJ = (cnpj: string): boolean => {
    const cnpjClean = cnpj.replace(/\D/g, '');
    if (cnpjClean.length !== 14) return false;
    if (/(\d)\1{13}/.test(cnpjClean)) return false;
    const weightsFirst = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const weightsSecond = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += parseInt(cnpjClean.charAt(i)) * weightsFirst[i];
    let remainder = sum % 11;
    const firstDigit = remainder < 2 ? 0 : 11 - remainder;
    if (firstDigit !== parseInt(cnpjClean.charAt(12))) return false;
    sum = 0;
    for (let i = 0; i < 13; i++) sum += parseInt(cnpjClean.charAt(i)) * weightsSecond[i];
    remainder = sum % 11;
    const secondDigit = remainder < 2 ? 0 : 11 - remainder;
    return secondDigit === parseInt(cnpjClean.charAt(13));
  };

  const validateParceiroCelular = (celular: string): boolean => {
    const celularClean = celular.replace(/\D/g, '');
    if (celularClean.length !== 11) return false;
    if (/(\d)\1{10}/.test(celularClean)) return false;
    const ddd = celularClean.substring(0, 2);
    if (ddd < '11' || ddd > '99') return false;
    return true;
  };

  const validateQuickParceiro = (): string | null => {
    if (!quickParceiroForm.razaoSocialOuNomeCompleto.trim()) return 'Razão Social/Nome completo é obrigatório';
    if (!quickParceiroForm.documento.trim()) return 'CNPJ/CPF é obrigatório';
    const documentoLimpo = normalizeDigitsValue(quickParceiroForm.documento);
    if (quickParceiroForm.pessoaTipo === 'juridica') {
      if (documentoLimpo.length !== 14) return 'CNPJ deve ter 14 dígitos completos';
      if (!validateParceiroCNPJ(quickParceiroForm.documento)) return 'CNPJ inválido';
    } else {
      if (documentoLimpo.length !== 11) return 'CPF deve ter 11 dígitos completos';
      if (!validateParceiroCPF(quickParceiroForm.documento)) return 'CPF inválido';
    }
    const existingDoc = parceiros.find(
      (p) => normalizeDigitsValue(p.documento) === documentoLimpo
    );
    if (existingDoc) return `CNPJ/CPF já está sendo usado pelo parceiro "${existingDoc.razaoSocialOuNomeCompleto}".`;

    const primeiroContato = quickParceiroForm.contatos[0];
    if (!primeiroContato.setor.trim()) return 'Setor do primeiro contato é obrigatório';
    if (!primeiroContato.celular.trim()) return 'Celular do primeiro contato é obrigatório';
    if (!primeiroContato.responsavel.trim()) return 'Responsável do primeiro contato é obrigatório';
    const celularLimpo = normalizeDigitsValue(primeiroContato.celular);
    if (celularLimpo.length !== 11) return 'Celular deve ter 11 dígitos completos: (00) 00000-0000';
    if (!validateParceiroCelular(primeiroContato.celular)) return 'Celular inválido';
    if (primeiroContato.email && primeiroContato.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(primeiroContato.email.trim())) return 'E-mail inválido';
    }

    const formCelulares = new Map<string, number>();
    const formEmails = new Map<string, number>();
    for (let i = 0; i < quickParceiroForm.contatos.length; i++) {
      const c = quickParceiroForm.contatos[i];
      const cell = normalizeDigitsValue(c.celular);
      if (cell && formCelulares.has(cell)) return `Celular ${c.celular} está duplicado entre os contatos deste parceiro.`;
      formCelulares.set(cell, i);
      const email = normalizeTextValue(c.email || '');
      if (email && formEmails.has(email)) return `E-mail ${c.email} está duplicado entre os contatos deste parceiro.`;
      formEmails.set(email, i);
    }

    for (const contato of quickParceiroForm.contatos) {
      const cell = normalizeDigitsValue(contato.celular);
      if (cell) {
        for (const parceiro of parceiros) {
          const found = parceiro.contatos.find(
            (c) => normalizeDigitsValue(c.celular) === cell
          );
          if (found) return `Celular ${contato.celular} já está sendo usado no contato "${found.setor}" do parceiro "${parceiro.razaoSocialOuNomeCompleto}".`;
        }
      }
      const email = normalizeTextValue(contato.email || '');
      if (email) {
        for (const parceiro of parceiros) {
          const found = parceiro.contatos.find(
            (c) => normalizeTextValue(c.email || '') === email
          );
          if (found) return `E-mail ${contato.email} já está sendo usado no contato "${found.setor}" do parceiro "${parceiro.razaoSocialOuNomeCompleto}".`;
        }
      }
    }

    return null;
  };

  const handleQuickParceiroSubmit = async () => {
    const validationError = validateQuickParceiro();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const cleanForm = {
      pessoaTipo: quickParceiroForm.pessoaTipo,
      documento: quickParceiroForm.documento.trim(),
      razaoSocialOuNomeCompleto: quickParceiroForm.razaoSocialOuNomeCompleto.trim(),
      contatos: quickParceiroForm.contatos.map((contato) => ({
        setor: contato.setor.trim(),
        celular: contato.celular.trim(),
        email: contato.email?.trim() || '',
        responsavel: contato.responsavel.trim(),
      })),
      filiais: [],
    };

    try {
      const newParceiro = await addParceiro(cleanForm);
      toast.success('Parceiro cadastrado com sucesso!');
      setQuickAddDriverForm(prev => ({ ...prev, parceiro_id: newParceiro.id }));
      setQuickParceiroForm({
        pessoaTipo: 'juridica',
        documento: '',
        razaoSocialOuNomeCompleto: '',
        contatos: [{ setor: '', celular: '', email: '', responsavel: '' }],
      });
      setIsQuickParceiroModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o parceiro.');
    }
  };

  const isAnyModalOpen = isModalOpen || isQuickPassengerModalOpen || Boolean(viewingOSId) || Boolean(cancelTargetId) || Boolean(quickAddModal) || isOsVehicleQuickModalOpen || Boolean(quickVehicleModal) || isQuickParceiroModalOpen;

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
        .select('id, placa, modelo, marca, tipo')
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
      { label: '', lat: null, lng: null, comment: '', passengers: [] },
      { label: '', lat: null, lng: null, comment: '', passengers: [] }
    ]
  };

  const resetMainModalState = () => {
    setIsModalOpen(false);
    setEditingOSId(null);
    setFormData(initialForm);
    setOpenWaypointComments({});
    void refreshData();
  };

  const handleOpenCreateOSModal = () => {
    setEditingOSId(null);
    setFormData(initialForm);
    setOpenWaypointComments({});
    setIsModalOpen(true);
  };

  const hydrateFormFromOS = (osItem: OrderService) => {
    const hydratedWaypoints = osItem.rota?.waypoints?.length
      ? osItem.rota.waypoints.map((waypoint, index) => ({
          label: waypoint.label,
          lat: waypoint.lat ?? null,
          lng: waypoint.lng ?? null,
          comment: waypoint.comment || '',
          passengers: (waypoint.passengers || []).map((passenger, passengerIndex) => ({
            id: passenger.id || `${osItem.id}-${index}-${passengerIndex}`,
            solicitanteId: passenger.solicitanteId || '',
            nome: passenger.nome || ''
          }))
        }))
      : initialForm.waypoints;

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
      waypoints: hydratedWaypoints
    });

    setOpenWaypointComments(
      hydratedWaypoints.reduce<Record<number, boolean>>((acc, waypoint, index) => {
        acc[index] = Boolean(waypoint.comment.trim());
        return acc;
      }, {})
    );
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

  const handleDeleteOS = async (osId: string) => {
    const targetOS = osList.find((os) => os.id === osId);
    if (!targetOS) return;

    const confirmed = await confirm({
      title: 'Arquivar OS',
      message: `Tem certeza que deseja arquivar a OS "${targetOS.protocolo || targetOS.os || 'sem protocolo'}"? Ela não aparecerá mais na lista, mas poderá ser recuperada posteriormente.`,
      confirmText: 'Sim, arquivar',
      cancelText: 'Cancelar',
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      await deleteOS(osId);
      setOpenActionMenuId(null);
      toast.success('OS arquivada com sucesso!');
    } catch (error) {
      console.error('Erro ao arquivar OS:', error);
      toast.error('Erro ao arquivar OS.');
    }
  };

  const confirmCancelOS = () => {
    if (!cancelTargetId) return;
    updateOSStatus(cancelTargetId, { operacional: 'Cancelado' });
    setCancelTargetId(null);
  };

  const handleNotifyPassenger = async (
    passengerKey: string,
    type: 'email' | 'whatsapp' | 'both',
    passenger: { nome: string; email: string; celular: string; hasEmail: boolean; hasPhone: boolean; solicitanteId: string; waypointIndex: number }
  ) => {
    if (!viewingOS) return;
    setNotifyLoadingKey(passengerKey);
    try {
      const acceptUrl = `${window.location.origin}/a`;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Sessão expirada. Por favor, faça login novamente.');
        return;
      }

      console.log('[handleNotifyPassenger] sending', { type, osId: viewingOS.id, passageiroId: passenger.solicitanteId, hasPhone: passenger.hasPhone, celular: passenger.celular });
      const res = await fetch('/api/notify-passenger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type,
          passengerEmail: passenger.hasEmail ? passenger.email : undefined,
          passengerPhone: passenger.hasPhone ? passenger.celular : undefined,
          passengerName: passenger.nome,
          osProtocol: viewingOS.protocolo,
          osId: viewingOS.id,
          passageiroId: passenger.solicitanteId || undefined,
          acceptUrl,
        }),
      });
      const data = await res.json();
      console.log('[handleNotifyPassenger] response', data);
      if (data.success) {
        toast.success('Notificação enviada com sucesso!');
      } else {
        toast.error(data.error || `Erro ao enviar notificação. Status: ${res.status}`);
      }
    } catch (err) {
      console.error('[handleNotifyPassenger] catch error:', err);
      toast.error('Erro ao enviar notificação. Verifique o console.');
    } finally {
      setNotifyLoadingKey(null);
      setOpenNotifyMenuKey(null);
    }
  };

  const sendWhatsAppNotification = async (osData: OrderService) => {
    if (!osData.motorista) {
      toast.error("Motorista não atribuído a esta OS.");
      return;
    }

    // Buscar o telefone do motorista pelo nome (case-insensitive e trimmed)
    const driverObj = drivers.find(d => 
      d.name.trim().toLowerCase() === osData.motorista.trim().toLowerCase()
    );
    
    let phone = driverObj?.phone || "5522997259180"; 
    
    if (!driverObj?.phone) {
      console.warn(`[WhatsApp] Motorista "${osData.motorista}" não encontrado ou sem telefone. Usando fallback.`);
    }

    // Limpeza e formatação do telefone
    phone = phone.replace(/\D/g, '');
    if (phone.length > 0 && phone.length <= 11 && !phone.startsWith('55')) {
      phone = `55${phone}`;
    }

    if (phone.length < 10) {
      toast.error("Telefone do motorista é inválido ou não cadastrado.");
      return;
    }

    const cliente = clientes.find(c => c.id === osData.clienteId)?.nome || 'Empresa não informada';

    // Veículo da OS ou vinculado ao motorista
    let vehicleInfo = { tipo: '', placa: '' };
    if (osData.veiculoId) {
      const v = vehicles.find(v => v.id === osData.veiculoId);
      if (v) vehicleInfo = { tipo: v.tipo || '', placa: v.placa || '' };
    } else if (driverObj?.id) {
      const assoc = driverVehiclesAssoc.find(a => a.driver_id === driverObj.id);
      if (assoc) {
        const v = vehicles.find(v => v.id === assoc.vehicle_id);
        if (v) vehicleInfo = { tipo: v.tipo || '', placa: v.placa || '' };
      }
    }

    // Passageiros do itinerário
    const allPassengers: { nome: string; celular: string }[] = [];
    const waypoints = osData.rota?.waypoints || [];
    waypoints.forEach((wp) => {
      (wp.passengers || []).forEach((p) => {
        const passRecord = passageiros.find(x => x.id === p.solicitanteId);
        const cel = passRecord?.celular || '';
        if (!allPassengers.some(x => x.nome === (p.nome || passRecord?.nomeCompleto || ''))) {
          allPassengers.push({
            nome: p.nome || passRecord?.nomeCompleto || 'Não identificado',
            celular: cel ? cel.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') : 'Não informado',
          });
        }
      });
    });

    // Itinerário com observações
    let itineraryText = '';
    if (waypoints.length >= 1) {
      itineraryText = waypoints.map((w, idx) => {
        const label = w.label.trim();
        const comment = w.comment?.trim();
        let line = '';
        if (idx === 0) line = `🟢 *Origem:* ${label}`;
        else if (idx === waypoints.length - 1) line = `🔵 *Destino Final:* ${label}`;
        else line = `🛑 *Parada ${idx}:* ${label}`;
        if (comment) line += `\n   _Obs: ${comment}_`;
        return line;
      }).join('\n\n');
    }

    // Transporte: usar tipo do veículo
    const tipoCapitalizado = vehicleInfo.tipo
      ? vehicleInfo.tipo.charAt(0).toUpperCase() + vehicleInfo.tipo.slice(1)
      : 'Não informado';
    const placaDisplay = vehicleInfo.placa || 'Não informada';

    // Passageiros
    const paxText = allPassengers.length > 0
      ? allPassengers.map(p => `• ${p.nome}${p.celular !== 'Não informado' ? ` – ${p.celular}` : ''}`).join('\n')
      : 'Não informado';

    // Buscar ou criar slug curto para a OS
    let shortSlug = osData.id;
    try {
      const { data: existing } = await supabase
        .from('os_link_shortcuts')
        .select('slug')
        .eq('os_id', osData.id)
        .single();
      if (existing?.slug) {
        shortSlug = existing.slug;
      } else {
        const newSlug = Math.random().toString(36).slice(2, 17);
        const { data: inserted } = await supabase
          .from('os_link_shortcuts')
          .insert({ os_id: osData.id, slug: newSlug })
          .select('slug')
          .single();
        if (inserted?.slug) shortSlug = inserted.slug;
      }
    } catch {
      /* fallback: usa o UUID */
    }

    const acceptLink = `${window.location.origin}/a/${shortSlug}`;

    const osLine = osData.os ? `🆔 *OS:* ${osData.os}\n` : '';

    const message =
      `📋 *Protocolo:* ${osData.protocolo}\n` +
      `${osLine}` +
      `📦 *Fornecedor:* Geolog Transporte Executivo\n` +
      `📅 *Data:* ${osData.data.split('-').reverse().join('/')}\n` +
      `⏰ *Horário:* ${osData.hora || 'Não informado'}\n` +
      `🏢 *Empresa:* ${cliente}\n` +
      `👤 *Solicitante:* ${osData.solicitante || 'Não informado'}\n` +
      `🚗 *Transporte:* ${tipoCapitalizado}\n\n` +
      `────────────────\n` +
      `👥 *Passageiro(s):*\n${paxText}\n\n` +
      `────────────────\n` +
      `📍 *Itinerário:*\n${itineraryText}\n\n` +
      `────────────────\n` +
      `👨‍✈️ *Motorista:* ${osData.motorista}\n` +
      `📞 *Contato:* ${driverObj?.phone || 'Não informado'}\n` +
      `🚘 *Veículo:* ${tipoCapitalizado}\n` +
      `📝 *Placa:* ${placaDisplay}\n\n` +
      `👇 *Aceitar o serviço:*\n` +
      `${acceptLink}\n`;

    setNotifyLoadingKey('driver-whatsapp');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Sessão expirada. Por favor, faça login novamente.");
        return;
      }

      console.log(`[WhatsApp] Enviando notificação para ${osData.motorista} (${phone})`);

      // 1. Enviar mensagem informativa com link curto
      const msgResponse = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ phone, message })
      });

      const msgData = await msgResponse.json();

      if (!msgResponse.ok || !msgData.success) {
        console.error('[WhatsApp] Erro na API de mensagem:', msgData);
        toast.error(`Falha ao enviar mensagem: ${msgData.error || 'Erro na API WAHA'}`);
        setNotifyLoadingKey(null);
        return;
      }

      toast.success("WhatsApp enviado para o motorista!");
      setDriverNotificationSentByOS((prev) => ({
        ...prev,
        [osData.id]: true,
      }));
      try {
        await supabase
          .from('ordens_servico')
          .update({ driver_message_sent_at: new Date().toISOString() })
          .eq('id', osData.id);
      } catch (dbErr) {
        console.error('[WhatsApp] Erro ao registrar timestamp de envio:', dbErr);
      }
      void refreshData();
    } catch (err) {
      console.error("[WhatsApp] Erro crítico:", err);
      toast.error("Erro ao conectar com a API de WhatsApp.");
    } finally {
      setNotifyLoadingKey(null);
    }
  };

  useEffect(() => {
    if (!openActionMenuId) return;

    const handleClickOutside = (event: MouseEvent) => {
      // Para modo tabela - verifica ref do botão MoreVertical
      const currentMenu = actionMenuRefs.current[openActionMenuId];
      // Para modo calendário - verifica ref do menu do calendário
      const calendarMenu = calendarMenuRef.current;
      
      const clickedOutsideTableMenu = currentMenu && !currentMenu.contains(event.target as Node);
      const clickedOutsideCalendarMenu = calendarMenu && !calendarMenu.contains(event.target as Node);
      
      if (clickedOutsideTableMenu || clickedOutsideCalendarMenu) {
        setOpenActionMenuId(null);
        setCalendarMenuPosition(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openActionMenuId]);

  const [openNotifyMenuKey, setOpenNotifyMenuKey] = useState<string | null>(null);
  const [notifyLoadingKey, setNotifyLoadingKey] = useState<string | null>(null);
  const [notifyMenuPosition, setNotifyMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [passengerConfirmations, setPassengerConfirmations] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!openNotifyMenuKey) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-notify-menu]') || target.closest('[data-notify-button]')) return;
      setOpenNotifyMenuKey(null);
      setNotifyMenuPosition(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openNotifyMenuKey]);

  useEffect(() => {
    if (!viewingOSId) {
      setPassengerConfirmations({});
      return;
    }

    const fetchConfirmations = async () => {
      const { data } = await supabase
        .from('os_passenger_confirmations')
        .select('passageiro_id, aceito')
        .eq('os_id', viewingOSId);
      
      if (data) {
        const map: Record<string, boolean> = {};
        data.forEach((row: { passageiro_id: string | null; aceito: boolean }) => {
          if (row.passageiro_id) map[row.passageiro_id] = row.aceito;
        });
        setPassengerConfirmations(map);
      }
    };

    void fetchConfirmations();

    const channel = supabase
      .channel(`os-confirmations-${viewingOSId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'os_passenger_confirmations',
          filter: `os_id=eq.${viewingOSId}`,
        },
        () => {
          void fetchConfirmations();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [viewingOSId, supabase]);

  const [formData, setFormData] = useState(initialForm);
  const [openWaypointComments, setOpenWaypointComments] = useState<Record<number, boolean>>({});
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
  const [isEstrangeiro, setIsEstrangeiro] = useState(false);
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
    if (isEstrangeiro) {
      return value.replace(/\D/g, '').slice(0, 15);
    }
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 10) {
      return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
    }
    return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
  };

  // Auto-update trecho preview from waypoints
  const trechoPreview = useMemo(() => {
    const validWaypoints = formData.waypoints
      .map(w => w.label.trim())
      .filter(label => label !== '');
    
    if (validWaypoints.length < 2) return validWaypoints[0] || '';
    return validWaypoints.join(' x ');
  }, [formData.waypoints]);

  const viewingOS = useMemo(() => {
    if (!viewingOSId) return null;
    return viewingOSLive || osList.find(os => os.id === viewingOSId) || null;
  }, [osList, viewingOSId, viewingOSLive]);
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
          hasEmail: Boolean(passengerRecord?.email && passengerRecord.email.trim() !== ''),
          hasPhone: Boolean(passengerRecord?.celular && passengerRecord.celular.replace(/\D/g, '').length > 0),
          solicitanteId: passenger.solicitanteId || '',
          waypointIndex,
        };
      })
    );
  }, [viewingOS, passageiros]);

  const driverFlow = useMemo(() => {
    const status = viewingOS?.status.operacional;
    return {
      received: Boolean(
        viewingOS &&
        (driverNotificationSentByOS[viewingOS.id] ||
          viewingOS.driverMessageSentAt ||
          status !== 'Pendente')
      ),
      accepted: Boolean(
        viewingOS?.driverAcceptedAt ||
        status === 'Aguardando' ||
        status === 'Em Rota' ||
        status === 'Finalizado'
      ),
      started: Boolean(
        viewingOS?.routeStartedAt ||
        status === 'Em Rota' ||
        status === 'Finalizado'
      ),
      finished: Boolean(
        viewingOS?.routeFinishedAt ||
        status === 'Finalizado'
      ),
    };
  }, [driverNotificationSentByOS, viewingOS]);

  const handleSwapRoute = () => {
    setOpenWaypointComments((prev) => {
      const entries = Object.entries(prev).map(([key, value]) => [Number(key), value] as const);
      const reversed = entries.reduce<Record<number, boolean>>((acc, [key, value]) => {
        acc[formData.waypoints.length - 1 - key] = value;
        return acc;
      }, {});
      return reversed;
    });
    setFormData(prev => ({
      ...prev,
      waypoints: [...prev.waypoints].reverse()
    }));
  };

  const handleAddWaypoint = () => {
    setOpenWaypointComments((prev) => ({
      ...prev,
      [formData.waypoints.length]: false,
    }));
    setFormData(prev => ({
      ...prev,
      waypoints: [...prev.waypoints, { label: '', lat: null, lng: null, comment: '', passengers: [] }]
    }));
  };

  const handleRemoveWaypoint = (index: number) => {
    if (formData.waypoints.length <= 2) return;
    setOpenWaypointComments((prev) => {
      const next: Record<number, boolean> = {};
      Object.entries(prev).forEach(([key, value]) => {
        const numericKey = Number(key);
        if (numericKey < index) next[numericKey] = value;
        if (numericKey > index) next[numericKey - 1] = value;
      });
      return next;
    });
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

  const handleWaypointCommentChange = (index: number, value: string) => {
    const newWaypoints = [...formData.waypoints];
    newWaypoints[index] = { ...newWaypoints[index], comment: value };
    setFormData(prev => ({
      ...prev,
      waypoints: newWaypoints
    }));
  };

  const toggleWaypointComment = (index: number) => {
    const waypointComment = formData.waypoints[index]?.comment?.trim() || '';
    const isOpen = Boolean(openWaypointComments[index]);

    if (isOpen) {
      if (waypointComment.length > 0) {
        toast.error('Apague a observação antes de recolher.');
        return;
      }

      setOpenWaypointComments((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
      return;
    }

    setOpenWaypointComments((prev) => ({
      ...prev,
      [index]: true
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

  const handleQuickVehicleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickVehicleModal) return;
    setIsSubmittingQuickVehicle(true);
    try {
      if (!validarPlacaOS(vehicleQuickForm.placa)) {
        throw new Error('Formato de placa inválido. Use ABC-1234 ou Mercosul ABC-1D23.');
      }
      if (quickVehicleModal.mode === 'create') {
        if (hasDuplicatePlateQuick(vehicleQuickForm.placa)) throw new Error('Já existe um veículo com esta placa.');
        const { data, error } = await supabase.from('veiculos').insert([{
          placa: vehicleQuickForm.placa.trim().toUpperCase(),
          modelo: vehicleQuickForm.modelo.trim(),
          marca: vehicleQuickForm.marca.trim(),
          tipo: vehicleQuickForm.tipo,
          status: 'ativo',
          ano: new Date().getFullYear(),
          renavam: '',
        }]).select('id, placa, modelo, marca').single();
        if (error) throw error;
        const newV = data as VehicleOption;
        setVehicles(prev => [...prev, newV].sort((a, b) => a.marca.localeCompare(b.marca, 'pt-BR') || a.modelo.localeCompare(b.modelo, 'pt-BR')));
        setQuickAddDriverForm(prev => ({
          ...prev,
          vehicle_ids: prev.vehicle_ids.map((id, idx) => idx === quickVehicleModal.rowIndex ? newV.id : id),
        }));
        toast.success('Veículo cadastrado e selecionado!');
      } else {
        const { vehicleId } = quickVehicleModal;
        if (hasDuplicatePlateQuick(vehicleQuickForm.placa, vehicleId)) throw new Error('Já existe um veículo com esta placa.');
        const { data, error } = await supabase.from('veiculos').update({
          placa: vehicleQuickForm.placa.trim().toUpperCase(),
          modelo: vehicleQuickForm.modelo.trim(),
          marca: vehicleQuickForm.marca.trim(),
          tipo: vehicleQuickForm.tipo,
        }).eq('id', vehicleId).select('id, placa, modelo, marca').single();
        if (error) throw error;
        setVehicles(prev => prev.map(v => v.id === vehicleId ? (data as VehicleOption) : v));
        toast.success('Veículo atualizado!');
      }
      setQuickVehicleModal(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar veículo.');
    } finally {
      setIsSubmittingQuickVehicle(false);
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
          const cpfDigits = quickAddDriverForm.cpf.replace(/\D/g, '');
          const celularDigits = quickAddDriverForm.celular.replace(/\D/g, '');

          if (!name) {
            toast.error('Nome completo é obrigatório.');
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

          if (quickAddDriverForm.vehicle_ids.length === 0) {
            toast.error('Adicione pelo menos um veículo ao motorista.');
            return;
          }

          const duplicateName = drivers.some((driver) => normalizeTextValue(driver.name) === normalizeTextValue(name));
          const duplicateCpf = drivers.some((driver) => normalizeDigitsValue(driver.cpf || '') === cpfDigits);
          const duplicatePhone = drivers.some((driver) => normalizeDigitsValue(driver.phone || '') === celularDigits);

          if (duplicateName) {
            toast.error('Já existe um motorista com este nome.');
            return;
          }

          if (duplicateCpf) {
            toast.error('Já existe um motorista com este CPF.');
            return;
          }

          if (duplicatePhone) {
            toast.error('Já existe um motorista com este celular.');
            return;
          }

          const insertData: Record<string, unknown> = {
            name,
            cpf: cpfDigits,
            phone: celularDigits,
            vehicle_id: quickAddDriverForm.vehicle_ids[0],
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

          // Inserir veículos vinculados
          if (data && quickAddDriverForm.vehicle_ids.length > 0) {
            const driverVehicles = quickAddDriverForm.vehicle_ids.map(vehicleId => ({
              driver_id: data.id,
              vehicle_id: vehicleId,
            }));

            const { error: vehiclesError } = await supabase
              .from('driver_vehicles')
              .insert(driverVehicles);

            if (vehiclesError) {
              console.error('Erro ao vincular veículos:', vehiclesError);
              toast.error('Motorista criado, mas houve erro ao vincular veículos.');
            }
          }

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

    setQuickPassengerErrors({});

    const errors: { celular?: string } = {};
    if (!isEstrangeiro && phoneDigits.length !== 11) {
      errors.celular = 'Celular brasileiro deve conter 11 dígitos.';
    }

    if (!trimmedNome || Object.keys(errors).length > 0) {
      setQuickPassengerErrors(errors);
      return;
    }

    if (isAddressExpanded && !trimmedEndereco) {
      toast.error('Informe o endereço completo ou recolha a seção de endereço para salvar sem endereço.');
      return;
    }

    const enderecos = trimmedEndereco
      ? [
          {
            rotulo: quickPassengerForm.rotulo.trim(),
            referencia: quickPassengerForm.referencia.trim(),
            enderecoCompleto: trimmedEndereco
          }
        ]
      : [];

    try {
      const novoPassageiro = await addPassageiro({
        nomeCompleto: trimmedNome,
        celular: quickPassengerForm.celular.trim(),
        notificar: quickPassengerForm.notificar === 'Sim',
        enderecos
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
      await addOS(finalData);
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

  const currentImposto = formData.valorBruto * (impostoPercentual / 100);
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
      const searchValue = osTable.searchTerm.toLowerCase().trim();
      const matchSearch = searchValue === '' ||
        item.os.toLowerCase().includes(searchValue) ||
        item.protocolo.toLowerCase().includes(searchValue) ||
        clienteNome.toLowerCase().includes(searchValue) ||
        item.trecho.toLowerCase().includes(searchValue) ||
        item.motorista.toLowerCase().includes(searchValue);
      if (!matchSearch) return false;

      if (advancedFilters.osNumber && !item.os.toLowerCase().includes(advancedFilters.osNumber.toLowerCase())) return false;
      if (advancedFilters.clienteId && item.clienteId !== advancedFilters.clienteId) return false;
      if (advancedFilters.centroCustoId && item.centroCustoId !== advancedFilters.centroCustoId) return false;
      if (advancedFilters.solicitante && !item.solicitante.toLowerCase().includes(advancedFilters.solicitante.toLowerCase())) return false;
      if (advancedFilters.motorista && !item.motorista.toLowerCase().includes(advancedFilters.motorista.toLowerCase())) return false;
      if (advancedFilters.veiculoId && item.veiculoId !== advancedFilters.veiculoId) return false;
      if (advancedFilters.passageiro) {
        const passageirosOS = item.rota?.waypoints?.flatMap(w => w.passengers.map(p => p.nome.toLowerCase())) || [];
        if (!passageirosOS.some(p => p.includes(advancedFilters.passageiro.toLowerCase()))) return false;
      }
      if (advancedFilters.dataInicio && item.data < advancedFilters.dataInicio) return false;
      if (advancedFilters.dataFim && item.data > advancedFilters.dataFim) return false;
      if (advancedFilters.statusOperacional && item.status.operacional !== advancedFilters.statusOperacional) return false;
      if (advancedFilters.statusFinanceiro && item.status.financeiro !== advancedFilters.statusFinanceiro) return false;

      return true;
    });
  }, [osList, clientes, osTable.searchTerm, advancedFilters]);

  const hasActiveAdvancedFilters = useMemo(() => {
    return Object.values(advancedFilters).some(v => v !== '');
  }, [advancedFilters]);

  const clientPageSize = 10;
  const clientPaginatedItems = useMemo(() => {
    const start = (clientPage - 1) * clientPageSize;
    return filteredData.slice(start, start + clientPageSize);
  }, [filteredData, clientPage]);

  const tableItems = useMemo(() => {
    if (hasActiveAdvancedFilters) return clientPaginatedItems;
    const start = (osTable.page - 1) * osTable.pageSize;
    return filteredData.slice(start, start + osTable.pageSize);
  }, [hasActiveAdvancedFilters, clientPaginatedItems, filteredData, osTable.page, osTable.pageSize]);

  const tableTotalCount = useMemo(() => filteredData.length, [filteredData]);

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
      <div className="flex flex-col gap-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          {/* Campo de busca (sempre visível) */}
          <div className="relative group flex-1">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.3-4.3"></path>
            </svg>
            <input
              type="text"
              placeholder="Pesquisar por Motorista, Trecho ou OS..."
              className="w-full pl-12 pr-6 py-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 font-bold text-sm transition-all"
              value={osTable.searchTerm}
              onChange={(e) => osTable.setSearchTerm(e.target.value)}
            />
          </div>

          {/* Botão Filtros Avançados */}
          <button
            onClick={() => setShowAdvancedFilters(prev => !prev)}
            className={`flex items-center gap-2 px-4 py-3.5 rounded-2xl font-bold text-sm uppercase tracking-widest transition-all shadow-sm border cursor-pointer shrink-0 ${
              hasActiveAdvancedFilters || showAdvancedFilters
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {hasActiveAdvancedFilters ? <Filter size={16} /> : <FilterX size={16} />}
            Filtros
            {hasActiveAdvancedFilters && (
              <span className="ml-1 inline-flex items-center justify-center w-5 h-5 bg-blue-600 text-white text-[10px] font-black rounded-full">
                {Object.values(advancedFilters).filter(v => v !== '').length}
              </span>
            )}
          </button>

          {/* Status do WhatsApp WAHA */}
          <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm shrink-0">
          <div className="flex items-center gap-2.5 px-3 py-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${
              wppStatus === 'open' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
              wppStatus === 'connecting' ? 'bg-amber-500 animate-pulse' : 
              'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
            }`} />
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">WhatsApp</span>
              <span className={`text-[11px] font-bold leading-none ${
                wppStatus === 'open' ? 'text-emerald-600' : 
                wppStatus === 'connecting' ? 'text-amber-600' : 
                'text-rose-600'
              }`}>
                {wppStatus === 'open' ? 'Online' : wppStatus === 'connecting' ? 'Conectando' : 'Offline'}
              </span>
            </div>
          </div>
          
        </div>

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
      </div>

      {/* Painel de Filtros Avançados */}
      {showAdvancedFilters && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-600">Filtros Avançados</h3>
            {hasActiveAdvancedFilters && (
              <button
                onClick={() => setAdvancedFilters(defaultAdvancedFilters)}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Limpar filtros
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* OS */}
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Número OS</label>
              <input
                type="text"
                value={advancedFilters.osNumber}
                onChange={(e) => setAdvancedFilters(prev => ({ ...prev, osNumber: e.target.value }))}
                placeholder="Ex: 00123"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
              />
            </div>
            {/* Empresa */}
            <GeologSearchableSelect
              label="Empresa"
              options={[{ id: '', nome: 'Todas' }, ...clientes.map(c => ({ id: c.id, nome: c.nome }))]}
              value={advancedFilters.clienteId}
              onChange={(id) => setAdvancedFilters(prev => ({ ...prev, clienteId: id, centroCustoId: '' }))}
              compact
              disableSearch={false}
            />
            {/* Centro de Custo */}
            <GeologSearchableSelect
              label="Centro de Custo"
              options={[
                { id: '', nome: 'Todos' },
                ...(advancedFilters.clienteId ? getCentrosCustoByCliente(advancedFilters.clienteId) : []).map(cc => ({ id: cc.id, nome: cc.nome }))
              ]}
              value={advancedFilters.centroCustoId}
              onChange={(id) => setAdvancedFilters(prev => ({ ...prev, centroCustoId: id }))}
              disabled={!advancedFilters.clienteId}
              compact
              disableSearch={false}
            />
            {/* Solicitante */}
            <GeologSearchableSelect
              label="Solicitante"
              options={[
                { id: '', nome: 'Todos' },
                ...solicitantes
                  .filter(s => !advancedFilters.clienteId || s.clienteId === advancedFilters.clienteId)
                  .map(s => ({ id: s.nome, nome: s.nome }))
              ]}
              value={advancedFilters.solicitante}
              onChange={(id) => setAdvancedFilters(prev => ({ ...prev, solicitante: id }))}
              compact
              disableSearch={false}
            />
            {/* Motorista */}
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Motorista</label>
              <input
                type="text"
                value={advancedFilters.motorista}
                onChange={(e) => setAdvancedFilters(prev => ({ ...prev, motorista: e.target.value }))}
                placeholder="Nome do motorista..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
              />
            </div>
            {/* Veículo */}
            <GeologSearchableSelect
              label="Veículo"
              options={[
                { id: '', nome: 'Todos' },
                ...vehicles.map(v => ({ id: v.id, nome: `${v.marca} ${v.modelo} — ${v.placa}` }))
              ]}
              value={advancedFilters.veiculoId}
              onChange={(id) => setAdvancedFilters(prev => ({ ...prev, veiculoId: id }))}
              compact
              disableSearch={false}
            />
            {/* Passageiro */}
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Passageiro</label>
              <input
                type="text"
                value={advancedFilters.passageiro}
                onChange={(e) => setAdvancedFilters(prev => ({ ...prev, passageiro: e.target.value }))}
                placeholder="Nome do passageiro..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
              />
            </div>
            {/* Data Início */}
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Data Início</label>
              <input
                type="date"
                value={advancedFilters.dataInicio}
                onChange={(e) => setAdvancedFilters(prev => ({ ...prev, dataInicio: e.target.value }))}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
              />
            </div>
            {/* Data Fim */}
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Data Fim</label>
              <input
                type="date"
                value={advancedFilters.dataFim}
                onChange={(e) => setAdvancedFilters(prev => ({ ...prev, dataFim: e.target.value }))}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
              />
            </div>
            {/* Status Operacional */}
            <GeologSearchableSelect
              label="Status Operacional"
              options={[
                { id: '', nome: 'Todos' },
                { id: 'Pendente', nome: 'Pendente' },
                { id: 'Aguardando', nome: 'Aguardando' },
                { id: 'Em Rota', nome: 'Em Rota' },
                { id: 'Finalizado', nome: 'Finalizado' },
                { id: 'Cancelado', nome: 'Cancelado' },
              ]}
              value={advancedFilters.statusOperacional}
              onChange={(id) => setAdvancedFilters(prev => ({ ...prev, statusOperacional: id as AdvancedFilters['statusOperacional'] }))}
              compact
              disableSearch={false}
            />
            {/* Status Financeiro */}
            <GeologSearchableSelect
              label="Status Financeiro"
              options={[
                { id: '', nome: 'Todos' },
                { id: 'Pendente', nome: 'Pendente' },
                { id: 'Pago', nome: 'Pago' },
                { id: 'Faturado', nome: 'Faturado' },
              ]}
              value={advancedFilters.statusFinanceiro}
              onChange={(id) => setAdvancedFilters(prev => ({ ...prev, statusFinanceiro: id as AdvancedFilters['statusFinanceiro'] }))}
              compact
              disableSearch={false}
            />
          </div>
        </div>
      )}

      {/* Conteúdo: Tabela ou Calendário */}
      {viewMode === 'table' ? (
        <DataTable
          data={tableItems}
          loading={dataLoading && !hasActiveAdvancedFilters}
          disableClientSearch
          pagination={hasActiveAdvancedFilters ? {
            page: clientPage,
            pageSize: clientPageSize,
            totalItems: filteredData.length,
            onPageChange: setClientPage,
          } : {
            page: osTable.page,
            pageSize: osTable.pageSize,
            totalItems: tableTotalCount,
            onPageChange: osTable.setPage,
          }}
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
              width: '380px',
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
              width: '200px',
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
              width: '250px',
              render: (value: unknown, item: OrderService) => {
                void value;

                const motoristaParts = String(item.motorista).trim().split(/\s+/).filter(Boolean);
                const motoristaNomeCurto = motoristaParts.length > 1
                  ? `${motoristaParts[0]} ${motoristaParts[1]}`
                  : motoristaParts[0] || '—';

                return (
                <div className="flex items-center gap-3">
                  <User size={14} className="text-blue-500" />
                  <span className="text-base font-bold">{motoristaNomeCurto}</span>
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
                    className="inline-flex items-center justify-center w-10 h-10 rounded-2xl border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm cursor-pointer"
                    aria-haspopup="true"
                    aria-expanded={openActionMenuId === item.id}
                  >
                    <MoreVertical size={18} />
                  </button>
                  {openActionMenuId === item.id && (() => {
                    const rect = actionMenuRefs.current[item.id]?.getBoundingClientRect();
                    if (!rect) return null;
                    const menuHeight = 200; // Altura aproximada do menu
                    const spaceBelow = window.innerHeight - rect.bottom;
                    const shouldOpenUp = spaceBelow < menuHeight + 16;
                    return (
                      <div
                        className="fixed min-w-[200px] bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 space-y-1 z-[9999]"
                        style={{
                          top: shouldOpenUp ? rect.top - menuHeight - 8 : rect.bottom + 8,
                          right: window.innerWidth - rect.right
                        }}
                      >
                        <button
                          onClick={() => handleViewOS(item.id)}
                          className="group w-full px-4 py-2 text-left text-sm font-bold text-slate-700 rounded-xl hover:bg-cyan-50 hover:text-cyan-600 flex items-center gap-3 cursor-pointer"
                        >
                          <Eye size={16} className="text-slate-400 group-hover:text-cyan-600" />
                          Visualizar
                        </button>
                        <button
                          onClick={() => handleEditOS(item.id)}
                          className="group w-full px-4 py-2 text-left text-sm font-bold text-slate-700 rounded-xl hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3 cursor-pointer"
                        >
                          <Pencil size={16} className="text-slate-400 group-hover:text-blue-600" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleReopenOS(item.id)}
                          className="group w-full px-4 py-2 text-left text-sm font-bold text-slate-700 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 flex items-center gap-3 cursor-pointer"
                        >
                          <RotateCcw size={16} className="text-slate-400 group-hover:text-emerald-600" />
                          Reabrir
                        </button>
                        <button
                          onClick={() => handleCancelOS(item.id)}
                          className="group w-full px-4 py-2 text-left text-sm font-bold text-slate-700 rounded-xl hover:bg-slate-100 hover:text-slate-600 flex items-center gap-3 cursor-pointer"
                        >
                          <XOctagon size={16} className="text-slate-400 group-hover:text-slate-600" />
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleDeleteOS(item.id)}
                          className="group w-full px-4 py-2 text-left text-sm font-bold rounded-xl bg-rose-50 hover:bg-rose-100 flex items-center gap-3 cursor-pointer"
                          style={{ color: 'rgb(219, 132, 153)' }}
                        >
                          <XOctagon size={16} style={{ color: 'rgb(219, 132, 153)' }} />
                          Excluir
                        </button>
                      </div>
                    );
                  })()}
                </div>
                );
              }
            }
          ]}
          searchPlaceholder=""
          emptyMessage="Nenhuma OS encontrada."
          emptyIcon={<Truck size={48} />}
          showHeader={false}
        />
      ) : (
        <>
          <OSCalendar 
            osList={filteredData} 
            clientes={clientes}
            onEventClick={(osId: string, position?: { x: number; y: number }) => {
              setOpenActionMenuId(osId);
              setCalendarMenuPosition(position || null);
            }}
          />
          
          {/* Menu de Ações para o Calendário */}
          {viewMode === 'calendar' && openActionMenuId && calendarMenuPosition && (() => {
            const osId = openActionMenuId;
            const menuHeight = 200;
            const spaceBelow = window.innerHeight - calendarMenuPosition.y;
            const shouldOpenUp = spaceBelow < menuHeight + 16;
            return (
              <div
                ref={calendarMenuRef}
                className="fixed min-w-[200px] bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 space-y-1 z-[9999]"
                style={{
                  top: shouldOpenUp ? calendarMenuPosition.y - menuHeight - 8 : calendarMenuPosition.y + 8,
                  left: calendarMenuPosition.x
                }}
              >
                <button
                  onClick={() => { handleViewOS(osId); setCalendarMenuPosition(null); }}
                  className="group w-full px-4 py-2 text-left text-sm font-bold text-slate-700 rounded-xl hover:bg-cyan-50 hover:text-cyan-600 flex items-center gap-3 cursor-pointer"
                >
                  <Eye size={16} className="text-slate-400 group-hover:text-cyan-600" />
                  Visualizar
                </button>
                <button
                  onClick={() => { handleEditOS(osId); setCalendarMenuPosition(null); }}
                  className="group w-full px-4 py-2 text-left text-sm font-bold text-slate-700 rounded-xl hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3 cursor-pointer"
                >
                  <Pencil size={16} className="text-slate-400 group-hover:text-blue-600" />
                  Editar
                </button>
                <button
                  onClick={() => { handleReopenOS(osId); setCalendarMenuPosition(null); }}
                  className="group w-full px-4 py-2 text-left text-sm font-bold text-slate-700 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 flex items-center gap-3 cursor-pointer"
                >
                  <RotateCcw size={16} className="text-slate-400 group-hover:text-emerald-600" />
                  Reabrir
                </button>
                <button
                  onClick={() => { handleCancelOS(osId); setCalendarMenuPosition(null); }}
                  className="group w-full px-4 py-2 text-left text-sm font-bold text-slate-700 rounded-xl hover:bg-slate-100 hover:text-slate-600 flex items-center gap-3 cursor-pointer"
                >
                  <XOctagon size={16} className="text-slate-400 group-hover:text-slate-600" />
                  Cancelar
                </button>
                <button
                  onClick={() => { handleDeleteOS(osId); setCalendarMenuPosition(null); }}
                  className="group w-full px-4 py-2 text-left text-sm font-bold rounded-xl bg-rose-50 hover:bg-rose-100 flex items-center gap-3 cursor-pointer"
                  style={{ color: 'rgb(219, 132, 153)' }}
                >
                  <XOctagon size={16} style={{ color: 'rgb(219, 132, 153)' }} />
                  Excluir
                </button>
              </div>
            );
          })()}
        </>
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
                                    <div className="space-y-4">
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
                                                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm pr-36"
                                             />
                                             <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
                                                <button
                                                  type="button"
                                                  onClick={() => toggleWaypointComment(index)}
                                                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-all cursor-pointer ${openWaypointComments[index] || waypoint.comment.trim() ? 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600'}`}
                                                  title="Adicionar observação"
                                                >
                                                  <MessageSquareMore size={16} />
                                                </button>
                                                <MapPin size={18} className="text-slate-300" />
                                                <button 
                                                   type="button" 
                                                   onClick={() => handleAddPassenger(index)}
                                                   className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all flex items-center justify-center shadow-sm border border-blue-100 cursor-pointer"
                                                   title="Adicionar Passageiro"
                                                >
                                                   <Plus size={18} />
                                                </button>
                                             </div>
                                          </div>
                                          {openWaypointComments[index] && (
                                            <div className="mt-3 ml-1">
                                              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                                                Observação do trajeto
                                              </label>
                                              <textarea
                                                value={waypoint.comment}
                                                onChange={(e) => handleWaypointCommentChange(index, e.target.value)}
                                                rows={2}
                                                placeholder="Ex: aguardar na portaria, desembarque pela lateral..."
                                                className="w-full resize-none rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-blue-600 focus:bg-white shadow-sm"
                                              />
                                            </div>
                                          )}
                                       </div>
                                    </div>

                                    {/* Botão Remover Parada - apenas para paradas intermediárias */}
                                    {formData.waypoints.length > 2 && (
                                       <div className="flex items-center justify-end pt-1">
                                          <button
                                             type="button"
                                             onClick={() => handleRemoveWaypoint(index)}
                                             className="p-2 bg-red-50 text-red-400 rounded-lg hover:bg-red-100 transition-all flex items-center justify-center shadow-sm border border-red-100 cursor-pointer"
                                             title="Remover Parada"
                                          >
                                             <X size={18} />
                                          </button>
                                       </div>
                                    )}

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
                                    <span className="text-[12px] font-black">-{impostoPercentual}% taxa</span>
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
          maxWidthClassName="max-w-6xl"
        >
          <form onSubmit={handleQuickPassengerSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-25 gap-6">
              <div className="space-y-2 md:col-span-12">
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
                <div className="flex justify-between items-center">
                  <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">Celular <RequiredAsterisk /></label>
                  <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-lg px-3 py-1" style={{ marginTop: '-7px' }}>
                    <input
                      type="checkbox"
                      id="isEstrangeiroQuick"
                      checked={isEstrangeiro}
                      onChange={(e) => {
                        setIsEstrangeiro(e.target.checked);
                        setQuickPassengerForm(prev => ({ ...prev, celular: '' }));
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="isEstrangeiroQuick" className="text-xs font-bold text-slate-700 cursor-pointer">Estrangeiro</label>
                  </div>
                </div>
                <input
                  required={!isEstrangeiro}
                  value={quickPassengerForm.celular}
                  onChange={(e) => {
                    const formatted = formatPhone(e.target.value);
                    setQuickPassengerForm(prev => ({ ...prev, celular: formatted }));
                  }}
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                  placeholder={isEstrangeiro ? "+00 123456789" : "(00) 00000-0000"}
                />
                {quickPassengerErrors.celular && (
                  <p className="text-xs font-semibold text-rose-400 ml-1">{quickPassengerErrors.celular}</p>
                )}
              </div>
              <div className="space-y-2 md:col-span-5">
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
          onClose={() => {
            setViewingOSId(null);
            void refreshData();
          }}
          title={`Visão Operacional ${viewingOS.os || 'Sem OS'}`}
          subtitle={`Protocolo ${viewingOS.protocolo}`}
          icon={<Eye size={24} />}
          maxWidthClassName="max-w-6xl min-[1360px]:max-w-[88vw]"
          bodyClassName="p-6 md:p-10 space-y-8"
        >
          <div className="space-y-8">
            {/* Barra de Resumo: Dados + Status/Horário separados */}
            <div className="flex flex-col md:flex-row gap-3">
              {/* Coluna principal — dados da OS */}
              <div className="flex-1 flex flex-wrap items-center gap-y-3 gap-x-1 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3">
                <div className="flex items-center gap-2 px-3">
                  <Building2 size={14} className="text-slate-400 shrink-0" />
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Cliente</p>
                    <p className="text-base font-bold text-slate-800 line-clamp-1">{clientes.find(c => c.id === viewingOS.clienteId)?.nome || 'N/A'}</p>
                  </div>
                </div>
                <div className="h-8 w-px bg-slate-200 mx-1 hidden lg:block" />

                <div className="flex items-center gap-2 px-3">
                  <User size={14} className="text-slate-400 shrink-0" />
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Solicitante</p>
                    <p className="text-base font-bold text-slate-800 line-clamp-1">{viewingOS.solicitante || 'N/A'}</p>
                  </div>
                </div>
                <div className="h-8 w-px bg-slate-200 mx-1 hidden lg:block" />

                <div className="flex items-center gap-2 px-3">
                  <Car size={14} className="text-slate-400 shrink-0" />
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Motorista</p>
                    <p className="text-base font-bold text-slate-800 line-clamp-1">{viewingOS.motorista || 'Não definido'}</p>
                  </div>
                </div>
                <div className="h-8 w-px bg-slate-200 mx-1 hidden lg:block" />

                <div className="flex items-center gap-2 px-3">
                  <Building size={14} className="text-slate-400 shrink-0" />
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">C. Custo</p>
                    <p className="text-base font-bold text-slate-800 line-clamp-1">
                      {clientes.find(c => c.id === viewingOS.clienteId)?.centrosCusto.find(cc => cc.id === viewingOS.centroCustoId)?.nome || 'Padrão'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Coluna lateral — Status + Horário em cards */}
              <div className="flex items-stretch gap-3">
                {/* Card de Status */}
                <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border shadow-sm ${
                  viewingOS.status.operacional === 'Pendente' ? 'bg-yellow-50 border-yellow-200' :
                  viewingOS.status.operacional === 'Aguardando' ? 'bg-indigo-50 border-indigo-200' :
                  viewingOS.status.operacional === 'Em Rota' ? 'bg-sky-50 border-sky-200' :
                  viewingOS.status.operacional === 'Finalizado' ? 'bg-emerald-50 border-emerald-200' :
                  viewingOS.status.operacional === 'Cancelado' ? 'bg-rose-50 border-rose-200' :
                  'bg-slate-50 border-slate-200'
                }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    viewingOS.status.operacional === 'Pendente' ? 'bg-yellow-100' :
                    viewingOS.status.operacional === 'Aguardando' ? 'bg-indigo-100' :
                    viewingOS.status.operacional === 'Em Rota' ? 'bg-sky-100' :
                    viewingOS.status.operacional === 'Finalizado' ? 'bg-emerald-100' :
                    viewingOS.status.operacional === 'Cancelado' ? 'bg-rose-100' :
                    'bg-slate-100'
                  }`}>
                    <CheckCircle2 size={18} className={
                      viewingOS.status.operacional === 'Pendente' ? 'text-yellow-600' :
                      viewingOS.status.operacional === 'Aguardando' ? 'text-indigo-600' :
                      viewingOS.status.operacional === 'Em Rota' ? 'text-sky-600' :
                      viewingOS.status.operacional === 'Finalizado' ? 'text-emerald-600' :
                      viewingOS.status.operacional === 'Cancelado' ? 'text-rose-600' :
                      'text-slate-600'
                    } />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status</p>
                    <p className={`text-base font-black ${
                      viewingOS.status.operacional === 'Pendente' ? 'text-yellow-700' :
                      viewingOS.status.operacional === 'Aguardando' ? 'text-indigo-700' :
                      viewingOS.status.operacional === 'Em Rota' ? 'text-sky-700' :
                      viewingOS.status.operacional === 'Finalizado' ? 'text-emerald-700' :
                      viewingOS.status.operacional === 'Cancelado' ? 'text-rose-700' :
                      'text-slate-700'
                    }`}>{getStatusConfig(viewingOS.status.operacional).label}</p>
                  </div>
                </div>

                {/* Card de Horário */}
                <div className="flex items-center gap-3 px-5 py-3 rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Clock size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Horário</p>
                    <p className="text-base font-black text-slate-800">{viewingOS.hora ? viewingOS.hora.slice(0, 5) : '--:--'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
              {/* Status da Operação - 100% Width */}
              <div className="rounded-[2rem] border border-slate-200 bg-white p-8 space-y-8 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-[0.1em]">Status da Operação</h3>
                    <p className="text-sm font-semibold text-slate-400 mt-1">Acompanhamento em tempo real da jornada do motorista.</p>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">
                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                    Em execução
                  </div>
                </div>

                <div className="relative flex justify-between items-start px-4">
                  {/* Linha de fundo da trilha */}
                  <div className="absolute top-[26px] left-[60px] right-[60px] h-[3px] bg-slate-100 rounded-full -z-0">
                    <div 
                      className="h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(81,222,255,0.3)]"
                      style={{ 
                        width: driverFlow.finished ? '100%' : driverFlow.started ? '66%' : driverFlow.accepted ? '33%' : driverFlow.received ? '0%' : '0%',
                        background: 'linear-gradient(to right, rgb(81, 222, 255), rgb(26, 238, 172), #2563eb, #10b981)'
                      }}
                    ></div>
                  </div>

                  {/* Steps */}
                  {[
                    {
                      id: 'received',
                      icon: <MessageCircle size={20} />,
                      label: 'Mensagem',
                      sublabel: 'Enviada',
                      active: driverFlow.received,
                      color: 'blue-light',
                      timestamp: viewingOS?.driverMessageSentAt,
                      km: undefined as number | undefined,
                    },
                    {
                      id: 'accepted',
                      icon: <CheckCircle2 size={20} />,
                      label: 'Aceite',
                      sublabel: driverFlow.accepted ? 'Confirmado' : 'Aguardando',
                      active: driverFlow.accepted,
                      color: 'emerald-light',
                      timestamp: viewingOS?.driverAcceptedAt,
                      km: viewingOS?.driverKmInitial,
                    },
                    {
                      id: 'started',
                      icon: <Navigation size={20} />,
                      label: 'Em Rota',
                      sublabel: driverFlow.started ? 'Iniciado' : 'Pendente',
                      active: driverFlow.started,
                      color: 'blue',
                      timestamp: viewingOS?.routeStartedAt,
                      km: viewingOS?.routeStartedKm ?? viewingOS?.driverKmInitial,
                    },
                    {
                      id: 'finished',
                      icon: <FileText size={20} />,
                      label: 'Concluído',
                      sublabel: driverFlow.finished ? 'Finalizado' : 'Em aberto',
                      active: driverFlow.finished,
                      color: 'emerald',
                      timestamp: viewingOS?.routeFinishedAt,
                      km: viewingOS?.routeFinishedKm,
                    },
                  ].map((step) => (
                    <button
                      key={step.id}
                      type="button"
                      className="relative z-10 flex flex-col items-center group cursor-pointer"
                      onClick={() => {
                        if (step.id === 'received' && viewingOS) {
                          if (wppStatus !== 'open') {
                            toast.error("O WhatsApp da Geolog está offline. Verifique a conexão.");
                            return;
                          }
                          sendWhatsAppNotification(viewingOS);
                        } else {
                          toast.info(`Etapa: ${step.label} - ${step.sublabel}`);
                        }
                      }}
                      disabled={notifyLoadingKey === 'driver-whatsapp'}
                    >
                      <div 
                        className={`
                          w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-lg
                          ${!step.active ? 'bg-white border-2 border-slate-200 text-slate-400 group-hover:border-slate-300' : 'text-white'}
                          group-hover:scale-110 group-active:scale-95
                          ${notifyLoadingKey === 'driver-whatsapp' && step.id === 'received' ? 'animate-pulse' : ''}
                        `}
                        style={step.active ? {
                          backgroundColor: step.color === 'blue-light' ? 'rgb(81, 222, 255)' 
                            : step.color === 'emerald-light' ? 'rgb(26, 238, 172)'
                            : step.color === 'blue' ? '#2563eb'
                            : '#10b981',
                          boxShadow: `0 10px 15px -3px ${
                            step.color === 'blue-light' ? 'rgba(81, 222, 255, 0.4)' 
                            : step.color === 'emerald-light' ? 'rgba(26, 238, 172, 0.4)'
                            : step.color === 'blue' ? 'rgba(37, 99, 235, 0.4)'
                            : 'rgba(16, 185, 129, 0.4)'
                          }`
                        } : {}}
                      >
                        {notifyLoadingKey === 'driver-whatsapp' && step.id === 'received' ? (
                          <Loader2 size={24} className="animate-spin" />
                        ) : step.icon}
                      </div>
                      
                      <div className="mt-4 text-center space-y-1">
                        <p className={`text-[11px] font-black uppercase tracking-[0.15em] transition-colors ${step.active ? 'text-slate-900' : 'text-slate-400'}`}>
                          {step.label}
                        </p>
                        <p className={`text-[10px] font-bold transition-colors ${step.active ? 'text-slate-500' : 'text-slate-300'}`}>
                          {step.sublabel}
                        </p>
                        {step.timestamp && (
                          <p className="text-[9px] font-medium text-slate-400">
                            {new Date(step.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                        {typeof step.km === 'number' && (
                          <p className="text-[9px] font-black text-slate-600">
                            KM: {step.km.toLocaleString('pt-BR')}
                          </p>
                        )}
                      </div>

                      {step.active && (
                        <div 
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center"
                          style={{
                            backgroundColor: step.color === 'blue-light' ? 'rgb(81, 222, 255)' 
                              : step.color === 'emerald-light' ? 'rgb(26, 238, 172)'
                              : step.color === 'blue' ? '#2563eb'
                              : '#10b981'
                          }}
                        >
                          <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid para Trajeto e Resumo - Agora lado a lado */}
              <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-8 items-stretch">
                {/* Trajeto do Atendimento */}
                <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <MapPin className="text-blue-600" size={22} />
                      <div>
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-[0.08em]">Trajeto do Atendimento</h3>
                        <p className="text-sm font-semibold text-slate-400 mt-1">Pontos de parada e rota definida para esta OS.</p>
                      </div>
                    </div>
                  </div>

                  <div className="relative flex flex-col gap-8 ml-4">
                    {/* Linha vertical conectando os pontos */}
                    <div className="absolute left-[11px] top-2 bottom-2 w-0.5 border-l-2 border-dashed border-slate-200"></div>

                    {(viewingOS.rota?.waypoints || []).map((waypoint, idx) => {
                      const isFirst = idx === 0;
                      const isLast = idx === (viewingOS.rota?.waypoints?.length || 0) - 1;
                      
                      return (
                        <div key={idx} className="relative flex items-center gap-6 group">
                          <div className={`
                            relative z-10 w-6 h-6 rounded-full border-4 border-white shadow-md transition-all duration-300
                            ${isFirst ? 'bg-emerald-500 scale-125' : isLast ? 'bg-blue-600 scale-125' : 'bg-slate-300'}
                            group-hover:scale-150
                          `}></div>
                          <div className={`
                            flex-1 p-4 rounded-2xl border transition-all duration-300
                            ${isFirst ? 'bg-emerald-50 border-emerald-100' : isLast ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'}
                            group-hover:shadow-md group-hover:bg-white
                          `}>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                              {isFirst ? 'Origem' : isLast ? 'Destino Final' : `Parada ${idx}`}
                            </p>
                            <p className="text-sm font-black text-slate-800 uppercase tracking-tight">
                              {waypoint.label}
                            </p>
                            {waypoint.comment && (
                              <p className="mt-2 text-xs font-semibold text-slate-500 bg-white/50 p-2 rounded-lg border border-slate-100 italic">
                                &quot;{waypoint.comment}&quot;
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Resumo de Contatos - Mesma altura que o Trajeto */}
                <div className="rounded-[2rem] border border-slate-200 bg-white p-8 space-y-6 shadow-sm h-full flex flex-col">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <Users className="text-blue-600" size={22} />
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-[0.08em]">Resumo do Itinerário</h3>
                  </div>
                  
                  <div className="space-y-4 flex-1 flex flex-col">
                    <div className="p-5 rounded-3xl bg-blue-50 border border-blue-100 h-full flex flex-col justify-center">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-3">Itinerário Simplificado</p>
                      <p className="text-sm font-black text-blue-900 leading-relaxed uppercase">
                        {viewingOS.trecho}
                      </p>
                    </div>
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
                <div className="overflow-hidden rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/40">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200">
                          <th className="px-6 py-4 text-left text-[12px] font-black uppercase tracking-widest text-slate-600 w-[25%]">Passageiro</th>
                          <th className="px-6 py-4 text-left text-[12px] font-black uppercase tracking-widest text-slate-600 w-[20%]">Contato</th>
                          <th className="px-6 py-4 text-left text-[12px] font-black uppercase tracking-widest text-slate-600 w-[40%]">Endereço</th>
                          <th className="px-6 py-4 text-left text-[12px] font-black uppercase tracking-widest text-slate-600 w-[15%]">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {operationalPassengerList.map((passenger) => (
                          <tr
                            key={passenger.key}
                            className="hover:bg-slate-50/50 transition-colors cursor-default group"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                                  <User size={18} className="text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-800">{passenger.nome}</p>
                                  <p className="text-xs font-semibold text-slate-400 mt-0.5">{passenger.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <MessageCircle size={14} className="text-slate-400 shrink-0" />
                                <p className="text-sm font-semibold text-slate-600">{passenger.celular}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-start gap-2 max-w-[280px]">
                                <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                                <p className="text-sm font-medium text-slate-600 line-clamp-2">{passenger.endereco}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {passengerConfirmations[passenger.solicitanteId] ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] bg-green-50 border-green-200 text-green-700">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                  Confirmado
                                </span>
                              ) : viewingOS.status.operacional === 'Pendente' ? (
                                <div className="relative inline-block">
                                  <button
                                    type="button"
                                    data-notify-button
                                    onClick={(e) => {
                                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                      setNotifyMenuPosition({ x: rect.left, y: rect.top });
                                      setOpenNotifyMenuKey(openNotifyMenuKey === passenger.key ? null : passenger.key);
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                                    title="Abrir opções de notificação"
                                  >
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                    Aguardando
                                    <ChevronDown size={12} />
                                  </button>
                                  {openNotifyMenuKey === passenger.key && notifyMenuPosition && (
                                    <div
                                      data-notify-menu
                                      style={{
                                        position: 'fixed',
                                        left: notifyMenuPosition.x,
                                        bottom: typeof window !== 'undefined' ? window.innerHeight - notifyMenuPosition.y + 8 : 0,
                                        transform: 'translateX(-25%)',
                                      }}
                                      className="z-[9999] min-w-[220px] bg-white rounded-2xl border border-slate-200 shadow-xl p-2 space-y-1"
                                    >
                                      <p className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                        <Bell size={12} />
                                        Notificar passageiro
                                      </p>
                                      {passenger.hasEmail && (
                                        <button
                                          type="button"
                                          onClick={() => handleNotifyPassenger(passenger.key, 'email', passenger)}
                                          disabled={!!notifyLoadingKey}
                                          className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                                        >
                                          <Mail size={14} />
                                          {notifyLoadingKey === passenger.key ? 'Enviando...' : 'Por e-mail'}
                                        </button>
                                      )}
                                      {passenger.hasPhone && (
                                        <button
                                          type="button"
                                          onClick={() => handleNotifyPassenger(passenger.key, 'whatsapp', passenger)}
                                          disabled={!!notifyLoadingKey}
                                          className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-green-50 hover:text-green-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                                        >
                                          <Smartphone size={14} />
                                          {notifyLoadingKey === passenger.key ? 'Enviando...' : 'Por celular'}
                                        </button>
                                      )}
                                      {passenger.hasEmail && passenger.hasPhone && (
                                        <button
                                          type="button"
                                          onClick={() => handleNotifyPassenger(passenger.key, 'both', passenger)}
                                          disabled={!!notifyLoadingKey}
                                          className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                                        >
                                          <Send size={14} />
                                          {notifyLoadingKey === passenger.key ? 'Enviando...' : 'Ambos'}
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] bg-emerald-50 border-emerald-200 text-emerald-700">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Ativo
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
                    <div className="space-y-2 w-full md:w-[45%]">
                      <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Nome completo <span className="text-rose-300 text-base">*</span></label>
                      <input
                        required
                        placeholder="Ex: João Silva da Rocha"
                        value={quickAddDriverForm.name}
                        onChange={e => setQuickAddDriverForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                      />
                    </div>
                    <div className="space-y-2 w-full md:w-48">
                      <GeologSearchableSelect
                        label="Tipo"
                        options={tipoDocumentoOptions}
                        value={quickAddDriverForm.tipo_documento}
                        onChange={(value) => setQuickAddDriverForm(prev => ({ ...prev, tipo_documento: value as 'cpf' | 'passaporte', cpf: formatDriverDocument(prev.cpf, value as 'cpf' | 'passaporte') }))}
                        required
                      />
                    </div>
                    <div className="space-y-2 w-full md:w-40">
                      <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{getDriverDocumentLabel(quickAddDriverForm.tipo_documento)} <span className="text-rose-300 text-base">*</span></label>
                      <input
                        required
                        placeholder={getDriverDocumentPlaceholder(quickAddDriverForm.tipo_documento)}
                        value={quickAddDriverForm.cpf}
                        onChange={e => setQuickAddDriverForm(prev => ({ ...prev, cpf: formatDriverDocument(e.target.value, prev.tipo_documento) }))}
                        className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                      />
                    </div>
                    <div className="space-y-2 w-full md:w-44">
                      <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Celular <span className="text-rose-300 text-base">*</span></label>
                      <input
                        required
                        placeholder="(00) 9XXXX-XXXX"
                        value={formatDriverCelular(quickAddDriverForm.celular)}
                        onChange={e => {
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
                  </div>
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    {quickAddDriverForm.vinculo_tipo === 'parceiro' && (
                      <div className="space-y-2 w-full md:w-[45%]">
                        <GeologSearchableSelect
                          label="Parceiro de serviço"
                          options={parceiroOptions}
                          value={quickAddDriverForm.parceiro_id}
                          onChange={(value) => setQuickAddDriverForm(prev => ({ ...prev, parceiro_id: value, vehicle_ids: [] }))}
                          placeholder="Selecione o parceiro..."
                          required
                          onQuickAdd={() => {
                            setQuickParceiroForm({
                              pessoaTipo: 'juridica',
                              documento: '',
                              razaoSocialOuNomeCompleto: '',
                              contatos: [{ setor: '', celular: '', email: '', responsavel: '' }],
                            });
                            setIsQuickParceiroModalOpen(true);
                          }}
                        />
                      </div>
                    )}
                    <div className="space-y-2 w-full md:w-auto">
                      <div className="flex gap-3 mt-7">
                        <button
                          type="button"
                          onClick={() => setQuickAddDriverForm(prev => ({ ...prev, vinculo_tipo: 'interno', parceiro_id: '', vehicle_ids: [], tipo_documento: 'cpf' }))}
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
                          onClick={() => setQuickAddDriverForm(prev => ({ ...prev, vinculo_tipo: 'parceiro', parceiro_id: '', vehicle_ids: [], tipo_documento: 'cpf' }))}
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
                </div>
              </section>

              {/* Seção de Veículos Vinculados */}
              <section className="space-y-6">
                <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4" style={{ paddingBottom: '1.25rem' }}>
                  <h3 className="text-[17px] font-black text-slate-900 uppercase tracking-[0.1em] flex items-center gap-3" style={{ lineHeight: '1.3' }}>
                    <Truck size={20} className="text-slate-500" /> Veículos Vinculados
                  </h3>
                  <button
                    type="button"
                    onClick={() => setQuickAddDriverForm(prev => ({ ...prev, vehicle_ids: [...prev.vehicle_ids, filteredQuickAddVehicles.find(v => !prev.vehicle_ids.includes(v.id))?.id || ''] }))}
                    disabled={filteredQuickAddVehicles.filter(v => !quickAddDriverForm.vehicle_ids.includes(v.id)).length === 0}
                    className="flex items-center gap-3 px-4 py-3 bg-blue-100 text-blue-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-200 transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PlusCircle size={14} /> Adicionar veículo
                  </button>
                </div>

                <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="hidden md:grid grid-cols-[2fr_2fr_auto] gap-4 bg-slate-50/80 border-b border-slate-200 px-6 py-4 text-[12px] font-black uppercase tracking-widest text-slate-600">
                    <span>Veículo</span>
                    <span className="ml-8">Placa</span>
                    <span className="text-right">Ações</span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-[30vh] overflow-y-auto custom-scrollbar">
                    {quickAddDriverForm.vehicle_ids.length === 0 && (
                      <div className="px-6 py-8 text-center text-slate-400 text-sm">
                        Nenhum veículo vinculado. Clique em &quot;Adicionar veículo&quot; acima.
                      </div>
                    )}
                    {quickAddDriverForm.vehicle_ids.map((vehicleId, index) => {
                      const vehicle = vehicles.find(v => v.id === vehicleId);
                      const availableVehiclesForThisRow = filteredQuickAddVehicles.filter(v =>
                        v.id === vehicleId || !quickAddDriverForm.vehicle_ids.includes(v.id)
                      );
                      return (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-[2fr_2fr_auto] gap-4 items-center px-6 py-4">
                          <div className="space-y-2">
                            <label className="md:hidden text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Veículo</label>
                            <GeologSearchableSelect
                              label=""
                              options={availableVehiclesForThisRow.map(v => ({
                                id: v.id,
                                nome: `${v.marca} ${v.modelo}`,
                                sublabel: v.placa
                              }))}
                              value={vehicleId}
                              onChange={(value) => setQuickAddDriverForm(prev => ({
                                ...prev,
                                vehicle_ids: prev.vehicle_ids.map((id, idx) => idx === index ? value : id)
                              }))}
                              placeholder="Selecione o veículo..."
                            />
                          </div>
                          <div className="space-y-1 ml-5">
                            <label className="md:hidden text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Placa</label>
                            <div className="w-[120px] bg-white border-2 border-slate-400 rounded-md overflow-hidden shadow-sm flex flex-col items-center">
                              <div className="w-full bg-blue-600 h-1" />
                              <div className="py-3 px-4 flex items-center justify-center">
                                <span className="text-[15px] font-black text-slate-900 uppercase tracking-widest leading-none">{vehicle?.placa || '—'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (!vehicleId) return;
                                const v = vehicles.find(veh => veh.id === vehicleId);
                                if (!v) return;
                                setVehicleQuickForm({ placa: v.placa, modelo: v.modelo, marca: v.marca, tipo: 'carro' });
                                setQuickVehicleModal({ mode: 'edit', rowIndex: index, vehicleId: v.id });
                              }}
                              disabled={!vehicleId}
                              className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              aria-label="Editar veículo"
                              title="Editar veículo"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setVehicleQuickForm({ placa: '', modelo: '', marca: '', tipo: 'carro' });
                                setQuickVehicleModal({ mode: 'create', rowIndex: index });
                              }}
                              className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all cursor-pointer"
                              aria-label="Cadastrar novo veículo"
                              title="Cadastrar novo veículo"
                            >
                              <Car size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setQuickAddDriverForm(prev => ({
                                ...prev,
                                vehicle_ids: prev.vehicle_ids.filter((_, idx) => idx !== index)
                              }))}
                              className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                              aria-label="Remover veículo"
                              title="Remover veículo"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
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

      {/* Modal Cadastrar/Editar Veículo (dentro do cadastro rápido de motorista) */}
      {quickVehicleModal && (
        <StandardModal
          onClose={() => setQuickVehicleModal(null)}
          title={quickVehicleModal.mode === 'create' ? 'Cadastrar Veículo' : 'Editar Veículo'}
          subtitle={quickVehicleModal.mode === 'create' ? 'Cadastro rápido de novo veículo' : 'Editar informações do veículo'}
          icon={<Car size={24} />}
          maxWidthClassName="max-w-6xl"
        >
          <form onSubmit={handleQuickVehicleSave} className="space-y-6">
            <div className="flex flex-wrap gap-3">
              <div className="w-[140px] space-y-2 flex-shrink-0">
                <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-1">Placa <RequiredAsterisk /></label>
                <input
                  required
                  value={vehicleQuickForm.placa}
                  onChange={e => setVehicleQuickForm({ ...vehicleQuickForm, placa: formatarPlacaOS(e.target.value) })}
                  className="max-w-[140px] px-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm mt-[4px] h-[60px]"
                  placeholder="ABC-1234"
                  maxLength={8}
                />
              </div>
              <div className="w-[220px] space-y-2 flex-shrink-0">
                <GeologSearchableSelect
                  label="Marca"
                  options={MARCAS_VEICULOS}
                  value={vehicleQuickForm.marca}
                  onChange={value => setVehicleQuickForm({ ...vehicleQuickForm, marca: value })}
                  required
                  triggerClassName="mt-[9px] h-[60px]"
                />
              </div>
              <div className="flex-1 space-y-2 min-w-[150px]">
                <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-1">Modelo <RequiredAsterisk /></label>
                <input
                  required
                  value={vehicleQuickForm.modelo}
                  onChange={e => setVehicleQuickForm({ ...vehicleQuickForm, modelo: e.target.value })}
                  className="w-full px-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm mt-[4px] h-[60px]"
                  placeholder="Ex: Corolla"
                />
              </div>
              <div className="w-[180px] space-y-2 flex-shrink-0">
                <GeologSearchableSelect
                  label="Tipo"
                  options={TIPOS_VEICULO_OS}
                  value={vehicleQuickForm.tipo}
                  onChange={value => setVehicleQuickForm({ ...vehicleQuickForm, tipo: value as typeof vehicleQuickForm.tipo })}
                  required
                  disableSearch
                  triggerClassName="mt-[9px] h-[60px]"
                />
              </div>
            </div>
            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={() => setQuickVehicleModal(null)}
                className="flex-1 py-4 border-2 border-slate-200 text-slate-500 font-black rounded-2xl hover:bg-slate-50 transition-all uppercase tracking-widest text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmittingQuickVehicle}
                className="flex-1 py-4 bg-green-600 text-white font-black rounded-2xl hover:bg-green-500 shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 uppercase tracking-widest text-xs cursor-pointer"
              >
                {isSubmittingQuickVehicle ? <Loader2 className="animate-spin" size={18} /> : (quickVehicleModal.mode === 'create' ? 'Cadastrar' : 'Salvar')}
              </button>
            </div>
          </form>
        </StandardModal>
      )}

      {/* Modal Cadastro Rápido de Parceiro */}
      {isQuickParceiroModalOpen && (
        <StandardModal
          onClose={() => setIsQuickParceiroModalOpen(false)}
          title="Novo Parceiro"
          subtitle="Cadastro rápido de parceiro de serviço"
          icon={<Handshake size={24} />}
          maxWidthClassName="max-w-6xl"
          bodyClassName="p-6 md:p-10 pb-16 space-y-8"
        >
          <form onSubmit={(e) => { e.preventDefault(); void handleQuickParceiroSubmit(); }} className="space-y-8">
            <section className="space-y-6">
              <div className="flex items-center border-b-2 border-slate-100 pb-4" style={{ paddingBottom: '1.25rem' }}>
                <h3 className="text-[17px] font-black text-slate-900 uppercase tracking-[0.1em] flex items-center gap-3" style={{ lineHeight: '1.3' }}>
                  <Building2 size={20} className="text-slate-500" /> Dados principais
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[0.7fr_1.6fr_0.6fr] gap-6">
                <div className="space-y-2">
                  <GeologSearchableSelect
                    label="Tipo de pessoa"
                    options={[
                      { id: 'juridica', nome: 'Pessoa jurídica' },
                      { id: 'fisica', nome: 'Pessoa física' },
                    ]}
                    value={quickParceiroForm.pessoaTipo}
                    onChange={(value) => setQuickParceiroForm(prev => ({
                      ...prev,
                      pessoaTipo: value as 'fisica' | 'juridica',
                      documento: formatParceiroDocument(prev.documento, value as 'fisica' | 'juridica'),
                      razaoSocialOuNomeCompleto: '',
                    }))}
                    triggerClassName="px-5 py-3.5 !bg-slate-50 border-2 !border-slate-200 mt-[5px]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                    {quickParceiroForm.pessoaTipo === 'juridica' ? 'Razão social' : 'Nome completo'}
                  </label>
                  <input
                    required
                    value={quickParceiroForm.razaoSocialOuNomeCompleto}
                    onChange={(e) => setQuickParceiroForm(prev => ({ ...prev, razaoSocialOuNomeCompleto: e.target.value }))}
                    placeholder={quickParceiroForm.pessoaTipo === 'juridica' ? 'Ex: Silva Logística LTDA' : 'Ex: João da Silva'}
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 placeholder:text-slate-300 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm mt-[2px]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{quickParceiroForm.pessoaTipo === 'juridica' ? 'CNPJ' : 'CPF'}</label>
                  <input
                    required
                    value={quickParceiroForm.documento}
                    onChange={(e) => setQuickParceiroForm(prev => ({ ...prev, documento: formatParceiroDocument(e.target.value, prev.pessoaTipo) }))}
                    placeholder={quickParceiroForm.pessoaTipo === 'juridica' ? '00.000.000/0001-00' : '000.000.000-00'}
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 placeholder:text-slate-300 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                  />
                </div>
              </div>
            </section>

            <div className="border-b-2 border-slate-100 my-10"></div>

            <section className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-[17px] font-black text-slate-900 uppercase tracking-[0.1em] flex items-center gap-3" style={{ lineHeight: '1.3' }}>
                    <Users size={20} className="text-blue-600" /> Contatos por unidade
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setQuickParceiroForm(prev => ({
                    ...prev,
                    contatos: [...prev.contatos, { setor: '', celular: '', email: '', responsavel: '' }],
                  }))}
                  className="flex items-center gap-3 px-4 py-3 bg-blue-100 text-blue-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-200 transition-all shadow-sm cursor-pointer"
                >
                  <PlusCircle size={14} /> Novo cadastro
                </button>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="hidden md:grid grid-cols-[1.2fr_0.8fr_1.2fr_1.1fr_auto] gap-4 bg-slate-50/80 border-b border-slate-200 px-6 py-4 text-[12px] font-black uppercase tracking-widest text-slate-600">
                  <span>Setor</span>
                  <span>Celular</span>
                  <span>E-mail</span>
                  <span>Responsável</span>
                  <span className="text-right">Ações</span>
                </div>
                <div className="divide-y divide-slate-100 max-h-[40vh] overflow-y-auto custom-scrollbar">
                  {quickParceiroForm.contatos.map((contato, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr_1.2fr_1.1fr_auto] gap-4 items-start px-6 py-5">
                      <div className="space-y-2 md:space-y-1">
                        <label className="md:hidden text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Setor</label>
                        <input
                          required
                          placeholder="Financeiro, Operação, Compras..."
                          value={contato.setor}
                          onChange={(e) => setQuickParceiroForm(prev => ({
                            ...prev,
                            contatos: prev.contatos.map((c, idx) => idx === index ? { ...c, setor: e.target.value.toUpperCase() } : c),
                          }))}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-900 placeholder:text-slate-300 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                        />
                      </div>
                      <div className="space-y-2 md:space-y-1">
                        <label className="md:hidden text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Celular</label>
                        <input
                          required
                          placeholder="(00) 00000-0000"
                          value={contato.celular}
                          onChange={(e) => setQuickParceiroForm(prev => ({
                            ...prev,
                            contatos: prev.contatos.map((c, idx) => idx === index ? { ...c, celular: formatParceiroPhone(e.target.value) } : c),
                          }))}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-900 placeholder:text-slate-300 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                        />
                      </div>
                      <div className="space-y-2 md:space-y-1">
                        <label className="md:hidden text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">E-mail</label>
                        <input
                          type="email"
                          placeholder="contato@empresa.com"
                          value={contato.email || ''}
                          onChange={(e) => setQuickParceiroForm(prev => ({
                            ...prev,
                            contatos: prev.contatos.map((c, idx) => idx === index ? { ...c, email: e.target.value.toLowerCase() } : c),
                          }))}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-900 placeholder:text-slate-300 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                        />
                      </div>
                      <div className="space-y-2 md:space-y-1">
                        <label className="md:hidden text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Responsável</label>
                        <input
                          required
                          placeholder="Nome do responsável"
                          value={contato.responsavel}
                          onChange={(e) => setQuickParceiroForm(prev => ({
                            ...prev,
                            contatos: prev.contatos.map((c, idx) => idx === index ? { ...c, responsavel: e.target.value.toUpperCase() } : c),
                          }))}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-900 placeholder:text-slate-300 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                        />
                      </div>
                      <div className="flex md:pt-1 justify-end">
                        {quickParceiroForm.contatos.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => setQuickParceiroForm(prev => ({
                              ...prev,
                              contatos: prev.contatos.filter((_, idx) => idx !== index),
                            }))}
                            className="inline-flex items-center justify-center p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                            aria-label="Remover contato"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 pt-3">Principal</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsQuickParceiroModalOpen(false)}
                className="px-8 py-4 bg-slate-100 text-slate-700 font-black rounded-xl hover:bg-slate-200 transition-all text-sm uppercase tracking-widest cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-12 py-4 bg-[var(--color-geolog-blue)] text-white font-black rounded-xl shadow-xl shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-widest cursor-pointer"
              >
                Salvar parceiro
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
