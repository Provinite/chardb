import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { DatabaseService } from "../../database/database.service";
import type { DiscordService } from "../../discord/discord.service";
import type { PendingOwnerNames } from "../pending-ownership.service";

const DISCORD_ID = /^\d{17,19}$/;

/**
 * Resolve what staff typed for a Discord pending owner -- an id or a
 * username -- to the id a linked account will carry, and the names it goes by
 * now, which staff find a pending owner by (#445).
 *
 * The one resolver for every grant path, items and characters alike.
 *
 * @param communityId Whose Discord server a username is looked up in.
 * @throws NotFoundException if Discord does not know the user
 * @throws BadRequestException if a username is given and the community has no
 *   Discord server connected
 * @throws ServiceUnavailableException if Discord cannot be reached
 */
export async function resolveDiscordOwner(
  deps: {
    db: Pick<DatabaseService, "community">;
    discord: Pick<DiscordService, "getUserInfo" | "resolveUsernameToId">;
  },
  communityId: string,
  identifier: string,
): Promise<{ accountId: string; names: PendingOwnerNames }> {
  const accountId = DISCORD_ID.test(identifier)
    ? identifier
    : await resolveUsername(deps, communityId, identifier);

  // Also the existence check for an id: Discord answers 404 for nobody.
  const user = await deps.discord.getUserInfo(accountId);
  return {
    accountId,
    names: { displayIdentifier: user.username, displayName: user.displayName },
  };
}

async function resolveUsername(
  deps: Parameters<typeof resolveDiscordOwner>[0],
  communityId: string,
  identifier: string,
): Promise<string> {
  const community = await deps.db.community.findUnique({
    where: { id: communityId },
    select: { discordGuildId: true, name: true },
  });

  if (!community) {
    throw new NotFoundException(`Community with ID ${communityId} not found`);
  }

  if (!community.discordGuildId) {
    throw new BadRequestException(
      `Cannot use Discord username: Community "${community.name}" has no Discord server connected. Please use numeric Discord User ID or ask an admin to connect the Discord server.`,
    );
  }

  const userId = await deps.discord.resolveUsernameToId(
    community.discordGuildId,
    identifier,
  );

  if (!userId) {
    throw new NotFoundException(
      `Discord user "${identifier}" not found in community's Discord server`,
    );
  }

  return userId;
}
