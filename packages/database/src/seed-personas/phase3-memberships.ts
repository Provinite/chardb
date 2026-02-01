/**
 * Phase 3: Role Assignments
 * Assigns users to their appropriate community roles via GraphQL
 */

import { User } from "@prisma/client";
import {
  GraphQLClient,
  MUTATIONS,
  CreateCommunityMemberResponse,
} from "./graphql-client";
import { PERSONA_LIST, PersonaDefinition, PERSONAS } from "./personas";
import { log, isAlreadyExistsError } from "./utils";

interface RoleInfo {
  id: string;
  name: string;
}

interface CommunityMemberNode {
  id: string;
  userId: string;
  roleId: string;
}

interface CommunityMembersResponse {
  communityMembersByCommunity: {
    nodes: CommunityMemberNode[];
  };
}

const QUERY_COMMUNITY_MEMBERS = `
  query CommunityMembersByCommunity($communityId: ID!, $first: Int!) {
    communityMembersByCommunity(communityId: $communityId, first: $first) {
      nodes {
        id
        userId
        roleId
      }
    }
  }
`;

async function getExistingMemberships(
  client: GraphQLClient,
  communityId: string
): Promise<Map<string, CommunityMemberNode>> {
  const response = await client.request<CommunityMembersResponse>(
    QUERY_COMMUNITY_MEMBERS,
    { communityId, first: 100 }
  );

  const memberships = new Map<string, CommunityMemberNode>();
  for (const member of response.communityMembersByCommunity.nodes) {
    memberships.set(member.userId, member);
  }
  return memberships;
}

async function createMembership(
  client: GraphQLClient,
  userId: string,
  roleId: string
): Promise<void> {
  await client.request<CreateCommunityMemberResponse>(
    MUTATIONS.createCommunityMember,
    {
      input: {
        userId,
        roleId,
      },
    }
  );
}

export async function runPhase3(
  client: GraphQLClient,
  users: Map<string, User>,
  communityId: string,
  roles: Map<string, RoleInfo>
): Promise<void> {
  log.phase("Phase 3: Assigning roles...");

  // Get existing memberships
  const existingMemberships = await getExistingMemberships(client, communityId);

  let assignedCount = 0;
  let existsCount = 0;
  let errorCount = 0;

  for (const persona of PERSONA_LIST) {
    const user = users.get(persona.email);
    if (!user) {
      log.error(`${persona.displayName}: User not found`);
      errorCount++;
      continue;
    }

    // Skip site admin - they were already assigned Admin role when creating the community
    if (persona.email === PERSONAS.siteAdmin.email) {
      log.skip(`${persona.displayName} -> ${persona.roleName} (community creator)`);
      existsCount++;
      continue;
    }

    const role = roles.get(persona.roleName);
    if (!role) {
      log.error(`${persona.displayName}: Role "${persona.roleName}" not found`);
      errorCount++;
      continue;
    }

    // Check if already a member
    const existingMembership = existingMemberships.get(user.id);
    if (existingMembership) {
      // User is already a member - check if same role
      if (existingMembership.roleId === role.id) {
        log.skip(`${persona.displayName} -> ${persona.roleName} (exists)`);
        existsCount++;
      } else {
        log.skip(`${persona.displayName} -> ${persona.roleName} (has different role)`);
        existsCount++;
      }
      continue;
    }

    try {
      await createMembership(client, user.id, role.id);
      log.success(`${persona.displayName} -> ${persona.roleName}`);
      assignedCount++;
    } catch (error) {
      if (error instanceof Error && isAlreadyExistsError(error)) {
        log.skip(`${persona.displayName} -> ${persona.roleName} (exists)`);
        existsCount++;
      } else {
        log.error(`${persona.displayName}: ${error instanceof Error ? error.message : String(error)}`);
        errorCount++;
      }
    }
  }

  log.info(
    `Memberships: ${assignedCount} assigned, ${existsCount} existing, ${errorCount} errors`
  );
}
