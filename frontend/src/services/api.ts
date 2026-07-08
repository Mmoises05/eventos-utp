import { useAuthStore } from '../store/authStore';

const BASE_URL = 'http://localhost:4000/api/v1';

async function refreshTokens(): Promise<string | null> {
  const { refreshToken, user, login, logout } = useAuthStore.getState();
  if (!refreshToken || !user) return null;

  try {
    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken, userId: user.id }),
    });

    if (!response.ok) {
      logout();
      return null;
    }

    const data = await response.json();
    login(user, data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch (e) {
    logout();
    return null;
  }
}

export const api = {
  async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    let { accessToken } = useAuthStore.getState();

    const headers = new Headers(options.headers || {});
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const config = { ...options, headers };
    let response = await fetch(`${BASE_URL}${endpoint}`, config);

    // Si da 401 (Expirado), intentamos Refresh Token Rotation automáticamente
    if (response.status === 401) {
      const newAccessToken = await refreshTokens();
      if (newAccessToken) {
        headers.set('Authorization', `Bearer ${newAccessToken}`);
        response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
      }
    }

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.message || `Error en servidor: ${response.status}`);
    }

    if (response.status === 204) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  },

  get(endpoint: string) {
    return this.request(endpoint, { method: 'GET' });
  },

  post(endpoint: string, body: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  patch(endpoint: string, body: any) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  delete(endpoint: string) {
    return this.request(endpoint, { method: 'DELETE' });
  },
};
