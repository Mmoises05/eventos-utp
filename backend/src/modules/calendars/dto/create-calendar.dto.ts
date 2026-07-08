import { IsString, IsIn, IsOptional, IsUUID, IsHexColor } from 'class-validator';

export class CreateCalendarDto {
  @IsString()
  name: string;

  @IsString()
  @IsIn(['USER', 'AREA', 'INSTITUTIONAL', 'GLOBAL'], {
    message: 'El tipo de calendario debe ser USER, AREA, INSTITUTIONAL o GLOBAL.',
  })
  type: string;

  @IsString()
  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsUUID('all', { message: 'El ID de usuario propietario debe ser un UUID válido.' })
  @IsOptional()
  ownerUserId?: string;

  @IsUUID('all', { message: 'El ID de área propietaria debe ser un UUID válido.' })
  @IsOptional()
  ownerAreaId?: string;
}
