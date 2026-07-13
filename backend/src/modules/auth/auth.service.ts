import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private readonly PREDEFINED_COLORS = [
    '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#22C55E', '#10B981', 
    '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6', 
    '#A855F7', '#D946EF', '#EC4899', '#F43F5E'
  ];

  async register(registerDto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });
    if (existing) {
      throw new BadRequestException('El correo ya está en uso.');
    }

    // Assign a color that is not used yet by other users, or a random one
    const usedColors = await this.prisma.user.findMany({ select: { color: true } });
    const usedColorSet = new Set(usedColors.map(u => u.color).filter(c => c));
    let assignedColor = this.PREDEFINED_COLORS.find(c => !usedColorSet.has(c));
    if (!assignedColor) {
      assignedColor = this.PREDEFINED_COLORS[Math.floor(Math.random() * this.PREDEFINED_COLORS.length)];
    }

    const jefeAreaRole = await this.prisma.role.findUnique({
      where: { name: 'JEFE_AREA' },
    });
    if (!jefeAreaRole) throw new BadRequestException('El rol JEFE_AREA no existe en la base de datos.');

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(registerDto.password, saltRounds);

    const user = await this.prisma.$transaction(async (tx) => {
      let targetArea = await tx.area.findFirst({
        where: { name: registerDto.areaName }
      });
      if (!targetArea) {
        targetArea = await tx.area.create({
          data: { name: registerDto.areaName, description: 'Área autogenerada' }
        });
      }

      const createdUser = await tx.user.create({
        data: {
          email: registerDto.email,
          name: registerDto.name,
          passwordHash,
          avatarUrl: registerDto.avatarUrl,
          position: registerDto.position,
          color: assignedColor,
          roleId: jefeAreaRole.id,
          areaId: targetArea.id,
        },
        include: { role: true, area: true }
      });

      await tx.userPreferences.create({
        data: {
          userId: createdUser.id,
          theme: 'light',
          language: 'es',
          calendarSettings: JSON.stringify({ defaultView: 'month', weekends: true }),
        },
      });

      await tx.calendar.create({
        data: {
          name: `Calendario de ${createdUser.name}`,
          type: 'USER',
          ownerUserId: createdUser.id,
          color: assignedColor,
        },
      });

      return createdUser;
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role.name, user.areaId);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
        area: user.area.name,
        color: user.color,
        avatarUrl: user.avatarUrl,
        position: user.position,
      },
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('El usuario está inactivo o suspendido.');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role.name, user.areaId);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
        area: user.area.name,
        color: user.color,
        avatarUrl: user.avatarUrl,
        position: user.position,
      },
      ...tokens,
    };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!user || !user.refreshTokenHash || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Acceso denegado.');
    }

    const isRefreshTokenValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Acceso denegado o token inválido.');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role.name, user.areaId);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  private async generateTokens(userId: string, email: string, roleName: string, areaId: string) {
    const jwtPayload = {
      sub: userId,
      email,
      role: roleName,
      areaId,
    };

    const accessToken = await this.jwtService.signAsync(jwtPayload, {
      secret: this.configService.get<string>('JWT_SECRET') || 'sici_jwt_secret_key_change_me_in_production_12345',
      expiresIn: (this.configService.get<string>('JWT_EXPIRATION') || '15m') as any,
    });

    const refreshToken = await this.jwtService.signAsync(jwtPayload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'sici_jwt_refresh_secret_key_change_me_in_production_54321',
      expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d') as any,
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private async updateRefreshToken(userId: string, refreshToken: string) {
    const saltRounds = 10;
    const hash = await bcrypt.hash(refreshToken, saltRounds);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: hash },
    });
  }
}
