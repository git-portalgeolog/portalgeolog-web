/**
 * Templates centralizados de mensagens WhatsApp para OS.
 * Usado tanto pelo frontend (manual) quanto pelas API routes (automático).
 */

export interface ItineraryStop {
  label: string;
  comment?: string | null;
  isOrigin?: boolean;
  isDestination?: boolean;
  isPassengerAddress?: boolean;
  dateTime?: string | null;
}

export interface ItineraryGroup {
  index: number;
  title?: string;
  dateTime?: string | null;
  stops: ItineraryStop[];
}

export interface PassengerInfo {
  nome: string;
  celular?: string | null;
}

export interface DriverNotificationData {
  protocolo: string;
  osNumber?: string | null;
  fornecedor?: string;
  empresa: string;
  solicitante?: string | null;
  transporteTipo?: string | null;
  motorista: string;
  motoristaTelefone?: string | null;
  veiculoTipo?: string | null;
  veiculoMarcaModelo?: string | null;
  veiculoPlaca?: string | null;
  passageiros: PassengerInfo[];
  itineraries: ItineraryGroup[];
  acceptLink: string;
}

export interface PassengerNotificationData {
  passengerName?: string | null;
  osProtocol?: string | null;
  driverName: string;
  driverPhone: string;
  vehicleLabel: string;
  vehiclePlate: string;
  passengerAddress: string;
  itinerarySummary: string;
  confirmationLink: string;
}

export interface DriverAcceptData {
  startRouteLink: string;
}

export interface DriverStartRouteData {
  kmInitial: number;
  finishLink: string;
}

function numeroParaOrdinal(n: number): string {
  const unidades = [
    '', 'Primeiro', 'Segundo', 'Terceiro', 'Quarto', 'Quinto',
    'Sexto', 'Sétimo', 'Oitavo', 'Nono',
  ];
  const especiais: Record<number, string> = {
    10: 'Décimo', 11: 'Décimo Primeiro', 12: 'Décimo Segundo',
    13: 'Décimo Terceiro', 14: 'Décimo Quarto', 15: 'Décimo Quinto',
    16: 'Décimo Sexto', 17: 'Décimo Sétimo', 18: 'Décimo Oitavo', 19: 'Décimo Nono',
  };
  const dezenas: Record<number, string> = {
    2: 'Vigésimo', 3: 'Trigésimo', 4: 'Quadragésimo', 5: 'Quinquagésimo',
    6: 'Sexagésimo', 7: 'Septuagésimo', 8: 'Octogésimo', 9: 'Nonagésimo',
  };
  if (n >= 1 && n <= 9) return unidades[n];
  if (n >= 10 && n <= 19) return especiais[n] || '';
  if (n >= 20 && n <= 99) {
    const d = Math.floor(n / 10);
    const u = n % 10;
    const dezenaText = dezenas[d] || '';
    const unidadeText = u > 0 ? unidades[u] : '';
    if (dezenaText && unidadeText) return `${dezenaText} ${unidadeText}`;
    return dezenaText || unidadeText || String(n);
  }
  if (n === 100) return 'Centésimo';
  return String(n);
}

function formatItineraryGroups(groups: ItineraryGroup[]): string {
  if (groups.length === 0) return '';

  return groups
    .map((it) => {
      const title =
        it.title ||
        (it.index < 0
          ? `🔄 *${numeroParaOrdinal(Math.abs(it.index))} Retorno*`
          : `📍 *${numeroParaOrdinal(it.index + 1)} Itinerário*`);

      const dateTimeLine = it.dateTime ? ` — ${it.dateTime}` : '';
      const stops = it.stops
        .map((stop, idx) => {
          let line = '';
          if (stop.isOrigin) line = `▶️ Origem: ${stop.label}`;
          else if (stop.isDestination) line = `🏁 Destino final: ${stop.label}`;
          else line = `⏹️ Parada ${idx}: ${stop.label}`;

          if (stop.dateTime) line += ` (${stop.dateTime})`;
          if (stop.isPassengerAddress) line += ' 📍 (seu endereço)';
          return `   ${line}`;
        })
        .join('\n');

      return `────────────────\n${title}${dateTimeLine}\n${stops}\n`;
    })
    .join('\n');
}

