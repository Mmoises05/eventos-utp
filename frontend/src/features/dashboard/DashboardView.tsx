import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Calendar, AlertTriangle, Users, BookOpen, Clock, CheckCircle } from 'lucide-react';

interface EventData {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  area: { name: string; color: string };
  responsible: { name: string };
  reservations: any[];
}

export const DashboardView: React.FC = () => {
  const user = useAuthStore((state: any) => state.user);
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEvents: 0,
    todayEventsCount: 0,
    conflictsCount: 0,
    mostActiveArea: 'Sistemas',
    mostActiveAreaCount: 0,
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const allEvents: EventData[] = await api.get('/events');
        
        const isSuper = user?.role === 'SUPER_ADMIN' || user?.name?.includes('Administrador');
        const filteredEvents = isSuper ? allEvents : allEvents.filter((ev: any) => 
          ev.responsible?.name === user?.name || 
          ev.area?.name === user?.area || 
          (ev.participants && ev.participants.some((p: any) => p.user?.name === user?.name))
        );
        
        setEvents(filteredEvents);

        const todayStr = new Date().toDateString();
        const todayEvents = filteredEvents.filter((ev) => new Date(ev.startTime).toDateString() === todayStr);

        // Agrupación por área para calcular la más activa
        const areaCounts: Record<string, number> = {};
        filteredEvents.forEach((ev) => {
          if (ev.area) {
            areaCounts[ev.area.name] = (areaCounts[ev.area.name] || 0) + 1;
          }
        });

        let maxArea = 'Ninguna';
        let maxCount = 0;
        Object.entries(areaCounts).forEach(([name, count]) => {
          if (count > maxCount) {
            maxCount = count;
            maxArea = name;
          }
        });

        setStats({
          totalEvents: filteredEvents.length,
          todayEventsCount: todayEvents.length,
          conflictsCount: filteredEvents.filter((ev) => ev.status === 'CONFLICT').length, // Simplificación
          mostActiveArea: maxArea,
          mostActiveAreaCount: maxCount,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return <div style={{ padding: '32px', color: 'var(--text-secondary)' }}>Cargando panel ejecutivo...</div>;
  }

  // Filtrar eventos de hoy
  const todayStr = new Date().toDateString();
  const todayEvents = events.filter((ev) => new Date(ev.startTime).toDateString() === todayStr);

  return (
    <div className="view-wrapper">
      <div>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '6px', letterSpacing: '-0.5px' }}>
          Bienvenido, {user?.name}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Área: <strong>{user?.area}</strong> | Rol: <span style={{ textTransform: 'capitalize' }}>{user?.role.toLowerCase()}</span>
        </p>
      </div>

      {/* Tarjetas de Estadísticas Rápidas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <div className="glass" style={{ padding: '24px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
            <Calendar size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Eventos de Hoy</span>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '2px' }}>{stats.todayEventsCount}</h3>
          </div>
        </div>

        <div className="glass" style={{ padding: '24px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Programados</span>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '2px' }}>{stats.totalEvents}</h3>
          </div>
        </div>

        <div className="glass" style={{ padding: '24px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Conflictos Detectados</span>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '2px' }}>{stats.conflictsCount}</h3>
          </div>
        </div>

        <div className="glass" style={{ padding: '24px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
            <Users size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Área Más Ocupada</span>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {stats.mostActiveArea}
            </h3>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '24px' }}>
        {/* Agenda de Hoy */}
        <div className="glass" style={{ padding: '24px', borderRadius: '16px', minHeight: '340px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={20} style={{ color: 'var(--primary)' }} />
            Agenda para el día de hoy
          </h3>

          {todayEvents.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No hay eventos coordinados para hoy. ¡Disfruta tu día libre!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {todayEvents.map((ev) => (
                <div
                  key={ev.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderLeft: `4px solid ${ev.area?.color || 'var(--primary)'}`,
                  }}
                >
                  <div>
                    <h4 style={{ fontWeight: 600, fontSize: '0.975rem' }}>{ev.title}</h4>
                    <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                      Responsable: {ev.responsible?.name} | {ev.area?.name}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--primary)' }}>
                      {formatTime(ev.startTime)} - {formatTime(ev.endTime)}
                    </span>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      color: 'var(--success)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      alignSelf: 'flex-end',
                    }}>
                      Confirmado
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
