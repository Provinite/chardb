import { Injectable } from "@nestjs/common";
import {
  ModerationStatus,
  type HalloweenPrize,
  type Prisma,
} from "@chardb/database";
import { DatabaseService } from "../../database/database.service";

const imageSelect = {
  originalUrl: true,
  mediumUrl: true,
  moderationStatus: true,
} satisfies Prisma.ImageSelect;

type ImageRow = Prisma.ImageGetPayload<{ select: typeof imageSelect }>;

/**
 * Only an approved image: chardb masks the rest until moderation passes, and
 * Discord should not show what chardb would not.
 */
export const approvedImageUrl = (
  image: ImageRow | null | undefined,
): string | null =>
  image && image.moderationStatus === ModerationStatus.APPROVED
    ? (image.mediumUrl ?? image.originalUrl)
    : null;

/**
 * The picture for each prize. A prize staff hand over themselves has the URL
 * an admin gave it; a chardb prize shows its item type's or character's own
 * image, looked up live so it follows any change made on chardb.
 */
@Injectable()
export class PrizeImageService {
  constructor(private readonly db: DatabaseService) {}

  async imageFor(prize: HalloweenPrize): Promise<string | null> {
    return (await this.imagesFor([prize])).get(prize) ?? null;
  }

  /** Every prize's image, in at most two queries. */
  async imagesFor(
    prizes: readonly HalloweenPrize[],
  ): Promise<Map<HalloweenPrize, string | null>> {
    const itemTypeIds = [
      ...new Set(prizes.flatMap((p) => (p.itemTypeId ? [p.itemTypeId] : []))),
    ];
    const characterIds = [
      ...new Set(prizes.flatMap((p) => (p.characterId ? [p.characterId] : []))),
    ];

    const [itemTypes, characters] = await Promise.all([
      itemTypeIds.length
        ? this.db.itemType.findMany({
            where: { id: { in: itemTypeIds } },
            select: { id: true, image: { select: imageSelect } },
          })
        : [],
      characterIds.length
        ? this.db.character.findMany({
            where: { id: { in: characterIds } },
            select: {
              id: true,
              mainMedia: { select: { image: { select: imageSelect } } },
            },
          })
        : [],
    ]);
    const itemTypeImages = new Map(
      itemTypes.map((t) => [t.id, approvedImageUrl(t.image)]),
    );
    const characterImages = new Map(
      characters.map((c) => [c.id, approvedImageUrl(c.mainMedia?.image)]),
    );

    return new Map(
      prizes.map((prize) => [
        prize,
        prize.itemTypeId
          ? (itemTypeImages.get(prize.itemTypeId) ?? null)
          : prize.characterId
            ? (characterImages.get(prize.characterId) ?? null)
            : prize.image,
      ]),
    );
  }
}
