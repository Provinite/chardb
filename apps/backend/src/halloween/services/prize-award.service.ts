import { Injectable } from "@nestjs/common";
import {
  ExternalAccountProvider,
  type HalloweenPrize,
  type Prisma,
} from "@chardb/database";
import { DatabaseService } from "../../database/database.service";
import { ItemsService } from "../../items/items.service";
import { PendingOwnershipService } from "../../pending-ownership/pending-ownership.service";
import { notDeleted } from "../../common/utils/prisma-filters";
import { HalloweenDiscordError } from "../errors";

/**
 * Delivers a prize's chardb item or character to the winner's Discord
 * account -- claimed at once if they have linked Discord, pending until they
 * do otherwise.
 *
 * The bot did this by sending a message to chardb's prize queue after telling
 * the player they had won, and only logged a failure. Here the prize is
 * checked inside the knock's transaction, so a prize that cannot be delivered
 * fails the knock (and leaves the player their knock) instead of announcing a
 * win nobody receives. The grant itself runs after the knock commits: chardb's
 * grant services open their own transactions and cannot join this one.
 */
@Injectable()
export class PrizeAwardService {
  constructor(
    private readonly db: DatabaseService,
    private readonly items: ItemsService,
    private readonly pendingOwnership: PendingOwnershipService,
  ) {}

  /** Throws if `award` would fail for a reason the data can show now. */
  async validate(
    prize: HalloweenPrize,
    guildId: string,
    tx: Prisma.TransactionClient = this.db,
  ): Promise<void> {
    if (prize.itemTypeId) {
      const community = await tx.community.findFirst({
        where: { discordGuildId: guildId },
      });
      if (!community) {
        throw this.undeliverable(
          prize,
          `no community is linked to Discord guild ${guildId}`,
        );
      }
      const itemType = await tx.itemType.findUnique({
        where: { id: prize.itemTypeId },
      });
      if (!itemType) {
        throw this.undeliverable(prize, `item type ${prize.itemTypeId} not found`);
      }
      if (itemType.communityId !== community.id) {
        throw this.undeliverable(
          prize,
          `item type ${prize.itemTypeId} belongs to another community`,
        );
      }
    }

    if (prize.characterId) {
      const character = await tx.character.findFirst({
        where: { id: prize.characterId, ...notDeleted },
      });
      if (!character) {
        throw this.undeliverable(prize, `character ${prize.characterId} not found`);
      }
      if (character.ownerId !== null) {
        throw this.undeliverable(
          prize,
          `character ${prize.characterId} is already owned`,
        );
      }
      const pending = await tx.pendingOwnership.findUnique({
        where: { characterId: prize.characterId },
      });
      if (pending) {
        throw this.undeliverable(
          prize,
          `character ${prize.characterId} is already pending for someone`,
        );
      }
    }
  }

  async award(prize: HalloweenPrize, discordUserId: string): Promise<void> {
    if (prize.itemTypeId) {
      await this.items.grantItem({
        itemTypeId: prize.itemTypeId,
        quantity: 1,
        pendingOwner: {
          provider: ExternalAccountProvider.DISCORD,
          providerAccountId: discordUserId,
        },
        actor: {
          actorLabel: "halloween-bot",
          reason: `Halloween prize: ${prize.name}`,
        },
      });
    } else if (prize.characterId) {
      await this.pendingOwnership.createForCharacter(
        prize.characterId,
        ExternalAccountProvider.DISCORD,
        discordUserId,
      );
    }
  }

  private undeliverable(prize: HalloweenPrize, reason: string) {
    return new HalloweenDiscordError({
      thrownFrom: "PrizeAwardService.validate",
      message: "This prize couldn't be delivered. Please let staff know.",
      sourceError: new Error(
        `Prize ${prize.id} in guild ${prize.guildId} is misconfigured: ${reason}`,
      ),
    });
  }
}
