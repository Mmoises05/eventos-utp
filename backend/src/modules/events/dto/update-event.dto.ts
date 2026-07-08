import { IsString, IsOptional, IsDateString, IsUUID, IsArray } from 'class-validator';

export class UpdateEventDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  priority?: string;

  @IsDateString()
  @IsOptional()
  startTime?: string;

  @IsDateString()
  @IsOptional()
  endTime?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsUUID('all')
  @IsOptional()
  areaId?: string;

  @IsUUID('all')
  @IsOptional()
  responsibleId?: string;

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
  @IsUUID('all', { each: true })
  @IsOptional()
  participantIds?: string[];

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  resourceIds?: string[];

  @IsString()
  @IsOptional()
  status?: string; // e.g., APPROVED, CANCELLED
}
