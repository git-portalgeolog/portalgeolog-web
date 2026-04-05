'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchClientes, 
  fetchSolicitantes, 
  fetchFornecedores, 
  fetchServicos, 
  fetchPassageiros,
  fetchOSList,
  fetchDrivers,
  insertCliente,
  updateClienteInDB,
  deleteClienteFromDB,
  insertSolicitante,
  updateSolicitanteInDB,
  deleteSolicitanteFromDB,
  insertCentroCusto,
  updateCentroCustoInDB,
  deleteCentroCustoFromDB,
  insertFornecedor,
  insertServico,
  updateServicoInDB,
  deleteServicoFromDB,
  insertPassageiro,
  insertOS,
  updateOSInDB,
  updateOSStatusInDB
} from '@/lib/supabase/queries';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';

// ── Interfaces ──────────────────────────────────────────

export interface Cliente {
  id: string;
  nome: string;
  contato?: string;
  centrosCusto: CentroCusto[];
}

export interface CentroCusto {
  id: string;
  nome: string;
  clienteId: string;
}

export interface Solicitante {
  id: string;
  nome: string;
  clienteId: string;
  centroCustoId?: string;
}

export interface Fornecedor {
  id: string;
  nome: string;
  tipo: string;
  telefone?: string;
}

export interface TipoServico {
  id: string;
  nome: string;
}

export interface Waypoint {
  label: string;
  lat: number | null;
  lng: number | null;
  passengers: {
    id: string;
    solicitanteId: string;
    nome: string;
  }[];
}

export interface OrderService {
  id: string;
  protocolo: string;
  os: string;
  data: string;
  hora: string;
  horaExtra?: string;
  clienteId: string;
  solicitante: string;
  centroCustoId?: string;
  motorista: string;
  tipoServico: string;
  valorBruto: number;
  custo: number;
  imposto: number;
  lucro: number;
  status: OSStatus;
  trecho: string;
  distancia?: number;
  rota?: {
    waypoints: Waypoint[];
  };
}

export interface OSStatus {
  operacional: 'Pendente' | 'Aguardando' | 'Em Rota' | 'Finalizado' | 'Cancelado';
  financeiro: 'Pendente' | 'Pago' | 'Faturado';
}

export interface Passageiro {
  id: string;
  nomeCompleto: string;
  email: string;
  celular: string;
  cpf: string;
  enderecos: PassageiroEndereco[];
}

export interface PassageiroEndereco {
  id: string;
  rotulo: string;
  enderecoCompleto: string;
  referencia?: string;
}

export interface NovoPassageiroInput {
  nomeCompleto: string;
  email: string;
  celular: string;
  cpf: string;
  enderecos: {
    rotulo?: string;
    enderecoCompleto: string;
    referencia?: string;
  }[];
}

export interface Driver {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  phone?: string;
  docs?: DriverDoc[];
}

export interface DriverDoc {
  id: string;
  type: string;
  status: 'valid' | 'expired' | 'pending';
  expiryDate?: string;
}

// ── Contexto ─────────────────────────────────────────────

interface DataContextType {
  clientes: Cliente[];
  solicitantes: Solicitante[];
  fornecedores: Fornecedor[];
  servicos: TipoServico[];
  passageiros: Passageiro[];
  osList: OrderService[];
  drivers: Driver[];
  loading: boolean;
  
  addCliente: (nome: string, contato?: string) => void;
  updateCliente: (id: string, updates: Partial<Cliente>) => void;
  deleteCliente: (id: string) => void;
  
  addSolicitante: (nome: string, clienteId: string, centroCustoId?: string) => void;
  updateSolicitante: (id: string, updates: Partial<Solicitante>) => void;
  deleteSolicitante: (id: string) => void;
  
  addPassageiro: (passageiro: NovoPassageiroInput) => Passageiro;
  addFornecedor: (nome: string, tipo: string, telefone?: string) => void;
  
  // Centros de Custo
  addCentroCusto: (nome: string, clienteId: string) => void;
  updateCentroCusto: (id: string, updates: Partial<CentroCusto>) => void;
  deleteCentroCusto: (id: string) => void;
  
  addServico: (nome: string) => void;
  updateServico: (id: string, updates: Partial<TipoServico>) => void;
  deleteServico: (id: string) => void;
  
  addOS: (osData: Omit<OrderService, 'id' | 'lucro' | 'imposto' | 'status' | 'protocolo'>) => OrderService;
  updateOS: (id: string, osData: Omit<OrderService, 'id' | 'lucro' | 'imposto' | 'status' | 'protocolo'>) => void;
  updateOSStatus: (id: string, updates: Partial<OSStatus>) => void;
  
