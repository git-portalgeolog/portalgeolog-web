'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import StandardModal from '@/components/StandardModal';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  MoreHorizontal, 
  Truck, 
  User,
  Calendar,
  X,
  PlusCircle,
  FileText,
  MapPin,
  Hash,
  Clock,
  CheckCircle2,
  Navigation,
  ArrowRightLeft,
  Building,
  ChevronDown,
  MoreVertical,
  Eye,
  Pencil,
  RotateCcw,
  XOctagon,
  MessageCircle,
  Users,
  AlertTriangle
} from 'lucide-react';
import { useData, type OrderService } from '@/context/DataContext';
import GeologSelect from '@/components/ui/GeologSelect';
import GeologSearchableSelect from '@/components/ui/GeologSearchableSelect';

type FormPassenger = { id: string; solicitanteId: string; nome: string; };
type FormWaypoint = { label: string; lat: number | null; lng: number | null; passengers: FormPassenger[]; };
type OSFormData = {
  data: string;
  hora: string;
  horaExtra: string;
  os: string;
  clienteId: string;
  solicitante: string;
  tipoServico: string;
  motorista: string;
  centroCusto: string;
  valorBruto: number;
  custo: number;
  waypoints: FormWaypoint[];
};

export default function OSOperationalPage() {
  const { osList, clientes, solicitantes, servicos, passageiros, addOS, updateOS, updateOSStatus, addPassageiro, getCentrosCustoByCliente } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuickPassengerModalOpen, setIsQuickPassengerModalOpen] = useState(false);
  const [quickPassengerTarget, setQuickPassengerTarget] = useState<{ waypointIndex: number; passengerId: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [editingOSId, setEditingOSId] = useState<string | null>(null);
  const [viewingOSId, setViewingOSId] = useState<string | null>(null);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const actionMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isAnyModalOpen = isModalOpen || isQuickPassengerModalOpen || Boolean(viewingOSId) || Boolean(cancelTargetId);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isAnyModalOpen]);

  // Form State
  const initialForm: OSFormData = {
    data: new Date().toISOString().split('T')[0],
    hora: '',
    horaExtra: '',
    os: '',
    clienteId: '',
    solicitante: '',
    tipoServico: '',
    motorista: '',
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
      tipoServico: osItem.tipoServico,
      motorista: osItem.motorista,
      centroCusto: osItem.centroCusto || '',
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
    email: '',
    celular: '',
    cpf: '',
    enderecoCompleto: ''
  };
  const [quickPassengerForm, setQuickPassengerForm] = useState(initialQuickPassengerForm);
  const [quickPassengerErrors, setQuickPassengerErrors] = useState<{ celular?: string }>({});
  const driverOptions = useMemo(() => (
    [
      { id: 'João Silva', nome: 'João Silva' },
      { id: 'Carlos Santos', nome: 'Carlos Santos' },
      { id: 'Pedro Oliveira', nome: 'Pedro Oliveira' },
      { id: 'Maria Costa', nome: 'Maria Costa' }
    ]
  ), []);

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    const part1 = digits.slice(0, 3);
    const part2 = digits.slice(3, 6);
    const part3 = digits.slice(6, 9);
    const part4 = digits.slice(9, 11);

    if (digits.length <= 3) return part1;
    if (digits.length <= 6) return `${part1}.${part2}`;
    if (digits.length <= 9) return `${part1}.${part2}.${part3}`;
    return `${part1}.${part2}.${part3}-${part4}`;
  };

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
    waypoint.passengers = [...(waypoint.passengers || []), { id: Date.now().toString(), solicitanteId: '', nome: '' }];
    newWaypoints[waypointIndex] = waypoint;
    setFormData(prev => ({ ...prev, waypoints: newWaypoints }));
  };

  const handleRemovePassenger = (waypointIndex: number, passengerId: string) => {
    const newWaypoints = [...formData.waypoints];
    const waypoint = { ...newWaypoints[waypointIndex] };
    waypoint.passengers = (waypoint.passengers || []).filter((p: any) => p.id !== passengerId);
    newWaypoints[waypointIndex] = waypoint;
    setFormData(prev => ({ ...prev, waypoints: newWaypoints }));
  };

  const handlePassengerChange = (waypointIndex: number, passengerId: string, novoPassageiroId: string) => {
    const newWaypoints = [...formData.waypoints];
    const waypoint = { ...newWaypoints[waypointIndex] };
    const passageiroSelecionado = passageiros.find(p => p.id === novoPassageiroId);
    waypoint.passengers = (waypoint.passengers || []).map((p: any) => 
      p.id === passengerId ? { ...p, solicitanteId: novoPassageiroId, nome: passageiroSelecionado?.nomeCompleto || '' } : p
    );
    newWaypoints[waypointIndex] = waypoint;
    setFormData(prev => ({ ...prev, waypoints: newWaypoints }));
  };

  const openQuickPassengerModal = (waypointIndex: number, passengerId: string) => {
    setQuickPassengerTarget({ waypointIndex, passengerId });
    setQuickPassengerForm(initialQuickPassengerForm);
    setQuickPassengerErrors({});
    setIsQuickPassengerModalOpen(true);
  };

  const handleQuickPassengerSubmit = (event: React.FormEvent) => {
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

    const novoPassageiro = addPassageiro({
      nomeCompleto: trimmedNome,
      email: quickPassengerForm.email.trim(),
      celular: quickPassengerForm.celular.trim(),
      cpf: quickPassengerForm.cpf.trim(),
      enderecos: [
        {
          rotulo: 'Base Principal',
          enderecoCompleto: trimmedEndereco
        }
      ]
    });

    const newWaypoints = [...formData.waypoints];
    const waypoint = { ...newWaypoints[quickPassengerTarget.waypointIndex] };
    waypoint.passengers = (waypoint.passengers || []).map((p: any) =>
      p.id === quickPassengerTarget.passengerId
        ? { ...p, solicitanteId: novoPassageiro.id, nome: novoPassageiro.nomeCompleto }
        : p
    );
    newWaypoints[quickPassengerTarget.waypointIndex] = waypoint;
    setFormData(prev => ({ ...prev, waypoints: newWaypoints }));

    setIsQuickPassengerModalOpen(false);
    setQuickPassengerTarget(null);
  };

  const sendWhatsAppNotification = async (osData: any) => {
    const phone = "5522997259180"; // Número de destino atualizado (Thorfinn)
    const cliente = clientes.find(c => c.id === osData.clienteId)?.nome || 'Empresa não informada';

    // Link para o motorista clicar (Você substituirá localhost pelo seu domínio final quando publicar)
    const acceptLink = `https://portalgeolog.web.app/os/aceitar?id=${osData.id}`;

    // Formatação do itinerário para WhatsApp
    const waypoints = osData.waypoints || [];
    let itineraryText = "";
    if (waypoints.length >= 2) {
      itineraryText = waypoints.map((w: any, idx: number) => {
        const label = w.label.trim();
        if (idx === 0) return `🟢 *Origem:* ${label}`;
        if (idx === waypoints.length - 1) return `🔵 *Destino Final:* ${label}`;
        return `🛑 *Parada:* ${label}`;
      }).join('\n\n');
    } else {
      itineraryText = `📍 ${osData.trecho}`;
    }

    const message = `*🔔 AVISO - PORTAL GEOLOG*\n\n` +
      `Olá, *${osData.motorista}*!\n` +
      `Você foi escalado para um novo serviço.\n\n` +
      `📌 *OS:* #${osData.os}\n` +
      `🏢 *Empresa:* ${cliente}\n` +
      `📍 *Itinerário:*\n\n${itineraryText}\n\n` +
      `📅 *Data:* ${osData.data.split('-').reverse().join('/')}\n` +
      `🛠️ *Serviço:* ${osData.tipoServico}\n\n` +
      `👇 *CLIQUE NO LINK ABAIXO PARA ACEITAR:* \n` +
      `${acceptLink}\n\n` +
      `_Ao clicar, o status será atualizado automaticamente no painel._`;


    try {
      const response = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message })
      });

      if (response.ok) {
        console.log("WhatsApp enviado com sucesso!");
      } else {
        console.error("Falha ao enviar WhatsApp via API");
      }
    } catch (err) {
      console.error("Erro na chamada da API de WhatsApp:", err);
    }
  };

  const handleAddOS = async (e: React.FormEvent) => {
    e.preventDefault();
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

    const newOS = addOS(finalData);
    await sendWhatsAppNotification(newOS);

    resetMainModalState();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const currentImposto = formData.valorBruto * 0.12;
  const currentLucro = formData.valorBruto - currentImposto - formData.custo;

  const availableSolicitantes = useMemo(() => {
    if (!formData.clienteId) return [];
    return solicitantes.filter(s => s.clienteId === formData.clienteId);
  }, [formData.clienteId, solicitantes]);

  const availableCentrosCusto = useMemo(() => {
    if (!formData.clienteId) return [];
    return getCentrosCustoByCliente(formData.clienteId);
  }, [formData.clienteId, getCentrosCustoByCliente]);

  const handleClienteChange = (id: string) => {
    setFormData(prev => ({
      ...prev,
      clienteId: id,
      solicitante: '',
      centroCusto: ''
    }));
  };

  const handleServicoChange = (id: string) => {
    const servico = servicos.find(s => s.id === id);
    setFormData(prev => ({
      ...prev,
      tipoServico: servico?.nome || '',
      valorBruto: servico?.precoBase || 0
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

    if (name.includes('.')) {
      const [parent, child, field] = name.split('.'); 
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev as any)[parent],
          [child]: {
            ...(prev as any)[parent][child],
            [field]: field === 'lat' || field === 'lng' ? parseFloat(value) || 0 : value
          }
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'valorBruto' || name === 'custo' ? parseFloat(value) || 0 : value
      }));
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Pendente': 
        return {
          icon: <Clock size={20} />,
          bg: 'bg-orange-50/50',
          border: 'border-orange-100',
          accent: 'bg-orange-500',
          shadow: 'shadow-orange-200',
          text: 'text-orange-700',
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <OpStatCard label="Pendentes" value={osList.filter(o => o.status.operacional === 'Pendente').length} icon={<Clock className="text-orange-500" size={24} />} />
        <OpStatCard label="Aguardando" value={osList.filter(o => o.status.operacional === 'Aguardando').length} icon={<Clock className="text-indigo-500" size={24} />} />
        <OpStatCard label="Em Rota" value={osList.filter(o => o.status.operacional === 'Em Rota').length} icon={<Navigation className="text-blue-500" size={24} />} />
        <OpStatCard label="Finalizados" value={osList.filter(o => o.status.operacional === 'Finalizado').length} icon={<CheckCircle2 className="text-emerald-500" size={24} />} />
      </div>

      {/* Action Bar & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative group flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Pesquisar por Motorista, Trecho ou OS..."
            className="w-full pl-12 pr-6 py-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 font-bold text-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button 
          onClick={handleOpenCreateOSModal}
          className="flex items-center justify-center gap-2 bg-[var(--color-geolog-blue)] text-white px-8 py-3.5 rounded-2xl font-black shadow-lg shadow-blue-900/10 hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-widest shrink-0 w-full md:w-auto"
        >
          <Plus size={18} strokeWidth={3} />
          Nova OS
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-visible">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-[11px] md:text-xs font-black uppercase tracking-[0.4em] text-slate-600">Protocolo</th>
              <th className="px-6 py-4 text-[11px] md:text-xs font-black uppercase tracking-[0.4em] text-slate-600">OS</th>
              <th className="px-6 py-4 text-[11px] md:text-xs font-black uppercase tracking-[0.4em] text-slate-600">Cliente</th>
              <th className="px-6 py-4 text-[11px] md:text-xs font-black uppercase tracking-[0.4em] text-slate-600">Itinerário</th>
              <th className="px-6 py-4 text-[11px] md:text-xs font-black uppercase tracking-[0.4em] text-slate-600">Motorista</th>
              <th className="px-6 py-4 text-[11px] md:text-xs font-black uppercase tracking-[0.4em] text-slate-600 text-center">Status</th>
              <th className="px-6 py-4 text-[11px] md:text-xs font-black uppercase tracking-[0.4em] text-slate-600 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredData.map((item) => {
              const clienteNome = clientes.find(c => c.id === item.clienteId)?.nome || 'N/A';
              const config = getStatusConfig(item.status.operacional);

              return (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors align-top">
                  <td className="px-6 py-5">
                    <div className="space-y-1">
                      <p className="font-black text-base text-slate-800 tracking-tight">{item.protocolo}</p>
                      <p className="text-sm font-semibold text-slate-400">{item.data.split('-').reverse().join('/')}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="font-black text-base text-slate-700">{item.os || '—'}</p>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                        <Building size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-base text-slate-700">{clienteNome}</p>
                        <p className="text-sm text-slate-400 uppercase tracking-wide">{item.tipoServico.split('-')[0].trim()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-base font-semibold text-slate-700 leading-snug">{item.trecho}</p>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-slate-700">
                      <User size={14} className="text-blue-500" />
                      <span className="text-base font-bold">{item.motorista}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs md:text-sm font-bold uppercase tracking-wide border ${config.bg} ${config.border} ${config.text}`}>
                      {config.icon}
                      {config.label}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center">
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
                      {openActionMenuId === item.id && (
                        <div className="absolute right-0 mt-2 min-w-[200px] bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 space-y-1 z-50">
                          <button
                            onClick={() => handleViewOS(item.id)}
                            className="w-full px-4 py-2 text-left text-sm font-bold text-slate-700 rounded-xl hover:bg-slate-50 flex items-center gap-3"
                          >
                            <Eye size={16} className="text-slate-400" />
                            Visualizar
                          </button>
                          <button
                            onClick={() => handleEditOS(item.id)}
                            className="w-full px-4 py-2 text-left text-sm font-bold text-blue-600 rounded-xl hover:bg-blue-50 flex items-center gap-3"
                          >
                            <Pencil size={16} className="text-blue-400" />
                            Editar
                          </button>
                          <button
                            onClick={() => handleReopenOS(item.id)}
                            className="w-full px-4 py-2 text-left text-sm font-bold text-emerald-600 rounded-xl hover:bg-emerald-50 flex items-center gap-3"
                          >
                            <RotateCcw size={16} className="text-emerald-400" />
                            Reabrir
                          </button>
                          <button
                            onClick={() => handleCancelOS(item.id)}
                            className="w-full px-4 py-2 text-left text-sm font-bold text-rose-600 rounded-xl hover:bg-rose-50 flex items-center gap-3"
                          >
                            <XOctagon size={16} className="text-rose-400" />
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
                className="px-6 py-4 text-slate-600 font-bold hover:text-slate-900 transition-colors text-sm uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="nova-os-form"
                className="px-12 py-4 bg-[var(--color-geolog-blue)] text-white font-black rounded-xl shadow-xl shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-widest"
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
                                 <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Data</label>
                                 <input 
                                   type="text" 
                                   name="data" 
                                   required 
                                   value={formData.data.includes('-') ? formData.data.split('-').reverse().join('/') : formData.data} 
                                   onChange={handleInputChange} 
                                   placeholder="DD/MM/AAAA"
                                   className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm" 
                                 />
                                 <Calendar size={18} className="absolute right-5 top-1/2 text-slate-300 pointer-events-none" style={{ transform: 'translateY(-10%)' }} />
                              </div>
                              <div className="space-y-1.5">
                                 <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Hora</label>
                                 <input 
                                   type="text" 
                                   name="hora" 
                                   value={formData.hora} 
                                   onChange={handleInputChange} 
                                   placeholder="HH:MM"
                                   maxLength={5}
                                   className="w-full px-4 py-4 bg-white border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm tracking-[0.2em] font-mono" 
                                 />
                              </div>
                              <div className="space-y-1.5">
                                 <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">OS</label>
                                 <input 
                                   type="text" 
                                   name="os" 
                                   required 
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
                        />
                        <GeologSearchableSelect 
                           label="Centro de Custo" 
                           options={availableCentrosCusto.map(c => ({ id: c.id, nome: c.nome }))} 
                           value={availableCentrosCusto.find(c => c.id === formData.centroCusto)?.id || ''} 
                           onChange={(id) => { 
                             setFormData(prev => ({ ...prev, centroCusto: id })); 
                           }} 
                           disabled={!formData.clienteId}
                        />
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <GeologSearchableSelect 
                           label="Motorista Alocado" 
                           options={driverOptions} 
                           value={formData.motorista || ''} 
                           onChange={(id) => { 
                             const opt = driverOptions.find(m => m.id === id); 
                             setFormData(prev => ({ ...prev, motorista: opt?.nome || '' })); 
                           }} 
                        />
                        <GeologSearchableSelect 
                           label="Tipo de Serviço" 
                           options={servicos.map(s => ({ id: s.id, nome: s.nome, sublabel: formatCurrency(s.precoBase) }))} 
                           value={servicos.find(s => s.nome === formData.tipoServico)?.id || ''} 
                           onChange={handleServicoChange} 
                        />
                     </div>
                  </div>

                  {/* 2. ITINERÁRIO */}
                  {/* 2. ITINERÁRIO DINÂMICO */}
                  <div className="space-y-8">
                     <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4" style={{ paddingBottom: '1.25rem' }}>
                        <h3 className="text-[17px] font-black text-slate-900 uppercase tracking-[0.1em] flex items-center gap-3" style={{ lineHeight: '1.3' }}>
                          <MapPin size={20} className="text-blue-600" /> Itinerário / Paradas
                        </h3>
                        <div className="flex gap-2">
                           <button type="button" onClick={handleSwapRoute} className="flex items-center gap-3 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all shadow-sm">
                              <ArrowRightLeft size={16} /> Inverter
                           </button>
                           <button type="button" onClick={handleAddWaypoint} className="flex items-center gap-3 px-4 py-2 bg-blue-100 text-blue-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-200 transition-all shadow-sm">
                              <Plus size={16} /> Adicionar Parada
                           </button>
                        </div>
                     </div>

                     <div className="relative pl-8 space-y-6">
                        {/* Timeline Connector */}
                        <div className="absolute left-3.5 top-3 bottom-3 w-0.5 bg-slate-300" />
                        
                        {formData.waypoints.map((waypoint, index) => (
                           <div key={index} className="relative group">
                              {/* Timeline Dot (Círculo) */}
                              <div className={`absolute -left-[1.625rem] top-8 w-4 h-4 rounded-full border-4 border-white shadow-sm ring-2 z-10 ${index === 0 ? 'bg-emerald-500 ring-emerald-100' : index === formData.waypoints.length - 1 ? 'bg-blue-600 ring-blue-100' : 'bg-slate-400 ring-slate-100'}`} />
                              
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
                                                className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center shadow-sm border border-red-100 cursor-pointer"
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
                                          {waypoint.passengers.map((passenger: any, passengerIndex: number) => (
                                             <div key={passenger.id} className={`relative flex items-center gap-4 group/pass ${passengerIndex === 0 ? 'mt-2' : 'mt-0.5'} ${passengerIndex === waypoint.passengers.length - 1 ? 'mb-6' : 'mb-1'}`}>
                                                {/* Linha horizontal da trilha - começa na linha vertical */}
                                                <div className="absolute -left-[1.125rem] top-1/2 -translate-y-1/2 w-12 h-0.5 bg-slate-300 z-10" />
                                                
                                                {/* Trilhas de passageiro (quadrado) - no final da linha */}
                                                <div className={`absolute left-[1.375rem] top-1/2 -translate-y-1/2 w-4 h-4 rounded-sm border-4 border-white shadow-sm ring-2 z-20 ${index === 0 ? 'bg-emerald-500 ring-emerald-100' : index === formData.waypoints.length - 1 ? 'bg-blue-600 ring-blue-100' : 'bg-slate-400 ring-slate-100'}`} />
                                                
                                                <div className="flex-1 flex items-center gap-3 ml-8">
                                                   <div className="w-1/2 ml-6">
                                                      <div className="flex items-center gap-3">
                                                        <div className={`flex-1 ${passengerIndex === 0 ? 'mt-3' : 'mt-0'} ${passengerIndex === waypoint.passengers.length - 1 ? 'mb-8' : 'mb-2'}`}>
                                                          <GeologSearchableSelect 
                                                             label=""
                                                             placeholder="Selecione o passageiro..."
                                                             options={passageiros.map(p => ({ id: p.id, nome: p.nomeCompleto }))}
                                                             value={passenger.solicitanteId || ''}
                                                             onChange={(val) => handlePassengerChange(index, passenger.id, val)}
                                                          />
                                                        </div>
                                                        <button
                                                          type="button"
                                                          onClick={() => openQuickPassengerModal(index, passenger.id)}
                                                          className="self-center p-3 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-all opacity-0 group-hover/pass:opacity-100 flex items-center justify-center shadow-sm border border-blue-200 cursor-pointer"
                                                          title="Cadastrar passageiro"
                                                        >
                                                          <PlusCircle size={18} />
                                                        </button>
                                                      </div>
                                                   </div>
                                                   <button 
                                                      type="button" 
                                                      onClick={() => handleRemovePassenger(index, passenger.id)}
                                                      className="self-center p-3 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-xl transition-all opacity-0 group-hover/pass:opacity-100 cursor-pointer"
                                                      title="Remover Passageiro"
                                                   >
                                                      <X size={18} />
                                                   </button>
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

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2.5">
                           <label className="text-sm font-bold text-slate-800 uppercase tracking-tight ml-1">Valor Bruto (R$)</label>
                           <input 
                             type="number" 
                             name="valorBruto" 
                             step="0.01" 
                             value={formData.valorBruto || ''} 
                             onChange={handleInputChange} 
                             className="w-full bg-slate-50 border-2 border-slate-200 py-4 px-6 rounded-xl font-black text-2xl text-blue-700 outline-none tabular-nums focus:bg-white focus:border-blue-600 transition-all shadow-sm" 
                           />
                        </div>
                        <div className="space-y-2.5">
                           <label className="text-sm font-bold text-slate-800 uppercase tracking-tight ml-1">Custo Motorista (R$)</label>
                           <div className="flex flex-col lg:flex-row gap-4">
                              <input 
                                type="number" 
                                name="custo" 
                                step="0.01" 
                                value={formData.custo || ''} 
                                onChange={handleInputChange} 
                                className="w-full bg-slate-50 border-2 border-slate-200 py-4 px-6 rounded-xl font-black text-2xl text-red-600 outline-none tabular-nums focus:bg-white focus:border-red-600 transition-all shadow-sm" 
                              />
                              <div className="space-y-1.5 w-full lg:max-w-[10rem]">
                                 <label className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Hora Extra</label>
                                 <input 
                                   type="text" 
                                   name="horaExtra" 
                                   value={formData.horaExtra} 
                                   disabled
                                   placeholder="Aguardando"
                                   className="w-full px-4 py-4 bg-slate-100 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-400 outline-none cursor-not-allowed" 
                                 />
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className={`p-8 md:p-10 rounded-[2.5rem] ${currentLucro >= 0 ? 'bg-emerald-600 shadow-emerald-900/10' : 'bg-red-600 shadow-red-900/10'} text-white shadow-2xl transition-all duration-500`}>
                        <div className="flex justify-between items-center">
                           <div className="space-y-1">
                              <span className="text-xs font-bold uppercase opacity-80 tracking-[0.2em]">Lucro Líquido Estimado</span>
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
          maxWidthClassName="max-w-4xl"
        >
          <form onSubmit={handleQuickPassengerSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">Nome completo <span className="text-rose-500 text-base">*</span></label>
                <input
                  required
                  value={quickPassengerForm.nomeCompleto}
                  onChange={(e) => setQuickPassengerForm(prev => ({ ...prev, nomeCompleto: e.target.value }))}
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                  placeholder="Ex: Lucas Vieira"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">Celular <span className="text-rose-500 text-base">*</span></label>
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
                  <p className="text-xs font-semibold text-rose-500 ml-1">{quickPassengerErrors.celular}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">Endereço principal <span className="text-rose-500 text-base">*</span></label>
              <input
                required
                value={quickPassengerForm.enderecoCompleto}
                onChange={(e) => setQuickPassengerForm(prev => ({ ...prev, enderecoCompleto: e.target.value }))}
                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                placeholder="Rua, número, bairro, cidade - UF"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">E-mail</label>
                <input
                  type="email"
                  value={quickPassengerForm.email}
                  onChange={(e) => setQuickPassengerForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                  placeholder="contato@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">CPF</label>
                <input
                  value={quickPassengerForm.cpf}
                  onChange={(e) => setQuickPassengerForm(prev => ({ ...prev, cpf: formatCPF(e.target.value) }))}
                  maxLength={14}
                  inputMode="numeric"
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                  placeholder="000.000.000-00"
                />
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => setIsQuickPassengerModalOpen(false)}
                className="px-6 py-3 text-slate-500 font-black rounded-xl border border-slate-200 hover:bg-slate-50 transition-all uppercase tracking-widest text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-8 py-3 bg-[var(--color-geolog-blue)] text-white font-black rounded-xl shadow-lg shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-xs"
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
                    <div className={`mt-0.5 w-10 h-10 rounded-2xl flex items-center justify-center ${driverFlow.accepted ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-600'}`}>
                      <CheckCircle2 size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-slate-900 uppercase tracking-[0.12em]">Aceite do motorista</p>
                      <p className="text-sm text-slate-500">Considerado confirmado quando a OS sai de `Pendente` e entra em etapa operacional posterior.</p>
                    </div>
                    <span className={`text-xs font-black uppercase tracking-[0.18em] ${driverFlow.accepted ? 'text-emerald-600' : 'text-orange-500'}`}>{driverFlow.accepted ? 'Confirmado' : 'Aguardando clique'}</span>
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
                    <p className="mt-2 text-sm font-bold text-slate-700">{viewingOS.centroCusto || 'Não informado'}</p>
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
                        <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-[0.16em] ${viewingOS.status.operacional === 'Pendente' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
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
                        <div className="flex items-center gap-3 rounded-2xl bg-white border border-slate-200 px-4 py-3">
                          <MapPin size={16} className="text-slate-400" />
                          {passenger.endereco}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3 flex items-center justify-between gap-3">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Interação do passageiro</p>
                        <span className={`text-xs font-black uppercase tracking-[0.16em] ${viewingOS.status.operacional === 'Pendente' ? 'text-orange-500' : 'text-emerald-600'}`}>
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
    </div>
  );
}


function OpStatCard({ label, value, icon }: { label: string, value: number, icon: any }) {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6">
      <div className="p-4 bg-slate-50 rounded-2xl">{icon}</div>
      <div>
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
        <h3 className="text-3xl font-black text-slate-800 tabular-nums">{value}</h3>
      </div>
    </div>
  );
}
