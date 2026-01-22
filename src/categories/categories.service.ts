import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    private auditLogService: AuditLogService,
  ) {}

  async create(
    createCategoryDto: CreateCategoryDto,
    adminId: string,
  ): Promise<Category> {
    const existingCategory = await this.categoryRepository.findOne({
      where: { name: createCategoryDto.name, deletedAt: null },
    });

    if (existingCategory) {
      throw new ConflictException('Category with this name already exists');
    }

    const category = this.categoryRepository.create(createCategoryDto);
    const savedCategory = await this.categoryRepository.save(category);

    await this.auditLogService.create({
      userId: adminId,
      action: 'create_category',
      entity: 'Category',
      entityId: savedCategory.id,
    });

    return savedCategory;
  }

  async findAll(): Promise<Category[]> {
    return this.categoryRepository.find({
      where: { deletedAt: null },
      relations: ['products'],
    });
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id, deletedAt: null },
      relations: ['products'],
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
    adminId: string,
  ): Promise<Category> {
    const category = await this.findOne(id);
    Object.assign(category, updateCategoryDto);
    const savedCategory = await this.categoryRepository.save(category);

    await this.auditLogService.create({
      userId: adminId,
      action: 'update_category',
      entity: 'Category',
      entityId: id,
    });

    return savedCategory;
  }

  async remove(id: string, adminId: string): Promise<void> {
    const category = await this.findOne(id);
    await this.categoryRepository.softRemove(category);

    await this.auditLogService.create({
      userId: adminId,
      action: 'delete_category',
      entity: 'Category',
      entityId: id,
    });
  }
}
