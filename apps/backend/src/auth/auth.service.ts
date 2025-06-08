import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../users/users.service';
import { CreateUser, Login } from '../shared/types';

// Helper function to add default social fields to User objects
function addDefaultSocialFields(user: any): any {
  return {
    ...user,
    followersCount: 0,
    followingCount: 0,
    userIsFollowing: false,
  };
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && await bcrypt.compare(password, user.passwordHash)) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: Login) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { email: user.email, sub: user.id };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      user: addDefaultSocialFields(user),
      accessToken,
      refreshToken,
    };
  }

  async signup(signupDto: CreateUser) {
    // Check for existing user by email
    const existingUserByEmail = await this.usersService.findByEmail(signupDto.email);
    if (existingUserByEmail) {
      throw new ConflictException('User with this email already exists');
    }

    // Check for existing user by username
    const existingUserByUsername = await this.usersService.findByUsername(signupDto.username);
    if (existingUserByUsername) {
      throw new ConflictException('User with this username already exists');
    }

    const hashedPassword = await bcrypt.hash(signupDto.password, 10);
    
    const user = await this.usersService.create({
      ...signupDto,
      password: hashedPassword,
    });

    const { passwordHash, ...userWithoutPassword } = user;
    const payload = { email: user.email, sub: user.id };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      user: addDefaultSocialFields(userWithoutPassword),
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(token: string) {
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