import { IsString, IsIn, IsOptional } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsString()
  @IsIn(['ROOM', 'VEHICLE', 'EQUIPMENT'], { message: 'El tipo debe ser ROOM, VEHICLE o EQUIPMENT.' })
  type: string;

  @IsString()
  @IsOptional()
  description?: string;
}
