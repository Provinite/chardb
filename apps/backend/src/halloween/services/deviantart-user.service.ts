import { Injectable } from "@nestjs/common";
import type { HalloweenDeviantArtUser, Prisma } from "@chardb/database";
import { DatabaseService } from "../../database/database.service";
import { ValidationError, type ValidationFieldError } from "../errors";

@Injectable()
export class DeviantArtUserService {
  constructor(private readonly db: DatabaseService) {}

  async get(
    { guildId, userId }: { guildId: string; userId: string },
    tx: Prisma.TransactionClient = this.db,
  ): Promise<HalloweenDeviantArtUser | null> {
    return tx.halloweenDeviantArtUser.findUnique({
      where: { userId_guildId: { userId, guildId } },
    });
  }

  /** Saves or replaces the player's DeviantArt name in this guild. */
  async save({
    deviantArtName,
    guildId,
    userId,
  }: HalloweenDeviantArtUser): Promise<void> {
    if (!guildId || !userId || !deviantArtName) {
      const missing: (ValidationFieldError | false)[] = [
        !guildId && { error: "Missing guild id", field: "guildId" },
        !userId && { error: "Missing user id", field: "userId" },
        !deviantArtName && {
          error: "Missing deviantArtName",
          field: "deviantArtName",
        },
      ];
      throw new ValidationError({
        message: "DeviantArt User validation failed",
        thrownFrom: "DeviantArtUserService.save",
        validationErrors: missing.filter(
          (f): f is ValidationFieldError => f !== false,
        ),
      });
    }

    if (!/^[a-zA-Z0-9-]{1,30}$/.test(deviantArtName)) {
      throw new ValidationError({
        message: "DeviantArt username validation failed",
        thrownFrom: "DeviantArtUserService.save",
        validationErrors: [
          {
            error:
              "DeviantArt username is invalid. Must contain only letters, numbers, and hyphens and be less than 30 characters",
            field: "deviantArtName",
          },
        ],
        // The player's typo, not the bot's fault.
        logAsError: false,
      });
    }

    await this.db.halloweenDeviantArtUser.upsert({
      where: { userId_guildId: { userId, guildId } },
      create: { deviantArtName, guildId, userId },
      update: { deviantArtName },
    });
  }
}
