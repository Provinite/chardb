import type { PrismaClient } from "@chardb/database";

export interface Persona {
  /** The key used in `ctx.user(key)` / `world.as(key)`. */
  key: string;
  userId: string;
  username: string;
  email: string;
  password: string;
  accessToken: string;
  refreshToken: string;
  isAdmin: boolean;
}

/** Global permission flags. These live as columns on User and cannot be granted
 *  through the API by a fresh account, which is why users are created directly. */
export interface UserSpec {
  username?: string;
  email?: string;
  displayName?: string;
  password?: string;
  isAdmin?: boolean;
  canCreateCommunity?: boolean;
  canListUsers?: boolean;
  canListInviteCodes?: boolean;
  canCreateInviteCode?: boolean;
  canGrantGlobalPermissions?: boolean;
}

export interface Actor {
  key: string;
  persona: Persona | null;
  /** POSTs to /graphql as this actor. Throws on any GraphQL error. */
  gql<T = Record<string, unknown>>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T>;
  /** Escape hatch for the REST surface (e.g. multipart POST /images/upload). */
  rest(path: string, init?: RequestInit): Promise<Response>;
}

/**
 * What a preset's `build` receives.
 *
 * `user()` both creates AND registers the persona, which is the ergonomic
 * crux: because the framework always knows every persona, `as()`, token
 * minting and storageState generation are automatic no matter what shape the
 * preset's own handle takes. A preset author never writes auth code.
 */
export interface SeedCtx {
  prisma: PrismaClient;
  user(key: string, spec?: UserSpec): Promise<Persona>;
  as(key: string): Actor;
  anon: Actor;
  personas: Record<string, Persona>;
}

export interface PresetDef<H> {
  name: string;
  description: string;
  build(ctx: SeedCtx): Promise<H>;
}

export const definePreset = <H>(d: PresetDef<H>): PresetDef<H> => d;

export interface WorldApi {
  preset: string;
  as(key: string): Actor;
  /** Absolute path to a Playwright storageState file for this persona. */
  storageState(key: string): string;
  /** Restore the snapshot. Call in beforeEach for per-test isolation. */
  reset(): Promise<void>;
  users: Record<string, Persona>;
}

export type World<H> = H & WorldApi;
