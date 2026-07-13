import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { socketService } from '../../services/socket';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, 
  format, addMonths, subMonths, isSameDay, isToday, parseISO,
  addDays, addWeeks
} from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  ChevronLeft, ChevronRight, ChevronDown, Plus, MapPin, Users, 
  Check, AlertTriangle, Sparkles, X, Calendar as CalendarIcon 
} from 'lucide-react';

const PREMIUM_COLORS = [
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#84CC16', // Lime
];

interface Event {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  color: string;
  area: { name: string; color: string };
  responsible: { name: string };
  location?: string;
  notes?: string;
}

interface CalendarLayer {
  id: string;
  name: string;
  type: string;
  color: string;
}

interface Resource {
  id: string;
  name: string;
  capacity?: number;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface CalendarViewProps {
  viewMode?: 'personal' | 'general';
}

export const CalendarView: React.FC<CalendarViewProps> = ({ viewMode = 'general' }) => {
  const currentUser = useAuthStore((state: any) => state.user);
  const { selectedCalendarIds, toggleCalendarFilter, setCalendarFilters } = useUIStore();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<'month' | 'week' | 'day'>('month');
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [expandedEvents, setExpandedEvents] = useState<Event[]>([]);
  const [calendarLayers, setCalendarLayers] = useState<CalendarLayer[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de Modal y Creación
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Formulario de Creación
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartHourPicker, setShowStartHourPicker] = useState(false);
  const [showEndHourPicker, setShowEndHourPicker] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date());
  const [startHour, setStartHour] = useState('09:00');
  const [endHour, setEndHour] = useState('10:00');
  const [recurrence, setRecurrence] = useState('NONE'); // NONE, DAILY, WEEKLY
  const [areaId, setAreaId] = useState(currentUser?.area || '');
  const [responsibleId, setResponsibleId] = useState(currentUser?.id || '');
  const [location, setLocation] = useState('');
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const timeOptions = Array.from({ length: 17 * 2 }, (_, i) => {
    const h = Math.floor(i / 2) + 6;
    const m = (i % 2) * 30;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  });

