'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchClientes,
  fetchSolicitantes,
  fetchServicos,
  fetchPassageiros,
  fetchOSList,
  fetchDrivers,
  insertCliente,
  updateClienteInDB,
  deleteClienteFromDB,
  updatePassageiroInDB,
  deletePassageiroFromDB,
  updateVeiculoInDB,
  deleteVeiculoFromDB,
  insertSolicitante,
  updateSolicitanteInDB,
  deleteSolicitanteFromDB,
  insertCentroCusto,
  updateCentroCustoInDB,
  deleteCentroCustoFromDB,
  insertServico,
  updateServicoInDB,
  deleteServicoFromDB,
  insertPassageiro,
  insertDriver,
  deleteDriverFromDB,
  insertOS,
  updateOSInDB,
  updateOSStatusInDB,
  createNotification,
  fetchParceiros,
  insertParceiro,
  updateParceiroInDB,
  deleteParceiroFromDB,
  type ParceiroServico,
  type ParceiroContato,
  type ParceiroFilial,
  type NovoParceiroInput
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
  email?: string;
  celular: string;
  cpf?: string;
  notificar?: boolean;
  genero?: string;
  enderecos: PassageiroEndereco[];
}

export interface Vehicle {
  id: string;
  placa: string;
  renavam: string;
  modelo: string;
  marca: string;
  ano: number;
  cor?: string;
  tipo: 'carro' | 'van' | 'onibus' | 'moto' | 'caminhao' | 'outro';
  status: 'ativo' | 'inativo' | 'manutencao';
  proprietario_tipo: 'interno' | 'parceiro';
  parceiro_id?: string;
  created_at: string;
}

export interface PassageiroEndereco {
  id: string;
  rotulo: string;
  enderecoCompleto: string;
  referencia?: string;
}

export interface NovoPassageiroInput {
  nomeCompleto: string;
  email?: string;
  celular: string;
  cpf?: string;
  notificar?: boolean;
  genero?: string;
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
  cpf?: string;
  cnh?: string;
  phone?: string;
  created_at?: string;
  docs?: DriverDoc[];
  vinculoTipo?: 'interno' | 'parceiro';
  parceiroId?: string;
}

export interface DriverDoc {
  id: string;
  type: string;
  status: 'valid' | 'expired' | 'pending';
  expiryDate?: string;
}

interface AppNotificationRecord {
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

const normalizeTextValue = (value: string): string => value.trim().toLowerCase();

const normalizeDigitsValue = (value: string): string => value.replace(/\D/g, '');

const isUniqueConstraintError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const maybeError = error as { code?: string; message?: string };
  return (
    maybeError.code === '23505' ||
    Boolean(maybeError.message?.toLowerCase().includes('duplicate key value violates unique constraint'))
  );
};

const hasDuplicateRecord = <T extends { id: string }>(
  records: T[],
  candidateValue: string,
  getValue: (record: T) => string,
  normalize: (value: string) => string,
  excludeId?: string
): boolean => {
  const normalizedCandidate = normalize(candidateValue);

  if (!normalizedCandidate) {
    return false;
  }

  return records.some((record) => record.id !== excludeId && normalize(getValue(record)) === normalizedCandidate);
};

// ── Contexto ─────────────────────────────────────────────

interface DataContextType {
  clientes: Cliente[];
  solicitantes: Solicitante[];
  servicos: TipoServico[];
  passageiros: Passageiro[];
  osList: OrderService[];
  drivers: Driver[];
  parceiros: ParceiroServico[];
  loading: boolean;

  addCliente: (nome: string, contato?: string) => Promise<Cliente>;
  updateCliente: (id: string, updates: Partial<Cliente>) => Promise<void>;
  deleteCliente: (id: string) => void;

  addSolicitante: (nome: string, clienteId: string, centroCustoId?: string) => Promise<Solicitante>;
  updateSolicitante: (id: string, updates: Partial<Solicitante>) => void;
  deleteSolicitante: (id: string) => void;

