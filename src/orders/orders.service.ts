import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { ProductsService } from '../products/products.service';
import { PaymentsService } from '../payments/payments.service';
import { OrderStatus } from '../common/enums/order-status.enum';
import { PaymentProvider } from '../common/enums/payment-provider.enum';
import { Role } from '../common/enums/role.enum';
import { AuditLogService } from '../audit-log/audit-log.service';
import { SellersService } from '../sellers/sellers.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    private productsService: ProductsService,
    private paymentsService: PaymentsService,
    private auditLogService: AuditLogService,
    private sellersService: SellersService,
    private dataSource: DataSource,
  ) {}

  async create(createOrderDto: CreateOrderDto, buyerId: string): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let totalPrice = 0;
      const orderItems: OrderItem[] = [];

      // Validate products and calculate total
      for (const item of createOrderDto.items) {
        const product = await this.productsService.findOne(item.productId);

        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for product ${product.name}`,
          );
        }

        const itemPrice = product.price * item.quantity;
        totalPrice += itemPrice;

        const orderItem = this.orderItemRepository.create({
          productId: item.productId,
          price: product.price,
          quantity: item.quantity,
        });

        orderItems.push(orderItem);
      }

      // Create order
      const order = this.orderRepository.create({
        buyerId,
        totalPrice,
        status: OrderStatus.PENDING,
      });

      const savedOrder = await queryRunner.manager.save(order);

      // Set orderId for items and save
      orderItems.forEach((item) => {
        item.orderId = savedOrder.id;
      });
      await queryRunner.manager.save(OrderItem, orderItems);

      await queryRunner.commitTransaction();

      const orderWithItems = await this.findOne(savedOrder.id);

      await this.auditLogService.create({
        userId: buyerId,
        action: 'create_order',
        entity: 'Order',
        entityId: savedOrder.id,
      });

      return orderWithItems;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(userId: string, userRole: Role): Promise<Order[]> {
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('order.buyer', 'buyer')
      .leftJoinAndSelect('order.payment', 'payment');

    if (userRole === Role.BUYER) {
      queryBuilder.where('order.buyerId = :userId', { userId });
    } else if (userRole === Role.SELLER) {
      const sellerProfile = await this.sellersService.findByUserId(userId);
      if (!sellerProfile) {
        return [];
      }
      queryBuilder
        .leftJoin('items.product', 'productForSeller')
        .where('productForSeller.sellerId = :sellerId', {
          sellerId: sellerProfile.id,
        });
    }
    // Admin can see all orders

    return queryBuilder.getMany();
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items', 'items.product', 'buyer', 'payment'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async updateStatus(
    id: string,
    updateOrderStatusDto: UpdateOrderStatusDto,
    userId: string,
    userRole: Role,
  ): Promise<Order> {
    const order = await this.findOne(id);
    const newStatus = updateOrderStatusDto.status;

    // Validate status transition
    this.validateStatusTransition(order.status, newStatus, userRole);

    // Check permissions
    if (userRole === Role.SELLER) {
      const sellerProfile = await this.sellersService.findByUserId(userId);
      const hasProduct = order.items.some(
        (item) => item.product.sellerId === sellerProfile?.id,
      );

      if (!hasProduct) {
        throw new ForbiddenException(
          'You can only update orders containing your products',
        );
      }

      if (newStatus !== OrderStatus.SHIPPED) {
        throw new ForbiddenException('Sellers can only mark orders as shipped');
      }
    }

    if (userRole === Role.BUYER) {
      if (order.buyerId !== userId) {
        throw new ForbiddenException('You can only update your own orders');
      }

      if (newStatus !== OrderStatus.COMPLETED && newStatus !== OrderStatus.CANCELED) {
        throw new ForbiddenException(
          'Buyers can only complete or cancel orders',
        );
      }

      if (order.status !== OrderStatus.SHIPPED && newStatus === OrderStatus.COMPLETED) {
        throw new BadRequestException(
          'Order must be shipped before it can be completed',
        );
      }
    }

    const oldStatus = order.status;
    order.status = newStatus;

    const savedOrder = await this.orderRepository.save(order);

    await this.auditLogService.create({
      userId,
      action: 'update_order_status',
      entity: 'Order',
      entityId: id,
    });

    return savedOrder;
  }

  private validateStatusTransition(
    currentStatus: OrderStatus,
    newStatus: OrderStatus,
    userRole: Role,
  ): void {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELED],
      [OrderStatus.PAID]: [OrderStatus.SHIPPED, OrderStatus.CANCELED],
      [OrderStatus.SHIPPED]: [OrderStatus.COMPLETED],
      [OrderStatus.COMPLETED]: [],
      [OrderStatus.CANCELED]: [],
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  async processPayment(
    orderId: string,
    paymentProvider: PaymentProvider,
    userId: string,
  ): Promise<Order> {
    const order = await this.findOne(orderId);

    if (order.buyerId !== userId) {
      throw new ForbiddenException('You can only pay for your own orders');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Order is not in pending status');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create payment
      const payment = await this.paymentsService.create(
        {
          orderId,
          amount: order.totalPrice,
          provider: paymentProvider,
        },
        queryRunner,
      );

      // Update order status
      order.status = OrderStatus.PAID;
      await queryRunner.manager.save(order);

      // Decrease product stock
      for (const item of order.items) {
        await this.productsService.decreaseStock(
          item.productId,
          item.quantity,
          queryRunner,
        );
      }

      await queryRunner.commitTransaction();

      await this.auditLogService.create({
        userId,
        action: 'process_payment',
        entity: 'Order',
        entityId: orderId,
      });

      return this.findOne(orderId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
