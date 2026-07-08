import { IsArray, IsUUID, IsInt, Min, IsDateString, IsOptional } from 'class-validator';

export class OptimizeScheduleDto {
  @IsArray()
  @IsUUID('all', { each: true, message: 'Cada ID de usuario obligatorio debe ser un UUID válido.' })
  mandatoryUserIds: string[];

  @IsArray()
  @IsUUID('all', { each: true, message: 'Cada ID de usuario opcional debe ser un UUID válido.' })
  @IsOptional()
  optionalUserIds?: string[];

  @IsArray()
  @IsUUID('all', { each: true, message: 'Cada ID de recurso debe ser un UUID válido.' })
  @IsOptional()
  requiredResourceIds?: string[];

  @IsInt()
  @Min(15, { message: 'La duración mínima del evento es de 15 minutos.' })
  durationMinutes: number;

  @IsDateString()
  searchWindowStart: string;

  @IsDateString()
  searchWindowEnd: string;
}
