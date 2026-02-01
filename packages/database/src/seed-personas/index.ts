/**
 * User Persona Seeding Script - Orchestrator
 *
 * Creates standard user personas for local testing:
 * - Site Admin: Full system access
 * - Community Admin: Admin role in test community
 * - Moderator: Moderator role
 * - Member: Basic member role
 * - Member (Registry Edit): Can edit registry fields on own characters
 * - Member (No Registry): Cannot edit registry fields
 */

import { PrismaClient } from "@prisma/client";
import { GraphQLClient } from "./graphql-client";
import { runPhase1 } from "./phase1-users";
import { runPhase2 } from "./phase2-community";
import { runPhase3 } from "./phase3-memberships";
import { runPhase4 } from "./phase4-sample-data";
import { log } from "./utils";
import { TEST_COMMUNITY_NAME, PERSONA_LIST, TEST_PASSWORD } from "./personas";

export interface SeedPersonasOptions {
  graphqlEndpoint?: string;
  skipSampleData?: boolean;
}

export async function seedPersonas(
  options: SeedPersonasOptions = {}
): Promise<void> {
  const { graphqlEndpoint = "http://localhost:4000/graphql", skipSampleData = false } =
    options;

  const prisma = new PrismaClient();
  const client = new GraphQLClient(graphqlEndpoint);

  try {
    console.log("\n========================================");
    console.log("  User Persona Seeding Script");
    console.log("========================================\n");
    console.log(`GraphQL Endpoint: ${graphqlEndpoint}`);
    console.log(`Personas to create: ${PERSONA_LIST.length}`);

    // Phase 1: Create users via Prisma
    const phase1Result = await runPhase1(prisma);

    // Phase 2: Create community and roles via GraphQL
    const phase2Result = await runPhase2(client, phase1Result.users);

    // Phase 3: Assign users to roles via GraphQL
    await runPhase3(
      client,
      phase1Result.users,
      phase2Result.communityId,
      phase2Result.roles
    );

    // Phase 4: Create sample data (optional)
    if (!skipSampleData) {
      await runPhase4(client, phase1Result.users, phase2Result.communityId);
    } else {
      log.phase("Phase 4: Skipped (--skip-sample-data)");
    }

    // Summary
    console.log("\n========================================");
    console.log("  Summary");
    console.log("========================================\n");
    console.log(`Community: ${TEST_COMMUNITY_NAME}`);
    console.log(`Users created: ${PERSONA_LIST.length}`);
    console.log(`Roles available: ${phase2Result.roles.size}`);
    console.log(`\nTest credentials (all users):`);
    console.log(`  Password: ${TEST_PASSWORD}`);
    console.log(`\nPersona emails:`);
    for (const persona of PERSONA_LIST) {
      console.log(`  - ${persona.email} (${persona.displayName})`);
    }

    log.done("All personas ready for testing!");
  } catch (error) {
    console.error("\nError during seeding:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Re-export for external use
export { PERSONAS, PERSONA_LIST, TEST_PASSWORD, TEST_COMMUNITY_NAME } from "./personas";
