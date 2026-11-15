import type {
  CommunityPermissions,
  RequestPermissions,
} from "../src/auth/request-permissions";
import { CommunityPermission } from "../src/auth/CommunityPermission";
import { GlobalPermission } from "../src/auth/GlobalPermission";

/** A {@link RequestPermissions} a spec can assert against and re-script. */
export interface FakePermissions extends RequestPermissions {
  isAdmin: boolean;
  hasGlobal: jest.Mock<boolean, [GlobalPermission]>;
  inCommunity: jest.Mock<Promise<CommunityPermissions>, [string]>;
  hasInCommunity: jest.Mock<Promise<boolean>, [string, CommunityPermission]>;
  communityIdsWith: jest.Mock<Promise<string[]>, CommunityPermission[]>;
}

/**
 * A caller's permissions for a unit spec.
 *
 * `inCommunity` is what the caller holds in every community asked about, and
 * `hasInCommunity` answers from it. `communityIdsWith` lists no communities
 * and `hasGlobal` grants only `isAdmin`, until a spec re-scripts them.
 */
export function fakePermissions(
  options: {
    isAdmin?: boolean;
    inCommunity?: Partial<CommunityPermissions>;
  } = {},
): FakePermissions {
  const held: CommunityPermissions = {
    hasMembership: options.inCommunity !== undefined,
    ...options.inCommunity,
  };
  const holds = (permission: CommunityPermission) =>
    permission === CommunityPermission.Any
      ? held.hasMembership
      : held[permission] === true;

  const fake: FakePermissions = {
    isAdmin: options.isAdmin ?? false,
    hasGlobal: jest.fn<boolean, [GlobalPermission]>(
      (permission) => permission === GlobalPermission.IsAdmin && fake.isAdmin,
    ),
    inCommunity: jest.fn<Promise<CommunityPermissions>, [string]>(
      async () => held,
    ),
    hasInCommunity: jest.fn<Promise<boolean>, [string, CommunityPermission]>(
      async (_communityId, permission) => holds(permission),
    ),
    communityIdsWith: jest.fn<Promise<string[]>, CommunityPermission[]>(
      async () => [],
    ),
  };
  return fake;
}
