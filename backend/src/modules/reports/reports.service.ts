import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getExecutiveStats() {
    const totalEvents = await this.prisma.event.count();
    const totalUsers = await this.prisma.user.count();
    const totalResources = await this.prisma.resource.count();

    const events = await this.prisma.event.findMany({
      include: { area: true },
    });

    const areaStats: Record<string, number> = {};
    events.forEach((ev) => {
      if (ev.area) {
        areaStats[ev.area.name] = (areaStats[ev.area.name] || 0) + 1;
      }
    });

    return {
      totalEvents,
      totalUsers,
      totalResources,
      eventsByArea: Object.entries(areaStats).map(([name, count]) => ({
        name,
        count,
      })),
    };
  }

  async exportEventsToCsv(): Promise<string> {
    const events = await this.prisma.event.findMany({
      include: {
        area: true,
        responsible: true,
      },
      orderBy: { startTime: 'asc' },
    });

    let csv = '\uFEFF'; // BOM UTF-8 para compatibilidad directa con Excel
    csv += 'ID,Título,Área,Responsable,Fecha de Inicio,Fecha de Fin,Duración (Min),Ubicación\n';

    for (const ev of events) {
      const row = [
        ev.id,
        `"${ev.title.replace(/"/g, '""')}"`,
        `"${ev.area?.name || ''}"`,
        `"${ev.responsible?.name || ''}"`,
        ev.startTime.toISOString(),
        ev.endTime.toISOString(),
        ev.durationMinutes,
        `"${ev.location || 'UTP'}"`,
      ].join(',');
      csv += row + '\n';
    }

    return csv;
  }
}
