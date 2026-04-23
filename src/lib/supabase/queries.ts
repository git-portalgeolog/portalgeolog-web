import { createClient } from '@/lib/supabase/client';
import type {
  Cliente,
  CentroCusto,
  Solicitante,
  Passageiro,
  PassageiroEndereco,
  OrderService,
  NovoPassageiroInput,
  Waypoint,
  Driver,
  Vehicle
} from '@/context/DataContext';

const supabase = createClient();

const trimText = (value?: string): string => value?.trim() ?? '';

type PaginationParams = {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
};

export type PaginatedResult<T> = {
  items: T[];
  totalCount: number;
};

const normalizePagination = (page = 1, pageSize = 10) => {
  const safePage = Math.max(1, Math.floor(page || 1));
  const safePageSize = Math.max(1, Math.floor(pageSize || 10));
  return {
    page: safePage,
    pageSize: safePageSize,
    from: (safePage - 1) * safePageSize,
    to: safePage * safePageSize - 1,
  };
};

const sanitizeSearchTerm = (term: string): string => term.trim().replace(/[%_]/g, '\\$&');

// Função para criar notificações
export async function createNotification(
  type: 'success' | 'info' | 'warning' | 'error',
  title: string,
  message: string,
  targetAudience: 'interno' | 'gestor' | 'all' = 'all',
  targetUserId?: string
): Promise<void> {
  try {
    const response = await fetch('/api/app-notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        title,
        message,
        targetAudience,
        targetUserId: targetUserId || null,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      console.error('Erro ao criar notificação:', payload?.error || `HTTP ${response.status}`);
    }
  } catch (err) {
    console.error('Erro ao criar notificação:', err);
  }
}


type ClienteRow = { id: string; nome: string; contato: string | null };
type CentroCustoRow = { id: string; nome: string; cliente_id: string };
type SolicitanteRow = { id: string; nome: string; cliente_id: string; centro_custo_id: string | null };
type PassageiroRow = {
  id: string;
  nome_completo: string;
  email: string | null;
  celular: string | null;
  cpf: string | null;
  notificar: boolean | null;
  genero: string | null;
};
type PassageiroEnderecoRow = {
  id: string;
  passageiro_id: string;
  rotulo: string;
  endereco_completo: string;
  referencia: string | null;
};
type OSRow = {
  id: string;
  protocolo: string | null;
  os_number: string | null;
  data: string | null;
  hora: string | null;
  hora_extra: string | null;
  cliente_id: string | null;
  centro_custo?: string | null;
  solicitante: string | null;
  tipo_servico: string | null;
  trecho: string | null;
  motorista: string | null;
  veiculo_id?: string | null;
  valor_bruto: number | string;
  imposto: number | string;
  custo: number | string;
  lucro: number | string;
  status_operacional: OrderService['status']['operacional'];
  status_financeiro: OrderService['status']['financeiro'];
  distancia: string | null;
};
type OSWaypointRow = {
  id: string;
  ordem_servico_id: string;
  position: number;
  label: string;
  lat: number | null;
  lng: number | null;
  comment: string | null;
};
type OSWaypointPassengerRow = {
  id: string;
  waypoint_id: string;
  passageiro_id: string | null;
  nome: string | null;
};
type DriverRow = {
  id: string;
  name: string;
  cpf?: string;
  cnh?: string | null;
  phone?: string | null;
  status: 'active' | 'inactive';
  created_at?: string;
  driver_vehicles?: Array<{
    id: string;
    vehicle_id: string;
    vehicle: {
      id: string;
      placa: string;
      modelo: string;
      marca: string;
    };
  }>;
};

// ── Clientes ──────────────────────────────────────────────

export async function fetchClientes(): Promise<Cliente[]> {
  const { data: clientesRaw, error } = await supabase
    .from('clientes')
    .select('id, nome, contato')
    .order('nome');

  if (error) throw error;

  const { data: centrosRaw } = await supabase
    .from('centros_custo')
    .select('id, nome, cliente_id')
    .order('nome');

  const typedClientes = (clientesRaw || []) as ClienteRow[];
  const typedCentros = (centrosRaw || []) as CentroCustoRow[];

  return typedClientes.map((c) => ({
    id: c.id,
    nome: c.nome,
    contato: c.contato || undefined,
    centrosCusto: typedCentros
      .filter((cc) => cc.cliente_id === c.id)
      .map((cc) => ({ id: cc.id, nome: cc.nome, clienteId: cc.cliente_id })),
  }));
}

export async function insertCentroCusto(nome: string, clienteId: string): Promise<CentroCusto> {
  const { data, error } = await supabase
    .from('centros_custo')
    .insert({ nome, cliente_id: clienteId })
    .select('id, nome, cliente_id')
    .single();

  if (error) throw error;
  return { id: data.id, nome: data.nome, clienteId: data.cliente_id };
}

