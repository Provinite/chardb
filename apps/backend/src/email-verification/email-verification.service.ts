import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import * as crypto from "crypto";

import { DatabaseService } from "../database/database.service";
import { EmailService } from "../email/email.service";

/**
 * How long a verification link is good for.
 *
 * Longer than a password reset's hour on purpose: this mail arrives before
 * somebody has any reason to be watching their inbox, so it routinely sits
 * unread overnight. An expired link is not a dead end -- the login screen
 * offers a resend -- but every expiry costs a send out of the lifetime budget
 * below, so a short window would burn the budget on nothing.
 */
export const EMAIL_VERIFICATION_EXPIRY_HOURS = 24;

/**
 * The most verification emails one address will ever receive, across every
 * account and every resend.
 *
 * This is the cap that stops the feature being a way to mail somebody
 * repeatedly. It is deliberately a lifetime count rather than a window: a
 * window resets, and an attacker with a script is happy to wait.
 *
 * Signup spends one, leaving five resends. An address that exhausts the budget
 * without ever being confirmed needs an admin to set `is_verified` by hand --
 * which is the same backstop as a mailbox that simply never receives.
 */
export const EMAIL_VERIFICATION_LIFETIME_LIMIT = 6;

/**
 * The most sends to one address inside {@link BURST_WINDOW_MS}.
 *
 * Mirrors the password reset limiter in `AuthService.requestPasswordReset`.
 * The lifetime cap already bounds the total damage; this only stops all six
 * arriving in the same ten seconds because somebody leant on the resend button.
 */
const BURST_LIMIT = 3;
const BURST_WINDOW_MS = 15 * 60 * 1000;

const sha256 = (value: string): string =>
  crypto.createHash("sha256").update(value).digest("hex");

/**
 * Minting and redeeming the "confirm your address" token.
 *
 * Sits below `AuthModule` in the graph -- it imports the database and the
 * mailer and nothing else -- because signup calls into it. Anything reaching
 * back up to auth would close a cycle and Nest would refuse to boot.
 *
 * Every send goes through {@link mint}, so the caps cannot be bypassed by
 * adding another caller.
 */
@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    private readonly prisma: DatabaseService,
    private readonly email: EmailService,
  ) {}

  /**
   * Send the first verification mail for a freshly created account.
   *
   * Swallows a delivery failure. The account row is already committed by the
   * time this runs, so throwing would turn a working signup into a 500 and
   * leave the caller believing nothing happened; a missing email is recoverable
   * from the login screen's resend, and a phantom failed signup is not.
   */
  async sendForNewUser(userId: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, username: true },
      });
      if (!user) return;

      await this.mintAndSend(user);
    } catch (error) {
      this.logger.error(
        `Failed to send signup verification for user ${userId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Re-send verification for an address, on request from the login or signup
   * screen.
   *
   * Returns without telling the caller anything in every refusing case --
   * unknown address, already confirmed, over a cap. The caller has no session
   * (an unverified account cannot get one), so this is an unauthenticated
   * endpoint, and any answer that varied by outcome would be an oracle for
   * which addresses are registered. Same convention as `forgotPassword`.
   */
  async resend(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, username: true, isVerified: true },
    });

    if (!user || user.isVerified) return;

    await this.mintAndSend(user);
  }

  /**
   * Redeem a verification link.
   *
   * An already-verified account is a success, not an error, however the link
   * got followed twice: mail clients and corporate link scanners fetch URLs
   * before a human ever clicks, and a single-use token that reports failure to
   * the person who actually clicked is indistinguishable from a broken feature.
   */
  async redeem(token: string): Promise<void> {
    const tokenHash = sha256(token);

    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, isVerified: true } } },
    });

    if (!record || !record.user) {
      throw new BadRequestException("Invalid or expired verification link");
    }

    if (record.user.isVerified) return;

    if (record.used) {
      throw new BadRequestException(
        "This verification link has already been used",
      );
    }

    if (record.expiresAt < new Date()) {
      throw new BadRequestException("This verification link has expired");
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.user.id },
        data: { isVerified: true },
      }),
      this.prisma.emailVerificationToken.update({
        where: { tokenHash },
        data: { used: true },
      }),
    ]);
  }

  /**
   * The single place a verification token is created and mailed.
   *
   * Returns quietly when either cap is hit. Callers do not get to know which,
   * or that one was hit at all.
   */
  private async mintAndSend(user: {
    id: string;
    email: string;
    username: string;
  }): Promise<void> {
    const email = user.email.toLowerCase();

    // Counted on the address rather than the user id, so the budget survives
    // the account: deleting one nulls `user_id` but leaves the rows, and
    // re-registering the same address does not hand out a fresh six.
    const everSent = await this.prisma.emailVerificationToken.count({
      where: { email },
    });
    if (everSent >= EMAIL_VERIFICATION_LIFETIME_LIMIT) {
      this.logger.warn(
        `Refusing verification send: ${email} has reached the lifetime limit of ${EMAIL_VERIFICATION_LIFETIME_LIMIT}`,
      );
      return;
    }

    const recentlySent = await this.prisma.emailVerificationToken.count({
      where: {
        email,
        createdAt: { gte: new Date(Date.now() - BURST_WINDOW_MS) },
      },
    });
    if (recentlySent >= BURST_LIMIT) {
      this.logger.warn(`Refusing verification send: ${email} is rate limited`);
      return;
    }

    // Hex, so the token can ride in a URL path segment untouched. A `.` in the
    // last segment makes the dev server's history fallback skip its rewrite to
    // index.html, and the SPA route 404s before the page ever loads.
    const token = crypto.randomBytes(32).toString("hex");

    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        email,
        tokenHash: sha256(token),
        expiresAt: new Date(
          Date.now() + EMAIL_VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000,
        ),
      },
    });

    await this.email.sendEmailVerification(
      email,
      token,
      user.username,
      EMAIL_VERIFICATION_EXPIRY_HOURS,
    );
  }
}
