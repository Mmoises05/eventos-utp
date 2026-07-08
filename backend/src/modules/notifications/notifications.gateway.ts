import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/realtime',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger('NotificationsGateway');

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.query.token as string;
      if (!token) {
        client.disconnect();
        return;
      }
      
      // Decodificar token para identificar usuario
      const payload = this.jwtService.decode(token) as any;
      if (!payload || !payload.sub) {
        client.disconnect();
        return;
      }

      const userId = payload.sub;
      const areaId = payload.areaId;

      // Unir al cliente a su sala individual, sala de área y sala global
      await client.join(`user:${userId}`);
      if (areaId) {
        await client.join(`area:${areaId}`);
      }
      await client.join('global');

      this.logger.log(`Cliente conectado: ${client.id} - Usuario: ${userId} - Área: ${areaId}`);
    } catch (e) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);
  }

  // Notificar a un usuario específico
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // Notificar a un área específica
  sendToArea(areaId: string, event: string, data: any) {
    this.server.to(`area:${areaId}`).emit(event, data);
  }

  // Notificar de manera global
  sendToAll(event: string, data: any) {
    this.server.to('global').emit(event, data);
  }
}
