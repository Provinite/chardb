import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { RequestMethod } from "@nestjs/common";
import { GUARDS_METADATA, METHOD_METADATA } from "@nestjs/common/constants";
import {
  RESOLVER_TYPE_METADATA,
  RESOLVER_PROPERTY_METADATA,
} from "@nestjs/graphql/dist/graphql.constants";

import { ResolveCommunityFrom } from "./decorators/ResolveCommunityFrom";
import { AllowGlobalPermission } from "./decorators/AllowGlobalPermission";
import { AllowCommunityPermission } from "./decorators/AllowCommunityPermission";
import { AllowEntityOwner } from "./decorators/AllowEntityOwner";
import { AllowSelf } from "./decorators/AllowSelf";
import { AllowCharacterProfileEditor } from "./decorators/AllowCharacterProfileEditor";
import { AllowCharacterRegistryEditor } from "./decorators/AllowCharacterRegistryEditor";
import { AllowAnyAuthenticated } from "./decorators/AllowAnyAuthenticated";
import { AllowUnauthenticated } from "./decorators/AllowUnauthenticated";
import { AllowAccessToken } from "./decorators/AllowAccessToken";

/**
 * Every resolver method must say who may call it.
 *
 * The app is deny-by-default: `main.ts` installs `PERMISSION_OR_GUARD`, an
 * `OrGuard` over eight guards, and each one returns false when its decorator is
 * absent. So a `@Query`, `@Mutation`, `@ResolveField` or `@Subscription` with no
 * `@Allow*` is not "unprotected" -- it is unconditionally forbidden to
 * everyone, admins included.
 *
 * That failure is invisible in review and nearly invisible at runtime. A
 * non-nullable field's 403 propagates to its parent and nulls it, so the symptom
 * shows up somewhere else entirely: a public gallery reported as missing
 * (#173), a comment form that vanished when the list behind it failed (#310).
 * Each was one missing decorator, and each was found only after a user reported
 * the wrong thing.
 *
 * The decorators below are the ones the guards actually read, imported rather
 * than matched by name, so this cannot drift from `auth.module.ts`. The lookup
 * mirrors the guards' own `getAllAndOverride([handler, class])`, so a
 * class-level `@Allow*` counts here exactly as it would at runtime.
 */

/**
 * Every decorator that satisfies a sub-guard of `PERMISSION_OR_GUARD`.
 *
 * Held as `{ KEY }` because each `ReflectableDecorator<T>` carries a different
 * `T`, so they do not unify into one array that `reflector.getAllAndOverride`
 * will accept. The `KEY` is the metadata key that call would look up anyway.
 */
const PERMISSION_DECORATORS: { KEY: string }[] = [
  AllowGlobalPermission,
  AllowCommunityPermission,
  AllowEntityOwner,
  AllowSelf,
  AllowCharacterProfileEditor,
  AllowCharacterRegistryEditor,
  AllowAnyAuthenticated,
  AllowUnauthenticated,
];

/**
 * Low enough never to flake, high enough to fail if the walk finds nothing.
 * Without it a broken path or a rename would make the assertion below pass
 * vacuously, which is the one way a test like this fails silently.
 */
const MINIMUM_EXPECTED_RESOLVERS = 300;

const SRC_ROOT = join(__dirname, "..");

const sourceFiles = (dir: string, suffix: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full, suffix);
    // Both `.spec.ts` and `.e2e.spec.ts` end in `.ts` and neither ends in
    // `.resolver.ts` or `.controller.ts`, so this excludes them without
    // naming them.
    return entry.name.endsWith(suffix) ? [full] : [];
  });

interface ResolverMethod {
  file: string;
  className: string;
  methodName: string;
  kind: string;
  handler: object;
  target: object;
}

const isClass = (value: unknown): value is { prototype: object } =>
  typeof value === "function" &&
  Boolean((value as { prototype?: object }).prototype);

/** The GraphQL kind of a method, or null when it is not a resolver at all. */
const resolverKind = (fn: object): string | null => {
  const type: unknown = Reflect.getMetadata(RESOLVER_TYPE_METADATA, fn);
  if (typeof type === "string") return type;
  // @ResolveField records a boolean under its own key rather than a kind.
  return Reflect.getMetadata(RESOLVER_PROPERTY_METADATA, fn)
    ? "ResolveField"
    : null;
};

