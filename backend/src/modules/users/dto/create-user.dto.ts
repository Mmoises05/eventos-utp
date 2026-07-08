import { IsEmail, IsString, MinLength, IsUUID, IsOptional, IsIn } from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  password: string;

  @IsString()
  name: string;

  @IsUUID('all', { message: 'El ID de rol debe ser un UUID válido.' })
  roleId: string;

  @IsUUID('all', { message: 'El ID de área debe ser un UUID válido.' })
  areaId: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @IsString()
  @IsOptional()
  position?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'SUSPENDED'], { message: 'El estado del usuario debe ser ACTIVE, INACTIVE o SUSPENDED.' })
  status?: string;
}