/** Mensagem inicial enviada ao motorista com os dados da OS e link de aceite. */
export function buildDriverNotificationMessage(data: DriverNotificationData): string {
  const osLine = data.osNumber ? `🆔 *OS:* ${data.osNumber.toUpperCase()}\n` : '';
  const fornecedorLine = data.fornecedor ? `📦 *Fornecedor:* ${data.fornecedor}\n` : '';
  const vehicleBrandModel = data.veiculoMarcaModelo
    ? `🏭 *Marca/Modelo:* ${data.veiculoMarcaModelo}\n`
    : '';
  const tipoCapitalizado = data.veiculoTipo
    ? data.veiculoTipo.charAt(0).toUpperCase() + data.veiculoTipo.slice(1)
    : 'Não informado';
  const placaDisplay = data.veiculoPlaca || 'Não informada';

  const paxText =
    data.passageiros.length > 0
      ? data.passageiros.map((p) => `• ${p.nome}${p.celular ? ` – ${p.celular}` : ''}`).join('\n')
      : 'Não informado';

  const itineraryText = formatItineraryGroups(data.itineraries);

  return (
    `📋 *Protocolo:* ${data.protocolo}\n` +
    `${osLine}` +
    `${fornecedorLine}` +
    `🏢 *Empresa:* ${data.empresa}\n` +
    `👤 *Solicitante:* ${data.solicitante || 'Não informado'}\n` +
    `🚗 *Transporte:* ${data.transporteTipo || tipoCapitalizado}\n\n` +
    `────────────────\n` +
    `👨‍✈️ *Motorista:* ${data.motorista}\n` +
    `📞 *Contato:* ${data.motoristaTelefone || 'Não informado'}\n` +
    `🚘 *Veículo:* ${tipoCapitalizado}\n` +
    `${vehicleBrandModel}` +
    `📝 *Placa:* ${placaDisplay}\n\n` +
    `────────────────\n` +
    `👥 *Passageiro(s):*\n${paxText}\n\n` +
    `────────────────\n` +
    `👇 *Aceitar o serviço:*\n` +
    `${data.acceptLink}\n\n` +
    `────────────────\n` +
    `${itineraryText}\n`
  );
}

/** Mensagem de confirmação de aceite enviada ao motorista. */
export function buildDriverAcceptConfirmationMessage(data: DriverAcceptData): string {
  return (
    `✅ *Obrigado pelo aceite!*\n\n` +
    `Sua viagem foi confirmada com sucesso.\n\n` +
    `Quando estiver pronto para começar, clique no link abaixo para seguir para o próximo passo:\n` +
    `${data.startRouteLink}`
  );
}

/** Mensagem de início de rota enviada ao motorista. */
export function buildDriverStartRouteMessage(data: DriverStartRouteData): string {
  return (
    `🚗 *Rota iniciada!*\n\n` +
    `KM inicial registrado: *${data.kmInitial.toLocaleString('pt-BR')}*\n\n` +
    `Quando chegar ao destino, clique no link abaixo para finalizar a rota e informar apenas o KM final:\n` +
    `${data.finishLink}\n\n` +
    `_Após clicar, o status será atualizado automaticamente no painel._`
  );
}

/** Mensagem de notificação enviada ao passageiro. */
export function buildPassengerNotificationMessage(data: PassengerNotificationData): string {
  return (
    `👋 Olá, *${data.passengerName || 'Passageiro'}*!\n\n` +
    `Sua viagem foi agendada. Por favor, *revise os dados abaixo* e confirme pelo link.\n\n` +
    `📋 *Protocolo:* ${data.osProtocol || 'N/A'}\n\n` +
    `────────────────\n` +
    `🚗 *Motorista:* ${data.driverName}\n` +
    `📞 *Contato:* ${data.driverPhone}\n` +
    `🪪 *Veículo:* ${data.vehicleLabel}\n` +
    `📝 *Placa:* ${data.vehiclePlate}\n\n` +
    `────────────────\n` +
    `📍 *Seu endereço:* ${data.passengerAddress}\n\n` +
    `────────────────\n` +
    `${data.itinerarySummary}\n` +
    `────────────────\n` +
    `👇 *Revisar e confirmar viagem:*\n${data.confirmationLink}`
  );
}
