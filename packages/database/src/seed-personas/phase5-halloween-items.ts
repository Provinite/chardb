/**
 * Phase 5: Halloween and Items
 * Turns the Halloween event on for the test community, gives the Member
 * persona a Discord link and an empty candy board, and adds an item type to
 * grant. Through Prisma: the guild and the Discord account come from Discord
 * in production, with no API to set them.
 */

import { ExternalAccountProvider, PrismaClient, User } from "@prisma/client";
import { PERSONAS } from "./personas";
import { log } from "./utils";

/** Discord ids; nothing calls Discord, so any snowflake-shaped string does. */
const GUILD_ID = "100000000000000099";
const MEMBER_DISCORD_ID = "200000000000000099";

export const TEST_ITEM_TYPE_NAME = "Test Lantern";

export interface Phase5Result {
  boardId: string;
}

export async function runPhase5(
  prisma: PrismaClient,
  users: Map<string, User>,
  communityId: string,
): Promise<Phase5Result> {
  log.phase("Phase 5: Halloween and items...");

  await prisma.community.update({
    where: { id: communityId },
    data: { discordGuildId: GUILD_ID, halloweenEnabled: true },
  });
  log.success("Halloween event on, Discord server linked");

  const member = users.get(PERSONAS.member.email);
  if (!member) throw new Error("Member persona missing");

  await prisma.externalAccount.upsert({
    where: {
      provider_userId: {
        provider: ExternalAccountProvider.DISCORD,
        userId: member.id,
      },
    },
    update: {},
    create: {
      userId: member.id,
      provider: ExternalAccountProvider.DISCORD,
      providerAccountId: MEMBER_DISCORD_ID,
      displayName: member.username,
    },
  });

  const existing = await prisma.halloweenCandyBoard.findFirst({
    where: { guildId: GUILD_ID, userId: MEMBER_DISCORD_ID },
  });
  const board =
    existing ??
    (await prisma.halloweenCandyBoard.create({
      data: { guildId: GUILD_ID, userId: MEMBER_DISCORD_ID },
    }));
  if (existing) log.skip("Member's candy board (exists)");
  else log.success("Member's candy board (created)");

  await prisma.itemType.upsert({
    where: {
      name_communityId: { name: TEST_ITEM_TYPE_NAME, communityId },
    },
    update: {},
    create: {
      name: TEST_ITEM_TYPE_NAME,
      description: "Something to grant.",
      communityId,
    },
  });
  log.success(`${TEST_ITEM_TYPE_NAME} item type`);

  return { boardId: board.id };
}
