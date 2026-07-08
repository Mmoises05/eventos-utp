import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    // Verificar si el correo ya existe
    const existing = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });
    if (existing) {
      throw new BadRequestException(`El correo electrónico ${createUserDto.email} ya está registrado.`);
    }

    // Verificar que el área exista
    const area = await this.prisma.area.findUnique({
      where: { id: createUserDto.areaId },
    });
    if (!area) {
      throw new NotFoundException(`El área con ID ${createUserDto.areaId} no existe.`);
    }

    // Verificar que el rol exista
    const role = await this.prisma.role.findUnique({
      where: { id: createUserDto.roleId },
    });
    if (!role) {
      throw new NotFoundException(`El rol con ID ${createUserDto.roleId} no existe.`);
    }

    // Hash de la contraseña
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(createUserDto.password, saltRounds);

    const { password, ...userData } = createUserDto;

    // Crear el usuario junto con sus preferencias y calendario por defecto
    const newUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          ...userData,
          passwordHash,
        },
      });

      // Crear preferencias
      await tx.userPreferences.create({
        data: {
          userId: user.id,
          theme: 'light',
          language: 'es',
          calendarSettings: JSON.stringify({
            defaultView: 'month',
            weekends: true,
          }),
        },
      });

      // Crear calendario personal
      await tx.calendar.create({
        data: {
          name: `Calendario de ${user.name}`,
          type: 'USER',
          ownerUserId: user.id,
          color: '#10B981',
        },
      });

      return user;
    });

    const { passwordHash: _, ...result } = newUser;
    return result;
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        color: true,
        position: true,
        avatarUrl: true,
        role: {
          select: { id: true, name: true, description: true },
        },
        area: {
          select: { id: true, name: true, color: true },
        },
        createdAt: true,
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        role: {
          select: { id: true, name: true, permissions: true },
        },
        area: {
          select: { id: true, name: true, color: true },
        },
        preferences: true,
        calendars: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException(`El usuario con ID ${id} no fue encontrado.`);
    }
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
        area: true,
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(id);

    const updateData: any = { ...updateUserDto };
    delete updateData.password;

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingEmail = await this.prisma.user.findFirst({
        where: {
          email: updateUserDto.email,
          id: { not: id },
        },
      });
      if (existingEmail) {
        throw new BadRequestException(`El correo electrónico ${updateUserDto.email} ya está registrado por otro usuario.`);
      }
    }

    if (updateUserDto.password) {
      const saltRounds = 10;
      updateData.passwordHash = await bcrypt.hash(updateUserDto.password, saltRounds);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    const { passwordHash: _, ...result } = updatedUser;
    return result;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
