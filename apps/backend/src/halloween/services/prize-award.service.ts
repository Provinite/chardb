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
 * checked and granted inside the knock's transaction: a prize that cannot be
 * delivered fails the knock (and leaves the player their knock) instead of
 * announcing a win nobody receives, and a win always comes with its prize.
 */
@Injectable()
export class PrizeAwardService {
  constructor(
    private readonly db: DatabaseService,
    private readonly items: ItemsService,
    private readonly pendingOwnership: PendingOwnershipService,
  ) {}

  /** Throws if `grant` would fail for a reason the data can show now. */
  async validate(
    prize: HalloweenPrize,
    guildId: string,
    tx: Prisma.TransactionClient = this.db,
  ): Promise<void> {
    const problem = await this.deliveryProblem(prize, guildId, tx);
    if (problem) {
      throw this.undeliverable(prize, problem);
    }
  }

  /**
   * Why the prize could not be delivered, or null if it could: one of a few
   * fixed phrases, which name no ids. Checked when
   * a prize is added on chardb and again when it is won, since the item type
   * or character can change in between.
   */
  async deliveryProblem(
    prize: { itemTypeId?: string | null; characterId?: string | null },
    guildId: string,
    tx: Prisma.TransactionClient = this.db,
  ): Promise<string | null> {
    if (!prize.itemTypeId && !prize.characterId) {
      return null;
    }

    // Whatever the prize hands over has to belong to the community this
    // Discord server is linked to. Otherwise any server's admin could add a
    // prize pointing at another community's item type or character.
    const community = await tx.community.findFirst({
      where: { discordGuildId: guildId },
    });
    if (!community) {
      return "no community is linked to this Discord server";
    }

    if (prize.itemTypeId) {
      const itemType = await tx.itemType.findUnique({
        where: { id: prize.itemTypeId },
      });
      if (!itemType) {
        return "the item type no longer exists";
      }
      if (itemType.communityId !== community.id) {
        return "the item type belongs to another community";
      }
    }

    if (prize.characterId) {
      const character = await tx.character.findFirst({
        where: { id: prize.characterId, ...notDeleted },
        include: { species: { select: { communityId: true } } },
      });
      if (!character) {
        return "the character no longer exists";
      }
      // A character belongs to a community through its species; one with no
      // species belongs to none, so no guild may give it away.
      if (character.species?.communityId !== community.id) {
        return "the character belongs to another community";
      }
      if (character.ownerId !== null) {
        return "the character is already owned";
      }
      const pending = await tx.pendingOwnership.findUnique({
        where: { characterId: prize.characterId },
      });
      if (pending) {
        return "the character is already promised to someone";
      }
    }
    return null;
  }

  /**
   * Hands the prize over inside the knock's transaction. The Discord id came
   * signed from Discord, so it is not checked again.
   */
  async grant(
    prize: HalloweenPrize,
    discordUserId: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    if (prize.itemTypeId) {
      await this.items.grantItemInTransaction(
        tx,
        {
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
        },
        { discordIdVerified: true },
      );
    } else if (prize.characterId) {
      await this.pendingOwnership.createForCharacter(
        prize.characterId,
        ExternalAccountProvider.DISCORD,
        discordUserId,
        undefined,
        tx,
      );
    }
  }

  private undeliverable(prize: HalloweenPrize, problem: string) {
    return new HalloweenDiscordError({
      thrownFrom: "PrizeAwardService.validate",
      message: "This prize couldn't be delivered. Please let staff know.",
      sourceError: new Error("Prize is misconfigured"),
      details: {
        prizeId: prize.id,
        guildId: prize.guildId,
        itemTypeId: prize.itemTypeId,
        characterId: prize.characterId,
        problem,
      },
    });
  }
}
