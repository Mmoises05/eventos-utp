import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { AreasService } from './areas.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';

@Controller('areas')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AreasController {
  constructor(private readonly areasService: AreasService) {}

  @Post()
  @RequirePermission('areas', 'create')
  create(@Body() createAreaDto: CreateAreaDto) {
    return this.areasService.create(createAreaDto);
  }

  @Get()
  @RequirePermission('areas', 'read')
  findAll() {
    return this.areasService.findAll();
  }

  @Get('tree')
  @RequirePermission('areas', 'read')
  findTree() {
    return this.areasService.findTree();
  }

  @Get(':id')
  @RequirePermission('areas', 'read')
  findOne(@Param('id') id: string) {
    return this.areasService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('areas', 'update')
  update(@Param('id') id: string, @Body() updateAreaDto: UpdateAreaDto) {
    return this.areasService.update(id, updateAreaDto);
  }

  @Delete(':id')
  @RequirePermission('areas', 'delete')
  remove(@Param('id') id: string) {
    return this.areasService.remove(id);
  }
}
