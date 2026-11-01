import { ExternalAccountProvider } from "@chardb/database";
import { SeedCreateCommunityDocument } from "../../generated/graphql.js";
import { communityUrl } from "../../config.js";
import { definePreset, type Persona } from "../types.js";

export interface CandyBoardWorld {
  community: { id: string; slug: string; url: string };
  /** An empty board belonging to `player`, open at `url`. */
  board: { id: string; url: string };
  users: {
    /** Owns the board, and the community it is in. */
    player: Persona;
  };
}

/** Discord ids; nothing calls Discord, so any snowflake-shaped string does. */
const GUILD_ID = "100000000000000001";
const PLAYER_DISCORD_ID = "200000000000000002";

export default definePreset<CandyBoardWorld>({
  name: "candy-board",
  description:
    "A community with the Halloween event on and a Discord server linked, and one empty candy board owned by a Discord-linked player.",

  async build(ctx) {
    const player = await ctx.user("player", { canCreateCommunity: true });

    const { createCommunity: community } = await ctx
      .as("player")
      .gql(SeedCreateCommunityDocument, {
        createCommunityInput: { name: "Hollowmere", slug: "hollowmere" },
      });

    // Both are set from Discord in production -- the server by a bot
    // command, the account by OAuth -- so they are seeded directly.
    await ctx.prisma.community.update({
      where: { id: community.id },
      data: { discordGuildId: GUILD_ID, halloweenEnabled: true },
    });
    await ctx.prisma.externalAccount.create({
      data: {
        userId: player.userId,
        provider: ExternalAccountProvider.DISCORD,
        providerAccountId: PLAYER_DISCORD_ID,
        displayName: "player",
      },
    });

    const board = await ctx.prisma.halloweenCandyBoard.create({
      data: { guildId: GUILD_ID, ownerId: player.userId },
    });

    const url = communityUrl(community.slug);
    return {
      community: { id: community.id, slug: community.slug, url },
      board: { id: board.id, url: `${url}/halloween/board/${board.id}` },
      users: { player },
    };
  },
});
