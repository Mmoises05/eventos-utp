import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ResourcesService } from './resources.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';

@Controller('resources')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  // --- CATEGORÍAS ---
  @Post('categories')
  @RequirePermission('resources', 'create')
  createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.resourcesService.createCategory(createCategoryDto);
  }

  @Get('categories')
  @RequirePermission('resources', 'read')
  findAllCategories() {
    return this.resourcesService.findAllCategories();
  }

  // --- RECURSOS ---
  @Post()
  @RequirePermission('resources', 'create')
  create(@Body() createResourceDto: CreateResourceDto) {
    return this.resourcesService.create(createResourceDto);
  }

  @Get()
  @RequirePermission('resources', 'read')
  findAll() {
    return this.resourcesService.findAll();
  }

  @Post('check-availability')
  @RequirePermission('resources', 'read')
  async checkAvailability(
    @Body('resourceId') resourceId: string,
    @Body('from') fromStr: string,
    @Body('to') toStr: string,
    @Body('excludeEventId') excludeEventId?: string,
  ) {
    const from = new Date(fromStr);
    const to = new Date(toStr);
    const available = await this.resourcesService.checkAvailability(resourceId, from, to, excludeEventId);
    return { available };
  }

  @Get(':id')
  @RequirePermission('resources', 'read')
  findOne(@Param('id') id: string) {
    return this.resourcesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('resources', 'update')
  update(@Param('id') id: string, @Body() updateResourceDto: UpdateResourceDto) {
    return this.resourcesService.update(id, updateResourceDto);
  }

  @Delete(':id')
  @RequirePermission('resources', 'delete')
  remove(@Param('id') id: string) {
    return this.resourcesService.remove(id);
  }
}
