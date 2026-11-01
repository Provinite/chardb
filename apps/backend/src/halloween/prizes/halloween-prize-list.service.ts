import { Injectable } from "@nestjs/common";
import { ExternalAccountProvider, type HalloweenPrize } from "@chardb/database";
import { DatabaseService } from "../../database/database.service";
import { PrizeImageService } from "../services/prize-image.service";
import { HalloweenLinks } from "../halloween-links";
import {
  HalloweenDashboardService,
  toPrizeBasics,
} from "../dashboard/halloween-dashboard.service";
import {
  mapPrismaUserToGraphQL,
  userMapperSelect,
} from "../../users/utils/user-resolver-mappers";
import {
  HalloweenPrizeListing,
  HalloweenPublicWin,
  HalloweenWinner,
  HalloweenWinnerKind,
} from "./halloween-prize-list.types";

export const DEFAULT_RECENT_WINS = 20;
export const MAX_RECENT_WINS = 50;

const SOME_DISCORD_USER = "A Discord user";

const ANONYMOUS_WINNER: HalloweenWinner = {
  kind: HalloweenWinnerKind.ANONYMOUS,
  displayName: SOME_DISCORD_USER,
  url: null,
  user: null,
};

/**
 * The Halloween pool and its wins as the public prize list shows them. Draw
 * weights and the winners' Discord accounts never leave here unless the
 * viewer is staff who could already see them on the event page.
 */
@Injectable()
export class HalloweenPrizeListService {
  constructor(
    private readonly db: DatabaseService,
    private readonly dashboard: HalloweenDashboardService,
    private readonly prizeImages: PrizeImageService,
    private readonly links: HalloweenLinks,
  ) {}

  /** In stock first, then by name. */
  async prizes(communityId: string): Promise<HalloweenPrizeListing[]> {
    const event = await this.dashboard.runningEvent(communityId);
    if (!event) return [];
    const prizes = await this.db.halloweenPrize.findMany({
      where: { guildId: event.guildId },
      orderBy: { name: "asc" },
    });
    const images = await this.prizeImages.imagesFor(prizes);
    return prizes
      .map((p) => this.toListing(event.slug, p, images.get(p) ?? null))
      .sort((a, b) => Number(b.currentStock > 0) - Number(a.currentStock > 0));
  }

  /** Newest first. `showDiscord` is whether the viewer is Halloween staff. */
  async recentWins(
    communityId: string,
    limit: number | undefined,
    showDiscord: boolean,
  ): Promise<HalloweenPublicWin[]> {
    const event = await this.dashboard.runningEvent(communityId);
    if (!event) return [];
    const take = Math.min(
      Math.max(limit ?? DEFAULT_RECENT_WINS, 1),
      MAX_RECENT_WINS,
    );
    const rows = await this.db.halloweenKnockEvent.findMany({
      where: {
        guildId: event.guildId,
        prizeId: { not: null },
        isPending: false,
      },
      include: {
        prize: true,
        staffAward: { select: { discordUsername: true } },
      },
      orderBy: [{ time: "desc" }, { id: "desc" }],
      take,
    });
    const [linkedAccounts, images] = await Promise.all([
      this.db.externalAccount.findMany({
        where: {
          provider: ExternalAccountProvider.DISCORD,
          providerAccountId: { in: [...new Set(rows.map((r) => r.userId))] },
        },
        include: { user: { select: userMapperSelect } },
      }),
      this.prizeImages.imagesFor(
        rows.flatMap((r) => (r.prize ? [r.prize] : [])),
      ),
    ]);
    const linkedUsers = new Map(
      linkedAccounts.map((a) => [a.providerAccountId, a.user]),
    );

    const winnerFor = (
      discordUserId: string,
      /** Only a staff prize's award has one. */
      handle: string | null,
    ): HalloweenWinner => {
      const linked = linkedUsers.get(discordUserId);
      if (linked) {
        return {
          kind: HalloweenWinnerKind.MEMBER,
          displayName: linked.username,
          url: this.links.profileUrl(linked.username),
          user: mapPrismaUserToGraphQL(linked),
        };
      }
      if (!showDiscord) return ANONYMOUS_WINNER;
      return {
        kind: HalloweenWinnerKind.DISCORD,
        displayName: handle ?? SOME_DISCORD_USER,
        url: `https://discord.com/users/${discordUserId}`,
        user: null,
      };
    };

    return rows.flatMap((row) =>
      row.prize
        ? [
            {
              id: row.id,
              time: row.time,
              prize: this.toListing(
                event.slug,
                row.prize,
                images.get(row.prize) ?? null,
              ),
              winner: winnerFor(
                row.userId,
                row.staffAward?.discordUsername ?? null,
              ),
            },
          ]
        : [],
    );
  }

  private toListing(
    communitySlug: string,
    prize: HalloweenPrize,
    image: string | null,
  ): HalloweenPrizeListing {
    return {
      ...toPrizeBasics(prize, image),
      url: this.links.prizeUrl(communitySlug, prize),
    };
  }
}