  // Catálogos
  const [resources, setResources] = useState<Resource[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [areas, setAreas] = useState<any[]>([]);

  // Motor Inteligente (Sugerencias)
  const [optimizing, setOptimizing] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [termometro, setTermometro] = useState<number | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      const data = await api.get('/events');
      setEvents(data);
      
      // Expand recurring events (for visualization purposes, next 4 weeks max)
      const expanded: any[] = [];
      data.forEach((ev: any) => {
        expanded.push(ev);
        if (ev.isRecurring && ev.recurrenceRule) {
          const baseStart = parseISO(ev.startTime);
          const baseEnd = parseISO(ev.endTime);
          
          if (ev.recurrenceRule === 'FREQ=DAILY') {
            for (let i = 1; i <= 30; i++) {
              expanded.push({
                ...ev,
                id: `${ev.id}-rep-${i}`,
                startTime: addDays(baseStart, i).toISOString(),
                endTime: addDays(baseEnd, i).toISOString(),
              });
            }
          } else if (ev.recurrenceRule === 'FREQ=WEEKLY') {
            for (let i = 1; i <= 12; i++) {
              expanded.push({
                ...ev,
                id: `${ev.id}-rep-${i}`,
                startTime: addWeeks(baseStart, i).toISOString(),
                endTime: addWeeks(baseEnd, i).toISOString(),
              });
            }
          }
        }
      });
      setExpandedEvents(expanded);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        // Cargar Usuarios como "Capas" para el calendario general
        const usersList = await api.get('/users');
        setUsers(usersList);
        
        const userLayers = usersList.map((u: any, index: number) => {
          const isSuper = u.role?.name === 'SUPER_ADMIN' || u.name.includes('Administrador');
          return {
            id: u.id,
            name: u.name,
            type: 'USER',
            color: isSuper ? 'rainbow' : (u.area?.color || u.color || PREMIUM_COLORS[index % PREMIUM_COLORS.length]),
            position: u.position
          };
        });

        setCalendarLayers(userLayers);
        setCalendarFilters(userLayers.map((l: any) => l.id)); // Activar todos por defecto

        // Cargar Catálogos para Formulario
        const resList = await api.get('/resources');
        setResources(resList);

        const areasList = await api.get('/areas');
        setAreas(areasList);
        if (areasList.length > 0) {
          const userArea = areasList.find((a: any) => a.name === currentUser?.area);
          setAreaId(userArea ? userArea.id : areasList[0].id);
        }

        await fetchEvents();
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    initData();

    // Suscribirse a eventos WebSocket
    socketService.on('event:created', () => {
      fetchEvents();
    });
    socketService.on('event:updated', () => {
      fetchEvents();
    });
    socketService.on('event:cancelled', () => {
      fetchEvents();
    });

    return () => {
      socketService.off('event:created');
      socketService.off('event:updated');
      socketService.off('event:cancelled');
    };
  }, []);

  // Verificar conflictos cada vez que cambia hora, recursos o personas
  useEffect(() => {
    if (eventDate && startHour && endHour) {
      const startIso = new Date(`${eventDate}T${startHour}:00`).toISOString();
      const endIso = new Date(`${eventDate}T${endHour}:00`).toISOString();
      const verifyConflicts = async () => {
        let hasConflict = false;
        let conflictMsg = '';

        if (selectedResources.length > 0) {
          for (const resId of selectedResources) {
            const check = await api.post('/resources/check-availability', {
              resourceId: resId,
              from: startIso,
              to: endIso,
            });
            if (!check.available) {
              hasConflict = true;
              const r = resources.find((item) => item.id === resId);
              conflictMsg = `Conflicto: El recurso "${r?.name || 'Recurso'}" no está disponible en este horario.`;
              break;
            }
          }
        }

        if (!hasConflict) {
          const reqStart = new Date(startIso);
          const reqEnd = new Date(endIso);
          const allInvolvedIds = [responsibleId, ...selectedParticipants].filter(Boolean);
          
          for (const ev of expandedEvents) {
            if (selectedEvent && ev.id.startsWith(selectedEvent.id)) continue;
            const evStart = new Date(ev.startTime);
            const evEnd = new Date(ev.endTime);
            
            if (reqStart < evEnd && reqEnd > evStart) {
              const evInvolvedIds = [
                ev.responsible?.id,
                ev.organizer?.id,
                ...(ev.participants?.map((p: any) => p.user?.id) || [])
              ].filter(Boolean);
              
              const conflictId = allInvolvedIds.find(id => evInvolvedIds.includes(id));
              if (conflictId) {
                hasConflict = true;
                const u = users.find(user => user.id === conflictId);
                conflictMsg = `Cruce de Agenda: ${u?.name || 'Un usuario'} ya tiene programado "${ev.title}" en este horario.`;
                break;
              }
            }
          }
        }

        if (hasConflict) {
          setTermometro(50);
          setConflictWarning(conflictMsg);
        } else {
          setTermometro(100);
          setConflictWarning(null);
        }
      };
      verifyConflicts();
    } else {
      setTermometro(null);
      setConflictWarning(null);
    }
  }, [eventDate, startHour, endHour, selectedResources, responsibleId, selectedParticipants, expandedEvents, resources, users, selectedEvent]);

  // Invocar motor inteligente Chronos Engine
  const handleOptimize = async () => {
    if (!eventDate) {
      alert('Por favor selecciona una fecha para iniciar la optimización.');
      return;
    }
    const startIso = new Date(`${eventDate}T${startHour}:00`).toISOString();
    
    setOptimizing(true);
    setSuggestions([]);
    try {
      const data = await api.post('/scheduler/optimize', {
        mandatoryUserIds: [responsibleId, ...selectedParticipants],
        optionalUserIds: [],
        requiredResourceIds: selectedResources,
        durationMinutes: 90, // Por defecto reuniones de 1.5 horas
        searchWindowStart: startIso,
        searchWindowEnd: new Date(new Date(startIso).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Búsqueda a 7 días
      });
      setSuggestions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setOptimizing(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const startIso = new Date(`${eventDate}T${startHour}:00`).toISOString();
    const endIso = new Date(`${eventDate}T${endHour}:00`).toISOString();
    
    try {
      await api.post('/events', {
        title,
        startTime: startIso,
        endTime: endIso,
        areaId,
        responsibleId,
        location,
        notes,
        resourceIds: selectedResources,
        participantIds: selectedParticipants,
        isRecurring: recurrence !== 'NONE',
        recurrenceRule: recurrence !== 'NONE' ? `FREQ=${recurrence}` : undefined,
      });

      // Limpiar Formulario
      setTitle('');
      setEventDate(format(new Date(), 'yyyy-MM-dd'));
      setStartHour('09:00');
      setEndHour('10:00');
      setRecurrence('NONE');
      setLocation('');
      setSelectedResources([]);
      setSelectedParticipants([]);
      setNotes('');
      setShowModal(false);
      await fetchEvents();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error al guardar el evento.';
      alert(msg);
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Empezar Lunes
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const dayHours = Array.from({ length: 24 }, (_, i) => i);

  const nextPeriod = () => {
    if (viewType === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (viewType === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else {
      const nextDay = addDays(selectedDay, 1);
      setSelectedDay(nextDay);
      setCurrentDate(nextDay);
    }
  };
  const prevPeriod = () => {
    if (viewType === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (viewType === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else {
      const prev = subDays(selectedDay, 1);
      setSelectedDay(prev);
      setCurrentDate(prev);
    }
  };
  
  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDay(today);
  };

  if (loading) {
    return <div style={{ padding: '32px', color: 'var(--text-secondary)' }}>Cargando grilla del planificador...</div>;
  }

  return (
    <div className="view-wrapper">
      <div className="calendar-header">
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, textTransform: 'capitalize', letterSpacing: '-0.5px' }}>
            {viewType === 'month' && format(currentDate, 'MMMM yyyy', { locale: es })}
            {viewType === 'week' && `Semana del ${format(weekStart, 'd')} al ${format(weekEnd, 'd')} de ${format(weekEnd, 'MMMM yyyy', { locale: es })}`}
            {viewType === 'day' && format(selectedDay, "eeee d 'de' MMMM, yyyy", { locale: es })}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {viewMode === 'personal' ? 'Mi Agenda Personal' : 'Coordinación y gestión de agendas institucionales'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Selector de Vistas Premium */}
          <div style={{ display: 'flex', backgroundColor: 'var(--bg-tertiary)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <button 
              onClick={() => setViewType('month')} 
              style={{ padding: '6px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, backgroundColor: viewType === 'month' ? 'var(--primary)' : 'transparent', color: viewType === 'month' ? '#fff' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
            >Mes</button>
            <button 
              onClick={() => setViewType('week')} 
              style={{ padding: '6px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, backgroundColor: viewType === 'week' ? 'var(--primary)' : 'transparent', color: viewType === 'week' ? '#fff' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
            >Semana</button>
            <button 
              onClick={() => { setViewType('day'); setSelectedDay(currentDate); }} 
              style={{ padding: '6px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, backgroundColor: viewType === 'day' ? 'var(--primary)' : 'transparent', color: viewType === 'day' ? '#fff' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
            >Día</button>
          </div>

          <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
            <button onClick={prevPeriod} className="btn btn-secondary" style={{ padding: '10px 14px', borderRadius: 0, border: 'none' }}>
              <ChevronLeft size={18} />
            </button>
            <button onClick={goToToday} className="btn btn-secondary" style={{ padding: '10px 14px', borderRadius: 0, borderTop: 'none', borderBottom: 'none' }}>
              Hoy
            </button>
            <button onClick={nextPeriod} className="btn btn-secondary" style={{ padding: '10px 14px', borderRadius: 0, border: 'none' }}>
              <ChevronRight size={18} />
            </button>
          </div>

          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus size={18} />
            Coordinar Evento
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'general' ? '1fr 4fr' : '1fr', gap: '24px', alignItems: 'start' }}>
        {/* Panel Izquierdo: Capas de Filtros de Calendarios (Solo en General) */}
        {viewMode === 'general' && (
          <div className="glass" style={{ padding: '20px', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '16px', letterSpacing: '0.5px' }}>
              Capas de Calendario
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {calendarLayers.map((layer) => (
                <label
                  key={layer.id}
                  onClick={(e) => {
                    e.preventDefault();
                    toggleCalendarFilter(layer.id);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: '4px 0',
                  }}
                >
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: layer.color === 'rainbow' ? 'linear-gradient(45deg, #EF4444, #F59E0B, #10B981, #3B82F6, #8B5CF6)' : layer.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    opacity: selectedCalendarIds.includes(layer.id) ? 1 : 0.4,
                    transition: 'all 0.2s ease',
                    boxShadow: selectedCalendarIds.includes(layer.id) ? `0 0 8px ${layer.color === 'rainbow' ? '#8B5CF6' : layer.color}80` : 'none',
                  }}>
                    {selectedCalendarIds.includes(layer.id) && <Check size={14} strokeWidth={3} />}
                  </div>
                  {layer.name}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Contenedor Principal de la Vista */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* VISTA MES */}
          {viewType === 'month' && (
            <div className="calendar-grid">
              {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((day) => (
                <div key={day} className="calendar-day-header">
                  {day}
                </div>
              ))}

              {days.map((day: Date) => {
                const dayEvents = expandedEvents.filter((ev) => {
                  if (!isSameDay(parseISO(ev.startTime), day)) return false;
                  
                  const involvedIds = [ev.responsible?.id, ev.organizer?.id, ...(ev.participants?.map((p: any) => p.user?.id) || [])];
                  
                  if (viewMode === 'personal') {
                    return involvedIds.includes(currentUser?.id);
                  } else {
                    return involvedIds.some(id => selectedCalendarIds.includes(id));
                  }
                });
                return (
                  <div
                    key={day.toString()}
                    className={`calendar-cell ${isToday(day) ? 'today' : ''}`}
                    onClick={() => { setViewType('day'); setSelectedDay(day); setCurrentDate(day); }}
                    style={{
                      backgroundColor: day.getMonth() === currentDate.getMonth() ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                      opacity: day.getMonth() === currentDate.getMonth() ? 1 : 0.6,
                      cursor: 'pointer'
                    }}
                  >
                    <div className="calendar-cell-number" style={{ pointerEvents: 'none' }}>{format(day, 'd')}</div>
                    <div style={{ overflowY: 'auto', maxHeight: '80px', pointerEvents: 'auto' }}>
                      {dayEvents.map((ev) => {
                        const layer = calendarLayers.find(l => l.id === ev.responsible?.id);
                        const renderColor = layer ? layer.color : (ev.color || 'var(--primary)');
                        const isRainbow = renderColor === 'rainbow';
                        return (
                          <div
                            key={ev.id}
                            className="calendar-event-item"
                            style={isRainbow ? {
                              background: 'linear-gradient(90deg, rgba(239,68,68,0.15), rgba(245,158,11,0.15), rgba(16,185,129,0.15), rgba(59,130,246,0.15), rgba(139,92,246,0.15))',
                              borderLeft: '4px solid #8B5CF6',
                              color: 'var(--text-primary)'
                            } : {
                              backgroundColor: `${renderColor}20`,
                              borderLeftColor: renderColor,
                              color: renderColor
                            }}
                            onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); setShowDetailModal(true); }}
                          >
                            {ev.title}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VISTA SEMANA */}
          {viewType === 'week' && (
            <div className="glass" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', backgroundColor: 'var(--border-color)', borderRadius: '16px', overflow: 'hidden' }}>
              {weekDays.map((day: Date) => {
                const dayEvents = expandedEvents.filter((ev) => {
                  if (!isSameDay(parseISO(ev.startTime), day)) return false;
                  const involvedIds = [ev.responsible?.id, ev.organizer?.id, ...(ev.participants?.map((p: any) => p.user?.id) || [])];
                  if (viewMode === 'personal') return involvedIds.includes(currentUser?.id);
                  return involvedIds.some(id => selectedCalendarIds.includes(id));
                }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
                
                return (
                  <div key={day.toString()} style={{ backgroundColor: 'var(--bg-secondary)', minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', backgroundColor: isToday(day) ? 'rgba(59,130,246,0.05)' : 'transparent' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{format(day, 'EEEE', { locale: es })}</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: isToday(day) ? 'var(--primary)' : 'var(--text-primary)' }}>{format(day, 'd')}</div>
                    </div>
                    <div style={{ padding: '8px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: isToday(day) ? 'rgba(59,130,246,0.02)' : 'transparent' }}>
                      {dayEvents.map((ev) => {
                        const layer = calendarLayers.find(l => l.id === ev.responsible?.id);
                        const renderColor = layer ? layer.color : (ev.color || 'var(--primary)');
                        const isRainbow = renderColor === 'rainbow';
                        return (
                          <div
                            key={ev.id}
                            className="calendar-event-item"
                            style={{
                              ...(isRainbow ? {
                                background: 'linear-gradient(90deg, rgba(239,68,68,0.15), rgba(245,158,11,0.15), rgba(16,185,129,0.15), rgba(59,130,246,0.15), rgba(139,92,246,0.15))',
                                borderLeft: '4px solid #8B5CF6',
                                color: 'var(--text-primary)'
                              } : {
                                backgroundColor: `${renderColor}15`,
                                borderLeftColor: renderColor,
                                color: renderColor
                              }),
                              padding: '10px',
                              whiteSpace: 'normal',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px'
                            }}
                            onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); setShowDetailModal(true); }}
                          >
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.8 }}>
                              {format(parseISO(ev.startTime), 'HH:mm')} - {format(parseISO(ev.endTime), 'HH:mm')}
                            </span>
                            <span style={{ fontWeight: 600, lineHeight: 1.2 }}>{ev.title}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VISTA DÍA (AGENDA VERTICAL) */}
          {viewType === 'day' && (
            <div className="glass" style={{ borderRadius: '16px', overflow: 'hidden', display: 'flex' }}>
              {/* Columna de Horas */}
              <div style={{ width: '80px', borderRight: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)', paddingBottom: '24px' }}>
                <div style={{ height: '60px', borderBottom: '1px solid var(--border-color)' }}></div>
                {dayHours.map(hour => (
                  <div key={hour} style={{ height: '80px', position: 'relative' }}>
                    <span style={{ position: 'absolute', top: '-10px', right: '12px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {`${hour.toString().padStart(2, '0')}:00`}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Columna de Eventos */}
              <div style={{ flex: 1, position: 'relative', backgroundColor: 'var(--bg-secondary)' }}>
                <div style={{ height: '60px', borderBottom: '1px solid var(--border-color)', padding: '0 24px', display: 'flex', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Agenda del Día</h3>
                </div>
                
                <div style={{ position: 'relative', height: `${24 * 80}px` }}>
                  {/* Líneas horizontales de horas */}
                  {dayHours.map(hour => (
                    <div key={hour} style={{ position: 'absolute', top: `${hour * 80}px`, left: 0, right: 0, height: '1px', backgroundColor: 'var(--border-color)', opacity: 0.5 }}></div>
                  ))}

                  {/* Contenedor interno para los eventos con padding lateral */}
                  <div style={{ position: 'absolute', top: 0, left: '16px', right: '16px', bottom: 0 }}>
                    {/* Renderizar eventos posicionados absolutamente */}
                    {(() => {
                      const filteredEventsForDay = expandedEvents.filter((ev) => {
                        if (!isSameDay(parseISO(ev.startTime), selectedDay)) return false;
                        const involvedIds = [ev.responsible?.id, ev.organizer?.id, ...(ev.participants?.map((p: any) => p.user?.id) || [])];
                        if (viewMode === 'personal') return involvedIds.includes(currentUser?.id);
                        return involvedIds.some(id => selectedCalendarIds.includes(id));
                      });

                      const sortedEvents = [...filteredEventsForDay].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
                      
                      const eventGroups: { events: { ev: any, colIndex: number }[], maxCols: number }[] = [];
                      let currentGroup: { events: { ev: any, colIndex: number }[], maxCols: number } | null = null;
                      let groupMaxEnd = 0;
                      
                      sortedEvents.forEach(ev => {
                        const start = new Date(ev.startTime).getTime();
                        const end = new Date(ev.endTime).getTime();
                        if (!currentGroup || start >= groupMaxEnd) {
                          if (currentGroup) eventGroups.push(currentGroup);
                          currentGroup = { events: [{ ev, colIndex: 0 }], maxCols: 1 };
                          groupMaxEnd = end;
                        } else {
                          let cIdx = 0;
                          while (currentGroup.events.some(e => e.colIndex === cIdx && new Date(e.ev.endTime).getTime() > start)) {
                            cIdx++;
                          }
                          currentGroup.events.push({ ev, colIndex: cIdx });
                          currentGroup.maxCols = Math.max(currentGroup.maxCols, cIdx + 1);
                          groupMaxEnd = Math.max(groupMaxEnd, end);
                        }
                      });
                      if (currentGroup) eventGroups.push(currentGroup);

                      return eventGroups.flatMap(group => {
                        return group.events.map(({ ev, colIndex }) => {
                          const layer = calendarLayers.find(l => l.id === ev.responsible?.id);
                          const renderColor = layer ? layer.color : (ev.color || 'var(--primary)');
                          const isRainbow = renderColor === 'rainbow';
                          
                          const start = parseISO(ev.startTime);
                          const end = parseISO(ev.endTime);
                          const startMinutes = start.getHours() * 60 + start.getMinutes();
                          const endMinutes = end.getHours() * 60 + end.getMinutes();
                          const durationMinutes = endMinutes - startMinutes;
                          
                          const topPosition = (startMinutes / 60) * 80;
                          const height = (durationMinutes / 60) * 80;

                          const widthPct = 100 / group.maxCols;
                          const leftPct = colIndex * widthPct;

                          return (
                            <div
                              key={ev.id}
                              className="calendar-event-item"
                              style={{
                                position: 'absolute',
                                top: `${topPosition}px`,
                                height: `${Math.max(height, 24)}px`,
                                left: `calc(${leftPct}% + 2px)`,
                                width: `calc(${widthPct}% - 4px)`,
                                ...(isRainbow ? {
                                  background: 'linear-gradient(90deg, rgba(239,68,68,0.15), rgba(245,158,11,0.15), rgba(16,185,129,0.15), rgba(59,130,246,0.15), rgba(139,92,246,0.15))',
                                  borderLeft: '4px solid #8B5CF6',
                                  color: 'var(--text-primary)'
                                } : {
                                  backgroundColor: `${renderColor}25`,
                                  borderLeftColor: renderColor,
                                  color: renderColor
                                }),
                              padding: '8px 12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px',
                              zIndex: 10,
                              boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                              overflow: 'hidden'
                            }}
                            onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); setShowDetailModal(true); }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{ev.title}</span>
                              {height > 40 && (
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.8, backgroundColor: 'rgba(255,255,255,0.3)', padding: '2px 6px', borderRadius: '8px' }}>
                                  {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                                </span>
                              )}
                            </div>
                            {height > 50 && (
                              <span style={{ fontSize: '0.75rem', opacity: 0.9, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                {ev.responsible?.name}
                              </span>
                            )}
                          </div>
                        );
                      });
                    });
                  })()}
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* MODAL NUEVO EVENTO */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content glass" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Coordinar Nuevo Evento</h3>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ padding: '6px', borderRadius: '50%' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} onClick={() => { setShowDatePicker(false); setShowStartHourPicker(false); setShowEndHourPicker(false); }} style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              <div className="form-group">
                <label className="form-label">Título de la Actividad</label>
                <input type="text" className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Ej. Auditoría de Sistemas" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="form-label">Fecha del Evento</label>
                  <div 
                    onClick={(e) => { e.stopPropagation(); setShowDatePicker(!showDatePicker); setShowStartHourPicker(false); setShowEndHourPicker(false); setPickerMonth(parseISO(eventDate)); }}
                    className="form-input" 
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}
                  >
                    <CalendarIcon size={16} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontWeight: 500 }}>{format(parseISO(eventDate), 'dd/MM/yyyy')}</span>
                  </div>

                  {showDatePicker && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: '8px',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '16px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                        zIndex: 50,
                        width: '280px'
                      }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setPickerMonth(subMonths(pickerMonth, 1)); }} className="btn btn-secondary" style={{ padding: '4px', borderRadius: '8px' }}>
                          <ChevronLeft size={16} />
                        </button>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', textTransform: 'capitalize' }}>
                          {format(pickerMonth, 'MMMM yyyy', { locale: es })}
                        </span>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setPickerMonth(addMonths(pickerMonth, 1)); }} className="btn btn-secondary" style={{ padding: '4px', borderRadius: '8px' }}>
                          <ChevronRight size={16} />
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'].map(d => <div key={d}>{d}</div>)}
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                        {eachDayOfInterval({ start: startOfWeek(startOfMonth(pickerMonth), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(pickerMonth), { weekStartsOn: 1 }) }).map(d => {
                          const isSel = eventDate === format(d, 'yyyy-MM-dd');
                          const isCurMonth = d.getMonth() === pickerMonth.getMonth();
                          return (
                            <div 
                              key={d.toString()}
                              onClick={(e) => { e.stopPropagation(); setEventDate(format(d, 'yyyy-MM-dd')); setShowDatePicker(false); }}
                              style={{
                                padding: '6px 0',
                                textAlign: 'center',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: isSel ? 700 : 500,
                                backgroundColor: isSel ? 'var(--primary)' : 'transparent',
                                color: isSel ? '#ffffff' : (isCurMonth ? 'var(--text-primary)' : 'var(--text-secondary)'),
                                opacity: isCurMonth ? 1 : 0.4
                              }}
                            >
                              {format(d, 'd')}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="form-label">Hora Inicio</label>
                  <div 
                    onClick={(e) => { e.stopPropagation(); setShowStartHourPicker(!showStartHourPicker); setShowDatePicker(false); setShowEndHourPicker(false); }}
                    className="form-input" 
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
                  >
                    <span style={{ fontWeight: 500 }}>{startHour}</span>
                    <ChevronDown size={16} style={{ color: 'var(--text-secondary)' }} />
                  </div>
                  {showStartHourPicker && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: '8px',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                        zIndex: 50,
                        width: '100%'
                      }}>
                      {timeOptions.map(t => (
                        <div 
                          key={`start-${t}`} 
                          onClick={() => { 
                            setStartHour(t); 
                            setShowStartHourPicker(false);
                            const sIdx = timeOptions.indexOf(t);
                            const eIdx = timeOptions.indexOf(endHour);
                            if (eIdx <= sIdx && sIdx + 1 < timeOptions.length) {
                              setEndHour(timeOptions[sIdx + 1]);
                            }
                          }}
                          style={{
                            padding: '10px 16px',
                            cursor: 'pointer',
                            backgroundColor: startHour === t ? 'rgba(179, 0, 38, 0.1)' : 'transparent',
                            color: startHour === t ? 'var(--primary)' : 'var(--text-primary)',
                            fontWeight: startHour === t ? 700 : 500,
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => { if (startHour !== t) e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'; }}
                          onMouseLeave={(e) => { if (startHour !== t) e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          {t}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="form-label">Hora Fin</label>
                  <div 
                    onClick={(e) => { e.stopPropagation(); setShowEndHourPicker(!showEndHourPicker); setShowDatePicker(false); setShowStartHourPicker(false); }}
                    className="form-input" 
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
                  >
                    <span style={{ fontWeight: 500 }}>{endHour}</span>
                    <ChevronDown size={16} style={{ color: 'var(--text-secondary)' }} />
                  </div>
                  {showEndHourPicker && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: '8px',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                        zIndex: 50,
                        width: '100%'
                      }}>
                      {timeOptions.filter(t => timeOptions.indexOf(t) > timeOptions.indexOf(startHour)).map(t => (
                        <div 
                          key={`end-${t}`} 
                          onClick={() => { setEndHour(t); setShowEndHourPicker(false); }}
                          style={{
                            padding: '10px 16px',
                            cursor: 'pointer',
                            backgroundColor: endHour === t ? 'rgba(179, 0, 38, 0.1)' : 'transparent',
                            color: endHour === t ? 'var(--primary)' : 'var(--text-primary)',
                            fontWeight: endHour === t ? 700 : 500,
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => { if (endHour !== t) e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'; }}
                          onMouseLeave={(e) => { if (endHour !== t) e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          {t}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Recurrencia</label>
                <select className="form-input" value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
                  <option value="NONE">No se repite (Solo una vez)</option>
                  <option value="DAILY">Todos los días a esta hora</option>
                  <option value="WEEKLY">Todas las semanas a esta misma hora</option>
                </select>
              </div>

              {/* Botón Asistente Chronos */}
              <div style={{ marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={handleOptimize}
                  className="btn btn-secondary"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--primary)' }}
                >
                  <Sparkles size={16} />
                  {optimizing ? 'Optimizando con Chronos...' : 'Sugerir Horarios Óptimos con Chronos Engine'}
                </button>
              </div>

              {/* Sugerencias Inteligentes */}
              {suggestions.length > 0 && (
                <div style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '16px',
                }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                    Sugerencias Horarias
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {suggestions.map((sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          // Seleccionar sugerencia
                          const s = parseISO(sug.start);
                          const e = parseISO(sug.end);
                          setEventDate(format(s, 'yyyy-MM-dd'));
                          setStartHour(format(s, 'HH:mm'));
                          setEndHour(format(e, 'HH:mm'));
                        }}
                        className="btn btn-secondary"
                        style={{
                          width: '100%',
                          fontSize: '0.8rem',
                          padding: '10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          textAlign: 'left',
                        }}
                      >
                        <div>
                          <strong>Opción {idx + 1}:</strong> {format(parseISO(sug.start), "eeee d 'de' MMMM, HH:mm", { locale: es })}
                        </div>
                        <span style={{
                          backgroundColor: 'rgba(16, 185, 129, 0.15)',
                          color: 'var(--success)',
                          fontSize: '0.7rem',
                          padding: '2px 8px',
                          borderRadius: '8px',
                          fontWeight: 700,
                        }}>
                          {sug.availabilityPercentage}% disp.
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Termómetro de Disponibilidad y Alertas */}
              {termometro !== null && (
                <div style={{
                  padding: '16px',
                  borderRadius: '12px',
                  backgroundColor: termometro === 100 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${termometro === 100 ? 'var(--success)' : 'var(--danger)'}`,
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}>
                  {termometro === 100 ? <Check size={20} style={{ color: 'var(--success)' }} /> : <AlertTriangle size={20} style={{ color: 'var(--danger)' }} />}
                  <div>
                    <strong style={{ fontSize: '0.85rem', color: termometro === 100 ? 'var(--success)' : 'var(--danger)' }}>
                      Termómetro de Disponibilidad: {termometro}%
                    </strong>
                    {conflictWarning && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {conflictWarning}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Área Organizadora</label>
                {(() => {
                  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.name?.includes('Administrador');
                  const allowedAreas = isSuperAdmin ? areas : areas.filter(a => a.name === currentUser?.area);
                  
                  return (
                    <select 
                      className="form-input" 
                      value={areaId} 
                      onChange={(e) => setAreaId(e.target.value)}
                      disabled={allowedAreas.length <= 1}
                      style={{ opacity: allowedAreas.length <= 1 ? 0.7 : 1, cursor: allowedAreas.length <= 1 ? 'not-allowed' : 'pointer' }}
                    >
                      {allowedAreas.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  );
                })()}
              </div>



              <div className="form-group">
                <label className="form-label">Responsable Principal</label>
                {(() => {
                  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.name?.includes('Administrador');
                  const isRosalinda = currentUser?.name?.includes('Rosalinda');
                  const allowedResponsibleUsers = users.filter(u => {
                    if (isSuperAdmin) return true;
                    if (isRosalinda) return u.id === currentUser?.id || u.name?.includes('Rodolfo');
                    return u.id === currentUser?.id;
                  });
                  return (
                    <select 
                      className="form-input" 
                      value={responsibleId} 
                      onChange={(e) => setResponsibleId(e.target.value)}
                      disabled={allowedResponsibleUsers.length <= 1}
                      style={{ opacity: allowedResponsibleUsers.length <= 1 ? 0.7 : 1, cursor: allowedResponsibleUsers.length <= 1 ? 'not-allowed' : 'pointer' }}
                    >
                      {allowedResponsibleUsers.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  );
                })()}
              </div>

              <div className="form-group">
                <label className="form-label">Invitar Participantes (Multiselección)</label>
                <div style={{
                  maxHeight: '100px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}>
                  {users.map((u) => (
                    <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                      <input
                        type="checkbox"
                        checked={selectedParticipants.includes(u.id)}
                        onChange={() => {
                          const active = selectedParticipants.includes(u.id);
                          setSelectedParticipants(
                            active ? selectedParticipants.filter(id => id !== u.id) : [...selectedParticipants, u.id]
                          );
                        }}
                      />
                      {u.name} ({u.email})
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notas Adicionales</label>
                <textarea className="form-input" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Detalles de agenda u orden del día..." />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={!!conflictWarning} style={{ opacity: conflictWarning ? 0.5 : 1, cursor: conflictWarning ? 'not-allowed' : 'pointer' }}>Agendar Actividad</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE EVENTO */}
      {showDetailModal && selectedEvent && (
        <div className="modal-overlay">
          <div className="modal-content glass" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: selectedEvent.color,
                backgroundColor: selectedEvent.color + '20',
                padding: '4px 10px',
                borderRadius: '8px',
              }}>
                {selectedEvent.area?.name}
              </span>
              <button onClick={() => setShowDetailModal(false)} className="btn btn-secondary" style={{ padding: '6px', borderRadius: '50%' }}>
                <X size={16} />
              </button>
            </div>

            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px' }}>{selectedEvent.title}</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarIcon size={16} style={{ color: 'var(--primary)' }} />
                <span>
                  {format(parseISO(selectedEvent.startTime), "eeee d 'de' MMMM, HH:mm", { locale: es })} a{' '}
                  {format(parseISO(selectedEvent.endTime), 'HH:mm', { locale: es })}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={16} style={{ color: 'var(--success)' }} />
                <span>Responsable: <strong>{selectedEvent.responsible?.name}</strong></span>
              </div>

              {selectedEvent.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={16} style={{ color: 'var(--danger)' }} />
                  <span>Ubicación: {selectedEvent.location}</span>
                </div>
              )}
            </div>

            {selectedEvent.notes && (
              <div style={{
                padding: '12px',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: '10px',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                marginBottom: '24px',
              }}>
                <strong>Notas:</strong>
                <p style={{ marginTop: '4px' }}>{selectedEvent.notes}</p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              {selectedEvent.responsible?.id === currentUser?.id && (
                <button 
                  onClick={() => setShowDeleteConfirm(true)} 
                  className="btn btn-secondary" 
                  style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                >
                  Eliminar Evento
                </button>
              )}
              <button onClick={() => setShowDetailModal(false)} className="btn btn-primary">Entendido</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {showDeleteConfirm && selectedEvent && (
        <div className="modal-overlay" style={{ zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-content glass" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '24px', maxWidth: '400px', textAlign: 'center' }}>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '16px', borderRadius: '50%' }}>
                <AlertTriangle size={36} style={{ color: 'var(--danger)' }} />
              </div>
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '8px' }}>¿Eliminar este evento?</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Esta acción es permanente. Si se trata de un evento recurrente programado, también se eliminarán todas las fechas asociadas.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => setShowDeleteConfirm(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
              <button 
                onClick={async () => {
                  try {
                    const baseEventId = selectedEvent.id.split('-rep-')[0];
                    await api.delete(`/events/${baseEventId}`);
                    setShowDeleteConfirm(false);
                    setShowDetailModal(false);
                    fetchEvents();
                  } catch (err: any) {
                    setErrorMessage(err.message || 'Error al eliminar el evento.');
                  }
                }} 
                className="btn btn-primary" 
                style={{ flex: 1, backgroundColor: 'var(--danger)', border: 'none' }}
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ERROR (Reemplaza a alert) */}
      {errorMessage && (
        <div className="modal-overlay" style={{ zIndex: 10000, backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-content glass" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '24px', maxWidth: '400px', textAlign: 'center' }}>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '16px', borderRadius: '50%' }}>
                <AlertTriangle size={36} style={{ color: 'var(--danger)' }} />
              </div>
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '8px' }}>Ocurrió un Problema</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              {errorMessage}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button 
                onClick={() => { setErrorMessage(null); setShowDeleteConfirm(false); setShowDetailModal(false); }} 
                className="btn btn-primary" 
                style={{ width: '100%' }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
