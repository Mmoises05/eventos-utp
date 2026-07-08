import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { SchedulerService, ScoredSlot } from './scheduler.service';
import { OptimizeScheduleDto } from './dto/optimize-schedule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';

@Controller('scheduler')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Post('optimize')
  @RequirePermission('events', 'create')
  optimize(@Body() dto: OptimizeScheduleDto): Promise<ScoredSlot[]> {
    return this.schedulerService.findOptimalSlots(dto);
  }
}
