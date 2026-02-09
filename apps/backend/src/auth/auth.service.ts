import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { UsersService } from '../users/users.service';
import { InviteCodesService } from '../invite-codes/invite-codes.service';
import { DatabaseService } from '../database/database.service';
import { EmailService } from '../email/email.service';
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
    private inviteCodesService: InviteCodesService,
    private prisma: DatabaseService,
    private emailService: EmailService,
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
    const normalizedEmail = input.email.toLowerCase();
    return await this.prisma.$transaction(async (tx) => {
      // 1. Validate invite code first (using regular service, not transaction)
      const inviteCode = await this.inviteCodesService.findOne(input.inviteCode);
      if (inviteCode.claimCount >= inviteCode.maxClaims) {
        throw new BadRequestException('Invite code has been exhausted');
      }

      // 2. Check for existing user by email (within transaction)
      const existingUserByEmail = await tx.user.findUnique({
        where: { email: normalizedEmail }
      });
      if (existingUserByEmail) {
        throw new ConflictException('User with this email already exists');
      }

      // 3. Check for existing user by username (within transaction)
      const existingUserByUsername = await tx.user.findUnique({
        where: { username: input.username }
      });
      if (existingUserByUsername) {
        throw new ConflictException('User with this username already exists');
      }

      // 4. Create user (within transaction)
      const hashedPassword = await bcrypt.hash(input.password, 10);
      const user = await tx.user.create({
        data: {
          username: input.username,
          email: normalizedEmail,
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
            throw new ConflictException('You are already a member of this community');
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

  /**
   * Request a password reset for the given email address
   * Implements database-based rate limiting and silent failure for non-existent users
   * @param email User's email address
   */
  async requestPasswordReset(email: string): Promise<void> {
    // Find user by email - silently fail if user doesn't exist (don't leak user existence)
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Don't reveal that user doesn't exist - return silently
      return;
    }

    // Database-based rate limiting: check for recent reset requests (last 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const recentTokens = await this.prisma.passwordResetToken.count({
      where: {
        userId: user.id,
        createdAt: {
          gte: fifteenMinutesAgo,
        },
      },
    });

    if (recentTokens >= 3) {
      // Rate limit exceeded - silently fail to prevent abuse
      return;
    }

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');

    // Hash the token before storing (SHA-256)
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Calculate expiry time (1 hour from now)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Store the hashed token in the database
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // Send password reset email with the unhashed token
    await this.emailService.sendPasswordResetEmail(email, token, user.username);
  }

  /**
   * Reset user's password using a valid reset token
   * @param token Password reset token from email
   * @param newPassword New password to set
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Hash the provided token to look it up
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find the token in the database
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    // Validate token exists
    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Validate token hasn't been used
    if (resetToken.used) {
      throw new BadRequestException('This reset token has already been used');
    }

    // Validate token hasn't expired
    if (resetToken.expiresAt < new Date()) {
      throw new BadRequestException('This reset token has expired');
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password and mark token as used in a transaction
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash: hashedPassword },
      }),
      this.prisma.passwordResetToken.update({
        where: { tokenHash },
        data: { used: true },
      }),
    ]);

    // Send password changed notification
    await this.emailService.sendPasswordChangedNotification(
      resetToken.user.email,
      resetToken.user.username,
    );
  }
}