import { BadRequestException } from "@nestjs/common";
import { ExternalAccountProvider } from "@chardb/database";
import type { DatabaseService } from "../../database/database.service";
import type { DiscordService } from "../../discord/discord.service";
import type { DeviantArtService } from "../../deviantart/deviantart.service";
import type { PendingOwnerNames } from "../pending-ownership.service";
import { resolveDiscordOwner } from "./resolve-discord-owner";
import { resolveDeviantArtOwner } from "./resolve-deviantart-owner";

/**
 * Resolve what staff typed for a pending owner on any provider to the id a
 * linked account will carry, and the names it goes by now.
 *
 * Calls the provider over HTTP, so callers run it before opening a
 * transaction rather than inside one.
 *
 * @param communityId Whose Discord server a Discord username is looked up in.
 * @throws BadRequestException for a provider that cannot be a pending owner
 */
export async function resolvePendingOwner(
  deps: {
    db: Pick<DatabaseService, "community">;
    discord: Pick<DiscordService, "getUserInfo" | "resolveUsernameToId">;
    deviantArt: Pick<DeviantArtService, "resolveUsername">;
  },
  communityId: string,
  provider: ExternalAccountProvider,
  identifier: string,
): Promise<{ accountId: string; names: PendingOwnerNames }> {
  switch (provider) {
    case ExternalAccountProvider.DISCORD:
      return resolveDiscordOwner(deps, communityId, identifier);
    case ExternalAccountProvider.DEVIANTART:
      return resolveDeviantArtOwner(deps.deviantArt, identifier);
    default:
      throw new BadRequestException(
        "Pending ownership is not supported for this provider",
      );
  }
}
