import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Req } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { Audit } from '../../common/decorators/audit.decorator';

@Controller('events')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @RequirePermission('events', 'create')
  @Audit('CREATE_EVENT', 'EVENTS')
  create(@Body() createEventDto: CreateEventDto, @Req() req: any) {
    return this.eventsService.create(createEventDto, req.user.id);
  }

  @Get()
  @RequirePermission('events', 'read')
  findAll(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('areaId') areaId?: string,
  ) {
    return this.eventsService.findAll(from, to, areaId);
  }

  @Get(':id')
  @RequirePermission('events', 'read')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('events', 'update')
  @Audit('UPDATE_EVENT', 'EVENTS')
  update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto, @Req() req: any) {
    return this.eventsService.update(id, updateEventDto, req.user.id);
  }

  @Delete(':id')
  @RequirePermission('events', 'delete')
  @Audit('DELETE_EVENT', 'EVENTS')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.eventsService.remove(id, req.user.id);
  }
}
