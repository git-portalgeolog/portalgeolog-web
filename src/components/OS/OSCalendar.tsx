'use client';

import React, { useMemo, useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import type { OrderService } from '@/context/DataContext';
import { 
  Clock, 
  Navigation, 
  CheckCircle2, 
  X, 
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Truck,
  User
} from 'lucide-react';

interface Cliente {
  id: string;
  nome: string;
}

interface EventContentProps {
  os: OrderService;
  clientes: Cliente[];
}

interface OSCalendarProps {
  osList: OrderService[];
  clientes: Cliente[];
  onEventClick: (osId: string, position?: { x: number; y: number }) => void;
}

// Cores por status — backgrounds mais saturados para legibilidade no calendário
const statusColors: Record<string, { bg: string; border: string; text: string; dot: string; clockColor?: string }> = {
  'Pendente': {
    bg: '#f1f5f9',
    border: '#64748b',
    text: '#1e293b',
    dot: '#cbd5e1',
    clockColor: '#64748b'
  },
  'Aguardando': {
    bg: '#e0e7ff',
    border: '#4f46e5',
    text: '#312e81',
    dot: '#4338ca'
  },
  'Em Rota': {
    bg: '#e0f6ff',
    border: '#7dd3fc',
    text: '#0c4a6e',
    dot: '#38bdf8'
  },
  'Finalizado': {
    bg: '#d1fae5',
    border: '#059669',
    text: '#064e3b',
    dot: '#047857'
  },
  'Cancelado': {
    bg: '#ffe4e6',
    border: '#e11d48',
    text: '#881337',
    dot: '#be123c'
  }
};

// Componente de Evento Customizado
const EventContent = ({ os, clientes }: EventContentProps) => {
  const status = os.status.operacional;
  const colors = statusColors[status] || statusColors['Pendente'];
  const clienteNome = clientes.find(c => c.id === os.clienteId)?.nome || 'N/A';
  const startTime = os.hora ? os.hora.slice(0, 5) : '';
  
  // Extrair passageiros
  const allPassengers = os.rota?.waypoints?.flatMap(w => w.passengers.map(p => p.nome)).filter(Boolean) || [];
  const passengerDisplay = allPassengers.length > 0 ? allPassengers[0].toUpperCase() : '';
  
  // Trajeto
  const trajeto = os.trecho || '';

  return (
    <div
      className="fc-event-custom group transition-all duration-200 hover:shadow-md"
      style={{
        backgroundColor: colors.bg,
        borderLeft: `4px solid ${colors.dot}`,
        padding: '5px 20px',
        borderRadius: '12px 8px 8px 12px',
        fontSize: '11px',
        lineHeight: '1.2',
        color: colors.text,
        cursor: 'pointer',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '2px',
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      }}
    >
      {/* Linha 1: Cliente */}
      <div style={{
        fontWeight: 800,
        textTransform: 'uppercase',
        color: '#0f172a',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontSize: '11px',
        letterSpacing: '0.01em'
      }}>
        {clienteNome}
      </div>

      {/* Linha 2: Solicitante */}
      <div style={{
        color: '#475569',
        fontWeight: 700,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontSize: '9.5px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: colors.dot }} />
        {os.solicitante.toUpperCase()}
      </div>

      {/* Linha 3: Trajeto */}
      {trajeto && (
        <div style={{
          fontWeight: 600,
          textTransform: 'uppercase',
          color: '#64748b',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontSize: '8.5px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <Navigation size={10} strokeWidth={2.5} style={{ color: colors.dot, flexShrink: 0 }} />
          {trajeto}
        </div>
      )}

      {/* Linha 4: Horário e Motorista */}
      <div style={{
        color: '#475569',
        fontWeight: 600,
        fontSize: '8.5px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginTop: '1px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          color: colors.clockColor || colors.dot,
          fontWeight: 800,
          fontSize: '9px'
        }}>
          <Clock size={10} strokeWidth={3} />
          {startTime || '--:--'}
        </div>

        {os.motorista && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            color: '#6366f1',
            fontWeight: 800,
            fontSize: '9px'
          }}>
            <User size={10} strokeWidth={3} />
            {os.motorista.split(' ').slice(0, 2).join(' ').toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
};

export default function OSCalendar({ osList, clientes, onEventClick }: OSCalendarProps) {
  const [currentView, setCurrentView] = useState<'dayGridMonth' | 'dayGridWeek' | 'dayGridDay' | 'listWeek'>('dayGridMonth');
  const calendarRef = React.useRef<FullCalendar>(null);

  // Converter OS para eventos do FullCalendar
  const events = useMemo(() => {
    return osList.map(os => {
      const dateStr = os.data; // YYYY-MM-DD
      const timeStr = os.hora || '00:00';
      const [hours, minutes] = timeStr.split(':');
      const startDateTime = `${dateStr}T${hours || '00'}:${minutes || '00'}:00`;
      
      // Duração estimada de 1 hora se não tiver hora extra
      const endHour = parseInt(hours || '0') + 1;
      const endDateTime = `${dateStr}T${endHour.toString().padStart(2, '0')}:${minutes || '00'}:00`;
      
      const clienteNome = clientes.find(c => c.id === os.clienteId)?.nome || 'N/A';
      const colors = statusColors[os.status.operacional] || statusColors['Pendente'];
      
      return {
        id: os.id,
        title: `${os.protocolo} - ${clienteNome}`,
        start: startDateTime,
        end: endDateTime,
        allDay: !os.hora,
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        textColor: colors.text,
        extendedProps: {
          os,
          clienteNome
        }
      };
    });
  }, [osList, clientes]);

  const handleEventClick = useCallback((info: { jsEvent: MouseEvent; event: { id: string } }) => {
    info.jsEvent.preventDefault();
    onEventClick(info.event.id, { x: info.jsEvent.clientX, y: info.jsEvent.clientY });
  }, [onEventClick]);

  const handleDateSelect = useCallback((selectInfo: { startStr: string }) => {
    // Poderia abrir modal de nova OS com a data pré-selecionada
    // Por agora, apenas logamos
    console.log('Data selecionada:', selectInfo.startStr);
  }, []);

  const changeView = (view: 'dayGridMonth' | 'dayGridWeek' | 'dayGridDay' | 'listWeek') => {
    setCurrentView(view);
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.changeView(view);
    }
  };

  const goToPrev = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) calendarApi.prev();
  };

  const goToNext = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) calendarApi.next();
  };

  const goToToday = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) calendarApi.today();
  };

  // Renderizador customizado de eventos
  const renderEventContent = (eventInfo: { event: { extendedProps: { os: OrderService } } }) => {
    const os = eventInfo.event.extendedProps.os;
    return <EventContent os={os} clientes={clientes} />;
  };

  if (osList.length === 0) {
    return (
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/40 p-16">
        <div className="flex flex-col items-center justify-center gap-4 text-slate-400">
          <CalendarDays size={64} className="text-slate-300" />
          <p className="font-bold text-lg">Nenhuma OS encontrada para exibir no calendário.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden">
      {/* Header do Calendário Customizado */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 md:p-6 border-b border-slate-200 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <button 
            onClick={goToPrev}
            className="p-2 hover:bg-slate-200 rounded-xl transition-colors"
            title="Mês anterior"
          >
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <button 
            onClick={goToToday}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            Hoje
          </button>
          <button 
            onClick={goToNext}
            className="p-2 hover:bg-slate-200 rounded-xl transition-colors"
            title="Próximo mês"
          >
            <ChevronRight size={20} className="text-slate-600" />
          </button>
        </div>

        {/* Seletor de Visualização */}
        <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
          {[
            { key: 'dayGridMonth', label: 'Mês', icon: CalendarDays },
            { key: 'dayGridWeek', label: 'Semana', icon: CalendarDays },
            { key: 'dayGridDay', label: 'Dia', icon: Clock },
            { key: 'listWeek', label: 'Lista', icon: Truck },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => changeView(key as 'dayGridMonth' | 'dayGridWeek' | 'dayGridDay' | 'listWeek')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${
                currentView === key
                  ? 'bg-[var(--color-geolog-blue)] text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Calendário */}
      <div className="p-4 md:p-6">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView={currentView}
          locale={ptBrLocale}
          events={events}
          eventClick={handleEventClick}
          selectable={true}
          select={handleDateSelect}
          headerToolbar={false}
          eventContent={renderEventContent}
          height="auto"
          contentHeight="auto"
          aspectRatio={1.8}
          dayMaxEvents={4}
          moreLinkContent={(arg) => `+${arg.num} mais`}
          moreLinkClassNames="text-blue-600 font-bold text-xs hover:text-blue-800"
          eventDisplay="block"
          slotEventOverlap={false}
          slotDuration="00:30:00"
          slotLabelInterval="01:00"
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }}
          slotLabelFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }}
          dayHeaderFormat={{ 
            weekday: 'short', 
            day: 'numeric',
            omitCommas: true 
          }}
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={true}
          allDayText="Dia Todo"
          expandRows={true}
          stickyHeaderDates={true}
          nowIndicator={true}
          navLinks={true}
          weekNumbers={false}
          businessHours={{
            daysOfWeek: [1, 2, 3, 4, 5, 6],
            startTime: '08:00',
            endTime: '18:00',
          }}
          buttonText={{
            today: 'Hoje',
            month: 'Mês',
            week: 'Semana',
            day: 'Dia',
            list: 'Lista'
          }}
          noEventsContent="Nenhuma OS para este período"
          eventMinHeight={100}
        />
        <style jsx global>{`
          /* Estilos para o DayGrid (Mês, Semana, Dia) */
          .fc .fc-daygrid-day-frame {
            min-height: 50px !important;
          }
          
          .fc .fc-daygrid-day-events {
            padding: 8px !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
          }

          .fc-daygrid-event-harness {
            margin: 0 !important;
            padding: 0 !important;
            min-height: 100px !important;
          }

          /* Garantir que o conteúdo do evento ocupe o espaço */
          .fc-event-custom {
            min-height: 100px !important;
          }

          /* Remover estilos de slots que não serão mais usados se estivermos em dayGrid */
          .fc .fc-timegrid-slot {
            height: 100px !important;
          }

          .fc-v-event {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
          }

          /* Melhorar visual do scroll */
          .fc-scroller {
            scrollbar-width: thin;
            scrollbar-color: #cbd5e1 transparent;
          }

          .fc-scroller::-webkit-scrollbar {
            width: 6px;
          }

          .fc-scroller::-webkit-scrollbar-track {
            background: transparent;
          }

          .fc-scroller::-webkit-scrollbar-thumb {
            background-color: #cbd5e1;
            border-radius: 20px;
          }

          /* Popover "+X mais" (Fix UI Bug) */
          .fc-more-popover {
            z-index: 9999 !important;
            background: #ffffff !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 24px !important;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
            overflow: hidden !important;
            width: 350px !important;
            animation: fcPopoverFadeIn 0.2s ease-out;
          }

          @keyframes fcPopoverFadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .fc-more-popover .fc-popover-header {
            background: #ffffff !important;
            padding: 16px 20px !important;
            border-bottom: 1px solid #f1f5f9 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
          }

          .fc-more-popover .fc-popover-title {
            font-size: 13px !important;
            font-weight: 900 !important;
            color: #1e293b !important;
            text-transform: uppercase !important;
            letter-spacing: 0.1em !important;
          }

          .fc-more-popover .fc-popover-close {
            background: #f1f5f9 !important;
            border-radius: 50% !important;
            width: 28px !important;
            height: 28px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            color: #64748b !important;
            opacity: 1 !important;
            transition: all 0.2s !important;
            font-size: 14px !important;
            cursor: pointer !important;
          }

          .fc-more-popover .fc-popover-close:hover {
            background: #e2e8f0 !important;
            color: #0f172a !important;
          }

          .fc-more-popover .fc-popover-body {
            padding: 16px !important;
            max-height: 400px !important;
            overflow-y: auto !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 10px !important;
          }

          /* Scrollbar para o popover */
          .fc-more-popover .fc-popover-body::-webkit-scrollbar {
            width: 6px;
          }

          .fc-more-popover .fc-popover-body::-webkit-scrollbar-track {
            background: transparent;
          }

          .fc-more-popover .fc-popover-body::-webkit-scrollbar-thumb {
            background-color: #cbd5e1;
            border-radius: 20px;
          }

          .fc-more-popover .fc-popover-body .fc-daygrid-event-harness {
            min-height: auto !important;
            margin-bottom: 4px !important;
          }
        `}</style>
      </div>

      {/* Legenda de Status */}
      <div className="px-4 md:px-6 py-4 border-t border-slate-200 bg-slate-50/30">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status:</span>
          {Object.entries(statusColors).map(([status, colors]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: colors.dot }}
              />
              <span className="text-xs font-semibold text-slate-600">{status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
