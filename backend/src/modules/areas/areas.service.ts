import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';

@Injectable()
export class AreasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createAreaDto: CreateAreaDto) {
    // Verificar si ya existe un área con el mismo nombre
    const existing = await this.prisma.area.findUnique({
      where: { name: createAreaDto.name },
    });
    if (existing) {
      throw new BadRequestException(`Ya existe un área con el nombre: ${createAreaDto.name}`);
    }

    // Si se especifica un área padre, verificar que exista
    if (createAreaDto.parentAreaId) {
      const parent = await this.prisma.area.findUnique({
        where: { id: createAreaDto.parentAreaId },
      });
      if (!parent) {
        throw new NotFoundException(`El área padre con ID ${createAreaDto.parentAreaId} no existe.`);
      }
    }

    return this.prisma.area.create({
      data: createAreaDto,
    });
  }

  async findAll() {
    return this.prisma.area.findMany({
      include: {
        parentArea: {
          select: { id: true, name: true },
        },
        subAreas: {
          select: { id: true, name: true, color: true },
        },
      },
    });
  }

  async findTree() {
    // Devuelve solo las áreas raíz (sin padre) cargando sus subáreas de manera recursiva
    const roots = await this.prisma.area.findMany({
      where: { parentAreaId: null },
      include: {
        subAreas: {
          include: {
            subAreas: true, // Soporte hasta 3 niveles en consulta directa. Para más niveles se usaría ordenación en memoria.
          },
        },
      },
    });
    return roots;
  }

  async findOne(id: string) {
    const area = await this.prisma.area.findUnique({
      where: { id },
      include: {
        parentArea: true,
        subAreas: true,
        users: {
          select: { id: true, name: true, email: true, status: true },
        },
        resources: true,
      },
    });
    if (!area) {
      throw new NotFoundException(`El área con ID ${id} no fue encontrada.`);
    }
    return area;
  }

  async update(id: string, updateAreaDto: UpdateAreaDto) {
    // Validar existencia
    await this.findOne(id);

    if (updateAreaDto.name) {
      const existingName = await this.prisma.area.findFirst({
        where: {
          name: updateAreaDto.name,
          id: { not: id },
        },
      });
      if (existingName) {
        throw new BadRequestException(`Ya existe otra área con el nombre: ${updateAreaDto.name}`);
      }
    }

    if (updateAreaDto.parentAreaId) {
      if (updateAreaDto.parentAreaId === id) {
        throw new BadRequestException('Un área no puede ser su propio padre.');
      }
      const parent = await this.prisma.area.findUnique({
        where: { id: updateAreaDto.parentAreaId },
      });
      if (!parent) {
        throw new NotFoundException(`El área padre con ID ${updateAreaDto.parentAreaId} no existe.`);
      }
    }

    return this.prisma.area.update({
      where: { id },
      data: updateAreaDto,
    });
  }

  async remove(id: string) {
    const area = await this.findOne(id);

    // No permitir eliminar si tiene subáreas
    if (area.subAreas.length > 0) {
      throw new BadRequestException('No se puede eliminar un área que contiene subáreas activas.');
    }

    // No permitir eliminar si tiene usuarios asociados
    if (area.users.length > 0) {
      throw new BadRequestException('No se puede eliminar un área que contiene usuarios asociados.');
    }

    return this.prisma.area.delete({
      where: { id },
    });
  }
}
