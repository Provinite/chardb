/**
 * The members page and the permission matrix read the same field,
 * `communityMembersByCommunity`, through one cache policy: the page in pages
 * of 50 with "Load more", the matrix as one page of 100 that it refetches
 * after every role change.
 */
import { describe, it, expect } from "vitest";
import { createCache } from "../apolloCache";
import {
  CommunityMembersWithRolesDocument,
  type CommunityMembersWithRolesQuery,
  type CommunityMembersWithRolesQueryVariables,
} from "../../generated/graphql";

type Member =
  CommunityMembersWithRolesQuery["communityMembersByCommunity"]["nodes"][number];

const member = (id: string): Member => ({
  __typename: "CommunityMember",
  id,
  userId: `user-${id}`,
  roleId: "role-1",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  user: {
    __typename: "User",
    id: `user-${id}`,
    username: id,
    email: `${id}@example.com`,
    displayName: null,
    avatarImage: null,
  },
  role: {
    __typename: "Role",
    id: "role-1",
    name: "Member",
    canCreateSpecies: false,
    canCreateCharacter: false,
    canCreateOrphanedCharacter: false,
    canEditCharacter: false,
    canEditOwnCharacter: false,
    canEditOwnCharacterRegistry: false,
    canEditCharacterRegistry: false,
    canEditSpecies: false,
    canManageItems: false,
    canGrantItems: false,
    canUploadOwnCharacterImages: false,
    canUploadCharacterImages: false,
    canModerateImages: false,
    canDeleteCharacter: false,
    canCreateInviteCode: false,
    canListInviteCodes: false,
    canCreateRole: false,
    canEditRole: false,
    canRemoveCommunityMember: false,
    canManageMemberRoles: false,
  },
});

const communityId = "community-1";
const cache = () => createCache();

const write = (
  c: ReturnType<typeof createCache>,
  variables: CommunityMembersWithRolesQueryVariables,
  ids: string[],
  hasNextPage = false,
) =>
  c.writeQuery({
    query: CommunityMembersWithRolesDocument,
    variables,
    data: {
      communityMembersByCommunity: {
        __typename: "CommunityMemberConnection",
        nodes: ids.map(member),
        totalCount: 9,
        hasNextPage,
        hasPreviousPage: Boolean(variables.after),
      },
    },
  });

const read = (
  c: ReturnType<typeof createCache>,
  variables: CommunityMembersWithRolesQueryVariables,
) =>
  c
    .readQuery({ query: CommunityMembersWithRolesDocument, variables })
    ?.communityMembersByCommunity.nodes.map((n) => n.id);

describe("communityMembersByCommunity in the cache", () => {
  it("appends the members page's Load more to its list", () => {
    const c = cache();
    write(c, { communityId, first: 50 }, ["a", "b"], true);
    write(c, { communityId, first: 50, after: "b" }, ["c"]);

    expect(read(c, { communityId, first: 50 })).toEqual(["a", "b", "c"]);
  });

  it("keeps the permission matrix's 100 apart from the members page", () => {
    const c = cache();
    write(c, { communityId, first: 50 }, ["a", "b"], true);
    write(c, { communityId, first: 50, after: "b" }, ["c"]);
    write(c, { communityId, first: 100, after: null }, ["a", "b", "c", "d"]);

    expect(read(c, { communityId, first: 100, after: null })).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
    expect(read(c, { communityId, first: 50 })).toEqual(["a", "b", "c"]);
  });

  it("replaces the permission matrix's list when it refetches", () => {
    const c = cache();
    write(c, { communityId, first: 100, after: null }, ["a", "b"]);
    write(c, { communityId, first: 100, after: null }, ["a", "b"]);

    expect(read(c, { communityId, first: 100, after: null })).toEqual([
      "a",
      "b",
    ]);
  });

  it("keeps a search's results apart from the full list", () => {
    const c = cache();
    write(c, { communityId, first: 50 }, ["a", "b"]);
    write(c, { communityId, first: 50, search: "b" }, ["b"]);

    expect(read(c, { communityId, first: 50 })).toEqual(["a", "b"]);
    expect(read(c, { communityId, first: 50, search: "b" })).toEqual(["b"]);
  });
});
