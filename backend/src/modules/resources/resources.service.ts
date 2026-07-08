import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class ResourcesService {
  constructor(private readonly prisma: PrismaService) {}

  // --- CATEGORÍAS ---
  async createCategory(createCategoryDto: CreateCategoryDto) {
    const existing = await this.prisma.resourceCategory.findUnique({
      where: { name: createCategoryDto.name },
    });
    if (existing) {
      throw new BadRequestException(`Ya existe una categoría de recurso con el nombre: ${createCategoryDto.name}`);
    }
    return this.prisma.resourceCategory.create({
      data: createCategoryDto,
    });
  }

  async findAllCategories() {
    return this.prisma.resourceCategory.findMany({
      include: { _count: { select: { resources: true } } },
    });
  }

  // --- RECURSOS ---
  async create(createResourceDto: CreateResourceDto) {
    const category = await this.prisma.resourceCategory.findUnique({
      where: { id: createResourceDto.categoryId },
    });
    if (!category) {
      throw new NotFoundException(`La categoría de recurso con ID ${createResourceDto.categoryId} no existe.`);
    }

    if (createResourceDto.areaId) {
      const area = await this.prisma.area.findUnique({
        where: { id: createResourceDto.areaId },
      });
      if (!area) {
        throw new NotFoundException(`El área con ID ${createResourceDto.areaId} no existe.`);
      }
    }

    return this.prisma.resource.create({
      data: {
        ...createResourceDto,
        metadata: createResourceDto.metadata || '{}',
      },
    });
  }

  async findAll() {
    return this.prisma.resource.findMany({
      include: {
        category: true,
        area: { select: { id: true, name: true, color: true } },
      },
    });
  }

  async findOne(id: string) {
    const resource = await this.prisma.resource.findUnique({
      where: { id },
      include: {
        category: true,
        area: { select: { id: true, name: true, color: true } },
        reservations: {
          orderBy: { reservedFrom: 'asc' },
        },
      },
    });
    if (!resource) {
      throw new NotFoundException(`El recurso con ID ${id} no fue encontrado.`);
    }
    return resource;
  }

  async update(id: string, updateResourceDto: UpdateResourceDto) {
    await this.findOne(id);

    if (updateResourceDto.categoryId) {
      const category = await this.prisma.resourceCategory.findUnique({
        where: { id: updateResourceDto.categoryId },
      });
      if (!category) {
        throw new NotFoundException(`La categoría de recurso con ID ${updateResourceDto.categoryId} no existe.`);
      }
    }

    if (updateResourceDto.areaId) {
      const area = await this.prisma.area.findUnique({
        where: { id: updateResourceDto.areaId },
      });
      if (!area) {
        throw new NotFoundException(`El área con ID ${updateResourceDto.areaId} no existe.`);
      }
    }

    return this.prisma.resource.update({
      where: { id },
      data: updateResourceDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.resource.delete({
      where: { id },
    });
  }

  // --- CHEQUEO DE DISPONIBILIDAD ---
  async checkAvailability(resourceId: string, from: Date, to: Date, excludeEventId?: string): Promise<boolean> {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
    });
    if (!resource || resource.status !== 'AVAILABLE') {
      return false;
    }

    // Buscar reservas colisionantes
    // (reservedFrom < to) AND (reservedTo > from) AND status != REJECTED
    const conflicts = await this.prisma.eventResourceReservation.findMany({
      where: {
        resourceId,
        status: { not: 'REJECTED' },
        eventId: excludeEventId ? { not: excludeEventId } : undefined,
        AND: [
          { reservedFrom: { lt: to } },
          { reservedTo: { gt: from } },
        ],
      },
    });

    return conflicts.length === 0;
  }
}
