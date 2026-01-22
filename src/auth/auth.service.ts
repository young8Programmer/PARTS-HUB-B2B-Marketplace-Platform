import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshToken } from './entities/refresh-token.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    const { accessToken, refreshToken } = await this.generateTokens(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    const fullUser = await this.usersService.findOne(user.id);

    const { accessToken, refreshToken } = await this.generateTokens(user.id);

    return {
      user: {
        id: fullUser.id,
        email: fullUser.email,
        role: fullUser.role,
      },
      accessToken,
      refreshToken,
    };
  }

  async generateTokens(userId: string) {
    const user = await this.usersService.findOne(userId);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshTokenSecret = this.configService.get('JWT_REFRESH_SECRET');
    const refreshTokenExpiresIn = this.configService.get(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );

    const refreshTokenPayload = { sub: user.id, type: 'refresh' };
    const refreshTokenString = this.jwtService.sign(refreshTokenPayload, {
      secret: refreshTokenSecret,
      expiresIn: refreshTokenExpiresIn,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Save refresh token to database
    const refreshTokenEntity = this.refreshTokenRepository.create({
      userId,
      token: refreshTokenString,
      expiresAt,
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);

    // Clean up expired tokens
    await this.cleanupExpiredTokens();

    return {
      accessToken,
      refreshToken: refreshTokenString,
    };
  }

  async refreshAccessToken(refreshTokenString: string) {
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { token: refreshTokenString },
      relations: ['user'],
    });

    if (!refreshToken || refreshToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!refreshToken.user.isActive) {
      throw new UnauthorizedException('User is not active');
    }

    const payload = {
      sub: refreshToken.user.id,
      email: refreshToken.user.email,
      role: refreshToken.user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
    };
  }

  async logout(refreshTokenString: string) {
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { token: refreshTokenString },
    });

    if (refreshToken) {
      await this.refreshTokenRepository.remove(refreshToken);
    }

    return { message: 'Logged out successfully' };
  }

  private async cleanupExpiredTokens() {
    await this.refreshTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });
  }
}
