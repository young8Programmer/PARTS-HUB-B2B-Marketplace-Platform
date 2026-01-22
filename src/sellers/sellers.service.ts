import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SellerProfile } from './entities/seller-profile.entity';
import { CreateSellerProfileDto } from './dto/create-seller-profile.dto';
import { UpdateSellerProfileDto } from './dto/update-seller-profile.dto';
import { UsersService } from '../users/users.service';
import { Role } from '../common/enums/role.enum';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class SellersService {
  constructor(
    @InjectRepository(SellerProfile)
    private sellerProfileRepository: Repository<SellerProfile>,
    private usersService: UsersService,
    private auditLogService: AuditLogService,
  ) {}

  async create(
    userId: string,
    createSellerProfileDto: CreateSellerProfileDto,
  ): Promise<SellerProfile> {
    const user = await this.usersService.findOne(userId);

    if (user.role !== Role.SELLER) {
      throw new BadRequestException('User must have seller role');
    }

    const existingProfile = await this.sellerProfileRepository.findOne({
      where: { userId },
    });

    if (existingProfile) {
      throw new BadRequestException('Seller profile already exists');
    }

    const sellerProfile = this.sellerProfileRepository.create({
      ...createSellerProfileDto,
      userId,
    });

    return this.sellerProfileRepository.save(sellerProfile);
  }

  async findAll(): Promise<SellerProfile[]> {
    return this.sellerProfileRepository.find({
      relations: ['user'],
    });
  }

  async findOne(id: string): Promise<SellerProfile> {
    const sellerProfile = await this.sellerProfileRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!sellerProfile) {
      throw new NotFoundException(`Seller profile with ID ${id} not found`);
    }

    return sellerProfile;
  }

  async findByUserId(userId: string): Promise<SellerProfile | null> {
    return this.sellerProfileRepository.findOne({
      where: { userId },
      relations: ['user'],
    });
  }

  async update(
    id: string,
    updateSellerProfileDto: UpdateSellerProfileDto,
  ): Promise<SellerProfile> {
    const sellerProfile = await this.findOne(id);
    Object.assign(sellerProfile, updateSellerProfileDto);
    return this.sellerProfileRepository.save(sellerProfile);
  }

  async verify(id: string, adminId: string): Promise<SellerProfile> {
    const sellerProfile = await this.findOne(id);
    sellerProfile.verified = true;

    await this.auditLogService.create({
      userId: adminId,
      action: 'verify_seller',
      entity: 'SellerProfile',
      entityId: id,
    });

    return this.sellerProfileRepository.save(sellerProfile);
  }

  async unverify(id: string, adminId: string): Promise<SellerProfile> {
    const sellerProfile = await this.findOne(id);
    sellerProfile.verified = false;

    await this.auditLogService.create({
      userId: adminId,
      action: 'unverify_seller',
      entity: 'SellerProfile',
      entityId: id,
    });

    return this.sellerProfileRepository.save(sellerProfile);
  }
}
