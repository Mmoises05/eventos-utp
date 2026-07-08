import React, { useEffect, useState, useRef } from 'react';
import { useAuthStore } from './store/authStore';
import { useUIStore } from './store/uiStore';
import { LoginView } from './features/login/LoginView';
import { DashboardView } from './features/dashboard/DashboardView';
import { CalendarView } from './features/calendar/CalendarView';
import { ReportsView } from './features/reports/ReportsView';
import { socketService } from './services/socket';
import { api } from './services/api';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  LayoutDashboard, Calendar, LogOut, 
  Layers, MapPin, BarChart3, Sun, Moon, Bell, Globe, Check, CalendarIcon
} from 'lucide-react';

export const App: React.FC = () => {
  const { user, accessToken, logout } = useAuthStore();
  const { currentView, theme, setView, toggleTheme } = useUIStore();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [readNotifications, setReadNotifications] = useState<string[]>(() => {
    const saved = localStorage.getItem('sici_read_notifications');
    return saved ? JSON.parse(saved) : [];
  });
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (accessToken && user) {
      socketService.connect();
      
      const fetchNotifications = async () => {
        try {
          const events = await api.get('/events');
          
          const invitedEvents = events.filter((ev: any) => {
            const isParticipant = ev.participants?.some((p: any) => p.user?.id === user.id || p.id === user.id);
            const isOrganizer = ev.responsible?.id === user.id || ev.organizer?.id === user.id;
            const isFuture = new Date(ev.startTime).getTime() >= new Date().setHours(0,0,0,0);
            return isParticipant && !isOrganizer && isFuture;
          });
          
          invitedEvents.sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
          setNotifications(invitedEvents);
        } catch (e) {
          console.error('Failed to fetch notifications', e);
        }
      };

      fetchNotifications();
      socketService.on('event:created', fetchNotifications);
      socketService.on('event:updated', fetchNotifications);

      return () => {
        socketService.disconnect();
        socketService.off('event:created', fetchNotifications);
        socketService.off('event:updated', fetchNotifications);
      };
    }
  }, [accessToken, user]);

  const unreadCount = notifications.filter(n => !readNotifications.includes(n.id)).length;

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    const newRead = [...new Set([...readNotifications, ...allIds])];
    setReadNotifications(newRead);
    localStorage.setItem('sici_read_notifications', JSON.stringify(newRead));
  };

  const handleNotificationClick = (n: any) => {
    setView('calendar');
    setShowNotifications(false);
    if (!readNotifications.includes(n.id)) {
      const newRead = [...readNotifications, n.id];
      setReadNotifications(newRead);
      localStorage.setItem('sici_read_notifications', JSON.stringify(newRead));
    }
  };

  // Aplicar tema en el elemento html/body
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark-theme');
    } else {
      root.classList.remove('dark-theme');
    }
  }, [theme]);

  if (!accessToken || !user) {
    return <LoginView />;
  }

  return (
    <div className={`app-container ${theme === 'dark' ? 'dark-theme' : ''}`}>
      {/* Sidebar de Navegación */}
      <aside className="sidebar">
        <div className="sidebar-header" style={{ justifyContent: 'center' }}>
          <img src="/utp-logo.png" alt="UTP Logo" style={{ height: '32px', objectFit: 'contain' }} />
        </div>

        <ul className="sidebar-menu">
          <li 
            className={`menu-item ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setView('dashboard')}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </li>
          
          <li 
            className={`menu-item ${currentView === 'calendar' ? 'active' : ''}`}
            onClick={() => setView('calendar')}
          >
            <Calendar size={20} />
            <span>Mi Calendario</span>
          </li>
          
          <li 
            className={`menu-item ${currentView === 'calendar-general' ? 'active' : ''}`}
            onClick={() => setView('calendar-general')}
          >
            <Globe size={20} />
            <span>Calendario General</span>
          </li>

          <li 
            className={`menu-item ${currentView === 'reports' ? 'active' : ''}`}
            onClick={() => setView('reports')}
          >
            <BarChart3 size={20} />
            <span>Reportes</span>
          </li>
        </ul>

        <div className="sidebar-footer">
          <button 
            onClick={toggleTheme} 
            className="btn btn-secondary" 
            style={{ padding: '8px', borderRadius: '50%', border: 'none' }}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          
          <button 
            onClick={logout} 
            className="btn btn-secondary" 
            style={{ padding: '8px', borderRadius: '50%', border: 'none', color: 'var(--danger)' }}
            title="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Área Principal de Contenido */}
      <main className="main-content">
        <header className="top-header">
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
              {currentView === 'dashboard' && 'Panel Ejecutivo'}
              {currentView === 'calendar' && 'Mi Calendario Personal'}
              {currentView === 'calendar-general' && 'Calendario Institucional'}
              {currentView === 'resources' && 'Inventario de Recursos'}
              {currentView === 'reports' && 'Reportes Estadísticos'}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="btn btn-secondary" 
                style={{ padding: '8px', borderRadius: '50%', border: 'none', position: 'relative' }}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    backgroundColor: 'var(--danger)',
                    color: 'white',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="glass" style={{
                  position: 'absolute',
                  top: '120%',
                  right: 0,
                  width: '320px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
                  zIndex: 100,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Notificaciones</h3>
                    {unreadCount > 0 && (
                      <button onClick={markAllAsRead} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                        <Check size={14} /> Marcar como leídas
                      </button>
                    )}
                  </div>
                  <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <Bell size={24} style={{ opacity: 0.2, margin: '0 auto 8px auto', display: 'block' }} />
                        <span style={{ fontSize: '0.85rem' }}>No tienes notificaciones pendientes.</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {notifications.map(n => {
                          const isUnread = !readNotifications.includes(n.id);
                          return (
                            <div 
                              key={n.id} 
                              onClick={() => handleNotificationClick(n)}
                              style={{ 
                                padding: '12px 16px', 
                                borderBottom: '1px solid var(--border-color)',
                                cursor: 'pointer',
                                backgroundColor: isUnread ? 'rgba(179, 0, 38, 0.05)' : 'transparent',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isUnread ? 'rgba(179, 0, 38, 0.1)' : 'var(--bg-tertiary)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isUnread ? 'rgba(179, 0, 38, 0.05)' : 'transparent'; }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {isUnread && <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)' }}></div>}
                                <span style={{ fontSize: '0.8rem', fontWeight: isUnread ? 700 : 500 }}>
                                  Invitación de {n.responsible?.name}
                                </span>
                              </div>
                              <p style={{ fontSize: '0.85rem', margin: 0, color: 'var(--text-secondary)' }}>
                                Te han incluido en: <strong>{n.title}</strong>
                              </p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                <CalendarIcon size={12} />
                                {format(parseISO(n.startTime), "eeee d 'de' MMMM, HH:mm", { locale: es })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="user-profile-badge">
              <div className="user-avatar" style={{ overflow: 'hidden' }}>
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  user.name.charAt(0)
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user.name}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{user.role}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Carga dinámica de vistas */}
        {currentView === 'dashboard' && <DashboardView />}
        {currentView === 'calendar' && <CalendarView viewMode="personal" />}
        {currentView === 'calendar-general' && <CalendarView viewMode="general" />}
        
        {currentView === 'reports' && <ReportsView />}
      </main>
    </div>
  );
};

export default App;
