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
  onEventClick: (osId: string) => void;
}

// Cores por status
const statusColors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  'Pendente': {
    bg: '#f8fafc',
    border: '#94a3b8',
    text: '#475569',
    dot: '#64748b'
  },
  'Aguardando': {
    bg: '#eef2ff',
    border: '#818cf8',
    text: '#3730a3',
    dot: '#6366f1'
  },
  'Em Rota': {
    bg: '#eff6ff',
    border: '#60a5fa',
    text: '#1e40af',
    dot: '#3b82f6'
  },
  'Finalizado': {
    bg: '#ecfdf5',
    border: '#34d399',
    text: '#065f46',
    dot: '#10b981'
  },
  'Cancelado': {
    bg: '#fff1f2',
    border: '#fb7185',
    text: '#9f1239',
    dot: '#f43f5e'
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
        padding: '5px 8px',
        borderRadius: '10px',
        fontSize: '10px',
        lineHeight: '1.3',
        color: '#334155',
        cursor: 'pointer',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '2px',
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
        border: `1px solid ${colors.dot}20`
      }}
    >
      {/* Linha 1: Cliente */}
      <div style={{ 
        fontWeight: 900, 
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

      {/* Linha 2: Solicitante (No lugar dos passageiros) */}
      <div style={{ 
        color: '#64748b', 
        fontWeight: 700, 
        whiteSpace: 'nowrap', 
        overflow: 'hidden', 
        textOverflow: 'ellipsis',
        fontSize: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#94a3b8' }} />
        {os.solicitante.toUpperCase()}
      </div>

      {/* Linha 3: Trajeto (Endereço) - Font weight menor */}
      {trajeto && (
        <div style={{ 
          fontWeight: 500, 
          textTransform: 'uppercase', 
          color: '#64748b', 
          whiteSpace: 'nowrap', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis',
          fontSize: '9.5px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <Navigation size={9} strokeWidth={3} className="text-slate-400" />
          {trajeto}
        </div>
      )}

      {/* Linha 4: Horário e Motorista */}
      <div style={{ 
        color: '#475569', 
        fontWeight: 600, 
        fontSize: '9px',
        whiteSpace: 'nowrap', 
        overflow: 'hidden', 
        textOverflow: 'ellipsis',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        marginTop: '2px'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '2px',
          color: '#0ea5e9',
          fontWeight: 800,
          backgroundColor: '#f0f9ff',
          padding: '1px 4px',
          borderRadius: '4px',
          fontSize: '8.5px'
        }}>
          <Clock size={8} strokeWidth={3} />
          {startTime}
        </div>

        {os.motorista && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '2px',
            color: '#6366f1',
            fontWeight: 800,
            backgroundColor: '#f5f3ff',
            padding: '1px 4px',
            borderRadius: '4px',
            fontSize: '8.5px'
          }}>
            <User size={8} strokeWidth={3} />
            {os.motorista.split(' ').slice(0, 2).join(' ').toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
};

export default function OSCalendar({ osList, clientes, onEventClick }: OSCalendarProps) {
  const [currentView, setCurrentView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek'>('dayGridMonth');
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
        backgroundColor: colors.bg,
        borderColor: colors.dot,
        textColor: colors.text,
        extendedProps: {
          os,
          clienteNome
        }
      };
    });
  }, [osList, clientes]);

  const handleEventClick = useCallback((info: { jsEvent: Event; event: { id: string } }) => {
    info.jsEvent.preventDefault();
    onEventClick(info.event.id);
  }, [onEventClick]);

  const handleDateSelect = useCallback((selectInfo: { startStr: string }) => {
    // Poderia abrir modal de nova OS com a data pré-selecionada
    // Por agora, apenas logamos
    console.log('Data selecionada:', selectInfo.startStr);
  }, []);

  const changeView = (view: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek') => {
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
            { key: 'timeGridWeek', label: 'Semana', icon: CalendarDays },
            { key: 'timeGridDay', label: 'Dia', icon: Clock },
            { key: 'listWeek', label: 'Lista', icon: Truck },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => changeView(key as 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek')}
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
          expandRows={false}
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
          eventMinHeight={85}
          eventShortHeight={85}
        />
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
