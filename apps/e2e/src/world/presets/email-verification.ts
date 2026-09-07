import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcrypt";

import { definePreset, type Persona } from "../types.js";
import { DEFAULT_PASSWORD } from "../ctx.js";

export interface EmailVerificationWorld {
  /** An invite code with claims to spare, so a spec can sign up through the UI. */
  inviteCode: string;
  users: {
    /** An ordinary confirmed account, for contrast. */
    member: Persona;
  };
  /**
   * An account that exists and cannot be used.
   *
   * Deliberately NOT a `Persona`: `ctx.user()` mints its tokens by calling the
   * real `login` mutation, and login is the thing this account is refused. It
   * has no session and cannot be given one until the link below is followed --
   * which is the entire behaviour under test.
   */
  unconfirmed: {
    email: string;
    password: string;
    /**
     * The raw token, which in production exists only inside the email.
     *
     * Only its SHA-256 is stored, so a spec cannot read one back out of the
     * database; it is minted here and handed over so a test can walk the same
     * URL a recipient would click.
     */
    verifyToken: string;
    /** A second token, already spent. */
    usedToken: string;
    /** A third, minted an hour in the past. */
    expiredToken: string;
  };
}

const sha256 = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

export default definePreset<EmailVerificationWorld>({
  name: "email-verification",
  description:
    "An unconfirmed account with a live, a spent and an expired link, plus an invite code for signing up through the UI.",

  async build(ctx) {
    const member = await ctx.user("member", { canCreateInviteCode: true });

    const inviteCode = `verify${Date.now()}`;
    await ctx.prisma.inviteCode.create({
      data: {
        id: inviteCode,
        maxClaims: 50,
        creatorId: member.userId,
      },
    });

    const email = "unconfirmed@e2e.local";
    const unconfirmedUser = await ctx.prisma.user.create({
      data: {
        username: "unconfirmed",
        email,
        displayName: "Unconfirmed",
        passwordHash: await bcrypt.hash(DEFAULT_PASSWORD, 10),
        isVerified: false,
      },
    });

    const verifyToken = randomBytes(32).toString("hex");
    const usedToken = randomBytes(32).toString("hex");
    const expiredToken = randomBytes(32).toString("hex");
    const hour = 60 * 60 * 1000;

    await ctx.prisma.emailVerificationToken.createMany({
      data: [
        {
          userId: unconfirmedUser.id,
          email,
          tokenHash: sha256(verifyToken),
          expiresAt: new Date(Date.now() + 24 * hour),
        },
        {
          userId: unconfirmedUser.id,
          email,
          tokenHash: sha256(usedToken),
          expiresAt: new Date(Date.now() + 24 * hour),
          used: true,
        },
        {
          userId: unconfirmedUser.id,
          email,
          tokenHash: sha256(expiredToken),
          expiresAt: new Date(Date.now() - hour),
        },
      ],
    });

    return {
      inviteCode,
      users: { member },
      unconfirmed: {
        email,
        password: DEFAULT_PASSWORD,
        verifyToken,
        usedToken,
        expiredToken,
      },
    };
  },
});
