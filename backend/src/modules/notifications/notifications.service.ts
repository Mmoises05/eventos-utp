import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async create(userId: string, title: string, message: string, type: string, link?: string) {
    // 1. Guardar en la Base de Datos
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        link,
      },
    });

    // 2. Transmitir en tiempo real al usuario específico vía WebSocket
    this.gateway.sendToUser(userId, 'notification:new', notification);

    return notification;
  }

  async findAllForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) {
      throw new NotFoundException('Notificación no encontrada o no pertenece al usuario.');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  // Métodos puente para emitir eventos del calendario en tiempo real
  notifyEventCreated(event: any) {
    this.gateway.sendToAll('event:created', event);
  }

  notifyEventUpdated(event: any) {
    this.gateway.sendToAll('event:updated', event);
  }

  notifyEventCancelled(eventId: string) {
    this.gateway.sendToAll('event:cancelled', { eventId });
  }
}
