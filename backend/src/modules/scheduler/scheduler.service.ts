import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OptimizeScheduleDto } from './dto/optimize-schedule.dto';

interface TimeInterval {
  start: Date;
  end: Date;
}

export interface ScoredSlot {
  start: string;
  end: string;
  score: number;
  conflicts: string[];
  availabilityPercentage: number;
}

@Injectable()
export class SchedulerService {
  constructor(private readonly prisma: PrismaService) {}

  async findOptimalSlots(dto: OptimizeScheduleDto): Promise<ScoredSlot[]> {
    const windowStart = new Date(dto.searchWindowStart);
    const windowEnd = new Date(dto.searchWindowEnd);

    if (windowStart >= windowEnd) {
      throw new BadRequestException('El inicio de la ventana de búsqueda debe ser anterior al fin.');
    }

    // 1. Obtener eventos y reservas ocupadas para los usuarios obligatorios y recursos
    const userEvents = await this.prisma.eventParticipant.findMany({
      where: {
        userId: { in: dto.mandatoryUserIds },
        status: { in: ['ACCEPTED', 'PENDING'] }, // Bloqueamos también si está pendiente
        event: {
          startTime: { lt: windowEnd },
          endTime: { gt: windowStart },
          status: { notIn: ['CANCELLED', 'REJECTED'] },
        },
      },
      include: {
        event: {
          select: { id: true, title: true, startTime: true, endTime: true },
        },
        user: { select: { id: true, name: true } },
      },
    });

    const resourceReservations = await this.prisma.eventResourceReservation.findMany({
      where: {
        resourceId: { in: dto.requiredResourceIds || [] },
        status: { not: 'REJECTED' },
        reservedFrom: { lt: windowEnd },
        reservedTo: { gt: windowStart },
      },
      include: {
        resource: { select: { id: true, name: true } },
      },
    });

    // Eventos de usuarios opcionales para calcular penalizaciones de puntuación
    const optionalUserEvents = dto.optionalUserIds && dto.optionalUserIds.length > 0
      ? await this.prisma.eventParticipant.findMany({
          where: {
            userId: { in: dto.optionalUserIds },
            status: { in: ['ACCEPTED', 'PENDING'] },
            event: {
              startTime: { lt: windowEnd },
              endTime: { gt: windowStart },
              status: { notIn: ['CANCELLED', 'REJECTED'] },
            },
          },
          include: {
            event: { select: { startTime: true, endTime: true } },
            user: { select: { id: true, name: true } },
          },
        })
      : [];

    // 2. Discretizar el tiempo en bloques de 30 minutos
    const timeGrid: TimeInterval[] = [];
    const stepMs = 30 * 60 * 1000; // 30 minutos
    let currentMs = windowStart.getTime();

    // Redondear al bloque de 30 min más cercano
    currentMs = Math.ceil(currentMs / stepMs) * stepMs;

    while (currentMs + stepMs <= windowEnd.getTime()) {
      timeGrid.push({
        start: new Date(currentMs),
        end: new Date(currentMs + stepMs),
      });
      currentMs += stepMs;
    }

    const proposedSlots: ScoredSlot[] = [];
    const stepsNeeded = Math.ceil(dto.durationMinutes / 30);

    // 3. Evaluar bloques contiguos de tamaño 'stepsNeeded'
    for (let i = 0; i <= timeGrid.length - stepsNeeded; i++) {
      const candidateStart = timeGrid[i].start;
      const candidateEnd = timeGrid[i + stepsNeeded - 1].end;

      // Restricción dura: Horas laborables (8 AM - 6 PM) y no fines de semana
      const startHour = candidateStart.getHours();
      const endHour = candidateEnd.getHours();
      const dayOfWeek = candidateStart.getDay(); // 0 = Domingo, 6 = Sábado

      if (startHour < 8 || endHour > 18 || dayOfWeek === 0 || dayOfWeek === 6) {
        continue; // Fuera del horario institucional
      }

      const conflicts: string[] = [];
      let mandatoryBusyCount = 0;

      // Verificar colisiones de usuarios obligatorios
      for (const ue of userEvents) {
        const evStart = new Date(ue.event.startTime);
        const evEnd = new Date(ue.event.endTime);
        if (evStart < candidateEnd && evEnd > candidateStart) {
          conflicts.push(`Usuario obligatorio ocupado: ${ue.user.name} en "${ue.event.title}"`);
          mandatoryBusyCount++;
        }
      }

      // Verificar colisiones de recursos requeridos
      for (const rr of resourceReservations) {
        const resStart = new Date(rr.reservedFrom);
        const resEnd = new Date(rr.reservedTo);
        if (resStart < candidateEnd && resEnd > candidateStart) {
          conflicts.push(`Recurso no disponible: ${rr.resource.name}`);
          mandatoryBusyCount++;
        }
      }

      // Calcular porcentaje de disponibilidad
      const totalRequired = dto.mandatoryUserIds.length + (dto.requiredResourceIds?.length || 0);
      const busyCount = mandatoryBusyCount;
      const availabilityPercentage = totalRequired > 0
        ? Math.max(0, Math.round(((totalRequired - busyCount) / totalRequired) * 100))
        : 100;

      // Si hay colisiones de elementos obligatorios, no sugerir este bloque como "óptimo" directo,
      // pero lo evaluamos si al final el porcentaje de disponibilidad es aceptable (por ejemplo, > 70% si no hay nada perfecto)
      let score = 100;

      // Penalizaciones / Ajuste de puntuación (Restricciones blandas)
      if (startHour >= 13 && startHour < 15) score -= 15; // Almuerzo
      if (startHour >= 17) score -= 20; // Tarde/Cierre

      // Sumar puntos si es en la mañana preferencial (9 AM - 12 PM)
      if (startHour >= 9 && startHour < 12) score += 10;

      // Evaluar opcionales
      let optionalConflictsCount = 0;
      for (const oe of optionalUserEvents) {
        const evStart = new Date(oe.event.startTime);
        const evEnd = new Date(oe.event.endTime);
        if (evStart < candidateEnd && evEnd > candidateStart) {
          score -= 10; // Restar 10 puntos por opcional ocupado
          optionalConflictsCount++;
          conflicts.push(`Usuario opcional ocupado: ${oe.user.name}`);
        }
      }

      proposedSlots.push({
        start: candidateStart.toISOString(),
        end: candidateEnd.toISOString(),
        score: Math.max(0, score),
        conflicts,
        availabilityPercentage,
      });
    }

    // 4. Filtrar y ordenar opciones
    // Separamos slots sin conflictos obligatorios de los que sí los tienen
    const perfectSlots = proposedSlots.filter((s) => s.availabilityPercentage === 100);

    if (perfectSlots.length > 0) {
      perfectSlots.sort((a, b) => b.score - a.score);
      return perfectSlots.slice(0, 5);
    }

    // Si no hay slots perfectos, ordenar todos por porcentaje de disponibilidad y luego por puntuación
    proposedSlots.sort((a, b) => {
      if (b.availabilityPercentage !== a.availabilityPercentage) {
        return b.availabilityPercentage - a.availabilityPercentage;
      }
      return b.score - a.score;
    });

    return proposedSlots.slice(0, 5);
  }
}
