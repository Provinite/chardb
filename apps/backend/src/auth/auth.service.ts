import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../users/users.service';
import { InviteCodesService } from '../invite-codes/invite-codes.service';
import { DatabaseService } from '../database/database.service';
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
  /** Required invite code */
  inviteCode: string;
}

/**
 * Auth response containing user and tokens
 */
export interface AuthResponse {
  /** User data without password */
  // eslint-disable-next-line @typescript-eslint/ban-types
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

// eslint-disable-next-line @typescript-eslint/ban-types
type PrismaUser = Prisma.UserGetPayload<{}>;

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private inviteCodesService: InviteCodesService,
    private prisma: DatabaseService,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<Omit<PrismaUser, 'passwordHash'> | null> {
    try {
      const user = await this.usersService.findByEmail(email);
      console.log('validateUser - user found:', !!user);
      console.log('validateUser - passwordHash exists:', !!user?.passwordHash);

      if (
        user &&
        user.passwordHash &&
        (await bcrypt.compare(password, user.passwordHash))
      ) {
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
    return await this.prisma.$transaction(async (tx) => {
      // 1. Validate invite code first (using regular service, not transaction)
      const inviteCode = await this.inviteCodesService.findOne(
        input.inviteCode,
      );
      if (inviteCode.claimCount >= inviteCode.maxClaims) {
        throw new BadRequestException('Invite code has been exhausted');
      }

      // 2. Check for existing user by email (within transaction)
      const existingUserByEmail = await tx.user.findUnique({
        where: { email: input.email },
      });
      if (existingUserByEmail) {
        throw new ConflictException('User with this email already exists');
      }

      // 3. Check for existing user by username (within transaction)
      const existingUserByUsername = await tx.user.findUnique({
        where: { username: input.username },
      });
      if (existingUserByUsername) {
        throw new ConflictException('User with this username already exists');
      }

      // 4. Create user (within transaction)
      const hashedPassword = await bcrypt.hash(input.password, 10);
      const user = await tx.user.create({
        data: {
          username: input.username,
          email: input.email,
          passwordHash: hashedPassword,
          displayName: input.displayName,
        },
      });

      // 5. Claim invite code and increment usage (within transaction)
      const updatedInviteCode = await tx.inviteCode.update({
        where: { id: input.inviteCode },
        data: {
          claimCount: { increment: 1 },
        },
        include: { role: true },
      });

      // 6. Create community membership if invite code has a role (within transaction)
      if (updatedInviteCode.roleId) {
        try {
          await tx.communityMember.create({
            data: {
              role: { connect: { id: updatedInviteCode.roleId } },
              user: { connect: { id: user.id } },
            },
          });
        } catch (error: any) {
          // Handle unique constraint violation with a more user-friendly error
          if (error.code === 'P2002') {
            throw new ConflictException(
              'You are already a member of this community',
            );
          }
          throw error;
        }
      }

      // 7. Generate tokens (outside transaction - no DB operations)
      const { passwordHash, ...userWithoutPassword } = user;
      const payload = { email: user.email, sub: user.id };
      const accessToken = this.jwtService.sign(payload);
      const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

      return {
        user: userWithoutPassword,
        accessToken,
        refreshToken,
      };
    });
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
