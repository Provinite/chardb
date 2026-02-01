/**
 * Phase 2: Community Setup
 * Creates the test community and custom roles via GraphQL
 */

import { User } from "@prisma/client";
import {
  GraphQLClient,
  MUTATIONS,
  QUERIES,
  LoginResponse,
  CreateCommunityResponse,
  CreateRoleResponse,
  CommunitiesResponse,
  RolesByCommunityResponse,
} from "./graphql-client";
import { PERSONAS, TEST_COMMUNITY_NAME, PERSONA_LIST } from "./personas";
import { log, isAlreadyExistsError } from "./utils";

interface RoleInfo {
  id: string;
  name: string;
}

export interface Phase2Result {
  communityId: string;
  roles: Map<string, RoleInfo>;
  token: string;
}

async function loginAsSiteAdmin(client: GraphQLClient): Promise<string> {
  const siteAdmin = PERSONAS.siteAdmin;

  const response = await client.request<LoginResponse>(MUTATIONS.login, {
    input: {
      email: siteAdmin.email,
      password: siteAdmin.password,
    },
  });

  return response.login.accessToken;
}

async function findOrCreateCommunity(
  client: GraphQLClient
): Promise<{ id: string; created: boolean }> {
  // Check if community already exists
  const communitiesResponse = await client.request<CommunitiesResponse>(
    QUERIES.communities,
    { first: 100 }
  );

  const existingCommunity = communitiesResponse.communities.nodes.find(
    (c) => c.name === TEST_COMMUNITY_NAME
  );

  if (existingCommunity) {
    return { id: existingCommunity.id, created: false };
  }

  // Create community
  const response = await client.request<CreateCommunityResponse>(
    MUTATIONS.createCommunity,
    {
      input: {
        name: TEST_COMMUNITY_NAME,
      },
    }
  );

  return { id: response.createCommunity.id, created: true };
}

async function getExistingRoles(
  client: GraphQLClient,
  communityId: string
): Promise<Map<string, RoleInfo>> {
  const response = await client.request<RolesByCommunityResponse>(
    QUERIES.rolesByCommunity,
    { communityId, first: 100 }
  );

  const roles = new Map<string, RoleInfo>();
  for (const role of response.rolesByCommunity.nodes) {
    roles.set(role.name, { id: role.id, name: role.name });
  }
  return roles;
}

async function createCustomRoles(
  client: GraphQLClient,
  communityId: string,
  existingRoles: Map<string, RoleInfo>
): Promise<Map<string, RoleInfo>> {
  const roles = new Map(existingRoles);

  // Find personas that need custom roles
  const customRolePersonas = PERSONA_LIST.filter((p) => p.isCustomRole);

  for (const persona of customRolePersonas) {
    if (roles.has(persona.roleName)) {
      log.skip(`${persona.roleName} role (exists)`);
      continue;
    }

    const permissions = persona.customRolePermissions;
    if (!permissions) {
      log.error(`${persona.roleName} missing customRolePermissions`);
      continue;
    }

    try {
      const response = await client.request<CreateRoleResponse>(
        MUTATIONS.createRole,
        {
          input: {
            name: persona.roleName,
            communityId,
            canCreateCharacter: permissions.canCreateCharacter,
            canEditOwnCharacter: permissions.canEditOwnCharacter,
            canEditOwnCharacterRegistry: permissions.canEditOwnCharacterRegistry,
            canUploadOwnCharacterImages: permissions.canUploadOwnCharacterImages,
          },
        }
      );

      roles.set(persona.roleName, {
        id: response.createRole.id,
        name: response.createRole.name,
      });
      log.success(`${persona.roleName} role (created)`);
    } catch (error) {
      if (error instanceof Error && isAlreadyExistsError(error)) {
        log.skip(`${persona.roleName} role (exists)`);
      } else {
        throw error;
      }
    }
  }

  return roles;
}

export async function runPhase2(
  client: GraphQLClient,
  users: Map<string, User>
): Promise<Phase2Result> {
  log.phase("Phase 2: Setting up community...");

  // Login as site admin
  log.info("Logging in as Site Admin...");
  const token = await loginAsSiteAdmin(client);
  client.setToken(token);

  // Find or create community
  const { id: communityId, created: communityCreated } =
    await findOrCreateCommunity(client);

  if (communityCreated) {
    log.success(`${TEST_COMMUNITY_NAME} (created)`);
  } else {
    log.skip(`${TEST_COMMUNITY_NAME} (exists)`);
  }

  // Get existing roles (includes default Admin, Moderator, Member)
  const existingRoles = await getExistingRoles(client, communityId);
  log.info(
    `Found ${existingRoles.size} existing roles: ${Array.from(existingRoles.keys()).join(", ")}`
  );

  // Create custom roles
  const roles = await createCustomRoles(client, communityId, existingRoles);

  return { communityId, roles, token };
}