  addPassageiro: (passageiro: NovoPassageiroInput) => Promise<Passageiro>;
  updatePassageiro: (id: string, passageiro: NovoPassageiroInput) => Promise<Passageiro>;
  deletePassageiro: (id: string) => void;
  addDriver: (name: string) => Promise<Driver>;
  updateVeiculo: (id: string, input: Partial<Vehicle>) => Promise<Vehicle>;
  deleteVeiculo: (id: string) => Promise<void>;
  
  // Parceiros
  addParceiro: (parceiro: NovoParceiroInput) => Promise<ParceiroServico>;
  updateParceiro: (id: string, parceiro: NovoParceiroInput) => Promise<void>;
  deleteParceiro: (id: string) => void;
  
  // Centros de Custo
  addCentroCusto: (nome: string, clienteId: string) => Promise<CentroCusto>;
  updateCentroCusto: (id: string, updates: Partial<CentroCusto>) => void;
  deleteCentroCusto: (id: string) => void;
  
  addServico: (nome: string) => Promise<TipoServico>;
  updateServico: (id: string, updates: Partial<TipoServico>) => Promise<void>;
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
  const [servicos, setServicos] = useState<TipoServico[]>([]);
  const [passageiros, setPassageiros] = useState<Passageiro[]>([]);
  const [osList, setOsList] = useState<OrderService[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [parceiros, setParceiros] = useState<ParceiroServico[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  // Fetch functions wrapped for stability
  const dbFetchClientes = useCallback(async () => fetchClientes(), []);
  const dbFetchSolicitantes = useCallback(async () => fetchSolicitantes(), []);
  const dbFetchServicos = useCallback(async () => fetchServicos(), []);
  const dbFetchPassageiros = useCallback(async () => fetchPassageiros(), []);
  const dbFetchParceiros = useCallback(async () => fetchParceiros(), []);
  const dbFetchOSList = useCallback(async () => fetchOSList(), []);
  const dbFetchDrivers = useCallback(async () => fetchDrivers(), []);


  const refreshData = useCallback(async () => {
    try {
      // Executa cada query individualmente para identificar qual está falhando
      const fetchAll = async () => {
        const results = await Promise.allSettled([
          dbFetchClientes(),
          dbFetchSolicitantes(),
          dbFetchServicos(),
          dbFetchPassageiros(),
          dbFetchOSList(),
          dbFetchDrivers(),
          dbFetchParceiros(),
        ]);

        const [c, s, sv, p, os, d, pa] = results;

        if (c.status === 'fulfilled') setClientes(c.value); else console.error('❌ Error fetching Clientes');
        if (s.status === 'fulfilled') setSolicitantes(s.value); else console.error('❌ Error fetching Solicitantes');
        if (sv.status === 'fulfilled') setServicos(sv.value); else console.error('❌ Error fetching Servicos');
        if (p.status === 'fulfilled') setPassageiros(p.value); else console.error('❌ Error fetching Passageiros');
        if (os.status === 'fulfilled') setOsList(os.value); else console.error('❌ Error fetching OS List');
        if (d.status === 'fulfilled') setDrivers(d.value); else console.error('❌ Error fetching Drivers');
        if (pa.status === 'fulfilled') setParceiros(pa.value); else console.error('❌ Error fetching Parceiros');

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
  }, [dbFetchClientes, dbFetchSolicitantes, dbFetchServicos, dbFetchPassageiros, dbFetchOSList, dbFetchDrivers, dbFetchParceiros]);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        refreshData().finally(() => setLoading(false));
      }
    }
  }, [refreshData, user, authLoading]);

