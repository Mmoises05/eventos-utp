import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { socketService } from '../../services/socket';
import { Shield, Key, Mail, Eye, EyeOff } from 'lucide-react';
import { RegisterView } from './RegisterView';

export const LoginView: React.FC = () => {
  const loginStore = useAuthStore((state: any) => state.login);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await api.post('/auth/login', { email, password });
      loginStore(data.user, data.accessToken, data.refreshToken);
      socketService.connect();
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  if (isRegistering) {
    return <RegisterView onBack={() => setIsRegistering(false)} />;
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#f8fafc',
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 0 20px rgba(179, 0, 38, 0.4), 0 0 40px rgba(179, 0, 38, 0.2), 0 0 60px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(179, 0, 38, 0.3)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img 
            src="/utp-logo.png" 
            alt="UTP Logo" 
            style={{ height: '60px', marginBottom: '24px', objectFit: 'contain' }}
          />
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px', letterSpacing: '-0.5px' }}>
            UTP-CALENDAR
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Planificación y Disponibilidad Inteligente
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fca5a5',
            color: '#dc2626',
            padding: '12px',
            borderRadius: '10px',
            marginBottom: '20px',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ color: '#334155', fontWeight: 600 }}>Correo Electrónico Institucional</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '16px', top: '13px', color: '#94a3b8' }} />
              <input
                type="email"
                className="form-input"
                style={{ 
                  paddingLeft: '48px', 
                  backgroundColor: '#f8fafc', 
                  borderColor: '#cbd5e1', 
                  color: '#0f172a',
                  height: '46px',
                  boxShadow: 'inset 0 0 5px rgba(0,0,0,0.05)',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 10px rgba(179, 0, 38, 0.3), inset 0 0 5px rgba(0,0,0,0.05)';
                  e.currentTarget.style.borderColor = '#B30026';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.boxShadow = 'inset 0 0 5px rgba(0,0,0,0.05)';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@utp.edu.pe"
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label" style={{ color: '#334155', fontWeight: 600 }}>Contraseña</label>
            <div style={{ position: 'relative' }}>
              <Key size={18} style={{ position: 'absolute', left: '16px', top: '13px', color: '#94a3b8' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                style={{ 
                  paddingLeft: '48px', 
                  paddingRight: '48px',
                  backgroundColor: '#f8fafc', 
                  borderColor: '#cbd5e1', 
                  color: '#0f172a',
                  height: '46px',
                  boxShadow: 'inset 0 0 5px rgba(0,0,0,0.05)',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 10px rgba(179, 0, 38, 0.3), inset 0 0 5px rgba(0,0,0,0.05)';
                  e.currentTarget.style.borderColor = '#B30026';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.boxShadow = 'inset 0 0 5px rgba(0,0,0,0.05)';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '13px',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: '#94a3b8'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn"
            style={{ 
              width: '100%', 
              padding: '14px', 
              fontSize: '1rem',
              backgroundColor: '#B30026', // UTP Red
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.8 : 1,
              boxShadow: '0 4px 15px rgba(179, 0, 38, 0.4)',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(179, 0, 38, 0.6)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseOut={(e) => {
              if (!loading) {
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(179, 0, 38, 0.4)';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
            disabled={loading}
          >
            {loading ? 'Iniciando sesión...' : 'Ingresar a UTP-CALENDAR'}
          </button>
        </form>

        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '12px' }}>¿Eres un Jefe de Área nuevo?</p>
          <button
            onClick={() => setIsRegistering(true)}
            className="btn"
            style={{
              width: '100%',
              padding: '12px',
              background: '#ffffff',
              border: '1px solid #111827', // Black border
              color: '#111827', // Black text
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
          >
            Crear Perfil y Asignar Color
          </button>
        </div>
      </div>
    </div>
  );
};



