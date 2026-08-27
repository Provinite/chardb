import bcrypt from "bcrypt";
import { PrismaClient } from "@chardb/database";
import { CFG } from "../config.js";
import { makeActor } from "./actor.js";
import { SeedLoginDocument } from "../generated/graphql.js";
import type { Actor, Persona, SeedCtx, UserSpec } from "./types.js";

/** Matches AuthService.signup and the existing persona seeder. */
const BCRYPT_ROUNDS = 10;
export const DEFAULT_PASSWORD = "test123";

export function makeSeedCtx(prisma: PrismaClient): SeedCtx {
  const personas: Record<string, Persona> = {};
  const anon = makeActor("anon", null);

  const ctx: SeedCtx = {
    prisma,
    personas,
    anon,

    /**
     * Creates the user directly via Prisma, then logs in over HTTP for a real
     * token.
     *
     * Direct creation is not a shortcut -- it is required. `signup` demands an
     * inviteCode and grants no global permissions, so an API-created user can
     * never hold isAdmin or canCreateCommunity, and those flags are exactly what
     * a seed needs. Tokens still come from the real `login` mutation rather than
     * being hand-signed, so the auth path is genuinely exercised.
     */
    async user(key, spec: UserSpec = {}) {
      const password = spec.password ?? DEFAULT_PASSWORD;
      const email = (spec.email ?? `${key}@e2e.local`).toLowerCase();
      const username = spec.username ?? key;

      const created = await prisma.user.create({
        data: {
          username,
          email,
          displayName: spec.displayName ?? key,
          passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
          isVerified: true,
          isAdmin: spec.isAdmin ?? false,
          canCreateCommunity: spec.canCreateCommunity ?? false,
          canListUsers: spec.canListUsers ?? false,
          canListInviteCodes: spec.canListInviteCodes ?? false,
          canCreateInviteCode: spec.canCreateInviteCode ?? false,
          canGrantGlobalPermissions: spec.canGrantGlobalPermissions ?? false,
        },
      });

      // Login is by EMAIL, not username.
      const { login } = await anon.gql(SeedLoginDocument, {
        input: { email, password },
      });

      const persona: Persona = {
        key,
        userId: created.id,
        username,
        email,
        password,
        accessToken: login.accessToken,
        refreshToken: login.refreshToken,
        isAdmin: created.isAdmin,
      };
      personas[key] = persona;
      return persona;
    },

    as(key: string): Actor {
      if (key === "anon") return anon;
      const persona = personas[key];
      if (!persona) {
        throw new Error(
          `Unknown persona "${key}". Registered: ${Object.keys(personas).join(", ") || "(none)"}. ` +
            `Personas are registered by calling ctx.user("${key}", ...) in the preset.`,
        );
      }
      return makeActor(key, persona);
    },
  };

  return ctx;
}

export const makePrisma = (): PrismaClient =>
  new PrismaClient({ datasources: { db: { url: CFG.databaseUrl } } });