  // Real-time Subscriptions with Silenced Fallback
  useEffect(() => {
    if (authLoading || !user) return;

    console.log('🔌 Supabase Real-time: Conectando canal central...');

    const channel = supabase
      .channel('geolog-realtime-global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ordens_servico' }, () => {
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'app_notifications' }, (payload: { new: AppNotificationRecord }) => {
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parceiros_servico' }, () => {
        dbFetchParceiros().then(setParceiros).catch(() => {});
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
  }, [
    authLoading,
    dbFetchClientes,
    dbFetchDrivers,
    dbFetchOSList,
    dbFetchPassageiros,
    dbFetchServicos,
    dbFetchSolicitantes,
    dbFetchParceiros,
    supabase,
    user,
  ]);

  // Actions
  const addCliente = async (nome: string, contato?: string): Promise<Cliente> => {
    const cleanNome = nome.trim();

    if (!cleanNome) {
      throw new Error('Informe o nome da empresa.');
    }

    if (hasDuplicateRecord(clientes, cleanNome, (cliente) => cliente.nome, normalizeTextValue)) {
      throw new Error('Já existe uma empresa com este nome.');
    }

    try {
      const result = await insertCliente(cleanNome, contato);
      setClientes((prev) => [...prev, result].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
      void refreshData();
      return result;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new Error('Já existe uma empresa com este nome.');
      }

      throw error instanceof Error ? error : new Error('Não foi possível salvar a empresa.');
    }
  };

  const updateCliente = async (id: string, updates: Partial<Cliente>): Promise<void> => {
    if (updates.nome !== undefined) {
      const cleanNome = updates.nome.trim();

      if (!cleanNome) {
        throw new Error('Informe o nome da empresa.');
      }

      if (hasDuplicateRecord(clientes, cleanNome, (cliente) => cliente.nome, normalizeTextValue, id)) {
        throw new Error('Já existe uma empresa com este nome.');
      }
    }

    try {
      await updateClienteInDB(id, updates);
      setClientes((prev) => prev.map((cliente) => {
        if (cliente.id !== id) return cliente;

        const nextNome = updates.nome !== undefined ? updates.nome.trim() : cliente.nome;
        const nextContato = updates.contato !== undefined ? (updates.contato.trim() || undefined) : cliente.contato;

        return {
          ...cliente,
          nome: nextNome,
          contato: nextContato,
        };
      }));
      void refreshData();
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new Error('Já existe uma empresa com este nome.');
      }

      throw error instanceof Error ? error : new Error('Não foi possível atualizar a empresa.');
    }
  };

  const deleteCliente = (id: string) => {
    deleteClienteFromDB(id)
      .then(() => {
        setClientes((prev) => prev.filter((cliente) => cliente.id !== id));
        setSolicitantes((prev) => prev.filter((solicitante) => solicitante.clienteId !== id));
        void refreshData();
      })
      .catch(err => console.error('Error deleteClienteFromDB:', err));
  };

