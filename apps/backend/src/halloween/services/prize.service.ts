import { Injectable } from "@nestjs/common";
import type { HalloweenPrize, Prisma } from "@chardb/database";
import { DatabaseService } from "../../database/database.service";
import { OutOfPrizesError, type ValidationFieldError } from "../errors";

export interface PrizeInput {
  id: string;
  guildId: string;
  name: string;
  initialStock: number;
  currentStock: number;
  weight: number;
  /** Only for a prize staff hand over; a chardb prize shows its own image. */
  image?: string | null;
  itemTypeId?: string;
  characterId?: string;
}

type Rule = [
  field: keyof HalloweenPrize | "*",
  error: string,
  ok: () => boolean,
];

/**
 * A prize's id: the slug admins and the database know it by, e.g.
 * `myo-common`. 2-25 characters, starting with a letter.
 */
export const PRIZE_ID = /^[a-z][a-z-]{1,24}$/;

export const isImageUrl = (image: string): boolean => {
  try {
    const url = new URL(image);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      (url.pathname.endsWith(".png") || url.pathname.endsWith(".jpg"))
    );
  } catch {
    return false;
  }
};

export function validatePrize(
  prize: Omit<PrizeInput, "currentStock">,
): true | ValidationFieldError[] {
  const {
    id,
    guildId,
    name,
    initialStock,
    weight,
    image,
    itemTypeId,
    characterId,
  } = prize;
  const isChardbPrize = Boolean(itemTypeId || characterId);
  const rules: Rule[] = [
    [
      "*",
      "All prize fields are required",
      // Numbers by presence, not truthiness: their own rules say which
      // values are allowed.
      () =>
        Boolean(id && guildId && name) &&
        Number.isFinite(initialStock) &&
        Number.isFinite(weight),
    ],
    [
      "id",
      "id must be 2-25 lowercase letters and hyphens, starting with a letter",
      () => PRIZE_ID.test(id),
    ],
    ["guildId", "guildId must be a non-empty string", () => guildId.length > 0],
    ["name", "name must be a string", () => typeof name === "string"],
    [
      "initialStock",
      "initialStock must be a positive integer less than 1000",
      () =>
        Number.isInteger(initialStock) &&
        initialStock > 0 &&
        initialStock < 1000,
    ],
    [
      "initialStock",
      "A character prize has a stock of 1",
      () => !characterId || initialStock === 1,
    ],
    [
      "weight",
      "weight must be an integer between 1 and 1000",
      () => Number.isInteger(weight) && weight >= 1 && weight <= 1000,
    ],
    [
      "image",
      "image must be an https or http string URL to a png or jpg image",
      () => isChardbPrize || (typeof image === "string" && isImageUrl(image)),
    ],
    [
      "image",
      "A chardb prize shows its item's or character's own image",
      () => !isChardbPrize || !image,
    ],
    [
      "itemTypeId",
      "itemTypeId must be a non-empty string if provided",
      () => itemTypeId === undefined || itemTypeId.length > 0,
    ],
    [
      "characterId",
      "characterId must be a non-empty string if provided",
      () => characterId === undefined || characterId.length > 0,
    ],
    [
      "*",
      "Only one of itemTypeId or characterId can be set, not both",
      () => !(itemTypeId && characterId),
    ],
  ];
  const failing = rules.filter(([, , ok]) => !ok());
  return failing.length
    ? failing.map(([field, error]) => ({ field, error }))
    : true;
}

@Injectable()
export class PrizeService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * The guild's prizes with stock left. With `lock`, the rows stay locked for
   * the rest of the transaction, so two winners cannot both take the last one.
   */
  async inStock(
    guildId: string,
    tx: Prisma.TransactionClient = this.db,
    { lock = false }: { lock?: boolean } = {},
  ): Promise<HalloweenPrize[]> {
    if (lock) {
      await tx.$queryRaw`SELECT 1 FROM "halloween_prizes" WHERE "guild_id" = ${guildId} AND "current_stock" > 0 FOR UPDATE`;
    }
    return tx.halloweenPrize.findMany({
      where: { guildId, currentStock: { gt: 0 } },
      orderBy: { id: "asc" },
    });
  }

  async hasInStock(
    guildId: string,
    tx: Prisma.TransactionClient = this.db,
  ): Promise<boolean> {
    return (
      (await tx.halloweenPrize.count({
        where: { guildId, currentStock: { gt: 0 } },
      })) > 0
    );
  }

  async decrementStock(
    prizeId: string,
    guildId: string,
    tx: Prisma.TransactionClient = this.db,
  ): Promise<HalloweenPrize> {
    const prize = await tx.halloweenPrize.findUnique({
      where: { guildId_id: { guildId, id: prizeId } },
    });
    if (!prize || prize.currentStock === 0) {
      throw new OutOfPrizesError({
        thrownFrom: "PrizeService.decrementStock",
        guildId,
      });
    }
    return tx.halloweenPrize.update({
      where: { guildId_id: { guildId, id: prizeId } },
      data: { currentStock: { decrement: 1 } },
    });
  }
}
