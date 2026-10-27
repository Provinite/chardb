import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { HalloweenPrize } from "@chardb/database";
import { DatabaseService } from "../database/database.service";

type ChardbPrize = Pick<HalloweenPrize, "itemTypeId" | "characterId">;

/** Where on the community's host a prize's item or character lives. */
const prizePath = ({ itemTypeId, characterId }: ChardbPrize): string | null =>
  itemTypeId
    ? `/item-types/${itemTypeId}`
    : characterId
      ? `/character/${characterId}`
      : null;

/**
 * Links from Discord back to chardb. Built the way the frontend's
 * `communityUrl` builds them: the community's slug under ROOT_DOMAIN, with
 * the scheme and port FRONTEND_URL is served on.
 */
@Injectable()
export class HalloweenLinks {
  constructor(
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
  ) {}

  /**
   * The event's page for the community this guild is linked to, or null when
   * there is none to link to.
   */
  async halloweenPage(guildId: string): Promise<string | null> {
    return this.communityUrl(guildId, "/admin/halloween");
  }

  /**
   * The player's own candy board on the community this guild is linked to,
   * or null when there is none to link to. The page finds whose it is from
   * whoever is signed in, so one link serves every player.
   */
  async candyBoard(guildId: string): Promise<string | null> {
    return this.communityUrl(guildId, "/halloween/board");
  }

  /**
   * A markdown link to what the prize hands over on chardb, or undefined for
   * a prize staff hand over themselves, or with nowhere to link to.
   */
  async chardbLink(
    guildId: string,
    prize: ChardbPrize,
  ): Promise<string | undefined> {
    if (!prizePath(prize)) {
      return undefined;
    }
    return (await this.chardbLinks(guildId))(prize);
  }

  /** `chardbLink` for a list of prizes, finding the community once. */
  async chardbLinks(
    guildId: string,
  ): Promise<(prize: ChardbPrize) => string | undefined> {
    const base = await this.communityUrl(guildId, "");
    return (prize) => {
      const path = prizePath(prize);
      return base && path ? `[View on CharDB](${base}${path})` : undefined;
    };
  }

  private async communityUrl(
    guildId: string,
    path: string,
  ): Promise<string | null> {
    const frontendUrl = this.config.get<string>("FRONTEND_URL");
    const rootDomain = this.config.get<string>("ROOT_DOMAIN");
    if (!frontendUrl || !rootDomain) {
      return null;
    }
    const community = await this.db.community.findFirst({
      where: { discordGuildId: guildId },
      select: { slug: true },
    });
    if (!community) {
      return null;
    }
    const { protocol, port } = new URL(frontendUrl);
    return `${protocol}//${community.slug}.${rootDomain}${port ? `:${port}` : ""}${path}`;
  }
}
