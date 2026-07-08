import { IsString, IsOptional, IsHexColor, IsUUID } from 'class-validator';

export class CreateAreaDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsUUID()
  @IsOptional()
  parentAreaId?: string;
}
