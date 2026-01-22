import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Engine Parts' })
  @IsString()
  @MinLength(2)
  name: string;
}
