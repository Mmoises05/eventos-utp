import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCalendarDto } from './dto/create-calendar.dto';
import { UpdateCalendarDto } from './dto/update-calendar.dto';

@Injectable()
export class CalendarsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCalendarDto: CreateCalendarDto) {
    if (createCalendarDto.type === 'USER' && !createCalendarDto.ownerUserId) {
      throw new BadRequestException('Un calendario de tipo USER debe tener un ownerUserId.');
    }
    if (createCalendarDto.type === 'AREA' && !createCalendarDto.ownerAreaId) {
      throw new BadRequestException('Un calendario de tipo AREA debe tener un ownerAreaId.');
    }

    return this.prisma.calendar.create({
      data: createCalendarDto,
    });
  }

  async findAll() {
    return this.prisma.calendar.findMany({
      include: {
        ownerUser: { select: { id: true, name: true, email: true } },
        ownerArea: { select: { id: true, name: true, color: true } },
      },
    });
  }

  async findOne(id: string) {
    const calendar = await this.prisma.calendar.findUnique({
      where: { id },
      include: {
        ownerUser: { select: { id: true, name: true, email: true } },
        ownerArea: { select: { id: true, name: true, color: true } },
      },
    });
    if (!calendar) {
      throw new NotFoundException(`El calendario con ID ${id} no existe.`);
    }
    return calendar;
  }

  async findByUserId(userId: string) {
    // Retorna calendarios visibles para el usuario:
    // 1. Su propio calendario personal.
    // 2. El calendario de su área.
    // 3. El calendario institucional.
    // 4. El calendario global (feriados).
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    return this.prisma.calendar.findMany({
      where: {
        OR: [
          { ownerUserId: userId },
          { ownerAreaId: user.areaId },
          { type: 'INSTITUTIONAL' },
          { type: 'GLOBAL' },
        ],
      },
    });
  }

  async update(id: string, updateCalendarDto: UpdateCalendarDto) {
    await this.findOne(id);
    return this.prisma.calendar.update({
      where: { id },
      data: updateCalendarDto,
    });
  }

  async remove(id: string) {
    const calendar = await this.findOne(id);
    if (calendar.type === 'INSTITUTIONAL' || calendar.type === 'GLOBAL') {
      throw new BadRequestException('No se permite eliminar los calendarios institucionales o globales por defecto.');
    }
    return this.prisma.calendar.delete({
      where: { id },
    });
  }

  async exportToIcs(calendarId: string): Promise<string> {
    const calendar = await this.findOne(calendarId);

    const where: any = {};
    if (calendar.type === 'USER') {
      where.organizerId = calendar.ownerUserId;
    } else if (calendar.type === 'AREA') {
      where.areaId = calendar.ownerAreaId;
    }

    const events = await this.prisma.event.findMany({
      where,
      include: {
        responsible: true,
      },
    });

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SICI UTP//NONSGML Calendar//ES',
      'CALSCALE:GREGORIAN',
      `X-WR-CALNAME:${calendar.name}`,
    ].join('\r\n') + '\r\n';

    for (const ev of events) {
      const dtStart = ev.startTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const dtEnd = ev.endTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const dtStamp = ev.createdAt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      icsContent += [
        'BEGIN:VEVENT',
        `UID:${ev.id}@sici.edu`,
        `DTSTAMP:${dtStamp}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${ev.title}`,
        `DESCRIPTION:${ev.description || ''}`,
        `LOCATION:${ev.location || 'UTP'}`,
        `ORGANIZER;CN=${ev.responsible?.name}:mailto:${ev.responsible?.email}`,
        'END:VEVENT',
      ].join('\r\n') + '\r\n';
    }

    icsContent += 'END:VCALENDAR\r\n';
    return icsContent;
  }
}