  const addSolicitante = async (nome: string, clienteId: string, centroCustoId?: string): Promise<Solicitante> => {
    const cleanNome = nome.trim();

    if (!cleanNome) {
      throw new Error('Informe o nome do solicitante.');
    }

    const solicitantesDoCliente = solicitantes.filter((solicitante) => solicitante.clienteId === clienteId);

    if (hasDuplicateRecord(solicitantesDoCliente, cleanNome, (solicitante) => solicitante.nome, normalizeTextValue)) {
      throw new Error('Já existe um solicitante com este nome para esta empresa.');
    }

    const result = await insertSolicitante(cleanNome, clienteId, centroCustoId);
    setSolicitantes((prev) => [...prev, result].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
    void refreshData();
    return result;
  };

  const addCentroCusto = async (nome: string, clienteId: string): Promise<CentroCusto> => {
    const cleanNome = nome.trim();

    if (!cleanNome) {
      throw new Error('Informe o nome do centro de custo.');
    }

    const centrosDoCliente = getCentrosCustoByCliente(clienteId);

    if (hasDuplicateRecord(centrosDoCliente, cleanNome, (centroCusto) => centroCusto.nome, normalizeTextValue)) {
      throw new Error('Já existe um centro de custo com este nome para esta empresa.');
    }

    const result = await insertCentroCusto(cleanNome, clienteId);
    setClientes((prev) => prev.map((cliente) => {
      if (cliente.id !== clienteId) return cliente;

      const centrosCusto = [...cliente.centrosCusto, result].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      return {
        ...cliente,
        centrosCusto,
      };
    }));
    void refreshData();
    return result;
  };

  const updateCentroCusto = (id: string, updates: Partial<CentroCusto>) => {
    updateCentroCustoInDB(id, updates)
      .then(() => {
        setClientes((prev) => prev.map((cliente) => {
          const currentCentro = cliente.centrosCusto.find((centroCusto) => centroCusto.id === id);

          if (!currentCentro) return cliente;

          const nextClienteId = updates.clienteId ?? currentCentro.clienteId;
          const nextCentro = {
            id,
            nome: updates.nome !== undefined ? updates.nome.trim() : currentCentro.nome,
            clienteId: nextClienteId,
          };

          const centrosCusto = cliente.centrosCusto.filter((centroCusto) => centroCusto.id !== id);
          if (cliente.id === nextClienteId) {
            centrosCusto.push(nextCentro);
          }

          return {
            ...cliente,
            centrosCusto: centrosCusto.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
          };
        }));
        void refreshData();
      })
      .catch(err => console.error('Error updateCentroCustoInDB:', err));
  };

  const deleteCentroCusto = (id: string) => {
    deleteCentroCustoFromDB(id)
      .then(() => {
        setClientes((prev) => prev.map((cliente) => ({
          ...cliente,
          centrosCusto: cliente.centrosCusto.filter((centroCusto) => centroCusto.id !== id),
        })));
        void refreshData();
      })
      .catch(err => console.error('Error deleteCentroCustoFromDB:', err));
  };

  const updateSolicitante = (id: string, updates: Partial<Solicitante>) => {
    updateSolicitanteInDB(id, updates)
      .then(() => {
        setSolicitantes((prev) => prev.map((solicitante) => {
          if (solicitante.id !== id) return solicitante;

          return {
            ...solicitante,
            nome: updates.nome !== undefined ? updates.nome.trim() : solicitante.nome,
            clienteId: updates.clienteId ?? solicitante.clienteId,
            centroCustoId: updates.centroCustoId ?? solicitante.centroCustoId,
          };
        }));
        void refreshData();
      })
      .catch(err => console.error('Error updateSolicitanteInDB:', err));
  };

  const deleteSolicitante = (id: string) => {
    deleteSolicitanteFromDB(id)
      .then(() => {
        setSolicitantes((prev) => prev.filter((solicitante) => solicitante.id !== id));
        void refreshData();
      })
      .catch(err => console.error('Error deleteSolicitanteFromDB:', err));
  };

  const addPassageiro = async (passageiro: NovoPassageiroInput): Promise<Passageiro> => {
    const cleanNome = passageiro.nomeCompleto.trim();
    const cleanEmail = passageiro.email?.trim() || '';
    const cleanCelular = passageiro.celular.trim();
    const cleanCpf = passageiro.cpf?.trim() || '';

    if (!cleanNome) {
      throw new Error('Informe o nome do passageiro.');
    }

    if (cleanEmail && hasDuplicateRecord(passageiros, cleanEmail, (item) => item.email || '', normalizeTextValue)) {
      throw new Error('Já existe um passageiro com este e-mail.');
    }

    if (hasDuplicateRecord(passageiros, cleanCelular, (item) => item.celular, normalizeDigitsValue)) {
      throw new Error('Já existe um passageiro com este celular.');
    }

    if (cleanCpf && hasDuplicateRecord(passageiros, cleanCpf, (item) => item.cpf || '', normalizeDigitsValue)) {
      throw new Error('Já existe um passageiro com este CPF.');
    }

    const tempId = `temp-${Date.now()}`;
    const optimistic: Passageiro = {
      id: tempId,
      nomeCompleto: cleanNome,
      email: cleanEmail || undefined,
      celular: cleanCelular,
      cpf: cleanCpf || undefined,
      enderecos: passageiro.enderecos.map((e, i) => ({
        id: `temp-end-${i}`,
        rotulo: e.rotulo?.trim() || `Endereço ${i + 1}`,
        enderecoCompleto: e.enderecoCompleto.trim(),
        referencia: e.referencia?.trim() || undefined,
      })),
    };

    setPassageiros((prev) => [...prev, optimistic]);

    try {
      const real = await insertPassageiro({
        ...passageiro,
        nomeCompleto: cleanNome,
        email: cleanEmail || undefined,
        celular: cleanCelular,
        cpf: cleanCpf || undefined,
      });

      setPassageiros((prev) => prev.map((p) => (p.id === tempId ? real : p)));
      void refreshData();
      return real;
    } catch (error) {
      setPassageiros((prev) => prev.filter((p) => p.id !== tempId));

      if (isUniqueConstraintError(error)) {
        const duplicateMessage = cleanEmail && hasDuplicateRecord(passageiros, cleanEmail, (item) => item.email || '', normalizeTextValue)
          ? 'Já existe um passageiro com este e-mail.'
          : hasDuplicateRecord(passageiros, cleanCelular, (item) => item.celular, normalizeDigitsValue)
            ? 'Já existe um passageiro com este celular.'
            : cleanCpf && hasDuplicateRecord(passageiros, cleanCpf, (item) => item.cpf || '', normalizeDigitsValue)
              ? 'Já existe um passageiro com este CPF.'
              : 'Não foi possível salvar o passageiro.';

        throw new Error(duplicateMessage);
      }

      throw error instanceof Error ? error : new Error('Não foi possível salvar o passageiro.');
    }
  };

  const updatePassageiro = async (id: string, passageiro: NovoPassageiroInput): Promise<Passageiro> => {
    const cleanNome = passageiro.nomeCompleto.trim();
    const cleanEmail = passageiro.email?.trim() || '';
    const cleanCelular = passageiro.celular.trim();
    const cleanCpf = passageiro.cpf?.trim() || '';

    if (!cleanNome) {
      throw new Error('Informe o nome do passageiro.');
    }

    // Verificar duplicatas excluindo o próprio passageiro
    const otherPassageiros = passageiros.filter(p => p.id !== id);

    if (cleanEmail && hasDuplicateRecord(otherPassageiros, cleanEmail, (item) => item.email || '', normalizeTextValue)) {
      throw new Error('Já existe um passageiro com este e-mail.');
    }

    if (hasDuplicateRecord(otherPassageiros, cleanCelular, (item) => item.celular, normalizeDigitsValue)) {
      throw new Error('Já existe um passageiro com este celular.');
    }

    if (cleanCpf && hasDuplicateRecord(otherPassageiros, cleanCpf, (item) => item.cpf || '', normalizeDigitsValue)) {
      throw new Error('Já existe um passageiro com este CPF.');
    }

    // Atualização otimista
    const optimistic: Passageiro = {
      id,
      nomeCompleto: cleanNome,
      email: cleanEmail || undefined,
      celular: cleanCelular,
      cpf: cleanCpf || undefined,
      enderecos: passageiro.enderecos.map((e, i) => ({
        id: `temp-end-${i}`,
        rotulo: e.rotulo?.trim() || `Endereço ${i + 1}`,
        enderecoCompleto: e.enderecoCompleto.trim(),
        referencia: e.referencia?.trim() || undefined,
      })),
    };

    const previousState = passageiros;
    setPassageiros((prev) => prev.map((p) => (p.id === id ? optimistic : p)));

    try {
      const real = await updatePassageiroInDB(id, {
        ...passageiro,
        nomeCompleto: cleanNome,
        email: cleanEmail || undefined,
        celular: cleanCelular,
        cpf: cleanCpf || undefined,
      });

      setPassageiros((prev) => prev.map((p) => (p.id === id ? real : p)));
      void refreshData();
      return real;
    } catch (error) {
      setPassageiros(previousState);

      if (isUniqueConstraintError(error)) {
        const duplicateMessage = cleanEmail && hasDuplicateRecord(otherPassageiros, cleanEmail, (item) => item.email || '', normalizeTextValue)
          ? 'Já existe um passageiro com este e-mail.'
          : hasDuplicateRecord(otherPassageiros, cleanCelular, (item) => item.celular, normalizeDigitsValue)
            ? 'Já existe um passageiro com este celular.'
            : cleanCpf && hasDuplicateRecord(otherPassageiros, cleanCpf, (item) => item.cpf || '', normalizeDigitsValue)
              ? 'Já existe um passageiro com este CPF.'
              : 'Não foi possível atualizar o passageiro.';

        throw new Error(duplicateMessage);
      }

      throw error instanceof Error ? error : new Error('Não foi possível atualizar o passageiro.');
    }
  };

  const deletePassageiro = (id: string) => {
    // Atualização otimista
    const previousState = passageiros;
    setPassageiros((prev) => prev.filter((p) => p.id !== id));

    deletePassageiroFromDB(id)
      .then(() => {
        void refreshData();
      })
      .catch((error) => {
        setPassageiros(previousState);
        console.error('Error deletePassageiroFromDB:', error);
        throw error;
      });
  };

  const updateVeiculo = async (id: string, input: Partial<Vehicle>): Promise<Vehicle> => {
    const real = await updateVeiculoInDB(id, input);
    return real;
  };

  const deleteVeiculo = async (id: string): Promise<void> => {
    try {
      await deleteVeiculoFromDB(id);
    } catch (error) {
      console.error('Error deleteVeiculoFromDB:', error);
      throw error;
    }
  };

  const addDriver = async (name: string): Promise<Driver> => {
    const cleanName = name.trim();

    if (!cleanName) {
      throw new Error('Informe o nome do motorista.');
    }

    if (hasDuplicateRecord(drivers, cleanName, (driver) => driver.name, normalizeTextValue)) {
      throw new Error('Já existe um motorista com este nome.');
    }

    try {
      const result = await insertDriver({
        name: cleanName,
        cpf: '',
        cnh: '',
        phone: '',
        status: 'active'
      });
      setDrivers((prev) => [...prev, result].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
      void refreshData();
      return result;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new Error('Já existe um motorista com este nome.');
      }

      throw error instanceof Error ? error : new Error('Não foi possível salvar o motorista.');
    }
  };

  const addServico = async (nome: string): Promise<TipoServico> => {
    const cleanNome = nome.trim();

    if (!cleanNome) {
      throw new Error('Informe o nome do serviço.');
    }

    if (hasDuplicateRecord(servicos, cleanNome, (item) => item.nome, normalizeTextValue)) {
      throw new Error('Já existe um serviço com este nome.');
    }

    try {
      const result = await insertServico(cleanNome);
      setServicos((prev) => [...prev, result].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
      void refreshData();
      return result;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new Error('Já existe um serviço com este nome.');
      }

      throw error instanceof Error ? error : new Error('Não foi possível salvar o serviço.');
    }
  };

  const updateServico = async (id: string, updates: Partial<TipoServico>): Promise<void> => {
    if (updates.nome !== undefined) {
      const cleanNome = updates.nome.trim();

      if (!cleanNome) {
        throw new Error('Informe o nome do serviço.');
      }

      if (hasDuplicateRecord(servicos, cleanNome, (item) => item.nome, normalizeTextValue, id)) {
        throw new Error('Já existe um serviço com este nome.');
      }
    }

    try {
      await updateServicoInDB(id, updates);
      setServicos((prev) => prev.map((servico) => {
        if (servico.id !== id) return servico;

        return {
          ...servico,
          nome: updates.nome !== undefined ? updates.nome.trim() : servico.nome,
        };
      }));
      void refreshData();
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new Error('Já existe um serviço com este nome.');
      }

      throw error instanceof Error ? error : new Error('Não foi possível atualizar o serviço.');
    }
  };

