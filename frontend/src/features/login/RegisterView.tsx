import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Shield, Key, Mail, User, Briefcase, Camera, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface RegisterViewProps {
  onBack: () => void;
}

const PREDEFINED_AVATARS = [
  'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f600.svg', // 😀
  'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f60e.svg', // 😎
  'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f913.svg', // 🤓
  'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f929.svg', // 🤩
  'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f607.svg', // 😇
];

export const RegisterView: React.FC<RegisterViewProps> = ({ onBack }) => {
  const loginStore = useAuthStore((state: any) => state.login);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    position: '',
    avatarUrl: PREDEFINED_AVATARS[0],
    areaName: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, avatarUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!formData.areaName) {
      setError('Por favor, ingresa un área departamental.');
      setLoading(false);
      return;
    }

    try {
      await api.post('/auth/register', formData);
      setSuccessMsg('¡Usuario registrado exitosamente! Redirigiendo al login...');
      setTimeout(() => {
        onBack();
      }, 2500);
    } catch (err: any) {
      setError(err.message || 'Error al registrar el usuario.');
      setLoading(false);
    }
  };

  const inputStyle = {
    paddingLeft: '48px', 
    backgroundColor: '#f8fafc', 
    borderColor: '#cbd5e1', 
    color: '#0f172a',
    height: '46px',
    boxShadow: 'inset 0 0 5px rgba(0,0,0,0.05)',
    transition: 'all 0.3s ease',
    width: '100%',
    boxSizing: 'border-box' as const
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.boxShadow = '0 0 10px rgba(179, 0, 38, 0.3), inset 0 0 5px rgba(0,0,0,0.05)';
    e.currentTarget.style.borderColor = '#B30026';
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.boxShadow = 'inset 0 0 5px rgba(0,0,0,0.05)';
    e.currentTarget.style.borderColor = '#cbd5e1';
  };

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
        maxWidth: '540px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 0 20px rgba(179, 0, 38, 0.4), 0 0 40px rgba(179, 0, 38, 0.2), 0 0 60px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(179, 0, 38, 0.3)',
      }}>
        <button 
          onClick={onBack}
          style={{ 
            padding: '8px 12px', 
            marginBottom: '20px', 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            border: '1px solid #e2e8f0', 
            background: '#ffffff',
            borderRadius: '8px',
            color: '#475569',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
        >
          <ArrowLeft size={16} /> Volver
        </button>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img 
            src="/utp-logo.png" 
            alt="UTP Logo" 
            style={{ height: '50px', marginBottom: '20px', objectFit: 'contain' }}
          />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px', letterSpacing: '-0.5px' }}>
            Registro en UTP-CALENDAR
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Tu color distintivo será asignado automáticamente
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

        {successMsg && (
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#166534',
            padding: '12px',
            borderRadius: '10px',
            marginBottom: '20px',
            fontSize: '0.875rem',
            fontWeight: 500,
            textAlign: 'center'
          }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ color: '#334155', fontWeight: 600 }}>Elige o sube tu Avatar de Perfil</label>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
              {PREDEFINED_AVATARS.map((url, idx) => (
                <div 
                  key={idx}
                  onClick={() => setFormData({ ...formData, avatarUrl: url })}
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    border: formData.avatarUrl === url ? '3px solid #B30026' : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: formData.avatarUrl === url ? '0 0 15px rgba(179,0,38,0.4)' : 'none',
                    transform: formData.avatarUrl === url ? 'scale(1.1)' : 'scale(1)',
                    background: '#f1f5f9',
                    overflow: 'hidden'
                  }}
                >
                  <img src={url} alt={`Avatar ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
              
              {/* Custom Image Upload Button */}
              <label style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                border: formData.avatarUrl.startsWith('data:') ? '3px solid #B30026' : '2px dashed #cbd5e1',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: formData.avatarUrl.startsWith('data:') ? 'transparent' : '#f8fafc',
                boxShadow: formData.avatarUrl.startsWith('data:') ? '0 0 15px rgba(179,0,38,0.4)' : 'none',
                transform: formData.avatarUrl.startsWith('data:') ? 'scale(1.1)' : 'scale(1)',
                transition: 'all 0.2s ease',
                overflow: 'hidden',
                color: '#64748b'
              }}>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                {formData.avatarUrl.startsWith('data:') ? (
                  <img src={formData.avatarUrl} alt="Custom Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Camera size={24} />
                )}
              </label>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ color: '#334155', fontWeight: 600 }}>Nombre Completo</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '16px', top: '13px', color: '#94a3b8' }} />
              <input
                type="text"
                name="name"
                className="form-input"
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
                value={formData.name}
                onChange={handleChange}
                placeholder="Ej. Ing. Carlos Mendoza"
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ color: '#334155', fontWeight: 600 }}>Correo Electrónico Institucional</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '16px', top: '13px', color: '#94a3b8' }} />
              <input
                type="email"
                name="email"
                className="form-input"
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
                value={formData.email}
                onChange={handleChange}
                placeholder="ejemplo@utp.edu.pe"
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ color: '#334155', fontWeight: 600 }}>Cargo / Puesto</label>
              <div style={{ position: 'relative' }}>
                <Briefcase size={18} style={{ position: 'absolute', left: '16px', top: '13px', color: '#94a3b8' }} />
                <input
                  type="text"
                  name="position"
                  className="form-input"
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  value={formData.position}
                  onChange={handleChange}
                  placeholder="Jefe de Logística"
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ color: '#334155', fontWeight: 600 }}>Área Departamental</label>
              <div style={{ position: 'relative' }}>
                <Shield size={18} style={{ position: 'absolute', left: '16px', top: '13px', color: '#94a3b8' }} />
                <input
                  type="text"
                  name="areaName"
                  className="form-input"
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  value={formData.areaName}
                  onChange={handleChange}
                  placeholder="Ej. Dirección Académica"
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label" style={{ color: '#334155', fontWeight: 600 }}>Contraseña</label>
            <div style={{ position: 'relative' }}>
              <Key size={18} style={{ position: 'absolute', left: '16px', top: '13px', color: '#94a3b8' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                className="form-input"
                style={{ ...inputStyle, paddingRight: '48px' }}
                onFocus={handleFocus}
                onBlur={handleBlur}
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                minLength={6}
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
            {loading ? 'Creando perfil...' : 'Registrar Perfil y Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};
