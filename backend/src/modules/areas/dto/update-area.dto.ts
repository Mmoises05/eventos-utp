import { IsString, IsOptional, IsHexColor, IsUUID } from 'class-validator';

export class UpdateAreaDto {
  @IsString()
  @IsOptional()
  name?: string;

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
