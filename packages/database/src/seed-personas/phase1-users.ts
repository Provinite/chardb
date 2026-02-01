/**
 * Phase 1: User Bootstrap
 * Creates all user personas directly via Prisma (bypasses invite code requirement)
 */

import { PrismaClient, User } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PERSONA_LIST, PersonaDefinition } from "./personas";
import { log } from "./utils";

const BCRYPT_ROUNDS = 10;

export interface Phase1Result {
  users: Map<string, User>;
}

async function createOrUpdateUser(
  prisma: PrismaClient,
  persona: PersonaDefinition
): Promise<{ user: User; created: boolean }> {
  const passwordHash = await bcrypt.hash(persona.password, BCRYPT_ROUNDS);

  const existingUser = await prisma.user.findUnique({
    where: { email: persona.email },
  });

  if (existingUser) {
    // Update to ensure permissions are correct
    const user = await prisma.user.update({
      where: { email: persona.email },
      data: {
        isAdmin: persona.globalPermissions.isAdmin,
        canCreateCommunity: persona.globalPermissions.canCreateCommunity,
        canListUsers: persona.globalPermissions.canListUsers,
        canListInviteCodes: persona.globalPermissions.canListInviteCodes,
        canCreateInviteCode: persona.globalPermissions.canCreateInviteCode,
        canGrantGlobalPermissions:
          persona.globalPermissions.canGrantGlobalPermissions,
        isVerified: true,
      },
    });
    return { user, created: false };
  }

  const user = await prisma.user.create({
    data: {
      username: persona.username,
      email: persona.email,
      displayName: persona.displayName,
      passwordHash,
      isAdmin: persona.globalPermissions.isAdmin,
      canCreateCommunity: persona.globalPermissions.canCreateCommunity,
      canListUsers: persona.globalPermissions.canListUsers,
      canListInviteCodes: persona.globalPermissions.canListInviteCodes,
      canCreateInviteCode: persona.globalPermissions.canCreateInviteCode,
      canGrantGlobalPermissions:
        persona.globalPermissions.canGrantGlobalPermissions,
      isVerified: true,
    },
  });

  return { user, created: true };
}

export async function runPhase1(prisma: PrismaClient): Promise<Phase1Result> {
  log.phase("Phase 1: Creating users...");

  const users = new Map<string, User>();
  let createdCount = 0;
  let existsCount = 0;

  for (const persona of PERSONA_LIST) {
    const { user, created } = await createOrUpdateUser(prisma, persona);
    users.set(persona.email, user);

    if (created) {
      log.success(`${persona.email} (created)`);
      createdCount++;
    } else {
      log.skip(`${persona.email} (exists)`);
      existsCount++;
    }
  }

  log.info(`Users: ${createdCount} created, ${existsCount} existing`);

  return { users };
}
