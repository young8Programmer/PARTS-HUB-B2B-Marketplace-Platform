import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateSellerProfileDto {
  @ApiProperty({ example: 'ABC Parts Company' })
  @IsString()
  @MinLength(2)
  companyName: string;
}
