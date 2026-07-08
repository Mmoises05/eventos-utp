import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

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

interface EventData {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  area: { name: string; color: string };
  responsible: { name: string };
}

export const ReportsView: React.FC = () => {
  const user = useAuthStore((state: any) => state.user);
  const [events, setEvents] = useState<EventData[]>([]);
  const [userColorMap, setUserColorMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReportsData = async () => {
      try {
        const [allEvents, usersList] = await Promise.all([
          api.get('/events'),
          api.get('/users')
        ]);
        const isSuper = user?.role === 'SUPER_ADMIN' || user?.name?.includes('Administrador');
        const filteredEvents = isSuper ? allEvents : allEvents.filter((ev: any) => 
          ev.responsible?.name === user?.name || 
          ev.area?.name === user?.area || 
          (ev.participants && ev.participants.some((p: any) => p.user?.name === user?.name))
        );
        
        setEvents(filteredEvents);

        // Mapear colores de usuarios igual que en el calendario
        const colorMap: Record<string, string> = {};
        usersList.forEach((u: any, index: number) => {
          colorMap[u.name] = u.area?.color || u.color || PREMIUM_COLORS[index % PREMIUM_COLORS.length];
        });
        setUserColorMap(colorMap);

      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchReportsData();
  }, []);

  if (loading) {
    return <div style={{ padding: '32px', color: 'var(--text-secondary)' }}>Cargando datos estadísticos...</div>;
  }

  // Agrupar eventos por área
  const areaCounts: Record<string, { count: number; color: string }> = {};
  events.forEach((ev) => {
    if (ev.area) {
      if (!areaCounts[ev.area.name]) {
        areaCounts[ev.area.name] = { count: 0, color: ev.area.color || '#3B82F6' };
      }
      areaCounts[ev.area.name].count += 1;
    }
  });

  const doughnutData = {
    labels: Object.keys(areaCounts),
    datasets: [
      {
        label: 'Eventos por Área',
        data: Object.values(areaCounts).map(a => a.count),
        backgroundColor: Object.values(areaCounts).map(a => a.color),
        borderWidth: 0,
      },
    ],
  };

  // Agrupar carga laboral por usuario
  const userCounts: Record<string, number> = {};
  events.forEach((ev) => {
    if (ev.responsible) {
      userCounts[ev.responsible.name] = (userCounts[ev.responsible.name] || 0) + 1;
    }
  });

  const barData = {
    labels: Object.keys(userCounts),
    datasets: [
      {
        label: 'Reuniones Lideradas',
        data: Object.values(userCounts),
        backgroundColor: Object.keys(userCounts).map(name => userColorMap[name] || '#3B82F6'),
        borderRadius: 4,
      },
    ],
  };

  const doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const },
    },
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const },
    },
    scales: {
      y: {
        ticks: {
          stepSize: 1, // Forzar números enteros
        },
      },
    },
  };

  return (
    <div className="view-wrapper">
      <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Reportes Estadísticos</h3>
      <p style={{ color: 'var(--text-secondary)' }}>
        Análisis de carga laboral, eventos por área y métricas institucionales.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginTop: '24px' }}>
        
        {/* Gráfico de Áreas */}
        <div className="glass" style={{ padding: '24px', borderRadius: '16px', height: '400px', display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ marginBottom: '16px', fontSize: '1rem', fontWeight: 600 }}>Eventos por Área</h4>
          <div style={{ flex: 1, position: 'relative' }}>
            {Object.keys(areaCounts).length > 0 ? (
              <Doughnut data={doughnutData} options={doughnutChartOptions} />
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>No hay datos suficientes</div>
            )}
          </div>
        </div>

        {/* Gráfico de Carga Laboral */}
        <div className="glass" style={{ padding: '24px', borderRadius: '16px', height: '400px', display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ marginBottom: '16px', fontSize: '1rem', fontWeight: 600 }}>Carga Laboral (Reuniones Lideradas)</h4>
          <div style={{ flex: 1, position: 'relative' }}>
             {Object.keys(userCounts).length > 0 ? (
               <Bar data={barData} options={barChartOptions} />
             ) : (
               <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>No hay datos suficientes</div>
             )}
          </div>
        </div>

      </div>

      <div className="glass" style={{ padding: '24px', borderRadius: '16px', marginTop: '24px' }}>
        <h4 style={{ marginBottom: '16px', fontSize: '1rem', fontWeight: 600 }}>Resumen Ejecutivo</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total de Eventos Registrados</span>
            <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 700 }}>{events.length}</span>
          </div>
          <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Áreas Activas</span>
            <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 700 }}>{Object.keys(areaCounts).length}</span>
          </div>
          <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Usuarios Involucrados</span>
            <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 700 }}>{Object.keys(userCounts).length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
