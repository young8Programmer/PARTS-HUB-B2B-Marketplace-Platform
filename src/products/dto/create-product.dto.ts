import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsUUID,
  Min,
  MinLength,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Engine Oil Filter' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 150000 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 100, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  stock?: number;

  @ApiProperty({ example: 'Bosch' })
  @IsString()
  @MinLength(2)
  brand: string;

  @ApiProperty({ example: 'uuid-of-category' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
