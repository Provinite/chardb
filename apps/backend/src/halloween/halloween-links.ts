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
 * Links back to chardb, for Discord and for the API. Built the way the
 * frontend's `communityUrl` and `apexUrl` build them: the community's slug
 * under ROOT_DOMAIN, or ROOT_DOMAIN itself, with the scheme and port
 * FRONTEND_URL is served on.
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
    return this.guildUrl(guildId, "/admin/halloween");
  }

  /** The community's public prize list, or null with nowhere to link to. */
  async prizeListPage(guildId: string): Promise<string | null> {
    return this.guildUrl(guildId, "/halloween/prizes");
  }

  /**
   * A markdown link to what the prize hands over on chardb, or undefined for
   * a prize staff hand over themselves, or with nowhere to link to.
   */
  async chardbLink(
    guildId: string,
    prize: ChardbPrize,
  ): Promise<string | undefined> {
    const path = prizePath(prize);
    if (!path) {
      return undefined;
    }
    const url = await this.guildUrl(guildId, path);
    return url ? `[View on CharDB](${url})` : undefined;
  }

  /**
   * What the prize hands over, on the community's host, or null for a prize
   * staff hand over themselves, or without the site's address configured.
   */
  prizeUrl(communitySlug: string, prize: ChardbPrize): string | null {
    const path = prizePath(prize);
    return path ? this.siteUrl(communitySlug, path) : null;
  }

  /** A user's profile, on the apex, or null without the site's address. */
  profileUrl(username: string): string | null {
    return this.siteUrl(null, `/user/${encodeURIComponent(username)}`);
  }

  private async guildUrl(
    guildId: string,
    path: string,
  ): Promise<string | null> {
    const community = await this.db.community.findFirst({
      where: { discordGuildId: guildId },
      select: { slug: true },
    });
    return community ? this.siteUrl(community.slug, path) : null;
  }

  /** The path on a community's host, or on the apex for no community. */
  private siteUrl(communitySlug: string | null, path: string): string | null {
    const frontendUrl = this.config.get<string>("FRONTEND_URL");
    const rootDomain = this.config.get<string>("ROOT_DOMAIN");
    if (!frontendUrl || !rootDomain) {
      return null;
    }
    const { protocol, port } = new URL(frontendUrl);
    const host = communitySlug ? `${communitySlug}.${rootDomain}` : rootDomain;
    return `${protocol}//${host}${port ? `:${port}` : ""}${path}`;
  }
}
