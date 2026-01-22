import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { PaymentProvider } from '../../common/enums/payment-provider.enum';

export class ProcessPaymentDto {
  @ApiProperty({ enum: PaymentProvider, example: PaymentProvider.MOCK })
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;
}
