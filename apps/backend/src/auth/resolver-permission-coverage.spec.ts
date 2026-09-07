import { readdirSync } from "node:fs";
import { join, relative } from "node:path";
import {
  RESOLVER_TYPE_METADATA,
  RESOLVER_PROPERTY_METADATA,
} from "@nestjs/graphql/dist/graphql.constants";

import { AllowGlobalPermission } from "./decorators/AllowGlobalPermission";
import { AllowCommunityPermission } from "./decorators/AllowCommunityPermission";
import { AllowEntityOwner } from "./decorators/AllowEntityOwner";
import { AllowSelf } from "./decorators/AllowSelf";
import { AllowCharacterProfileEditor } from "./decorators/AllowCharacterProfileEditor";
import { AllowCharacterRegistryEditor } from "./decorators/AllowCharacterRegistryEditor";
import { AllowAnyAuthenticated } from "./decorators/AllowAnyAuthenticated";
import { AllowUnauthenticated } from "./decorators/AllowUnauthenticated";

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

const resolverFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return resolverFiles(full);
    // Both `.spec.ts` and `.e2e.spec.ts` end in `.ts` and neither ends in
    // `.resolver.ts`, so this excludes them without naming them.
    return entry.name.endsWith(".resolver.ts") ? [full] : [];
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

const collectResolverMethods = (): ResolverMethod[] => {
  const found: ResolverMethod[] = [];

  for (const file of resolverFiles(SRC_ROOT)) {
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

        const kind = resolverKind(descriptor.value as object);
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

describe("resolver permission coverage", () => {
  const methods = collectResolverMethods();

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
});
