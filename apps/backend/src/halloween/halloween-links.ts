import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DatabaseService } from "../database/database.service";

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
    return `${protocol}//${community.slug}.${rootDomain}${port ? `:${port}` : ""}/admin/halloween`;
  }
}