/** The HTTP verb of a controller method, or null when it is not a route. */
const routeKind = (fn: object): string | null => {
  const verb: unknown = Reflect.getMetadata(METHOD_METADATA, fn);
  return typeof verb === "number" ? (RequestMethod[verb] ?? null) : null;
};

const collectMethods = (
  suffix: string,
  kindOf: (fn: object) => string | null,
): ResolverMethod[] => {
  const found: ResolverMethod[] = [];

  for (const file of sourceFiles(SRC_ROOT, suffix)) {
    // Dynamic by necessity: the point of this test is to find resolver files
    // rather than be told about them, so a static import list would be the
    // very thing that goes stale.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const moduleExports = require(file) as Record<string, unknown>;

    for (const [exportName, exported] of Object.entries(moduleExports)) {
      if (!isClass(exported)) continue;
      const proto = exported.prototype;

      for (const methodName of Object.getOwnPropertyNames(proto)) {
        if (methodName === "constructor") continue;
        const descriptor = Object.getOwnPropertyDescriptor(proto, methodName);
        if (typeof descriptor?.value !== "function") continue;

        const kind = kindOf(descriptor.value as object);
        if (!kind) continue;

        found.push({
          file: relative(SRC_ROOT, file),
          className: exportName,
          methodName,
          kind,
          handler: descriptor.value as object,
          target: exported as object,
        });
      }
    }
  }

  return found;
};

const describeMethod = (m: ResolverMethod): string =>
  `${m.file} — ${m.className}.${m.methodName} (@${m.kind})`;

/**
 * The same question `getAllAndOverride([handler, class])` asks: is this
 * decorator present on the method, or failing that on its class?
 */
const hasDecorator = (m: ResolverMethod, key: string): boolean =>
  Reflect.getMetadata(key, m.handler) !== undefined ||
  Reflect.getMetadata(key, m.target) !== undefined;

/** A decorator's value as the guards read it: the method's, else its class's. */
const decoratorValue = (m: ResolverMethod, key: string): unknown =>
  Reflect.getMetadata(key, m.handler) ?? Reflect.getMetadata(key, m.target);

/** A config object in one stable spelling. */
const spell = (config: unknown): string =>
  JSON.stringify(config, Object.keys(config as object).sort());

/**
 * Who may call a method, in one line.
 *
 * The `@Allow*` decorators are alternatives: `PERMISSION_OR_GUARD` admits the
 * caller when any one is satisfied, so they are joined with "or". A guard
 * named in `@UseGuards` runs after that and has to pass as well, so those are
 * joined with "and".
 */
const describeAccess = (m: ResolverMethod): string => {
  const allowed: string[] = [];
  const value = (decorator: { KEY: string }) =>
    decoratorValue(m, decorator.KEY);

  if (value(AllowUnauthenticated) !== undefined) allowed.push("anyone");
  if (value(AllowAnyAuthenticated) !== undefined) allowed.push("signed in");

  const global = value(AllowGlobalPermission);
  if (global !== undefined) allowed.push(`global ${String(global)}`);

  const community = value(AllowCommunityPermission);
  if (community !== undefined) {
    const from = value(ResolveCommunityFrom);
    allowed.push(
      `community ${String(community)} of ${from === undefined ? "NOTHING" : spell(from)}`,
    );
  }

  const owner = value(AllowEntityOwner);
  if (owner !== undefined) allowed.push(`owner of ${spell(owner)}`);

  const self = value(AllowSelf);
  if (self !== undefined) allowed.push(`self ${spell(self)}`);

  const profile = value(AllowCharacterProfileEditor);
  if (profile !== undefined) {
    allowed.push(`character profile editor ${spell(profile)}`);
  }

  const registry = value(AllowCharacterRegistryEditor);
  if (registry !== undefined) {
    allowed.push(`character registry editor ${spell(registry)}`);
  }

  const routeGuards = [
    ...((Reflect.getMetadata(GUARDS_METADATA, m.target) as unknown[]) ?? []),
    ...((Reflect.getMetadata(GUARDS_METADATA, m.handler) as unknown[]) ?? []),
  ].map((guard) => (guard as { name?: string }).name ?? "anonymous guard");

  return [
    allowed.length > 0 ? allowed.join(" or ") : "NOBODY",
    ...routeGuards.map((name) => `and ${name}`),
    ...(value(AllowAccessToken) !== undefined
      ? ["(access tokens admitted)"]
      : []),
  ].join(" ");
};

