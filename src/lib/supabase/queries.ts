import { createClient } from '@/lib/supabase/client';
import type {
  Cliente,
  CentroCusto,
  Solicitante,
  Fornecedor,
  TipoServico,
  Passageiro,
  PassageiroEndereco,
  OrderService,
  NovoPassageiroInput,
  Waypoint,
  Driver
} from '@/context/DataContext';

const supabase = createClient();

const trimText = (value?: string): string => value?.trim() ?? '';

type ClienteRow = { id: string; nome: string; contato: string | null };
type CentroCustoRow = { id: string; nome: string; cliente_id: string };
type SolicitanteRow = { id: string; nome: string; cliente_id: string; centro_custo_id: string | null };
type FornecedorRow = { id: string; nome: string; tipo: string; telefone: string | null };
type TipoServicoRow = { id: string; nome: string };
type PassageiroRow = {
  id: string;
  nome_completo: string;
  email: string | null;
  celular: string | null;
  cpf: string | null;
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
  centro_custo_id?: string | null;
  solicitante: string | null;
  tipo_servico: string | null;
  trecho: string | null;
  motorista: string | null;
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

// ── Fornecedores ──────────────────────────────────────────

export async function fetchFornecedores(): Promise<Fornecedor[]> {
  const { data, error } = await supabase
    .from('fornecedores')
    .select('id, nome, tipo, telefone')
    .order('nome');

  if (error) throw error;
  return ((data || []) as FornecedorRow[]).map((f) => ({
    id: f.id,
    nome: f.nome,
    tipo: f.tipo,
    telefone: f.telefone || undefined,
  }));
}

export async function insertFornecedor(nome: string, tipo: string, telefone?: string): Promise<void> {
  const { error } = await supabase.from('fornecedores').insert({
    nome: trimText(nome),
    tipo: trimText(tipo),
    telefone: trimText(telefone) || null,
  });
  if (error) throw error;
}

export async function deleteFornecedor(id: string): Promise<void> {
  const { error } = await supabase.from('fornecedores').delete().eq('id', id);
  if (error) throw error;
}

// ── Tipos de Serviço ──────────────────────────────────────

export async function fetchServicos(): Promise<TipoServico[]> {
  const { data, error } = await supabase
    .from('tipos_servico')
    .select('id, nome')
    .order('nome');

  if (error) throw error;
  return ((data || []) as TipoServicoRow[]).map((s) => ({
    id: s.id,
    nome: s.nome,
  }));
}

export async function insertServico(nome: string): Promise<TipoServico> {
  const { data, error } = await supabase
    .from('tipos_servico')
    .insert({ nome: trimText(nome) })
    .select('id, nome')
    .single();

  if (error) throw error;
  return { id: data.id, nome: data.nome };
}

export async function updateServicoInDB(id: string, updates: Partial<TipoServico>): Promise<void> {
  const payload: { nome?: string } = {};

  if (updates.nome !== undefined) {
    payload.nome = trimText(updates.nome);
  }

  const { error } = await supabase
    .from('tipos_servico')
    .update(payload)
    .eq('id', id);

  if (error) throw error;
}

export async function deleteServicoFromDB(id: string): Promise<void> {
  const { error } = await supabase
    .from('tipos_servico')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ── Passageiros ───────────────────────────────────────────

export async function fetchPassageiros(): Promise<Passageiro[]> {
  const { data: passRaw, error } = await supabase
    .from('passageiros')
    .select('id, nome_completo, email, celular, cpf')
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
    email: p.email || '',
    celular: p.celular || '',
    cpf: p.cpf || '',
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
    })
    .select('id, nome_completo, email, celular, cpf')
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
    enderecos,
  };
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
      .select('id, ordem_servico_id, position, label, lat, lng')
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
      centroCustoId: o.centro_custo_id || '',
      tipoServico: o.tipo_servico || '',
      trecho: o.trecho || '',
      motorista: o.motorista || '',
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
      tipo_servico: osData.tipoServico || '',
      trecho: osData.trecho || '',
      motorista: osData.motorista || '',
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

    insertedWaypoints.push({
      label: wp.label,
      lat: wp.lat,
      lng: wp.lng,
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
    tipoServico: osRow.tipo_servico || '',
    trecho: osRow.trecho || '',
    motorista: osRow.motorista || '',
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
      tipo_servico: osData.tipoServico || '',
      trecho: osData.trecho || '',
      motorista: osData.motorista || '',
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
