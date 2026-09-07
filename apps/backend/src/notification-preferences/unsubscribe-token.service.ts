import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotificationKind } from "@chardb/database";
import * as crypto from "crypto";

/** What a valid token names. */
export interface UnsubscribeClaim {
  userId: string;
  kind: NotificationKind;
}

/** Domain separator, so this key can never collide with JWT signing. */
const KEY_LABEL = "chardb:unsubscribe:v1";

/**
 * Issues and verifies the token in an email's unsubscribe link.
 *
 * Stateless HMAC rather than the `PasswordResetToken` row the rest of the
 * codebase uses, and the difference is deliberate. A reset token is
 * single-use, expires in an hour and must be revocable; an unsubscribe link
 * has to keep working in a mail somebody archived a year ago. Mirroring the
 * table here would mean writing a database row for every notification email
 * ever sent, to support a link almost nobody clicks.
 *
 * The key is derived from `JWT_SECRET` under a fixed label rather than read
 * from a variable of its own, so there is no new secret to provision and no
 * environment where the link silently stops working. The derivation makes it
 * cryptographically independent of the signing key: a token minted here is not
 * a valid JWT and cannot be made into one.
 *
 * A token authorises exactly one thing -- switching one kind's email off -- so
 * a leaked link cannot enable anything, read anything, or reach any other
 * account. See `NotificationPreferencesService.disableEmail`.
 */
@Injectable()
export class UnsubscribeTokenService {
  private readonly key: Buffer;

  constructor(configService: ConfigService) {
    const secret = configService.getOrThrow<string>("JWT_SECRET");
    this.key = crypto.createHmac("sha256", secret).update(KEY_LABEL).digest();
  }

  /** The token for one member's one kind. Stable: the same inputs sign alike. */
  issue(userId: string, kind: NotificationKind): string {
    const body = this.body(userId, kind);
    return `${body}.${this.sign(body)}`;
  }

  /**
   * Returns what the token claims, or null if it does not verify.
   *
   * Null covers every failure the same way -- malformed, tampered, naming a
   * kind this version has never heard of -- because the caller has nothing
   * useful to tell an anonymous clicker beyond "this link is not valid".
   */
  verify(token: string): UnsubscribeClaim | null {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [encodedUserId, encodedKind, mac] = parts;
    const body = `${encodedUserId}.${encodedKind}`;
    if (!this.macMatches(body, mac)) return null;

    const userId = decode(encodedUserId);
    const kind = decode(encodedKind);
    if (!userId || !isNotificationKind(kind)) return null;

    return { userId, kind };
  }

  private body(userId: string, kind: NotificationKind): string {
    return `${encode(userId)}.${encode(kind)}`;
  }

  private sign(body: string): string {
    return crypto
      .createHmac("sha256", this.key)
      .update(body)
      .digest("base64url");
  }

  /**
   * Constant-time comparison. The lengths are compared first because
   * `timingSafeEqual` throws on a mismatch rather than returning false, and a
   * thrown error on a public endpoint is a worse leak than the length itself.
   */
  private macMatches(body: string, mac: string): boolean {
    const expected = Buffer.from(this.sign(body));
    const actual = Buffer.from(mac);
    if (expected.length !== actual.length) return false;
    return crypto.timingSafeEqual(expected, actual);
  }
}

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function isNotificationKind(value: string): value is NotificationKind {
  return Object.values(NotificationKind).includes(value as NotificationKind);
}