  refreshData: () => Promise<void>;
  getSolicitantesByCliente: (clienteId: string) => Solicitante[];
  getCentrosCustoByCliente: (clienteId: string) => CentroCusto[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [solicitantes, setSolicitantes] = useState<Solicitante[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [servicos, setServicos] = useState<TipoServico[]>([]);
  const [passageiros, setPassageiros] = useState<Passageiro[]>([]);
  const [osList, setOsList] = useState<OrderService[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();

  // Fetch functions wrapped for stability
  const dbFetchClientes = useCallback(async () => fetchClientes(), []);
  const dbFetchSolicitantes = useCallback(async () => fetchSolicitantes(), []);
  const dbFetchFornecedores = useCallback(async () => fetchFornecedores(), []);
  const dbFetchServicos = useCallback(async () => fetchServicos(), []);
  const dbFetchPassageiros = useCallback(async () => fetchPassageiros(), []);
  const dbFetchOSList = useCallback(async () => fetchOSList(), []);
  const dbFetchDrivers = useCallback(async () => fetchDrivers(), []);

  const refreshData = useCallback(async () => {
    try {
      // Executa cada query individualmente para identificar qual está falhando
      const fetchAll = async () => {
        const results = await Promise.allSettled([
          dbFetchClientes(),
          dbFetchSolicitantes(),
          dbFetchFornecedores(),
          dbFetchServicos(),
          dbFetchPassageiros(),
          dbFetchOSList(),
          dbFetchDrivers(),
        ]);

        const [c, s, f, sv, p, os, d] = results;

        if (c.status === 'fulfilled') setClientes(c.value); else console.error('❌ Error fetching Clientes');
        if (s.status === 'fulfilled') setSolicitantes(s.value); else console.error('❌ Error fetching Solicitantes');
        if (f.status === 'fulfilled') setFornecedores(f.value); else console.error('❌ Error fetching Fornecedores');
        if (sv.status === 'fulfilled') setServicos(sv.value); else console.error('❌ Error fetching Servicos');
        if (p.status === 'fulfilled') setPassageiros(p.value); else console.error('❌ Error fetching Passageiros');
        if (os.status === 'fulfilled') setOsList(os.value); else console.error('❌ Error fetching OS List');
        if (d.status === 'fulfilled') setDrivers(d.value); else console.error('❌ Error fetching Drivers');

        // Se pelo menos uma falhou criticamente (ex: erro de rede), Promise.allSettled lida bem,
        // mas se quisermos lançar erro para o catch principal:
        const failed = results.filter(r => r.status === 'rejected');
        if (failed.length > 0) {
          console.warn(`⚠️ ${failed.length} tabelas falharam ao carregar. Verifique o console.`);
        }
      };

      await fetchAll();
    } catch (err) {
      console.error('🔥 CRITICAL: Error refreshing global data:', err);
      toast.error('Erro ao sincronizar dados. Tente atualizar a página.');
    }
  }, [dbFetchClientes, dbFetchSolicitantes, dbFetchFornecedores, dbFetchServicos, dbFetchPassageiros, dbFetchOSList, dbFetchDrivers]);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        refreshData().finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }
  }, [refreshData, user, authLoading]);

