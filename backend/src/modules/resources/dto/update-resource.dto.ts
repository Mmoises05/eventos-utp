import { IsString, IsUUID, IsOptional, IsInt, Min, IsIn } from 'class-validator';

export class UpdateResourceDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsUUID('all')
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @IsIn(['AVAILABLE', 'MAINTENANCE', 'OUT_OF_SERVICE'])
  status?: string;

  @IsUUID('all')
  @IsOptional()
  areaId?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @IsString()
  @IsOptional()
  metadata?: string;
}
