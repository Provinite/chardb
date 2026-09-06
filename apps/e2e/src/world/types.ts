import type { PrismaClient } from "@chardb/database";
import type { TypedDocumentNode } from "@graphql-typed-document-node/core";

export interface Persona {
  /** The key used in `ctx.user(key)` / `world.as(key)`. */
  key: string;
  userId: string;
  username: string;
  email: string;
  password: string;
  accessToken: string;
  /**
   * The VALUE of the `chardb_rt` cookie the login response set -- not a token
   * the API will accept as an argument.
   *
   * Named for what it is because that is all it can be used as now: the
   * refresh token travels as an `HttpOnly` cookie and `refreshToken` takes no
   * arguments (#339). The harness's only use for it is writing a Playwright
   * cookie that stands in for having signed in.
   */
  refreshCookie: string;
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
  /**
   * POSTs to /graphql as this actor. Throws on any GraphQL error.
   *
   * Takes a generated TypedDocumentNode from src/generated/graphql.ts, so the
   * result and variables types both come from the schema. A renamed field or a
   * new required input fails `yarn codegen` / `yarn type-check`, not at runtime.
   */
  gql<TResult, TVariables>(
    document: TypedDocumentNode<TResult, TVariables>,
    variables?: TVariables,
  ): Promise<TResult>;
  /**
   * `gql`, plus the HTTP response.
   *
   * For the one thing that lives outside the GraphQL payload: the refresh
   * cookie a login sets. Prefer `gql` everywhere else.
   */
  gqlWithResponse<TResult, TVariables>(
    document: TypedDocumentNode<TResult, TVariables>,
    variables?: TVariables,
  ): Promise<{ data: TResult; response: Response }>;
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
