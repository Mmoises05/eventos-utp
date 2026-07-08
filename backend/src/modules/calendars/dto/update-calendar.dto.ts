import { IsString, IsOptional, IsHexColor, IsBoolean } from 'class-validator';

export class UpdateCalendarDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsBoolean()
  @IsOptional()
  isVisible?: boolean;
}