  const deleteServico = (id: string) => {
    deleteServicoFromDB(id)
      .then(() => {
        setServicos((prev) => prev.filter((servico) => servico.id !== id));
        void refreshData();
      })
      .catch(err => console.error('Error deleteServicoFromDB:', err));
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
        void refreshData();
      })
      .catch((err) => {
        console.error('Error adding OS:', err);
        console.error('OS Data that failed:', osData);
        setOsList((prev) => prev.filter((o) => o.id !== tempId));
        throw err; // Re-throw para que o erro possa ser tratado no componente
      });

    return optimistic;
  };

  const updateOS = (id: string, osData: Omit<OrderService, 'id' | 'lucro' | 'imposto' | 'status' | 'protocolo'>) => {
    const currentOS = osList.find((os) => os.id === id);
    if (currentOS) {
      const imposto = osData.valorBruto * 0.12;
      const lucro = osData.valorBruto - imposto - osData.custo;

      setOsList((prev) => prev.map((os) => (os.id === id ? {
        ...currentOS,
        ...osData,
        imposto,
        lucro,
        status: currentOS.status,
        protocolo: currentOS.protocolo,
      } : os)));
    }

    updateOSInDB(id, osData)
      .then(() => {
        void refreshData();
      })
      .catch(err => console.error('Error updateOSInDB:', err));
  };

  const updateOSStatus = (id: string, updates: Partial<OSStatus>) => {
    setOsList((prev) => prev.map((os) => (os.id === id ? {
      ...os,
      status: {
        operacional: updates.operacional ?? os.status.operacional,
        financeiro: updates.financeiro ?? os.status.financeiro,
      },
    } : os)));

    updateOSStatusInDB(id, updates)
      .then(() => {
        void refreshData();
      })
      .catch(err => console.error('Error updateOSStatusInDB:', err));
  };

  const getSolicitantesByCliente = useCallback((clienteId: string) => {
    return solicitantes.filter((s) => s.clienteId === clienteId);
  }, [solicitantes]);

  const getCentrosCustoByCliente = useCallback((clienteId: string) => {
    const cliente = clientes.find((c) => c.id === clienteId);
    return cliente?.centrosCusto || [];
  }, [clientes]);

  // Parceiros CRUD
  const addParceiro = async (input: NovoParceiroInput): Promise<ParceiroServico> => {
    const cleanNome = input.razaoSocialOuNomeCompleto.trim();
    if (!cleanNome) {
      throw new Error('Informe a razão social ou nome completo do parceiro.');
    }

    if (hasDuplicateRecord(parceiros, cleanNome, (p) => p.razaoSocialOuNomeCompleto, normalizeTextValue)) {
      throw new Error('Já existe um parceiro com esta razão social/nome.');
    }

    try {
      const result = await insertParceiro(input);
      setParceiros((prev) => [...prev, result].sort((a, b) => a.razaoSocialOuNomeCompleto.localeCompare(b.razaoSocialOuNomeCompleto, 'pt-BR')));
      createNotification('success', 'Parceiro cadastrado', `"${cleanNome}" foi adicionado como parceiro de serviço.`, 'interno');
      void refreshData();
      return result;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new Error('Já existe um parceiro com este documento.');
      }
      throw error instanceof Error ? error : new Error('Não foi possível salvar o parceiro.');
    }
  };

  const updateParceiro = async (id: string, input: NovoParceiroInput): Promise<void> => {
    const cleanNome = input.razaoSocialOuNomeCompleto.trim();
    if (!cleanNome) {
      throw new Error('Informe a razão social ou nome completo do parceiro.');
    }

    if (hasDuplicateRecord(parceiros, cleanNome, (p) => p.razaoSocialOuNomeCompleto, normalizeTextValue, id)) {
      throw new Error('Já existe um parceiro com esta razão social/nome.');
    }

    try {
      await updateParceiroInDB(id, input);
      setParceiros((prev) => prev.map((parceiro) => (parceiro.id === id ? {
        ...parceiro,
        ...input,
        razaoSocialOuNomeCompleto: cleanNome,
      } : parceiro)).sort((a, b) => a.razaoSocialOuNomeCompleto.localeCompare(b.razaoSocialOuNomeCompleto, 'pt-BR')));
      void refreshData();
      createNotification('info', 'Parceiro atualizado', `Os dados de "${cleanNome}" foram atualizados.`, 'interno');
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new Error('Já existe um parceiro com este documento.');
      }
      throw error instanceof Error ? error : new Error('Não foi possível atualizar o parceiro.');
    }
  };

  const deleteParceiro = (id: string) => {
    const parceiro = parceiros.find((p) => p.id === id);
    deleteParceiroFromDB(id).then(() => {
      setParceiros((prev) => prev.filter((p) => p.id !== id));
      if (parceiro) {
        createNotification('warning', 'Parceiro excluído', `"${parceiro.razaoSocialOuNomeCompleto}" foi removido do sistema.`, 'interno');
      }
      void refreshData();
    }).catch(err => console.error('Error deleteParceiroFromDB:', err));
  };

  return (
    <DataContext.Provider
      value={{
        clientes,
        solicitantes,
        servicos,
        passageiros,
        osList,
        drivers,
        parceiros,
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
        updatePassageiro,
        deletePassageiro,
        addDriver,
        updateVeiculo,
        deleteVeiculo,
        addParceiro,
        updateParceiro,
        deleteParceiro,
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

// Re-exportar tipos para uso externo
export type { ParceiroServico, ParceiroContato, ParceiroFilial, NovoParceiroInput } from '@/lib/supabase/queries';
