import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { ResourcesService } from '../resources/resources.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resourcesService: ResourcesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(createEventDto: CreateEventDto, organizerId: string) {
    const start = new Date(createEventDto.startTime);
    const end = new Date(createEventDto.endTime);

    if (start >= end) {
      throw new BadRequestException('La fecha de inicio debe ser anterior a la de fin.');
    }

    const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

    // 1. Validar que el área y responsable existan
    const area = await this.prisma.area.findUnique({ where: { id: createEventDto.areaId } });
    if (!area) throw new NotFoundException('Área no encontrada.');

    const responsible = await this.prisma.user.findUnique({ where: { id: createEventDto.responsibleId } });
    if (!responsible) throw new NotFoundException('Usuario responsable no encontrado.');

    // 2. Validar disponibilidad de recursos (salas, vehículos)
    if (createEventDto.resourceIds && createEventDto.resourceIds.length > 0) {
      for (const resId of createEventDto.resourceIds) {
        const isAvailable = await this.resourcesService.checkAvailability(resId, start, end);
        if (!isAvailable) {
          const res = await this.prisma.resource.findUnique({ where: { id: resId } });
          throw new BadRequestException(`El recurso "${res?.name || resId}" ya está reservado en este horario.`);
        }
      }
    }

    // 2.5 Validar disponibilidad de usuarios involucrados
    const involvedUserIds = [...new Set([organizerId, createEventDto.responsibleId, ...(createEventDto.participantIds || [])])].filter(Boolean);

    for (const uId of involvedUserIds) {
      const overlappingEvent = await this.prisma.eventParticipant.findFirst({
        where: {
          userId: uId,
          event: {
            status: { not: 'CANCELLED' },
            startTime: { lt: end },
            endTime: { gt: start },
          }
        },
        include: { event: true, user: true }
      });

      if (overlappingEvent) {
        throw new BadRequestException(`Cruce de Agenda: El usuario ${overlappingEvent.user.name} ya tiene programado "${overlappingEvent.event.title}" en este horario.`);
      }
    }

    const organizerUser = await this.prisma.user.findUnique({ where: { id: organizerId } });

    // 3. Crear el evento en una transacción
    const event = await this.prisma.$transaction(async (tx) => {
      const newEvent = await tx.event.create({
        data: {
          title: createEventDto.title,
          description: createEventDto.description,
          type: createEventDto.type || 'REUNION',
          priority: createEventDto.priority || 'MEDIUM',
          status: 'APPROVED', // Autoconfirmado para agilizar pruebas
          startTime: start,
          endTime: end,
          durationMinutes,
          color: createEventDto.color || organizerUser?.color || '#3B82F6',
          isRecurring: createEventDto.isRecurring || false,
          recurrenceRule: createEventDto.recurrenceRule,
          areaId: createEventDto.areaId,
          responsibleId: createEventDto.responsibleId,
          organizerId,
          location: createEventDto.location,
          tags: JSON.stringify(createEventDto.tags || []),
          notes: createEventDto.notes,
        },
      });

      // Crear reservas de recursos
      if (createEventDto.resourceIds) {
        for (const resId of createEventDto.resourceIds) {
          await tx.eventResourceReservation.create({
            data: {
              eventId: newEvent.id,
              resourceId: resId,
              status: 'APPROVED',
              reservedFrom: start,
              reservedTo: end,
            },
          });
        }
      }

      // Crear participantes (el organizador es agregado automáticamente)
      await tx.eventParticipant.create({
        data: {
          eventId: newEvent.id,
          userId: organizerId,
          role: 'ORGANIZER',
          status: 'ACCEPTED',
        },
      });

      // Agregar otros participantes
      if (createEventDto.participantIds) {
        for (const pId of createEventDto.participantIds) {
          if (pId !== organizerId) {
            await tx.eventParticipant.create({
              data: {
                eventId: newEvent.id,
                userId: pId,
                role: 'REQUIRED',
                status: 'PENDING',
              },
            });
          }
        }
      }

      // Crear historial
      await tx.eventHistory.create({
        data: {
          eventId: newEvent.id,
          userId: organizerId,
          action: 'CREAR',
          changes: JSON.stringify({ nuevo: newEvent }),
        },
      });

      return newEvent;
    });

    const result = await this.findOne(event.id);
    this.notificationsService.notifyEventCreated(result);

    if (createEventDto.participantIds) {
      for (const pId of createEventDto.participantIds) {
        if (pId !== organizerId) {
          await this.notificationsService.create(
            pId,
            'Nueva invitación a evento',
            `Has sido invitado al evento "${createEventDto.title}" por ${result.organizer.name}.`,
            'INVITATION_RECEIVED',
            `/calendar?event=${event.id}`
          );
        }
      }
    }

    return result;
  }

  async findAll(from?: string, to?: string, areaId?: string) {
    const where: any = {};
    if (from && to) {
      where.startTime = { gte: new Date(from) };
      where.endTime = { lte: new Date(to) };
    }
    if (areaId) {
      where.areaId = areaId;
    }

    return this.prisma.event.findMany({
      where,
      include: {
        area: { select: { id: true, name: true, color: true } },
        responsible: { select: { id: true, name: true, email: true } },
        organizer: { select: { id: true, name: true, email: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        reservations: {
          include: {
            resource: { select: { id: true, name: true, category: true } },
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        area: { select: { id: true, name: true, color: true } },
        responsible: { select: { id: true, name: true, email: true } },
        organizer: { select: { id: true, name: true, email: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        reservations: {
          include: {
            resource: { select: { id: true, name: true, category: true } },
          },
        },
        history: true,
      },
    });
    if (!event) throw new NotFoundException(`El evento con ID ${id} no existe.`);
    return event;
  }

  async update(id: string, updateEventDto: UpdateEventDto, userId: string) {
    const event = await this.findOne(id);
    const start = updateEventDto.startTime ? new Date(updateEventDto.startTime) : event.startTime;
    const end = updateEventDto.endTime ? new Date(updateEventDto.endTime) : event.endTime;

    if (start >= end) {
      throw new BadRequestException('La fecha de inicio debe ser anterior a la de fin.');
    }

    const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

    // Validar disponibilidad de recursos si cambian horas o recursos
    if (updateEventDto.resourceIds) {
      for (const resId of updateEventDto.resourceIds) {
        const isAvailable = await this.resourcesService.checkAvailability(resId, start, end, id);
        if (!isAvailable) {
          const res = await this.prisma.resource.findUnique({ where: { id: resId } });
          throw new BadRequestException(`El recurso "${res?.name || resId}" ya está reservado en este horario.`);
        }
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedEvent = await tx.event.update({
        where: { id },
        data: {
          title: updateEventDto.title,
          description: updateEventDto.description,
          type: updateEventDto.type,
          priority: updateEventDto.priority,
          startTime: start,
          endTime: end,
          durationMinutes,
          areaId: updateEventDto.areaId,
          responsibleId: updateEventDto.responsibleId,
          location: updateEventDto.location,
          color: updateEventDto.color,
          tags: updateEventDto.tags ? JSON.stringify(updateEventDto.tags) : undefined,
          notes: updateEventDto.notes,
          status: updateEventDto.status,
        },
      });

      // Si cambian recursos, borrar los anteriores y crear nuevos
      if (updateEventDto.resourceIds) {
        await tx.eventResourceReservation.deleteMany({ where: { eventId: id } });
        for (const resId of updateEventDto.resourceIds) {
          await tx.eventResourceReservation.create({
            data: {
              eventId: id,
              resourceId: resId,
              status: 'APPROVED',
              reservedFrom: start,
              reservedTo: end,
            },
          });
        }
      }

      // Si cambian participantes, actualizar
      if (updateEventDto.participantIds) {
        const organizerParticipant = event.participants.find(p => p.role === 'ORGANIZER');
        
        await tx.eventParticipant.deleteMany({
          where: {
            eventId: id,
            role: { not: 'ORGANIZER' },
          },
        });

        for (const pId of updateEventDto.participantIds) {
          if (pId !== organizerParticipant?.userId) {
            await tx.eventParticipant.create({
              data: {
                eventId: id,
                userId: pId,
                role: 'REQUIRED',
                status: 'PENDING',
              },
            });
          }
        }
      }

      // Guardar historial
      await tx.eventHistory.create({
        data: {
          eventId: id,
          userId,
          action: 'MODIFICAR',
          changes: JSON.stringify({ antes: event, despues: updatedEvent }),
        },
      });

      return updatedEvent;
    });

    const result = await this.findOne(id);
    this.notificationsService.notifyEventUpdated(result);

    for (const p of result.participants) {
      if (p.userId !== userId) {
        await this.notificationsService.create(
          p.userId,
          'Evento actualizado',
          `El evento "${result.title}" ha sido actualizado.`,
          'EVENT_UPDATED',
          `/calendar?event=${id}`
        );
      }
    }

    return result;
  }

  async remove(id: string, userId: string) {
    const event = await this.findOne(id);
    await this.prisma.$transaction(async (tx) => {
      // Eliminar dependencias primero
      await tx.eventParticipant.deleteMany({ where: { eventId: id } });
      await tx.eventResourceReservation.deleteMany({ where: { eventId: id } });
      await tx.eventHistory.deleteMany({ where: { eventId: id } });
      await tx.event.delete({
        where: { id },
      });
    });

    this.notificationsService.notifyEventCancelled(id);

    for (const p of event.participants) {
      if (p.userId !== userId) {
        await this.notificationsService.create(
          p.userId,
          'Evento cancelado',
          `El evento "${event.title}" ha sido cancelado.`,
          'EVENT_CANCELLED'
        );
      }
    }
  }
}
