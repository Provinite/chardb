import { Injectable } from "@nestjs/common";
import { ExternalAccountProvider, type HalloweenPrize } from "@chardb/database";
import { DatabaseService } from "../../database/database.service";
import { PrizeImageService } from "../services/prize-image.service";
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

const ANONYMOUS_WINNER: HalloweenWinner = {
  kind: HalloweenWinnerKind.ANONYMOUS,
  displayName: "A Discord user",
  url: null,
  user: null,
};

const toListing = (
  prize: HalloweenPrize,
  image: string | null,
): HalloweenPrizeListing => ({
  id: prize.id,
  name: prize.name,
  image,
  initialStock: prize.initialStock,
  currentStock: prize.currentStock,
  itemTypeId: prize.itemTypeId,
  characterId: prize.characterId,
});

/**
 * The Halloween pool and its wins as the public prize list shows them. Draw
 * weights and the winners' Discord identities never leave here unless the
 * viewer is staff who could already see them on the event page.
 */
@Injectable()
export class HalloweenPrizeListService {
  constructor(
    private readonly db: DatabaseService,
    private readonly prizeImages: PrizeImageService,
  ) {}

  /** In stock first, then by name. */
  async prizes(communityId: string): Promise<HalloweenPrizeListing[]> {
    const guildId = await this.guildFor(communityId);
    if (!guildId) return [];
    const prizes = await this.db.halloweenPrize.findMany({
      where: { guildId },
      orderBy: { name: "asc" },
    });
    const images = await this.prizeImages.imagesFor(prizes);
    return prizes
      .map((p) => toListing(p, images.get(p) ?? null))
      .sort((a, b) => Number(b.currentStock > 0) - Number(a.currentStock > 0));
  }

  /** Newest first. `showDiscord` is whether the viewer is item staff here. */
  async recentWins(
    communityId: string,
    limit: number | undefined,
    showDiscord: boolean,
  ): Promise<HalloweenPublicWin[]> {
    const guildId = await this.guildFor(communityId);
    if (!guildId) return [];
    const take = Math.min(
      Math.max(limit ?? DEFAULT_RECENT_WINS, 1),
      MAX_RECENT_WINS,
    );
    const rows = await this.db.halloweenKnockEvent.findMany({
      where: { guildId, prizeId: { not: null }, isPending: false },
      include: {
        prize: true,
        staffAward: { select: { discordUsername: true } },
      },
      orderBy: [{ time: "desc" }, { id: "desc" }],
      take,
    });
    const winnerIds = [...new Set(rows.map((r) => r.userId))];
    const [linkedAccounts, pendingNames, images] = await Promise.all([
      this.db.externalAccount.findMany({
        where: {
          provider: ExternalAccountProvider.DISCORD,
          providerAccountId: { in: winnerIds },
        },
        include: { user: { select: userMapperSelect } },
      }),
      showDiscord
        ? this.db.pendingOwnership.findMany({
            where: {
              provider: ExternalAccountProvider.DISCORD,
              providerAccountId: { in: winnerIds },
              displayIdentifier: { not: null },
            },
            orderBy: { createdAt: "desc" },
            select: { providerAccountId: true, displayIdentifier: true },
          })
        : [],
      this.prizeImages.imagesFor(
        rows.flatMap((r) => (r.prize ? [r.prize] : [])),
      ),
    ]);
    const linkedUsers = new Map(
      linkedAccounts.map((a) => [a.providerAccountId, a.user]),
    );
    // Newest first, so the first name seen for an account is its latest.
    const handles = new Map<string, string>();
    for (const p of pendingNames) {
      if (p.displayIdentifier && !handles.has(p.providerAccountId)) {
        handles.set(p.providerAccountId, p.displayIdentifier);
      }
    }

    const winnerFor = (
      discordUserId: string,
      /** A staff prize's award has it; a chardb prize's pending owner does. */
      awardHandle: string | null,
    ): HalloweenWinner => {
      const linked = linkedUsers.get(discordUserId);
      if (linked) {
        return {
          kind: HalloweenWinnerKind.MEMBER,
          displayName: linked.username,
          url: `/user/${linked.username}`,
          user: mapPrismaUserToGraphQL(linked),
        };
      }
      if (!showDiscord) return ANONYMOUS_WINNER;
      return {
        kind: HalloweenWinnerKind.DISCORD,
        displayName:
          awardHandle ??
          handles.get(discordUserId) ??
          `Discord user ${discordUserId}`,
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
              prize: toListing(row.prize, images.get(row.prize) ?? null),
              winner: winnerFor(
                row.userId,
                row.staffAward?.discordUsername ?? null,
              ),
            },
          ]
        : [],
    );
  }

  /** The community's guild while its event is on, else null. */
  private async guildFor(communityId: string): Promise<string | null> {
    const community = await this.db.community.findUnique({
      where: { id: communityId },
      select: { halloweenEnabled: true, discordGuildId: true },
    });
    return community?.halloweenEnabled ? community.discordGuildId : null;
  }
}
