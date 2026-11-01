import {
  Injectable,
  Inject,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  forwardRef,
} from "@nestjs/common";
import { CommunityMembershipService } from "../community-membership/community-membership.service";
import { hasStaffPermissions } from "../roles/open-signup-permissions";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";

import { UsersService } from "../users/users.service";
import { InviteCodesService } from "../invite-codes/invite-codes.service";
import { DatabaseService } from "../database/database.service";
import { EmailService } from "../email/email.service";
import { EmailVerificationService } from "../email-verification/email-verification.service";
import { EmailNotVerifiedError } from "./errors/email-not-verified.error";
import { Prisma, User } from "@chardb/database";

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
  /** Required unless `communityId` names a community with open sign-up */
  inviteCode?: string;
  /** Community to join without a code; ignored when `inviteCode` is given */
  communityId?: string;
}

/**
 * Auth response containing user and tokens
 */
export interface AuthResponse {
  /** User data without password */
  user: Omit<User, "passwordHash">;
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

type PrismaUser = User;

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private inviteCodesService: InviteCodesService,
    private prisma: DatabaseService,
    private emailService: EmailService,
    private emailVerificationService: EmailVerificationService,
    @Inject(forwardRef(() => CommunityMembershipService))
    private membership: CommunityMembershipService,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<Omit<PrismaUser, "passwordHash"> | null> {
    try {
      const user = await this.usersService.findByEmail(email);
      if (
        user &&
        user.passwordHash &&
        (await bcrypt.compare(password, user.passwordHash))
      ) {
        const { passwordHash: _passwordHash, ...result } = user;
        return result;
      }
      return null;
    } catch (error) {
      console.error("validateUser error:", error);
      throw error;
    }
  }

  async login(input: LoginServiceInput): Promise<AuthResponse> {
    const user = await this.validateUser(input.email, input.password);
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Checked after the password, not before: answering differently for a
    // registered-but-unconfirmed address than for one nobody has ever used
    // would turn the login form into a way to test whether an address has an
    // account here.
    if (!user.isVerified) {
      throw new EmailNotVerifiedError();
    }

    const payload = { email: user.email, sub: user.id };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: "7d" });

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Create an account. Does not sign anybody in.
   *
   * A new account cannot hold a session until its address is confirmed, so
   * there are no tokens to hand back and no refresh cookie to set -- the caller
   * goes to the "check your email" screen instead of the dashboard.
   */
  async signup(input: SignupServiceInput): Promise<void> {
    const normalizedEmail = input.email.toLowerCase();
    const userId = await this.prisma.$transaction(async (tx) => {
      // 1. Find what lets this person in: an invite code, or a community that
      // takes anyone. A code wins when both are given, since following an
      // invite link is the more deliberate act.
      let openSignupRoleId: string | null = null;
      if (input.inviteCode) {
        const inviteCode = await this.inviteCodesService.findOne(
          input.inviteCode,
        );
        if (inviteCode.claimCount >= inviteCode.maxClaims) {
          throw new BadRequestException("Invite code has been exhausted");
        }
      } else if (input.communityId) {
        // A community that does not exist gets the same answer as a closed
        // one: signup is unauthenticated, and it is no place to learn which
        // ids are real.
        // The role is checked again here, not only when it was chosen: it can
        // have gained a staff permission since.
        const community = await tx.community.findUnique({
          where: { id: input.communityId },
          select: { openSignupRoleId: true, openSignupRole: true },
        });
        if (
          !community?.openSignupRoleId ||
          !community.openSignupRole ||
          hasStaffPermissions(community.openSignupRole)
        ) {
          throw new BadRequestException(
            "This community requires an invite code",
          );
        }
        openSignupRoleId = community.openSignupRoleId;
      } else {
        throw new BadRequestException("An invite code is required");
      }

      // 2. Check for existing user by email (within transaction)
      const existingUserByEmail = await tx.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (existingUserByEmail) {
        throw new ConflictException("User with this email already exists");
      }

      // 3. Check for existing user by username (within transaction)
      const existingUserByUsername = await tx.user.findUnique({
        where: { username: input.username },
      });
      if (existingUserByUsername) {
        throw new ConflictException("User with this username already exists");
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
      let roleId = openSignupRoleId;
      if (input.inviteCode) {
        const updatedInviteCode = await tx.inviteCode.update({
          where: { id: input.inviteCode },
          data: {
            claimCount: { increment: 1 },
          },
        });
        roleId = updatedInviteCode.roleId;
      }

      // 6. Join the community the code or open sign-up names, if any
      if (roleId) {
        try {
          await this.membership.join(tx, {
            userId: user.id,
            roleId,
          });
        } catch (error) {
          // Handle unique constraint violation with a more user-friendly error
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
          ) {
            throw new ConflictException(
              "You are already a member of this community",
            );
          }
          throw error;
        }
      }

      return user.id;
    });

    // Sent after the transaction commits, never inside it. An email sent from
    // within a transaction that then rolls back has already gone -- there is no
    // un-sending it -- so the account has to be a fact before anybody is told
    // about it. Delivery failures are swallowed inside `sendForNewUser`.
    await this.emailVerificationService.sendForNewUser(userId);
  }

  async refreshToken(token: string): Promise<RefreshTokenResponse> {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.usersService.findById(payload.sub);

      if (!user) {
        throw new UnauthorizedException("User not found");
      }

      // Also checked here, not just in `login`. A refresh cookie outlives the
      // session it came with, so without this a token minted before the account
      // was ever confirmed would keep renewing itself for a week.
      if (!user.isVerified) {
        throw new EmailNotVerifiedError();
      }

      const newPayload = { email: user.email, sub: user.id };
      const accessToken = this.jwtService.sign(newPayload);

      return { accessToken };
    } catch (error) {
      // Passed through rather than flattened. The blanket catch below exists to
      // stop a malformed or expired cookie leaking anything about why it was
      // rejected; an unconfirmed address is not that, and the client needs the
      // code to offer a resend rather than "log in again".
      if (error instanceof EmailNotVerifiedError) {
        throw error;
      }
      throw new UnauthorizedException("Invalid refresh token");
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
    const token = crypto.randomBytes(32).toString("hex");

    // Hash the token before storing (SHA-256)
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

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
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Find the token in the database
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    // Validate token exists
    if (!resetToken) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    // Validate token hasn't been used
    if (resetToken.used) {
      throw new BadRequestException("This reset token has already been used");
    }

    // Validate token hasn't expired
    if (resetToken.expiresAt < new Date()) {
      throw new BadRequestException("This reset token has expired");
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
