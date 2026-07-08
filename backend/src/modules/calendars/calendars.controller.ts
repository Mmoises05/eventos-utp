import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Res } from '@nestjs/common';
import { CalendarsService } from './calendars.service';
import { CreateCalendarDto } from './dto/create-calendar.dto';
import { UpdateCalendarDto } from './dto/update-calendar.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';

@Controller('calendars')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CalendarsController {
  constructor(private readonly calendarsService: CalendarsService) {}

  @Post()
  @RequirePermission('calendars', 'create')
  create(@Body() createCalendarDto: CreateCalendarDto) {
    return this.calendarsService.create(createCalendarDto);
  }

  @Get()
  @RequirePermission('calendars', 'read')
  findAll() {
    return this.calendarsService.findAll();
  }

  @Get('my-calendars')
  findMyCalendars(@Req() req: any) {
    // Retorna los calendarios visibles para el usuario autenticado actual
    return this.calendarsService.findByUserId(req.user.id);
  }

  @Get('user/:userId')
  @RequirePermission('calendars', 'read')
  findByUserId(@Param('userId') userId: string) {
    return this.calendarsService.findByUserId(userId);
  }

  @Get(':id')
  @RequirePermission('calendars', 'read')
  findOne(@Param('id') id: string) {
    return this.calendarsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('calendars', 'update')
  update(@Param('id') id: string, @Body() updateCalendarDto: UpdateCalendarDto) {
    return this.calendarsService.update(id, updateCalendarDto);
  }

  @Delete(':id')
  @RequirePermission('calendars', 'delete')
  remove(@Param('id') id: string) {
    return this.calendarsService.remove(id);
  }

  @Get(':id/export')
  @RequirePermission('calendars', 'read')
  async exportCalendar(@Param('id') id: string, @Res() res: any) {
    const icsContent = await this.calendarsService.exportToIcs(id);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="calendar-${id}.ics"`);
    res.status(200).send(icsContent);
  }
}
