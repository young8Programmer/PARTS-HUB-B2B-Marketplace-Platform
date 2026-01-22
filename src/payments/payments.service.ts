import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentStatus } from './../common/enums/payment-status.enum';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
  ) {}

  async create(
    createPaymentDto: CreatePaymentDto,
    queryRunner?: QueryRunner,
  ): Promise<Payment> {
    const payment = this.paymentRepository.create({
      ...createPaymentDto,
      status: PaymentStatus.PENDING,
    });

    // Simulate payment processing (mock)
    // In real scenario, this would call payment provider API
    payment.status = PaymentStatus.SUCCESS;

    if (queryRunner) {
      return queryRunner.manager.save(payment);
    }

    return this.paymentRepository.save(payment);
  }

  async findAll(): Promise<Payment[]> {
    return this.paymentRepository.find({
      relations: ['order'],
    });
  }

  async findOne(id: string): Promise<Payment> {
    return this.paymentRepository.findOne({
      where: { id },
      relations: ['order'],
    });
  }

  async findByOrderId(orderId: string): Promise<Payment | null> {
    return this.paymentRepository.findOne({
      where: { orderId },
      relations: ['order'],
    });
  }
}
