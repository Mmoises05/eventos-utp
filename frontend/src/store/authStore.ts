import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  area: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setAccessToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>((set: any) => ({
  user: localStorage.getItem('sici_user') 
    ? JSON.parse(localStorage.getItem('sici_user')!) 
    : null,
  accessToken: localStorage.getItem('sici_access_token') || null,
  refreshToken: localStorage.getItem('sici_refresh_token') || null,

  login: (user: User, accessToken: string, refreshToken: string) => {
    localStorage.setItem('sici_user', JSON.stringify(user));
    localStorage.setItem('sici_access_token', accessToken);
    localStorage.setItem('sici_refresh_token', refreshToken);
    set({ user, accessToken, refreshToken });
  },

  logout: () => {
    localStorage.removeItem('sici_user');
    localStorage.removeItem('sici_access_token');
    localStorage.removeItem('sici_refresh_token');
    set({ user: null, accessToken: null, refreshToken: null });
  },

  setAccessToken: (accessToken: string) => {
    localStorage.setItem('sici_access_token', accessToken);
    set({ accessToken });
  },
}));
