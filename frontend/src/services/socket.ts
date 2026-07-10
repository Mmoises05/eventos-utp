import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

class SocketService {
  private socket: Socket | null = null;

  connect() {
    const { accessToken } = useAuthStore.getState();
    if (!accessToken) return;

    if (this.socket) {
      this.socket.disconnect();
    }

    const SOCKET_URL = import.meta.env.PROD ? '' : 'http://localhost:4000';
    this.socket = io(`${SOCKET_URL}/realtime`, {
      query: { token: accessToken },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('🔌 Conectado a WebSockets en el namespace /realtime');
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Desconectado de WebSockets');
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on(event, callback);
  }

  off(event: string, callback?: (data: any) => void) {
    if (!this.socket) return;
    this.socket.off(event, callback);
  }

  emit(event: string, data: any) {
    if (!this.socket) return;
    this.socket.emit(event, data);
  }
}

export const socketService = new SocketService();
