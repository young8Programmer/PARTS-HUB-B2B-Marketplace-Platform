import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, QueryRunner } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchProductDto } from './dto/search-product.dto';
import { SellersService } from '../sellers/sellers.service';
import { CategoriesService } from '../categories/categories.service';
import { Role } from '../common/enums/role.enum';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private sellersService: SellersService,
    private categoriesService: CategoriesService,
    private auditLogService: AuditLogService,
  ) {}

  async create(
    createProductDto: CreateProductDto,
    sellerId: string,
  ): Promise<Product> {
    const sellerProfile = await this.sellersService.findByUserId(sellerId);

    if (!sellerProfile || !sellerProfile.verified) {
      throw new ForbiddenException('Seller profile must be verified');
    }

    await this.categoriesService.findOne(createProductDto.categoryId);

    const product = this.productRepository.create({
      ...createProductDto,
      sellerId: sellerProfile.id,
    });

    const savedProduct = await this.productRepository.save(product);

    await this.auditLogService.create({
      userId: sellerId,
      action: 'create_product',
      entity: 'Product',
      entityId: savedProduct.id,
    });

    return savedProduct;
  }

  async findAll(searchDto: SearchProductDto): Promise<{
    data: Product[];
    total: number;
    page: number;
    limit: number;
  }> {
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.seller', 'seller')
      .leftJoinAndSelect('seller.user', 'user')
      .where('product.deletedAt IS NULL')
      .andWhere('product.isActive = :isActive', { isActive: true });

    this.applyFilters(queryBuilder, searchDto);

    const page = searchDto.page || 1;
    const limit = searchDto.limit || 10;
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  private applyFilters(
    queryBuilder: SelectQueryBuilder<Product>,
    searchDto: SearchProductDto,
  ): void {
    if (searchDto.minPrice) {
      queryBuilder.andWhere('product.price >= :minPrice', {
        minPrice: searchDto.minPrice,
      });
    }

    if (searchDto.maxPrice) {
      queryBuilder.andWhere('product.price <= :maxPrice', {
        maxPrice: searchDto.maxPrice,
      });
    }

    if (searchDto.brand) {
      queryBuilder.andWhere('product.brand = :brand', {
        brand: searchDto.brand,
      });
    }

    if (searchDto.categoryId) {
      queryBuilder.andWhere('product.categoryId = :categoryId', {
        categoryId: searchDto.categoryId,
      });
    }

    if (searchDto.sellerId) {
      queryBuilder.andWhere('product.sellerId = :sellerId', {
        sellerId: searchDto.sellerId,
      });
    }

    if (searchDto.search) {
      queryBuilder.andWhere(
        '(product.name ILIKE :search OR product.brand ILIKE :search)',
        { search: `%${searchDto.search}%` },
      );
    }
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id, deletedAt: null },
      relations: ['category', 'seller', 'seller.user'],
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    userId: string,
    userRole: Role,
  ): Promise<Product> {
    const product = await this.findOne(id);

    if (userRole !== Role.ADMIN) {
      const sellerProfile = await this.sellersService.findByUserId(userId);
      if (product.sellerId !== sellerProfile?.id) {
        throw new ForbiddenException('You can only update your own products');
      }
    }

    if (updateProductDto.categoryId) {
      await this.categoriesService.findOne(updateProductDto.categoryId);
    }

    Object.assign(product, updateProductDto);
    const savedProduct = await this.productRepository.save(product);

    await this.auditLogService.create({
      userId,
      action: 'update_product',
      entity: 'Product',
      entityId: id,
    });

    return savedProduct;
  }

  async remove(id: string, userId: string, userRole: Role): Promise<void> {
    const product = await this.findOne(id);

    if (userRole !== Role.ADMIN) {
      const sellerProfile = await this.sellersService.findByUserId(userId);
      if (product.sellerId !== sellerProfile?.id) {
        throw new ForbiddenException('You can only delete your own products');
      }
    }

    await this.productRepository.softRemove(product);

    await this.auditLogService.create({
      userId,
      action: 'delete_product',
      entity: 'Product',
      entityId: id,
    });
  }

  async decreaseStock(
    productId: string,
    quantity: number,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = queryRunner
      ? queryRunner.manager.getRepository(Product)
      : this.productRepository;

    const product = await repository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    if (product.stock < quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    product.stock -= quantity;
    await repository.save(product);
  }

  async increaseStock(
    productId: string,
    quantity: number,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = queryRunner
      ? queryRunner.manager.getRepository(Product)
      : this.productRepository;

    const product = await repository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    product.stock += quantity;
    await repository.save(product);
  }
}