export async function updateCentroCustoInDB(id: string, updates: Partial<CentroCusto>): Promise<void> {
  const { error } = await supabase
    .from('centros_custo')
    .update({ nome: updates.nome, cliente_id: updates.clienteId })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteCentroCustoFromDB(id: string): Promise<void> {
  const { error } = await supabase.from('centros_custo').delete().eq('id', id);
  if (error) throw error;
}

export async function insertCliente(nome: string, contato?: string): Promise<Cliente> {
  const { data, error } = await supabase
    .from('clientes')
    .insert({ nome: trimText(nome), contato: trimText(contato) || null })
    .select('id, nome, contato')
    .single();

  if (error) throw error;
  return { ...data, contato: data.contato || undefined, centrosCusto: [] };
}

export async function updateClienteInDB(id: string, updates: Partial<Cliente>): Promise<void> {
  const payload: { nome?: string; contato?: string | null } = {};

  if (updates.nome !== undefined) {
    payload.nome = trimText(updates.nome);
  }

  if (updates.contato !== undefined) {
    payload.contato = trimText(updates.contato) || null;
  }

  const { error } = await supabase
    .from('clientes')
    .update(payload)
    .eq('id', id);

  if (error) throw error;
}

export async function deleteClienteFromDB(id: string): Promise<void> {
  const { error } = await supabase
    .from('clientes')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ── Solicitantes ──────────────────────────────────────────

export async function fetchSolicitantes(): Promise<Solicitante[]> {
  const { data, error } = await supabase
    .from('solicitantes')
    .select('id, nome, cliente_id, centro_custo_id')
    .order('nome');

  if (error) throw error;
  return ((data || []) as SolicitanteRow[]).map((s) => ({ 
    id: s.id, 
    nome: s.nome, 
    clienteId: s.cliente_id,
    centroCustoId: s.centro_custo_id || undefined
  }));
}

export async function insertSolicitante(nome: string, clienteId: string, centroCustoId?: string): Promise<Solicitante> {
  const { data, error } = await supabase
    .from('solicitantes')
    .insert({ nome, cliente_id: clienteId, centro_custo_id: centroCustoId })
    .select('id, nome, cliente_id, centro_custo_id')
    .single();

  if (error) throw error;
  return { 
    id: data.id, 
    nome: data.nome, 
    clienteId: data.cliente_id,
    centroCustoId: data.centro_custo_id
  };
}

export async function updateSolicitanteInDB(id: string, updates: Partial<Solicitante>): Promise<void> {
  const { error } = await supabase
    .from('solicitantes')
    .update({ 
      nome: updates.nome, 
      cliente_id: updates.clienteId,
      centro_custo_id: updates.centroCustoId
    })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteSolicitanteFromDB(id: string): Promise<void> {
  const { error } = await supabase
    .from('solicitantes')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ── Passageiros ───────────────────────────────────────────

export async function fetchPassageiros(): Promise<Passageiro[]> {
  const { data: passRaw, error } = await supabase
    .from('passageiros')
    .select('id, nome_completo, email, celular, cpf, notificar, genero')
    .order('nome_completo');

  if (error) throw error;

  const { data: endRaw } = await supabase
    .from('passageiro_enderecos')
    .select('id, passageiro_id, rotulo, endereco_completo, referencia');

  const typedPassengers = (passRaw || []) as PassageiroRow[];
  const typedAddresses = (endRaw || []) as PassageiroEnderecoRow[];

  return typedPassengers.map((p) => ({
    id: p.id,
    nomeCompleto: p.nome_completo,
    email: p.email || undefined,
    celular: p.celular || '',
    cpf: p.cpf || undefined,
    notificar: p.notificar ?? undefined,
    genero: p.genero ?? undefined,
    enderecos: typedAddresses
      .filter((e) => e.passageiro_id === p.id)
      .map((e) => ({
        id: e.id,
        rotulo: e.rotulo,
        enderecoCompleto: e.endereco_completo,
        referencia: e.referencia || undefined,
      })),
  }));
}

export async function insertPassageiro(input: NovoPassageiroInput): Promise<Passageiro> {
  const { data: passRow, error: passError } = await supabase
    .from('passageiros')
    .insert({
      nome_completo: trimText(input.nomeCompleto),
      email: input.email ? trimText(input.email) : null,
      celular: trimText(input.celular),
      cpf: input.cpf ? trimText(input.cpf) : null,
      notificar: input.notificar ?? false,
      genero: input.genero || null,
    })
    .select('id, nome_completo, email, celular, cpf, notificar, genero')
    .single();

  if (passError) throw passError;

  const enderecos: PassageiroEndereco[] = [];

  if (input.enderecos.length > 0) {
    const { data: endRows, error: endError } = await supabase
      .from('passageiro_enderecos')
      .insert(
        input.enderecos.map((e) => ({
          passageiro_id: passRow.id,
          rotulo: trimText(e.rotulo) || 'Principal',
          endereco_completo: trimText(e.enderecoCompleto),
          referencia: trimText(e.referencia) || null,
        }))
      )
      .select('id, rotulo, endereco_completo, referencia');

    if (!endError && endRows) {
      (endRows as PassageiroEnderecoRow[]).forEach((e) =>
        enderecos.push({
          id: e.id,
          rotulo: e.rotulo,
          enderecoCompleto: e.endereco_completo,
          referencia: e.referencia || undefined,
        })
      );
    }
  }

  return {
    id: passRow.id,
    nomeCompleto: passRow.nome_completo,
    email: passRow.email || undefined,
    celular: passRow.celular || '',
    cpf: passRow.cpf || undefined,
    notificar: passRow.notificar || undefined,
    genero: passRow.genero || undefined,
    enderecos,
  };
}

export async function updatePassageiroInDB(id: string, input: NovoPassageiroInput): Promise<Passageiro> {
  const { data: passRow, error: passError } = await supabase
    .from('passageiros')
    .update({
      nome_completo: trimText(input.nomeCompleto),
      email: input.email ? trimText(input.email) : null,
      celular: trimText(input.celular),
      cpf: input.cpf ? trimText(input.cpf) : null,
      notificar: input.notificar ?? false,
      genero: input.genero || null,
    })
    .eq('id', id)
    .select('id, nome_completo, email, celular, cpf, notificar, genero')
    .single();

  if (passError) throw passError;

  // Deletar endereços antigos
  await supabase.from('passageiro_enderecos').delete().eq('passageiro_id', id);

  // Inserir novos endereços
  const enderecos: PassageiroEndereco[] = [];

  if (input.enderecos.length > 0) {
    const { data: endRows, error: endError } = await supabase
      .from('passageiro_enderecos')
      .insert(
        input.enderecos.map((e) => ({
          passageiro_id: id,
          rotulo: trimText(e.rotulo) || 'Principal',
          endereco_completo: trimText(e.enderecoCompleto),
          referencia: trimText(e.referencia) || null,
        }))
      )
      .select('id, rotulo, endereco_completo, referencia');

    if (!endError && endRows) {
      (endRows as PassageiroEnderecoRow[]).forEach((e) =>
        enderecos.push({
          id: e.id,
          rotulo: e.rotulo,
          enderecoCompleto: e.endereco_completo,
          referencia: e.referencia || undefined,
        })
      );
    }
  }

  return {
    id: passRow.id,
    nomeCompleto: passRow.nome_completo,
    email: passRow.email || undefined,
    celular: passRow.celular || '',
    cpf: passRow.cpf || undefined,
    notificar: passRow.notificar || undefined,
    genero: passRow.genero || undefined,
    enderecos,
  };
}

export async function deletePassageiroFromDB(id: string): Promise<void> {
  const { error } = await supabase.from('passageiros').delete().eq('id', id);

  if (error) throw error;
}

export async function fetchPassageirosPage({
  page = 1,
  pageSize = 10,
  searchTerm = '',
}: PaginationParams = {}): Promise<PaginatedResult<Passageiro>> {
  const { from, to } = normalizePagination(page, pageSize);
  const term = searchTerm.trim();
  const likeTerm = term ? `%${sanitizeSearchTerm(term)}%` : '';

  let query = supabase
    .from('passageiros')
    .select('*', { count: 'exact' })
    .order('nome_completo', { ascending: true })
    .range(from, to);

  if (likeTerm) {
    query = query.or(
      `nome_completo.ilike.${likeTerm},email.ilike.${likeTerm},celular.ilike.${likeTerm},cpf.ilike.${likeTerm}`
    );
  }

  const { data: passRaw, error, count } = await query;
  if (error) throw error;

  const typedPassengers = (passRaw || []) as PassageiroRow[];
  const passengerIds = typedPassengers.map((p) => p.id);

  let endRaw: PassageiroEnderecoRow[] = [];
  if (passengerIds.length > 0) {
    const { data: endData } = await supabase
      .from('passageiro_enderecos')
      .select('id, passageiro_id, rotulo, endereco_completo, referencia')
      .in('passageiro_id', passengerIds);

    endRaw = (endData || []) as PassageiroEnderecoRow[];
  }

  return {
    items: typedPassengers.map((p) => ({
      id: p.id,
      nomeCompleto: p.nome_completo,
      email: p.email || undefined,
      celular: p.celular || '',
      cpf: p.cpf || undefined,
      notificar: p.notificar ?? undefined,
      genero: p.genero ?? undefined,
      enderecos: endRaw
        .filter((e) => e.passageiro_id === p.id)
        .map((e) => ({
          id: e.id,
          rotulo: e.rotulo,
          enderecoCompleto: e.endereco_completo,
          referencia: e.referencia || undefined,
        })),
    })),
    totalCount: count ?? typedPassengers.length,
  };
}

// ── Veículos ───────────────────────────────────────────

export async function updateVeiculoInDB(id: string, input: Partial<Vehicle>): Promise<Vehicle> {
  const { data: vehRow, error: vehError } = await supabase
    .from('veiculos')
    .update({
      placa: input.placa?.trim().toUpperCase(),
      renavam: input.renavam?.trim(),
      modelo: input.modelo?.trim(),
      marca: input.marca?.trim(),
      ano: input.ano,
      cor: input.cor?.trim() || null,
      tipo: input.tipo,
      status: input.status,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (vehError) throw vehError;

  return {
    id: vehRow.id,
    placa: vehRow.placa,
    renavam: vehRow.renavam,
    modelo: vehRow.modelo,
    marca: vehRow.marca,
    ano: vehRow.ano,
    cor: vehRow.cor || undefined,
    tipo: vehRow.tipo as Vehicle['tipo'],
    status: vehRow.status as Vehicle['status'],
    proprietario_tipo: vehRow.proprietario_tipo as Vehicle['proprietario_tipo'],
    parceiro_id: vehRow.parceiro_id || undefined,
    created_at: vehRow.created_at,
  };
}

export async function deleteVeiculoFromDB(id: string): Promise<void> {
  const { error } = await supabase.from('veiculos').delete().eq('id', id);

  if (error) throw error;
}

// ── Ordens de Serviço ─────────────────────────────────────

export async function fetchOSList(): Promise<OrderService[]> {
  const { data: osRaw, error } = await supabase
    .from('ordens_servico')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const typedOrders = (osRaw || []) as OSRow[];
  const osIds = typedOrders.map((o) => o.id);
  let wpRaw: OSWaypointRow[] = [];
  let wpPassRaw: OSWaypointPassengerRow[] = [];

  if (osIds.length > 0) {
    const { data: wpData } = await supabase
      .from('os_waypoints')
      .select('id, ordem_servico_id, position, label, lat, lng, comment')
      .in('ordem_servico_id', osIds)
      .order('position');

    wpRaw = (wpData || []) as OSWaypointRow[];
    const wpIds = wpRaw.map((w) => w.id);

    if (wpIds.length > 0) {
      const { data: passData } = await supabase
        .from('os_waypoint_passengers')
        .select('id, waypoint_id, passageiro_id, nome')
        .in('waypoint_id', wpIds);

      wpPassRaw = (passData || []) as OSWaypointPassengerRow[];
    }
  }

  return typedOrders.map((o) => {
    const waypoints: Waypoint[] = wpRaw
      .filter((w) => w.ordem_servico_id === o.id)
      .map((w) => ({
        label: w.label,
        lat: w.lat,
        lng: w.lng,
        comment: w.comment || undefined,
        passengers: wpPassRaw
          .filter((p) => p.waypoint_id === w.id)
          .map((p) => ({
            id: p.id,
            solicitanteId: p.passageiro_id || '',
            nome: p.nome || '',
          })),
      }));

    return {
      id: o.id,
      protocolo: o.protocolo || '',
      os: o.os_number || '',
      data: o.data || '',
      hora: o.hora || '',
      horaExtra: o.hora_extra || '',
      clienteId: o.cliente_id || '',
      solicitante: o.solicitante || '',
      centroCustoId: o.centro_custo || '',
      trecho: o.trecho || '',
      motorista: o.motorista || '',
      veiculoId: o.veiculo_id || undefined,
      valorBruto: Number(o.valor_bruto),
      imposto: Number(o.imposto),
      custo: Number(o.custo),
      lucro: Number(o.lucro),
      status: {
        operacional: o.status_operacional as OrderService['status']['operacional'],
        financeiro: o.status_financeiro as OrderService['status']['financeiro'],
      },
      distancia: o.distancia ? Number(o.distancia) : undefined,
      rota: waypoints.length > 0 ? { waypoints } : undefined,
    };
  });
}

export async function fetchOSPage({
  page = 1,
  pageSize = 10,
  searchTerm = '',
}: PaginationParams = {}): Promise<PaginatedResult<OrderService>> {
  const { from, to } = normalizePagination(page, pageSize);
  const term = searchTerm.trim();
  const likeTerm = term ? `%${sanitizeSearchTerm(term)}%` : '';

  let query = supabase
    .from('ordens_servico')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (likeTerm) {
    query = query.or(
      `protocolo.ilike.${likeTerm},os_number.ilike.${likeTerm},trecho.ilike.${likeTerm},motorista.ilike.${likeTerm}`
    );
  }

  const { data: osRaw, error, count } = await query;
  if (error) throw error;

  const typedOrders = (osRaw || []) as OSRow[];
  const osIds = typedOrders.map((o) => o.id);
  let wpRaw: OSWaypointRow[] = [];
  let wpPassRaw: OSWaypointPassengerRow[] = [];

  if (osIds.length > 0) {
    const { data: wpData } = await supabase
      .from('os_waypoints')
      .select('id, ordem_servico_id, position, label, lat, lng, comment')
      .in('ordem_servico_id', osIds)
      .order('position');

    wpRaw = (wpData || []) as OSWaypointRow[];
    const wpIds = wpRaw.map((w) => w.id);

    if (wpIds.length > 0) {
      const { data: passData } = await supabase
        .from('os_waypoint_passengers')
        .select('id, waypoint_id, passageiro_id, nome')
        .in('waypoint_id', wpIds);

      wpPassRaw = (passData || []) as OSWaypointPassengerRow[];
    }
  }

  return {
    items: typedOrders.map((o) => {
      const waypoints: Waypoint[] = wpRaw
        .filter((w) => w.ordem_servico_id === o.id)
        .map((w) => ({
          label: w.label,
          lat: w.lat,
          lng: w.lng,
          comment: w.comment || undefined,
          passengers: wpPassRaw
            .filter((p) => p.waypoint_id === w.id)
            .map((p) => ({
              id: p.id,
              solicitanteId: p.passageiro_id || '',
              nome: p.nome || '',
            })),
        }));

      return {
        id: o.id,
        protocolo: o.protocolo || '',
        os: o.os_number || '',
        data: o.data || '',
        hora: o.hora || '',
        horaExtra: o.hora_extra || '',
        clienteId: o.cliente_id || '',
        solicitante: o.solicitante || '',
        centroCustoId: o.centro_custo || '',
        trecho: o.trecho || '',
        motorista: o.motorista || '',
        veiculoId: o.veiculo_id || undefined,
        valorBruto: Number(o.valor_bruto),
        imposto: Number(o.imposto),
        custo: Number(o.custo),
        lucro: Number(o.lucro),
        status: {
          operacional: o.status_operacional as OrderService['status']['operacional'],
          financeiro: o.status_financeiro as OrderService['status']['financeiro'],
        },
        distancia: o.distancia ? Number(o.distancia) : undefined,
        rota: waypoints.length > 0 ? { waypoints } : undefined,
      };
    }),
    totalCount: count ?? typedOrders.length,
  };
}

type OSInput = Omit<OrderService, 'id' | 'lucro' | 'imposto' | 'status' | 'protocolo'>;

export async function insertOS(osData: OSInput): Promise<OrderService> {
  const imposto = osData.valorBruto * 0.12;
  const lucro = osData.valorBruto - imposto - osData.custo;
  const centroCusto = (osData as OSInput & { centroCusto?: string }).centroCusto ?? osData.centroCustoId ?? '';

  const { data: osRow, error: osError } = await supabase
    .from('ordens_servico')
    .insert({
      protocolo: '', // trigger will generate
      data: osData.data,
      hora: osData.hora || '',
      hora_extra: osData.horaExtra || '',
      os_number: osData.os || '',
      cliente_id: osData.clienteId || null,
      solicitante: osData.solicitante || '',
      centro_custo: centroCusto,
      trecho: osData.trecho || '',
      motorista: osData.motorista || '',
      veiculo_id: (osData as OSInput & { veiculoId?: string }).veiculoId || null,
      valor_bruto: osData.valorBruto,
      imposto,
      custo: osData.custo,
      lucro,
      status_operacional: 'Pendente',
      status_financeiro: 'Pendente',
    })
    .select('*')
    .single();

  if (osError) throw osError;

  // Insert waypoints
  const waypoints = osData.rota?.waypoints || [];
  const insertedWaypoints: Waypoint[] = [];

  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i];
    const { data: wpRow, error: wpError } = await supabase
      .from('os_waypoints')
      .insert({
        ordem_servico_id: osRow.id,
        position: i,
        label: wp.label,
        lat: wp.lat || null,
        lng: wp.lng || null,
        comment: wp.comment?.trim() || '',
      })
      .select('id')
      .single();

    if (wpError) continue;

    const passengers = wp.passengers || [];
    const insertedPassengers: { id: string; solicitanteId: string; nome: string }[] = [];

    if (passengers.length > 0) {
      const { data: passRows } = await supabase
        .from('os_waypoint_passengers')
        .insert(
          passengers.map((p) => ({
            waypoint_id: wpRow.id,
            passageiro_id: p.solicitanteId || null,
            nome: p.nome || '',
          }))
        )
        .select('id, passageiro_id, nome');

      if (passRows) {
        (passRows as OSWaypointPassengerRow[]).forEach((pr) =>
          insertedPassengers.push({
            id: pr.id,
            solicitanteId: pr.passageiro_id || '',
            nome: pr.nome || '',
          })
        );
      }
    }

    const cleanComment = wp.comment?.trim() || '';
    if (cleanComment) {
      await supabase.from('os_waypoint_comments').insert({
        ordem_servico_id: osRow.id,
        waypoint_position: i,
        waypoint_label: wp.label,
        comment: cleanComment,
      });
    }

    insertedWaypoints.push({
      label: wp.label,
      lat: wp.lat,
      lng: wp.lng,
      comment: wp.comment?.trim() || undefined,
      passengers: insertedPassengers,
    });
  }

  return {
    id: osRow.id,
    protocolo: osRow.protocolo,
    data: osRow.data,
    hora: osRow.hora || '',
    horaExtra: osRow.hora_extra || '',
    os: osRow.os_number || '',
    clienteId: osRow.cliente_id || '',
    solicitante: osRow.solicitante || '',
    centroCustoId: osRow.centro_custo || '',
    trecho: osRow.trecho || '',
    motorista: osRow.motorista || '',
    veiculoId: osRow.veiculo_id || undefined,
    valorBruto: Number(osRow.valor_bruto),
    imposto: Number(osRow.imposto),
    custo: Number(osRow.custo),
    lucro: Number(osRow.lucro),
    status: {
      operacional: osRow.status_operacional as OrderService['status']['operacional'],
      financeiro: osRow.status_financeiro as OrderService['status']['financeiro'],
    },
    rota: insertedWaypoints.length > 0 ? { waypoints: insertedWaypoints } : undefined,
  };
}

export async function updateOSInDB(
  id: string,
  osData: OSInput
): Promise<void> {
  const imposto = osData.valorBruto * 0.12;
  const lucro = osData.valorBruto - imposto - osData.custo;
  const centroCusto = (osData as OSInput & { centroCusto?: string }).centroCusto ?? osData.centroCustoId ?? '';

  const { error: osError } = await supabase
    .from('ordens_servico')
    .update({
      data: osData.data,
      hora: osData.hora || '',
      hora_extra: osData.horaExtra || '',
      os_number: osData.os || '',
      cliente_id: osData.clienteId || null,
      solicitante: osData.solicitante || '',
      centro_custo: centroCusto,
      trecho: osData.trecho || '',
      motorista: osData.motorista || '',
      veiculo_id: (osData as OSInput & { veiculoId?: string }).veiculoId || null,
      valor_bruto: osData.valorBruto,
      imposto,
      custo: osData.custo,
      lucro,
    })
    .eq('id', id);

  if (osError) throw osError;

  // Delete old waypoints (cascade deletes passengers too)
  await supabase.from('os_waypoints').delete().eq('ordem_servico_id', id);

  // Re-insert waypoints
  const waypoints = osData.rota?.waypoints || [];
  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i];
    const { data: wpRow } = await supabase
      .from('os_waypoints')
      .insert({
        ordem_servico_id: id,
        position: i,
        label: wp.label,
        lat: wp.lat || null,
        lng: wp.lng || null,
        comment: wp.comment?.trim() || '',
      })
      .select('id')
      .single();

    if (wpRow && wp.passengers && wp.passengers.length > 0) {
      await supabase.from('os_waypoint_passengers').insert(
        wp.passengers.map((p) => ({
          waypoint_id: wpRow.id,
          passageiro_id: p.solicitanteId || null,
          nome: p.nome || '',
        }))
      );
    }

    const cleanComment = wp.comment?.trim() || '';
    if (cleanComment) {
      await supabase.from('os_waypoint_comments').insert({
        ordem_servico_id: id,
        waypoint_position: i,
        waypoint_label: wp.label,
        comment: cleanComment,
      });
    }
  }
}

export async function updateOSStatusInDB(
  id: string,
  updates: { operacional?: string; financeiro?: string }
): Promise<void> {
  const updatePayload: Record<string, string> = {};
  if (updates.operacional) updatePayload.status_operacional = updates.operacional;
  if (updates.financeiro) updatePayload.status_financeiro = updates.financeiro;

  const { error } = await supabase
    .from('ordens_servico')
    .update(updatePayload)
    .eq('id', id);

  if (error) throw error;
}

export async function deleteOSFromDB(id: string): Promise<void> {
  const { data: waypoints, error: waypointsError } = await supabase
    .from('os_waypoints')
    .select('id')
    .eq('ordem_servico_id', id);

  if (waypointsError) throw waypointsError;

  const waypointIds = (waypoints || []).map((waypoint) => waypoint.id);

  if (waypointIds.length > 0) {
    const { error: passengersError } = await supabase
      .from('os_waypoint_passengers')
      .delete()
      .in('waypoint_id', waypointIds);

    if (passengersError) throw passengersError;

    const { error: deleteWaypointsError } = await supabase
      .from('os_waypoints')
      .delete()
      .eq('ordem_servico_id', id);

    if (deleteWaypointsError) throw deleteWaypointsError;
  }

  const { error: osError } = await supabase
    .from('ordens_servico')
    .delete()
    .eq('id', id);

  if (osError) throw osError;
}

// ── Centros de Custo ──────────────────────────────────────

export async function fetchCentrosCustoByCliente(clienteId: string): Promise<CentroCusto[]> {
  const { data, error } = await supabase
    .from('centros_custo')
    .select('id, nome')
    .eq('cliente_id', clienteId)
    .order('nome');

  if (error) throw error;
  return ((data || []) as Array<Pick<CentroCustoRow, 'id' | 'nome'>>).map((cc) => ({ id: cc.id, nome: cc.nome, clienteId: clienteId }));
}

// ── Motoristas ────────────────────────────────────────────

export async function fetchDrivers(): Promise<Driver[]> {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .order('name');

  if (error) throw error;
  return ((data || []) as DriverRow[]).map((d) => ({
    id: d.id,
    name: d.name,
    cpf: d.cpf || '',
    cnh: d.cnh || '',
    phone: d.phone || '',
    status: d.status as 'active' | 'inactive',
    created_at: d.created_at
  }));
}

export async function fetchDriversPage({
  page = 1,
  pageSize = 10,
  searchTerm = '',
}: PaginationParams = {}): Promise<PaginatedResult<Driver>> {
  const { from, to } = normalizePagination(page, pageSize);
  const term = searchTerm.trim();
  const likeTerm = term ? `%${sanitizeSearchTerm(term)}%` : '';

  let query = supabase
    .from('drivers')
    .select(`*, driver_vehicles(id, vehicle_id, vehicle:veiculos(id, placa, modelo, marca))`, { count: 'exact' })
    .order('name', { ascending: true })
    .range(from, to);

  if (likeTerm) {
    query = query.or(`name.ilike.${likeTerm},cpf.ilike.${likeTerm},cnh.ilike.${likeTerm},phone.ilike.${likeTerm}`);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    items: ((data || []) as DriverRow[]).map((d) => ({
      id: d.id,
      name: d.name,
      cpf: d.cpf || '',
      cnh: d.cnh || '',
      phone: d.phone || '',
      status: d.status as 'active' | 'inactive',
      created_at: d.created_at,
      driver_vehicles: d.driver_vehicles?.map((dv) => ({
        id: dv.id,
        driver_id: d.id,
        vehicle_id: dv.vehicle_id,
        vehicle: dv.vehicle,
      })) || [],
    })),
    totalCount: count ?? (data || []).length,
  };
}

// ── Veículos ───────────────────────────────────────────

export async function fetchVeiculosPage({
  page = 1,
  pageSize = 10,
  searchTerm = '',
}: PaginationParams = {}): Promise<PaginatedResult<Vehicle>> {
  const { from, to } = normalizePagination(page, pageSize);
  const term = searchTerm.trim();
  const likeTerm = term ? `%${sanitizeSearchTerm(term)}%` : '';

  let query = supabase
    .from('veiculos')
    .select('*', { count: 'exact' })
    .order('marca', { ascending: true })
    .order('modelo', { ascending: true })
    .range(from, to);

  if (likeTerm) {
    query = query.or(`placa.ilike.${likeTerm},modelo.ilike.${likeTerm},marca.ilike.${likeTerm},renavam.ilike.${likeTerm}`);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    items: (data || []) as Vehicle[],
    totalCount: count ?? (data || []).length,
  };
}

export async function insertDriver(driver: Omit<Driver, 'id' | 'created_at'>): Promise<Driver> {
  const { data, error } = await supabase
    .from('drivers')
    .insert(driver)
    .select('*')
    .single();

  if (error) throw error;
  return data as Driver;
}

export async function updateDriverInDB(id: string, driver: Partial<Driver>): Promise<void> {
  const { error } = await supabase
    .from('drivers')
    .update(driver)
    .eq('id', id);

  if (error) throw error;
}

export async function deleteDriverFromDB(id: string): Promise<void> {
  const { error } = await supabase
    .from('drivers')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ── Parceiros de Serviço ─────────────────────────────────

export interface ParceiroServico {
  id: string;
  pessoaTipo: 'fisica' | 'juridica';
  documento: string;
  razaoSocialOuNomeCompleto: string;
  contatos: ParceiroContato[];
  filiais: ParceiroFilial[];
  searchIndex: string;
}

export interface ParceiroContato {
  id: string;
  setor: string;
  celular: string;
  email?: string;
  responsavel: string;
}

export interface ParceiroFilial {
  id: string;
  rotulo: string;
  enderecoCompleto: string;
  referencia?: string;
}

export interface NovoParceiroInput {
  pessoaTipo: 'fisica' | 'juridica';
  documento: string;
  razaoSocialOuNomeCompleto: string;
  contatos: {
    setor: string;
    celular: string;
    email?: string;
    responsavel: string;
  }[];
  filiais: {
    rotulo: string;
    enderecoCompleto: string;
    referencia?: string;
  }[];
}

type ParceiroRow = {
  id: string;
  nome: string;
  tipo: string;
  pessoa_tipo: 'fisica' | 'juridica';
  documento: string | null;
  razao_social_ou_nome_completo: string | null;
  telefone: string | null;
  search_index: string;
};

type ParceiroContatoRow = {
  id: string;
  parceiro_id: string;
  setor: string;
  celular: string;
  email: string | null;
  responsavel: string;
};

type ParceiroFilialRow = {
  id: string;
  parceiro_id: string;
  rotulo: string;
  endereco_completo: string;
  referencia: string | null;
};

const buildParceiroSearchIndex = (
  parceiro: Omit<ParceiroServico, 'searchIndex'>,
  contatos: ParceiroContato[],
  filiais: ParceiroFilial[]
): string => {
  const tokens = [
    parceiro.pessoaTipo,
    parceiro.documento,
    parceiro.razaoSocialOuNomeCompleto,
    ...contatos.flatMap((contato) => [contato.setor, contato.celular, contato.email || '', contato.responsavel]),
    ...filiais.flatMap((filial) => [filial.rotulo, filial.enderecoCompleto, filial.referencia || '']),
  ];

  return tokens.join(' ').toLowerCase();
};

const mapParceiroPayload = (
  parceiro: ParceiroRow,
  contatos: ParceiroContatoRow[],
  filiais: ParceiroFilialRow[]
): ParceiroServico => {
  const mappedContatos = contatos.map((contato) => ({
    id: contato.id,
    setor: contato.setor,
    celular: contato.celular,
    email: contato.email || undefined,
    responsavel: contato.responsavel,
  }));

  const mappedFiliais = filiais.map((filial) => ({
    id: filial.id,
    rotulo: filial.rotulo || 'Filial',
    enderecoCompleto: filial.endereco_completo,
    referencia: filial.referencia || undefined,
  }));

  const base = {
    id: parceiro.id,
    pessoaTipo: parceiro.pessoa_tipo,
    documento: parceiro.documento || '',
    razaoSocialOuNomeCompleto: parceiro.razao_social_ou_nome_completo || parceiro.nome || '',
    contatos: mappedContatos,
    filiais: mappedFiliais,
  };

  return {
    ...base,
    searchIndex: buildParceiroSearchIndex(base, mappedContatos, mappedFiliais),
  };
};

export async function fetchParceiros(): Promise<ParceiroServico[]> {
  const { data: parceirosData, error: parceirosError } = await supabase
    .from('parceiros_servico')
    .select('*')
    .order('nome');

  if (parceirosError) throw parceirosError;
  const parceiros = parceirosData as ParceiroRow[];

  // Buscar contatos e filiais para todos os parceiros
  const parceirosIds = parceiros.map(p => p.id);
  
  let contatos: ParceiroContatoRow[] = [];
  let filiais: ParceiroFilialRow[] = [];
  
  if (parceirosIds.length > 0) {
    const { data: contatosData, error: contatosError } = await supabase
      .from('parceiros_contatos')
      .select('*')
      .in('parceiro_id', parceirosIds);
      
    if (contatosError) throw contatosError;
    contatos = contatosData as ParceiroContatoRow[];
    
    const { data: filiaisData, error: filiaisError } = await supabase
      .from('parceiros_filiais')
      .select('*')
      .in('parceiro_id', parceirosIds);
      
    if (filiaisError) throw filiaisError;
    filiais = filiaisData as ParceiroFilialRow[];
  }

  // Mapear dados completos
  return parceiros.map(parceiro => {
    const parceiroContatos = contatos.filter(c => c.parceiro_id === parceiro.id);
    const parceiroFiliais = filiais.filter(f => f.parceiro_id === parceiro.id);
    return mapParceiroPayload(parceiro, parceiroContatos, parceiroFiliais);
  });
}

export async function fetchParceirosPage({
  page = 1,
  pageSize = 10,
  searchTerm = '',
}: PaginationParams = {}): Promise<PaginatedResult<ParceiroServico>> {
  const { from, to } = normalizePagination(page, pageSize);
  const term = searchTerm.trim();
  const likeTerm = term ? `%${sanitizeSearchTerm(term)}%` : '';

  let query = supabase
    .from('parceiros_servico')
    .select('*', { count: 'exact' })
    .order('nome', { ascending: true })
    .range(from, to);

  if (likeTerm) {
    query = query.or(`search_index.ilike.${likeTerm}`);
  }

  const { data: parceirosData, error: parceirosError, count } = await query;
  if (parceirosError) throw parceirosError;
  const parceiros = (parceirosData || []) as ParceiroRow[];

  const parceirosIds = parceiros.map((p) => p.id);
  let contatos: ParceiroContatoRow[] = [];
  let filiais: ParceiroFilialRow[] = [];

  if (parceirosIds.length > 0) {
    const { data: contatosData, error: contatosError } = await supabase
      .from('parceiros_contatos')
      .select('*')
      .in('parceiro_id', parceirosIds);

    if (contatosError) throw contatosError;
    contatos = contatosData as ParceiroContatoRow[];

    const { data: filiaisData, error: filiaisError } = await supabase
      .from('parceiros_filiais')
      .select('*')
      .in('parceiro_id', parceirosIds);

    if (filiaisError) throw filiaisError;
    filiais = filiaisData as ParceiroFilialRow[];
  }

  return {
    items: parceiros.map((parceiro) => {
      const parceiroContatos = contatos.filter((c) => c.parceiro_id === parceiro.id);
      const parceiroFiliais = filiais.filter((f) => f.parceiro_id === parceiro.id);
      return mapParceiroPayload(parceiro, parceiroContatos, parceiroFiliais);
    }),
    totalCount: count ?? parceiros.length,
  };
}

export async function fetchParceiroById(id: string): Promise<ParceiroServico> {
  const { data: parceiroData, error: parceiroError } = await supabase
    .from('parceiros_servico')
    .select('*')
    .eq('id', id)
    .single();

  if (parceiroError) throw parceiroError;
  const parceiro = parceiroData as ParceiroRow;

  // Buscar contatos
  const { data: contatosData, error: contatosError } = await supabase
    .from('parceiros_contatos')
    .select('*')
    .eq('parceiro_id', id);
    
  if (contatosError) throw contatosError;
  const contatos = contatosData as ParceiroContatoRow[];
  
  // Buscar filiais
  const { data: filiaisData, error: filiaisError } = await supabase
    .from('parceiros_filiais')
    .select('*')
    .eq('parceiro_id', id);
    
  if (filiaisError) throw filiaisError;
  const filiais = filiaisData as ParceiroFilialRow[];

  return mapParceiroPayload(parceiro, contatos, filiais);
}

export async function insertParceiro(input: NovoParceiroInput): Promise<ParceiroServico> {
  // Inserir parceiro principal
  const { data: parceiroData, error: parceiroError } = await supabase
    .from('parceiros_servico')
    .insert({
      nome: trimText(input.razaoSocialOuNomeCompleto),
      tipo: 'Parceiro',
      pessoa_tipo: input.pessoaTipo,
      documento: trimText(input.documento),
      razao_social_ou_nome_completo: trimText(input.razaoSocialOuNomeCompleto),
    })
    .select('*')
    .single();

  if (parceiroError) throw parceiroError;
  const parceiro = parceiroData as ParceiroRow;

  // Inserir contatos
  const contatosToInsert = input.contatos.map((contato) => ({
    parceiro_id: parceiro.id,
    setor: trimText(contato.setor),
    celular: trimText(contato.celular),
    email: trimText(contato.email) || null,
    responsavel: trimText(contato.responsavel),
  }));

  if (contatosToInsert.length > 0) {
    const { error: contatosError } = await supabase
      .from('parceiros_contatos')
      .insert(contatosToInsert);

    if (contatosError) throw contatosError;
  }

  // Inserir filiais
  const filiaisToInsert = input.filiais.map((filial) => ({
    parceiro_id: parceiro.id,
    rotulo: trimText(filial.rotulo),
    endereco_completo: trimText(filial.enderecoCompleto),
    referencia: trimText(filial.referencia) || null,
  }));

  if (filiaisToInsert.length > 0) {
    const { error: filiaisError } = await supabase
      .from('parceiros_filiais')
      .insert(filiaisToInsert);

    if (filiaisError) throw filiaisError;
  }

  // Buscar dados completos para retornar
  return fetchParceiroById(parceiro.id);
}

export async function updateParceiroInDB(id: string, input: NovoParceiroInput): Promise<ParceiroServico> {
  // Atualizar parceiro principal
  const { error: parceiroError } = await supabase
    .from('parceiros_servico')
    .update({
      nome: trimText(input.razaoSocialOuNomeCompleto),
      tipo: 'Parceiro',
      pessoa_tipo: input.pessoaTipo,
      documento: trimText(input.documento),
      razao_social_ou_nome_completo: trimText(input.razaoSocialOuNomeCompleto),
    })
    .eq('id', id);

  if (parceiroError) throw parceiroError;

  // Remover contatos e filiais existentes
  await supabase.from('parceiros_contatos').delete().eq('parceiro_id', id);
  await supabase.from('parceiros_filiais').delete().eq('parceiro_id', id);

  // Inserir novos contatos
  const contatosToInsert = input.contatos.map((contato) => ({
    parceiro_id: id,
    setor: trimText(contato.setor),
    celular: trimText(contato.celular),
    email: trimText(contato.email) || null,
    responsavel: trimText(contato.responsavel),
  }));

  if (contatosToInsert.length > 0) {
    const { error: contatosError } = await supabase
      .from('parceiros_contatos')
      .insert(contatosToInsert);

    if (contatosError) throw contatosError;
  }

  // Inserir novas filiais
  const filiaisToInsert = input.filiais.map((filial) => ({
    parceiro_id: id,
    rotulo: trimText(filial.rotulo),
    endereco_completo: trimText(filial.enderecoCompleto),
    referencia: trimText(filial.referencia) || null,
  }));

  if (filiaisToInsert.length > 0) {
    const { error: filiaisError } = await supabase
      .from('parceiros_filiais')
      .insert(filiaisToInsert);

    if (filiaisError) throw filiaisError;
  }

  // Buscar dados completos para retornar
  return fetchParceiroById(id);
}

export async function deleteParceiroFromDB(id: string): Promise<void> {
  const { error } = await supabase
    .from('parceiros_servico')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
