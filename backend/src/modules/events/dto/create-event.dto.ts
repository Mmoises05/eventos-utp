import { IsString, IsOptional, IsDateString, IsUUID, IsArray, IsEnum, IsBoolean } from 'class-validator';

export class CreateEventDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  type?: string; // REUNION, CAPACITACION, etc.

  @IsString()
  @IsOptional()
  priority?: string; // LOW, MEDIUM, HIGH, CRITICAL

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsUUID('all', { message: 'El ID de área debe ser un UUID válido.' })
  areaId: string;

  @IsUUID('all', { message: 'El ID del responsable debe ser un UUID válido.' })
  responsibleId: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @IsUUID('all', { each: true, message: 'Cada ID de participante debe ser un UUID válido.' })
  @IsOptional()
  participantIds?: string[];

  @IsArray()
  @IsUUID('all', { each: true, message: 'Cada ID de recurso debe ser un UUID válido.' })
  @IsOptional()
  resourceIds?: string[];

  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @IsString()
  @IsOptional()
  recurrenceRule?: string; // Regla RRULE (RFC 5545)
}
