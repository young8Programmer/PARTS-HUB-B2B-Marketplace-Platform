import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SellersService } from './sellers.service';
import { CreateSellerProfileDto } from './dto/create-seller-profile.dto';
import { UpdateSellerProfileDto } from './dto/update-seller-profile.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { User } from '../users/entities/user.entity';

@ApiTags('Sellers')
@Controller('sellers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class SellersController {
  constructor(private readonly sellersService: SellersService) {}

  @Post()
  @Roles(Role.SELLER)
  @ApiOperation({ summary: 'Create seller profile' })
  create(
    @CurrentUser() user: User,
    @Body() createSellerProfileDto: CreateSellerProfileDto,
  ) {
    return this.sellersService.create(user.id, createSellerProfileDto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all sellers (Admin only)' })
  findAll() {
    return this.sellersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get seller profile by ID' })
  findOne(@Param('id') id: string) {
    return this.sellersService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.SELLER)
  @ApiOperation({ summary: 'Update seller profile' })
  update(
    @Param('id') id: string,
    @Body() updateSellerProfileDto: UpdateSellerProfileDto,
  ) {
    return this.sellersService.update(id, updateSellerProfileDto);
  }

  @Post(':id/verify')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Verify seller (Admin only)' })
  verify(@CurrentUser() user: User, @Param('id') id: string) {
    return this.sellersService.verify(id, user.id);
  }

  @Post(':id/unverify')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Unverify seller (Admin only)' })
  unverify(@CurrentUser() user: User, @Param('id') id: string) {
    return this.sellersService.unverify(id, user.id);
  }
}
