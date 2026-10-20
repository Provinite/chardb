import { Injectable } from "@nestjs/common";
import type { HalloweenPrize, Prisma } from "@chardb/database";
import { DatabaseService } from "../../database/database.service";
import type { ValidationFieldError } from "../errors";

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
   * The guild's prizes with stock left, unlocked: a pick from these can lose
   * its prize to another winner, which `takeOne` reports.
   */
  async inStock(
    guildId: string,
    tx: Prisma.TransactionClient = this.db,
  ): Promise<HalloweenPrize[]> {
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

  /**
   * Takes one of a prize, returning it with what is left, or null when someone
   * else took the last one first. Only that prize's row is locked, and only
   * for the rest of the caller's transaction, so winners of different prizes
   * never wait on each other.
   */
  async takeOne(
    prizeId: string,
    guildId: string,
    tx: Prisma.TransactionClient = this.db,
  ): Promise<HalloweenPrize | null> {
    const { count } = await tx.halloweenPrize.updateMany({
      where: { guildId, id: prizeId, currentStock: { gt: 0 } },
      data: { currentStock: { decrement: 1 } },
    });
    if (count === 0) return null;
    return tx.halloweenPrize.findUniqueOrThrow({
      where: { guildId_id: { guildId, id: prizeId } },
    });
  }
}
