'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Cliente {
  id: string;
  nome: string;
  contato?: string;
  centrosCusto: CentroCusto[];
}

export interface CentroCusto {
  id: string;
  nome: string;
}

export interface Solicitante {
  id: string;
  nome: string;
  clienteId: string;
}

export interface Fornecedor {
  id: string;
  nome: string;
  tipo: string;
  telefone?: string;
}

export interface PassageiroEndereco {
  id: string;
  rotulo: string;
  enderecoCompleto: string;
  referencia?: string;
}

export interface Passageiro {
  id: string;
  nomeCompleto: string;
  email: string;
  celular: string;
  cpf: string;
  enderecos: PassageiroEndereco[];
}

export type NovoPassageiroInput = Omit<Passageiro, 'id' | 'enderecos'> & {
  enderecos: Omit<PassageiroEndereco, 'id'>[];
};

export interface TipoServico {
  id: string;
  nome: string;
  precoBase: number;
}

export interface OSStatus {
  operacional: 'Pendente' | 'Aguardando' | 'Em Rota' | 'Finalizado' | 'Cancelado';
  financeiro: 'Pendente' | 'Faturado';
}

export interface Waypoint {
  label: string;
  lat?: number | null;
  lng?: number | null;
  passengers?: { id: string; solicitanteId: string; nome: string; }[];
}

export interface Rota {
  waypoints: Waypoint[];
}

export interface OrderService {
  id: string;
  protocolo: string;
  data: string;
  hora?: string;
  horaExtra?: string;
  os: string;
  clienteId: string;
  solicitante: string;
  centroCusto?: string;
  tipoServico: string;
  trecho: string;
  motorista: string;
  valorBruto: number;
  imposto: number;
  custo: number;
  lucro: number;
  status: OSStatus;
  distancia?: string;
  rota?: Rota;
}

interface DataContextType {
  clientes: Cliente[];
  solicitantes: Solicitante[];
  fornecedores: Fornecedor[];
  servicos: TipoServico[];
  osList: OrderService[];
  passageiros: Passageiro[];
  
  // Actions
  addCliente: (nome: string, contato?: string) => void;
  addSolicitante: (nome: string, clienteId: string) => void;
  addPassageiro: (passageiro: NovoPassageiroInput) => Passageiro;
  addFornecedor: (nome: string, tipo: string, telefone?: string) => void;
  addServico: (nome: string, precoBase: number) => void;
  addOS: (osData: Omit<OrderService, 'id' | 'lucro' | 'imposto' | 'status' | 'protocolo'>) => OrderService;
  updateOS: (id: string, osData: Omit<OrderService, 'id' | 'lucro' | 'imposto' | 'status' | 'protocolo'>) => void;
  updateOSStatus: (id: string, updates: Partial<OSStatus>) => void;
  
