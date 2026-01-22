import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsEnum, Min } from 'class-validator';
import { PaymentProvider } from '../../common/enums/payment-provider.enum';

export class CreatePaymentDto {
  @ApiProperty()
  @IsUUID()
  orderId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ enum: PaymentProvider })
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;
}