/**
 * Handlers that change credentials, sessions, linked accounts or tokens.
 * A personal access token must never reach them, so none may carry
 * `@AllowAccessToken()`. A whole class is named by its name alone.
 */
const NEVER_FOR_ACCESS_TOKENS = [
  "AuthResolver",
  "EmailVerificationResolver",
  "ExternalAccountsResolver",
  "PersonalAccessTokensResolver",
  "DeviantArtOAuthController",
  "DiscordOAuthController",
  "ToyhouseOAuthController",
  "PatreonOAuthController",
  "UsersResolver.updateProfile",
];

const MANIFEST_PATH = join(__dirname, "permission-manifest.txt");

const MANIFEST_HEADER = [
  "# Who may call every GraphQL resolver method and REST route in the backend.",
  "#",
  "# Generated from the @Allow* decorators and @UseGuards on each method by",
  "# apps/backend/src/auth/resolver-permission-coverage.spec.ts, which fails",
  "# when this file and the code disagree. A change here is a change to who",
  "# may do what: read the diff as that.",
  "#",
  "# To update, from apps/backend:",
  "#   UPDATE_PERMISSION_MANIFEST=1 yarn jest src/auth/resolver-permission-coverage.spec.ts",
  "#",
  "# Alternatives are joined with 'or'; a guard after 'and' must pass as well.",
  "# This is the gate in front of a method. A check the method or its service",
  "# makes afterwards is not shown.",
  "",
].join("\n");

const buildManifest = (methods: ResolverMethod[]): string => {
  const lines = methods
    .map(
      (m) => `${m.className}.${m.methodName} (${m.kind}): ${describeAccess(m)}`,
    )
    .sort();
  return `${MANIFEST_HEADER}${lines.join("\n")}\n`;
};

describe("resolver permission coverage", () => {
  const methods = collectMethods(".resolver.ts", resolverKind);
  const routes = collectMethods(".controller.ts", routeKind);

  it("finds the resolver methods to check", () => {
    expect(methods.length).toBeGreaterThan(MINIMUM_EXPECTED_RESOLVERS);
  });

  it("every resolver method carries at least one @Allow* decorator", () => {
    const undecorated = methods
      .filter((m) => !PERMISSION_DECORATORS.some((d) => hasDecorator(m, d.KEY)))
      .map(describeMethod);

    // Listed rather than counted: the point of failing is to name the method,
    // since the runtime symptom never will.
    expect(undecorated).toEqual([]);
  });

  it("opens no credential handler to personal access tokens", () => {
    const named = new Set(NEVER_FOR_ACCESS_TOKENS);
    const handlers = [...methods, ...routes].filter(
      (m) =>
        named.has(m.className) || named.has(`${m.className}.${m.methodName}`),
    );

    // Every name on the list still finds something, or the list has gone stale.
    for (const name of NEVER_FOR_ACCESS_TOKENS) {
      expect(
        handlers.some(
          (m) =>
            m.className === name || `${m.className}.${m.methodName}` === name,
        ),
      ).toBe(true);
    }
    expect(
      handlers
        .filter((m) => hasDecorator(m, AllowAccessToken.KEY))
        .map(describeMethod),
    ).toEqual([]);
  });

  /**
   * Who may call what, written down.
   *
   * The check above says every method has a gate. This says which gate, so a
   * decorator that is swapped, loosened or dropped shows up as a changed line
   * in a file a reviewer reads, and not only as a behaviour somebody has to
   * think to test. `permission-guards.e2e.spec.ts` is the other half: it
   * shows each kind of gate admitting and refusing who it should.
   */
  it("matches the committed permission manifest", () => {
    const manifest = buildManifest([...methods, ...routes]);

    if (process.env.UPDATE_PERMISSION_MANIFEST) {
      writeFileSync(MANIFEST_PATH, manifest);
    }

    expect(manifest).toEqual(readFileSync(MANIFEST_PATH, "utf8"));
  });
});