  // Helpers
  getSolicitantesByCliente: (clienteId: string) => Solicitante[];
  getCentrosCustoByCliente: (clienteId: string) => CentroCusto[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [clientes, setClientes] = useState<Cliente[]>([
    { id: 'c1', nome: 'Petrobras', contato: 'operacoes@petrobras.com.br', centrosCusto: [
      { id: 'c1-op', nome: 'Operações Offshore' },
      { id: 'c1-log', nome: 'Logística Macaé' },
      { id: 'c1-suporte', nome: 'Suporte Base Galeão' },
    ] },
    { id: 'c2', nome: 'Equinor', contato: 'logistics@equinor.com', centrosCusto: [
      { id: 'c2-op', nome: 'Operações Peregrino' },
      { id: 'c2-manut', nome: 'Manutenção Campos Basin' },
    ] },
    { id: 'c3', nome: 'SBM Offshore', contato: 'chartering@sbmoffshore.com', centrosCusto: [
      { id: 'c3-frota', nome: 'Frota FPSO' },
      { id: 'c3-log', nome: 'Logística Niterói' },
    ] },
    { id: 'c4', nome: 'Subsea7', contato: 'vessel.support@subsea7.com', centrosCusto: [
      { id: 'c4-proj', nome: 'Projetos Submarinos' },
      { id: 'c4-oper', nome: 'Operações Macaé' },
    ] },
    { id: 'c5', nome: 'OceanPact', contato: 'operativo@oceanpact.com', centrosCusto: [
      { id: 'c5-emerg', nome: 'Resposta a Emergências' },
      { id: 'c5-supr', nome: 'Suprimentos Offshore' },
    ] },
  ]);

  const [solicitantes, setSolicitantes] = useState<Solicitante[]>([
    { id: 's1', nome: 'Marcelo Santos', clienteId: 'c1' },
    { id: 's2', nome: 'Fernanda Lima', clienteId: 'c1' },
    { id: 's3', nome: 'Breno Carvalho', clienteId: 'c2' },
    { id: 's4', nome: 'Juliana Torres', clienteId: 'c3' },
    { id: 's5', nome: 'Rodrigo Mello', clienteId: 'c4' },
    { id: 's6', nome: 'Amanda Veras', clienteId: 'c5' },
  ]);

  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([
    { id: 'f1', nome: 'TransRapid Logística', tipo: 'Transportadora' },
    { id: 'f2', nome: 'Viação Águia Branca', tipo: 'Fretamento' },
  ]);

  const [passageiros, setPassageiros] = useState<Passageiro[]>([
    {
      id: 'p1',
      nomeCompleto: 'Gabriel Almeida',
      email: 'gabriel.almeida@email.com',
      celular: '(22) 99877-1122',
      cpf: '123.456.789-00',
      enderecos: [
        {
          id: 'pe1',
          rotulo: 'Residencial',
          enderecoCompleto: 'Rua das Palmeiras, 120 - Parque Aeroporto, Macaé - RJ',
          referencia: 'Próximo à praça principal'
        }
      ]
    },
    {
      id: 'p2',
      nomeCompleto: 'Larissa Monteiro',
      email: 'larissa.monteiro@exemplo.com',
      celular: '(21) 99700-4455',
      cpf: '987.654.321-00',
      enderecos: [
        {
          id: 'pe2',
          rotulo: 'Base Offshore',
          enderecoCompleto: 'Terminal Barra do Furado, lote 08, Campos - RJ'
        },
        {
          id: 'pe3',
          rotulo: 'Residência Temporária',
          enderecoCompleto: 'Av. Atlântica, 450 - Copacabana, Rio de Janeiro - RJ'
        }
      ]
    }
  ]);

  const [servicos, setServicos] = useState<TipoServico[]>([
    { id: 'v1', nome: 'Translado de Tripulação - Van (24h)', precoBase: 450.00 },
    { id: 'v2', nome: 'Transporte Executivo Sedan', precoBase: 180.00 },
    { id: 'v3', nome: 'Fretamento Ônibus (Docagem)', precoBase: 1200.00 },
    { id: 'v4', nome: 'Caminhão Baú (Suprimentos)', precoBase: 850.00 },
    { id: 'v5', nome: 'Escolta Armada', precoBase: 1500.00 },
  ]);

  const [osList, setOsList] = useState<OrderService[]>([
    {
      id: 'os1',
      protocolo: '2024030001',
      data: '2024-03-10',
      os: 'OS-8820',
      clienteId: 'c1',
      solicitante: 'Marcelo Santos',
      tipoServico: 'Translado de Tripulação - Van (24h)',
      trecho: 'Aeroporto Galeão x Porto do Açu',
      motorista: 'Claudio Ferreira',
      valorBruto: 3200.00,
      imposto: 384.00,
      custo: 2400.00,
      lucro: 416.00,
      status: { operacional: 'Finalizado', financeiro: 'Faturado' },
      rota: {
        waypoints: [
          { lat: -22.8123, lng: -43.2505, label: 'Aeroporto Internacional do Galeão' },
          { lat: -21.8344, lng: -41.0089, label: 'Porto do Açu, São João da Barra' }
        ]
      }
    },
    {
      id: 'os2',
      protocolo: '2024030002',
      data: '2024-03-12',
      os: 'OS-9015',
      clienteId: 'c2',
      solicitante: 'Breno Carvalho',
      tipoServico: 'Transporte Executivo Sedan',
      trecho: 'Centro, Rio de Janeiro x Macaé',
      motorista: 'Paulo Souza',
      valorBruto: 850.00,
      imposto: 102.00,
      custo: 550.00,
      lucro: 198.00,
      status: { operacional: 'Em Rota', financeiro: 'Pendente' },
      rota: {
        waypoints: [
          { lat: -22.9068, lng: -43.1729, label: 'Avenida Rio Branco, RJ' },
          { lat: -22.3708, lng: -41.7749, label: 'Imbetiba, Macaé' }
        ]
      }
    }
  ]);

  const addCliente = (nome: string, contato?: string) => {
    setClientes([...clientes, { id: Math.random().toString(36).substr(2, 9), nome, contato, centrosCusto: [] }]);
  };

  const addSolicitante = (nome: string, clienteId: string) => {
    setSolicitantes([...solicitantes, { id: Math.random().toString(36).substr(2, 9), nome, clienteId }]);
  };

  const addPassageiro = (passageiro: NovoPassageiroInput) => {
    const newPassageiro: Passageiro = {
      id: Math.random().toString(36).substr(2, 9),
      ...passageiro,
      enderecos: passageiro.enderecos.map((endereco, index) => ({
        id: Math.random().toString(36).substr(2, 9),
        rotulo: endereco.rotulo?.trim() || `Endereço ${index + 1}`,
        enderecoCompleto: endereco.enderecoCompleto,
        referencia: endereco.referencia?.trim() ? endereco.referencia : undefined
      }))
    };

    setPassageiros([...passageiros, newPassageiro]);
    return newPassageiro;
  };

  const addFornecedor = (nome: string, tipo: string, telefone?: string) => {
    setFornecedores([...fornecedores, { id: Math.random().toString(36).substr(2, 9), nome, tipo, telefone }]);
  };

  const addServico = (nome: string, precoBase: number) => {
    setServicos([...servicos, { id: Math.random().toString(36).substr(2, 9), nome, precoBase }]);
  };

  const generateProtocolo = () => {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    return `${year}${month}${code}`;
  };

  const addOS = (osData: Omit<OrderService, 'id' | 'lucro' | 'imposto' | 'status' | 'protocolo'>) => {
    const imposto = osData.valorBruto * 0.12;
    const lucro = osData.valorBruto - imposto - osData.custo;
    const newOS: OrderService = {
      id: Math.random().toString(36).substr(2, 9),
      protocolo: generateProtocolo(),
      ...osData,
      imposto,
      lucro,
      status: { operacional: 'Pendente', financeiro: 'Pendente' }
    };
    setOsList([newOS, ...osList]);
    return newOS;
  };

  const updateOS = (id: string, osData: Omit<OrderService, 'id' | 'lucro' | 'imposto' | 'status' | 'protocolo'>) => {
    const imposto = osData.valorBruto * 0.12;
    const lucro = osData.valorBruto - imposto - osData.custo;

    setOsList(osList.map(os =>
      os.id === id
        ? {
            ...os,
            ...osData,
            imposto,
            lucro
          }
        : os
    ));
  };

  const updateOSStatus = (id: string, updates: Partial<OSStatus>) => {
    setOsList(osList.map(os => 
      os.id === id 
        ? { ...os, status: { ...os.status, ...updates } } 
        : os
    ));
  };

  const getSolicitantesByCliente = (clienteId: string) => {
    return solicitantes.filter(s => s.clienteId === clienteId);
  };

  const getCentrosCustoByCliente = (clienteId: string) => {
    const cliente = clientes.find(c => c.id === clienteId);
    return cliente?.centrosCusto || [];
  };

  return (
    <DataContext.Provider value={{
      clientes,
      solicitantes,
      fornecedores,
      servicos,
      osList,
      passageiros,
      addCliente,
      addSolicitante,
      addPassageiro,
      addFornecedor,
      addServico,
      addOS,
      updateOS,
      updateOSStatus,
      getSolicitantesByCliente,
      getCentrosCustoByCliente
    }}>
      {children}
    </DataContext.Provider>
  );
}


export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
