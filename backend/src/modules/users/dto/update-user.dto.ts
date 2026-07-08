import { IsEmail, IsString, MinLength, IsUUID, IsOptional, IsIn } from 'class-validator';

export class UpdateUserDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsUUID('all', { message: 'El ID de rol debe ser un UUID válido.' })
  @IsOptional()
  roleId?: string;

  @IsUUID('all', { message: 'El ID de área debe ser un UUID válido.' })
  @IsOptional()
  areaId?: string;

  @IsString()
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'SUSPENDED'], { message: 'El estado del usuario debe ser ACTIVE, INACTIVE o SUSPENDED.' })
  status?: string;
}
