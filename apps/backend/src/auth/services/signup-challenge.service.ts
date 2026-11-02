import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Prisma } from "@chardb/database";
import {
  createChallenge,
  verifySolution,
  type Challenge,
  type Solution,
} from "altcha-lib";
import { deriveKey } from "altcha-lib/algorithms/pbkdf2";
import {
  SignupChallengeFailedError,
  type SignupChallengeFailure,
} from "../errors/signup-challenge-failed.error";

/**
 * PBKDF2 runs on Web Crypto in every browser the widget supports, with no
 * worker to load. Argon2 and scrypt would be harder to farm out to GPUs but
 * need a WebAssembly worker on the page.
 */
const ALGORITHM = "PBKDF2/SHA-256";

/**
 * Iterations per guess. With the default two-hex-digit prefix a solve takes
 * about 256 guesses, which at 5,000 is a few hundred milliseconds in a
 * browser and one key derivation (about 1ms) to verify.
 */
const DEFAULT_COST = 5_000;

/** Long enough to fill in the form at a relaxed pace. */
const CHALLENGE_LIFETIME_MS = 10 * 60 * 1000;

/**
 * Used outside production when `ALTCHA_HMAC_SECRET` is unset, so a checkout
 * whose `.env` predates the challenge still boots.
 */
const DEVELOPMENT_SECRET = "development-only-altcha-secret";

/** A challenge that verified, ready to be spent in the sign-up transaction. */
export interface VerifiedSignupChallenge {
  nonce: string;
  expiresAt: Date;
}

interface SignupPayload {
  challenge: Challenge;
  solution: Solution;
}

/**
 * The proof of work every sign-up carries (ALTCHA). The browser solves a
 * challenge this service signed; the server checks the signature, expiry and
 * work, and the sign-up transaction records the nonce so it creates one
 * account.
 *
 * Proof of work does not tell a person from a script. It makes each sign-up
 * cost the client some CPU, which together with email verification and the
 * credential throttle makes mass sign-ups expensive.
 */
@Injectable()
export class SignupChallengeService {
  private readonly logger = new Logger(SignupChallengeService.name);
  private readonly secret: string;
  private readonly cost: number;

  constructor(configService: ConfigService) {
    const secret = configService.get<string>("ALTCHA_HMAC_SECRET");
    if (secret) {
      this.secret = secret;
    } else if (configService.get<string>("NODE_ENV") === "production") {
      throw new Error(
        "ALTCHA_HMAC_SECRET is required but not configured. Set the ALTCHA_HMAC_SECRET environment variable.",
      );
    } else {
      this.logger.warn({
        message: "ALTCHA_HMAC_SECRET is unset; using the development secret",
      });
      this.secret = DEVELOPMENT_SECRET;
    }

    const cost = Number(configService.get<string>("ALTCHA_COST"));
    this.cost = Number.isInteger(cost) && cost > 0 ? cost : DEFAULT_COST;
  }

  /** A freshly signed challenge, as the JSON the widget accepts. */
  async create(): Promise<string> {
    const challenge = await createChallenge({
      algorithm: ALGORITHM,
      cost: this.cost,
      deriveKey,
      hmacSignatureSecret: this.secret,
      expiresAt: new Date(Date.now() + CHALLENGE_LIFETIME_MS),
    });
    return JSON.stringify(challenge);
  }

  /**
   * Checks the payload and the honeypot without touching the database.
   * Throws `SignupChallengeFailedError` on any failure.
   */
  async verify(
    payload: string,
    honeypot: string | undefined,
  ): Promise<VerifiedSignupChallenge> {
    if (honeypot) this.refuse("honeypot");

    const decoded = this.decode(payload);
    const result = await verifySolution({
      challenge: decoded.challenge,
      solution: decoded.solution,
      deriveKey,
      hmacSignatureSecret: this.secret,
    });
    if (result.expired) this.refuse("expired");
    if (!result.verified) this.refuse("invalid");

    const { nonce, expiresAt } = decoded.challenge.parameters;
    if (!expiresAt) this.refuse("invalid");
    return { nonce, expiresAt: new Date(expiresAt * 1000) };
  }

  /**
   * Records the challenge as spent, inside the sign-up transaction. A second
   * sign-up with the same challenge finds the nonce taken and is refused; if
   * the sign-up rolls back, so does this, and the challenge can be used again.
   */
  async spend(
    tx: Prisma.TransactionClient,
    challenge: VerifiedSignupChallenge,
  ): Promise<void> {
    await tx.usedSignupChallenge.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    const { count } = await tx.usedSignupChallenge.createMany({
      data: [challenge],
      skipDuplicates: true,
    });
    if (count === 0) this.refuse("spent");
  }

  private decode(payload: string): SignupPayload {
    let parsed: unknown;
    try {
      parsed = JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
    } catch {
      this.refuse("malformed");
    }
    if (!isSignupPayload(parsed)) this.refuse("malformed");
    return parsed;
  }

  private refuse(reason: SignupChallengeFailure): never {
    this.logger.warn({ message: "Sign-up challenge refused", reason });
    throw new SignupChallengeFailedError(reason);
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * The shape `verifySolution` reads. Anything else, including the widget's
 * `{ challenge: null, test: true }` test payload, is malformed.
 */
const isSignupPayload = (value: unknown): value is SignupPayload => {
  if (!isRecord(value)) return false;
  const { challenge, solution } = value;
  if (!isRecord(challenge) || !isRecord(solution)) return false;
  const { parameters, signature } = challenge;
  return (
    isRecord(parameters) &&
    typeof parameters.nonce === "string" &&
    typeof signature === "string" &&
    typeof solution.counter === "number" &&
    typeof solution.derivedKey === "string"
  );
};
