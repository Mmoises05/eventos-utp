import { IsString, IsUUID, IsOptional, IsInt, Min, IsIn } from 'class-validator';

export class CreateResourceDto {
  @IsString()
  name: string;

  @IsUUID('all', { message: 'El ID de la categoría debe ser un UUID válido.' })
  categoryId: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @IsIn(['AVAILABLE', 'MAINTENANCE', 'OUT_OF_SERVICE'], {
    message: 'El estado del recurso debe ser AVAILABLE, MAINTENANCE o OUT_OF_SERVICE.',
  })
  status?: string;

  @IsUUID('all', { message: 'El ID de área debe ser un UUID válido.' })
  @IsOptional()
  areaId?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @IsString()
  @IsOptional()
  metadata?: string; // Almacenado como string JSON para SQLite
}