  // Real-time Subscriptions with Silenced Fallback
  useEffect(() => {
    if (authLoading || !user) return;

    // Debounce para evitar múltiplas conexões em re-renderizações rápidas
    const timer = setTimeout(() => {
      console.log('🔌 Supabase Real-time: Conectando canal central...');
      
      // Remove canal existente antes de criar novo para evitar erro de callbacks após subscribe
      supabase.removeChannel(supabase.channel('geolog-realtime-global'));
      
      const channel = supabase
        .channel('geolog-realtime-global')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ordens_servico' }, (payload: any) => {
          console.log('📦 OS Change detected');
          dbFetchOSList().then(setOsList).catch(() => {});
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, () => {
          dbFetchClientes().then(setClientes).catch(() => {});
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitantes' }, () => {
          dbFetchSolicitantes().then(setSolicitantes).catch(() => {});
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tipos_servico' }, () => {
          dbFetchServicos().then(setServicos).catch(() => {});
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'centros_custo' }, () => {
          dbFetchClientes().then(setClientes).catch(() => {}); // Centros de custo estao dentro de clientes no estado
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'app_notifications' }, (payload: any) => {
          const notif = payload.new;
          if (notif.type === 'success') toast.success(notif.title, { description: notif.message });
          else if (notif.type === 'error') toast.error(notif.title, { description: notif.message });
          else if (notif.type === 'warning') toast.warning(notif.title, { description: notif.message });
          else toast.info(notif.title, { description: notif.message });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'passageiros' }, () => {
          dbFetchPassageiros().then(setPassageiros).catch(() => {});
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, () => {
          dbFetchDrivers().then(setDrivers).catch(() => {});
        })
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
             console.log('✅ Real-time ativado.');
          }
          // Ignoramos erros ruidosos de canal, o Supabase gerencia reconexão internamente
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }, 1500);

    return () => clearTimeout(timer);
  }, [user, authLoading]);

  // Actions
  const addCliente = (nome: string, contato?: string) => {
    insertCliente(nome, contato).catch(err => console.error('Error insertCliente:', err));
  };

  const updateCliente = (id: string, updates: Partial<Cliente>) => {
    updateClienteInDB(id, updates).catch(err => console.error('Error updateClienteInDB:', err));
  };

  const deleteCliente = (id: string) => {
    deleteClienteFromDB(id).catch(err => console.error('Error deleteClienteFromDB:', err));
  };

  const addSolicitante = (nome: string, clienteId: string, centroCustoId?: string) => {
    insertSolicitante(nome, clienteId, centroCustoId).catch(err => console.error('Error insertSolicitante:', err));
  };

  const addCentroCusto = (nome: string, clienteId: string) => {
    insertCentroCusto(nome, clienteId).catch(err => console.error('Error insertCentroCusto:', err));
  };

  const updateCentroCusto = (id: string, updates: Partial<CentroCusto>) => {
    updateCentroCustoInDB(id, updates).catch(err => console.error('Error updateCentroCustoInDB:', err));
  };

  const deleteCentroCusto = (id: string) => {
    deleteCentroCustoFromDB(id).catch(err => console.error('Error deleteCentroCustoFromDB:', err));
  };

  const updateSolicitante = (id: string, updates: Partial<Solicitante>) => {
    updateSolicitanteInDB(id, updates).catch(err => console.error('Error updateSolicitanteInDB:', err));
  };

  const deleteSolicitante = (id: string) => {
    deleteSolicitanteFromDB(id).catch(err => console.error('Error deleteSolicitanteFromDB:', err));
  };

  const addPassageiro = (passageiro: NovoPassageiroInput): Passageiro => {
    const tempId = `temp-${Date.now()}`;
    const optimistic: Passageiro = {
      id: tempId,
      ...passageiro,
      enderecos: passageiro.enderecos.map((e, i) => ({
        id: `temp-end-${i}`,
        rotulo: e.rotulo?.trim() || `Endereço ${i + 1}`,
        enderecoCompleto: e.enderecoCompleto,
        referencia: e.referencia?.trim() ? e.referencia : undefined,
      })),
    };

    setPassageiros((prev) => [...prev, optimistic]);

    insertPassageiro(passageiro)
      .then((real) => {
        setPassageiros((prev) => prev.map((p) => (p.id === tempId ? real : p)));
      })
      .catch((err) => {
        console.error('Error adding passageiro:', err);
        setPassageiros((prev) => prev.filter((p) => p.id !== tempId));
      });

    return optimistic;
  };

  const addFornecedor = (nome: string, tipo: string, telefone?: string) => {
    insertFornecedor(nome, tipo, telefone).catch(err => console.error('Error insertFornecedor:', err));
  };

  const addServico = (nome: string) => {
    insertServico(nome).catch(err => console.error('Error insertServico:', err));
  };

  const updateServico = (id: string, updates: Partial<TipoServico>) => {
    updateServicoInDB(id, updates).catch(err => console.error('Error updateServicoInDB:', err));
  };

  const deleteServico = (id: string) => {
    deleteServicoFromDB(id).catch(err => console.error('Error deleteServicoFromDB:', err));
  };

  const addOS = (osData: Omit<OrderService, 'id' | 'lucro' | 'imposto' | 'status' | 'protocolo'>): OrderService => {
    const imposto = osData.valorBruto * 0.12;
    const lucro = osData.valorBruto - imposto - osData.custo;
    const tempId = `temp-${Date.now()}`;

    const optimistic: OrderService = {
      id: tempId,
      protocolo: '...',
      ...osData,
      imposto,
      lucro,
      status: { operacional: 'Pendente', financeiro: 'Pendente' },
    };

    setOsList((prev) => [optimistic, ...prev]);

    insertOS(osData)
      .then((real) => {
        setOsList((prev) => prev.map((o) => (o.id === tempId ? real : o)));
      })
      .catch((err) => {
        console.error('Error adding OS:', err);
        setOsList((prev) => prev.filter((o) => o.id !== tempId));
      });

    return optimistic;
  };

  const updateOS = (id: string, osData: Omit<OrderService, 'id' | 'lucro' | 'imposto' | 'status' | 'protocolo'>) => {
    updateOSInDB(id, osData).catch(err => console.error('Error updateOSInDB:', err));
  };

  const updateOSStatus = (id: string, updates: Partial<OSStatus>) => {
    updateOSStatusInDB(id, updates).catch(err => console.error('Error updateOSStatusInDB:', err));
  };

  const getSolicitantesByCliente = useCallback((clienteId: string) => {
    return solicitantes.filter((s) => s.clienteId === clienteId);
  }, [solicitantes]);

  const getCentrosCustoByCliente = useCallback((clienteId: string) => {
    const cliente = clientes.find((c) => c.id === clienteId);
    return cliente?.centrosCusto || [];
  }, [clientes]);

  return (
    <DataContext.Provider
      value={{
        clientes,
        solicitantes,
        fornecedores,
        servicos,
        passageiros,
        osList,
        drivers,
        loading,
        addCliente,
        updateCliente,
        deleteCliente,
        addSolicitante,
        updateSolicitante,
        deleteSolicitante,
        addCentroCusto,
        updateCentroCusto,
        deleteCentroCusto,
        addPassageiro,
        addFornecedor,
        addServico,
        updateServico,
        deleteServico,
        addOS,
        updateOS,
        updateOSStatus,
        refreshData,
        getSolicitantesByCliente,
        getCentrosCustoByCliente,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};
