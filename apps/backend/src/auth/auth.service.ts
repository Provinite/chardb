import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../users/users.service';
import { Prisma } from '@chardb/database';

/**
 * Service layer input types for auth operations.
 * These interfaces provide clean, simple inputs for the service layer,
 * avoiding the complexity of GraphQL relation objects.
 */

/**
 * Input data for user login
 */
export interface LoginServiceInput {
  /** User's email address */
  email: string;
  /** User's password */
  password: string;
}

/**
 * Input data for user signup
 */
export interface SignupServiceInput {
  /** User's unique username */
  username: string;
  /** User's email address */
  email: string;
  /** User's password */
  password: string;
  /** Optional display name */
  displayName?: string;
}

/**
 * Auth response containing user and tokens
 */
export interface AuthResponse {
  /** User data without password */
  user: Omit<Prisma.UserGetPayload<{}>, 'passwordHash'>;
  /** JWT access token */
  accessToken: string;
  /** JWT refresh token */
  refreshToken: string;
}

/**
 * Token refresh response
 */
export interface RefreshTokenResponse {
  /** New JWT access token */
  accessToken: string;
}

type PrismaUser = Prisma.UserGetPayload<{}>;

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<Omit<PrismaUser, 'passwordHash'> | null> {
    try {
      const user = await this.usersService.findByEmail(email);
      console.log('validateUser - user found:', !!user);
      console.log('validateUser - passwordHash exists:', !!user?.passwordHash);
      
      if (user && user.passwordHash && await bcrypt.compare(password, user.passwordHash)) {
        const { passwordHash, ...result } = user;
        return result;
      }
      return null;
    } catch (error) {
      console.error('validateUser error:', error);
      throw error;
    }
  }

  async login(input: LoginServiceInput): Promise<AuthResponse> {
    const user = await this.validateUser(input.email, input.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { email: user.email, sub: user.id };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  async signup(input: SignupServiceInput): Promise<AuthResponse> {
    // Check for existing user by email
    const existingUserByEmail = await this.usersService.findByEmail(input.email);
    if (existingUserByEmail) {
      throw new ConflictException('User with this email already exists');
    }

    // Check for existing user by username
    const existingUserByUsername = await this.usersService.findByUsername(input.username);
    if (existingUserByUsername) {
      throw new ConflictException('User with this username already exists');
    }

    const hashedPassword = await bcrypt.hash(input.password, 10);
    
    const user = await this.usersService.create({
      username: input.username,
      email: input.email,
      passwordHash: hashedPassword,
      displayName: input.displayName,
    });

    const { passwordHash, ...userWithoutPassword } = user;
    const payload = { email: user.email, sub: user.id };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(token: string): Promise<RefreshTokenResponse> {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.usersService.findById(payload.sub);
      
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const newPayload = { email: user.email, sub: user.id };
      const accessToken = this.jwtService.sign(newPayload);
      
      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}