import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  Prisma,
  type Character,
  type HalloweenGuildSettings,
  type HalloweenPrize,
  type ItemType,
} from "@chardb/database";
import { DatabaseService } from "../../database/database.service";
import { notDeleted } from "../../common/utils/prisma-filters";
import {
  GuildSettingsService,
  validateGuildSettings,
} from "../services/guild-settings.service";
import {
  isImageUrl,
  validatePrize,
  type PrizeInput,
} from "../services/prize.service";
import { PrizeAwardService } from "../services/prize-award.service";
import { HalloweenLogEvent, type HalloweenLogLine } from "../logging";
import { HalloweenDashboardService } from "./halloween-dashboard.service";
import type {
  CreateHalloweenPrizeInput,
  HalloweenSettingsInput,
  UpdateHalloweenPrizeInput,
} from "./halloween-admin.inputs";
import type {
  HalloweenEventSettings,
  HalloweenPrizeView,
} from "./halloween-dashboard.types";

const SETTING_FIELDS = [
  "startDate",
  "endDate",
  "knocksPerDay",
  "resetTime",
  "winRate",
  "winChannel",
] as const;

const toView = (settings: HalloweenGuildSettings): HalloweenEventSettings => ({
  startDate: settings.startDate,
  endDate: settings.endDate,
  knocksPerDay: settings.knocksPerDay,
  resetTime: settings.resetTime,
  winRate: settings.winRate,
  winChannel: settings.winChannel,
});

const sameValue = (a: unknown, b: unknown) =>
  a instanceof Date && b instanceof Date
    ? a.getTime() === b.getTime()
    : a === b;

/**
 * Running the event from chardb: what `/settings set` and `/prize admin`
 * used to do in Discord. Every change is logged with who made it, since the
 * rows keep only the latest values.
 */
@Injectable()
export class HalloweenAdminService {
  private readonly logger = new Logger(HalloweenAdminService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly dashboard: HalloweenDashboardService,
    private readonly prizeAward: PrizeAwardService,
    private readonly guildSettings: GuildSettingsService,
  ) {}

  /** Creates the guild's settings the first time, replaces them after. */
  async updateSettings(
    communityId: string,
    input: HalloweenSettingsInput,
    actorUserId: string,
  ): Promise<HalloweenEventSettings> {
    const guildId = await this.dashboard.linkedGuildFor(communityId);
    const next: HalloweenGuildSettings = {
      guildId,
      startDate: input.startDate,
      endDate: input.endDate,
      knocksPerDay: input.knocksPerDay,
      resetTime: input.resetTime,
      winRate: input.winRate,
      winChannel: input.winChannel,
    };
    const validation = validateGuildSettings(next);
    if (validation !== true) {
      throw new BadRequestException(
        validation.map(({ error }) => error).join(". "),
      );
    }

    const before = await this.db.halloweenGuildSettings.findUnique({
      where: { guildId },
    });
    const saved = await this.db.halloweenGuildSettings.upsert({
      where: { guildId },
      create: next,
      update: next,
    });
    this.guildSettings.invalidate(guildId);

    const who = { communityId, guildId, actorUserId };
    if (!before) {
      this.logger.log({
        event: HalloweenLogEvent.SettingsCreated,
        message: "Halloween event set up from chardb",
        ...who,
      } satisfies HalloweenLogLine);
    }
    for (const field of SETTING_FIELDS) {
      if (before && sameValue(before[field], saved[field])) continue;
      this.logger.log({
        event: HalloweenLogEvent.SettingChanged,
        message: "Halloween event setting changed from chardb",
        ...who,
        setting: field,
        oldValue: before ? before[field] : null,
        newValue: saved[field],
      } satisfies HalloweenLogLine);
    }
    return toView(saved);
  }

  async createPrize(
    communityId: string,
    input: CreateHalloweenPrizeInput,
    actorUserId: string,
  ): Promise<HalloweenPrizeView> {
    const guildId = await this.dashboard.linkedGuildFor(communityId);
    // Prizes belong to the guild's settings row; the page shows the settings
    // form first, so this only catches a request made around it.
    if (!(await this.db.halloweenGuildSettings.count({ where: { guildId } }))) {
      throw new BadRequestException("Set the event up before adding prizes");
    }

    const prize: PrizeInput = {
      guildId,
      id: input.id,
      name: input.name,
      initialStock: input.stock,
      currentStock: input.stock,
      weight: input.weight ?? 10,
      image: input.image ?? null,
      itemTypeId: input.itemTypeId ?? undefined,
      characterId: input.characterId ?? undefined,
    };
    const validation = validatePrize(prize);
    if (validation !== true) {
      throw new BadRequestException(
        validation.map(({ error }) => error).join(". "),
      );
    }
    const problem = await this.prizeAward.deliveryProblem(prize, guildId);
    if (problem) {
      throw new BadRequestException(
        `This prize couldn't be delivered: ${problem}`,
      );
    }
    // A character is one of a kind: a second prize for it could only ever
    // fail to deliver.
    if (prize.characterId) {
      const existing = await this.db.halloweenPrize.findFirst({
        where: { guildId, characterId: prize.characterId },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException(
          `That character is already the prize "${existing.id}"`,
        );
      }
    }

    let saved: HalloweenPrize;
    try {
      saved = await this.db.halloweenPrize.create({ data: prize });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          `There is already a prize called "${prize.id}"`,
        );
      }
      throw error;
    }

    this.logger.log({
      event: HalloweenLogEvent.PrizeAdded,
      message: "Halloween prize added from chardb",
      communityId,
      guildId,
      actorUserId,
      prizeId: saved.id,
      name: saved.name,
      initialStock: saved.initialStock,
      weight: saved.weight,
      image: saved.image,
      itemTypeId: saved.itemTypeId,
      characterId: saved.characterId,
    } satisfies HalloweenLogLine);

    const [view] = await this.dashboard.prizeViews([saved]);
    return view;
  }

  async updatePrize(
    communityId: string,
    prizeId: string,
    input: UpdateHalloweenPrizeInput,
    actorUserId: string,
  ): Promise<HalloweenPrizeView> {
    const guildId = await this.dashboard.linkedGuildFor(communityId);
    const prize = await this.findPrize(guildId, prizeId);
    const isChardbPrize = Boolean(prize.itemTypeId || prize.characterId);

    const changes: Prisma.HalloweenPrizeUpdateInput = {};
    const problems: string[] = [];
    if (input.name !== undefined) {
      if (!input.name.trim()) problems.push("A prize needs a name");
      changes.name = input.name;
    }
    if (input.weight !== undefined) {
      if (input.weight < 1 || input.weight > 1000) {
        problems.push("Weight must be a whole number from 1 to 1000");
      }
      changes.weight = input.weight;
    }
    if (input.image !== undefined) {
      if (isChardbPrize) {
        problems.push(
          "A chardb prize shows its item's or character's own image",
        );
      } else if (!input.image || !isImageUrl(input.image)) {
        problems.push(
          "image must be an https or http string URL to a png or jpg image",
        );
      }
      changes.image = input.image;
    }
    if (input.currentStock !== undefined) {
      // One of a kind: won, it is gone, and putting it back would offer a
      // character somebody already has. Fixed by hand in the database if
      // ever needed.
      if (prize.characterId) {
        problems.push("A character prize's stock can't be changed");
      } else if (input.currentStock < 0 || input.currentStock > 999) {
        problems.push("Stock must be a whole number from 0 to 999");
      }
      // Moving the starting stock by the same amount keeps "given out"
      // (initial - current) as it was.
      changes.currentStock = input.currentStock;
      changes.initialStock =
        prize.initialStock + (input.currentStock - prize.currentStock);
    }
    if (problems.length) {
      throw new BadRequestException(problems.join(". "));
    }

    const saved = await this.db.halloweenPrize.update({
      where: { guildId_id: { guildId, id: prizeId } },
      data: changes,
    });

    this.logger.log({
      event: HalloweenLogEvent.PrizeUpdated,
      message: "Halloween prize changed from chardb",
      communityId,
      guildId,
      actorUserId,
      prizeId,
      before: {
        name: prize.name,
        weight: prize.weight,
        image: prize.image,
        initialStock: prize.initialStock,
        currentStock: prize.currentStock,
      },
      after: {
        name: saved.name,
        weight: saved.weight,
        image: saved.image,
        initialStock: saved.initialStock,
        currentStock: saved.currentStock,
      },
    } satisfies HalloweenLogLine);

    const [view] = await this.dashboard.prizeViews([saved]);
    return view;
  }

  /** Only a prize nobody has won: a win keeps its prize on record. */
  async removePrize(
    communityId: string,
    prizeId: string,
    actorUserId: string,
  ): Promise<boolean> {
    const guildId = await this.dashboard.linkedGuildFor(communityId);
    const prize = await this.findPrize(guildId, prizeId);
    const won = await this.db.halloweenKnockEvent.count({
      where: { guildId, prizeId },
    });
    if (won) {
      throw new ConflictException(
        "Somebody has won this prize, so it stays on record. Set its stock to 0 instead.",
      );
    }
    await this.db.halloweenPrize.delete({
      where: { guildId_id: { guildId, id: prizeId } },
    });
    this.logger.log({
      event: HalloweenLogEvent.PrizeRemoved,
      message: "Halloween prize removed from chardb",
      communityId,
      guildId,
      actorUserId,
      prizeId,
      name: prize.name,
      itemTypeId: prize.itemTypeId,
      characterId: prize.characterId,
    } satisfies HalloweenLogLine);
    return true;
  }

  /** Item types of the community whose name contains `search`. */
  async prizeItemTypes(
    communityId: string,
    search: string,
  ): Promise<ItemType[]> {
    await this.dashboard.guildFor(communityId);
    return this.db.itemType.findMany({
      where: { communityId, name: nameContains(search) },
      orderBy: { name: "asc" },
      take: OPTIONS_LIMIT,
    });
  }

  /**
   * Characters of the community whose name contains `search` and that could
   * be a new prize: no owner, no pending owner, and no prize already.
   */
  async prizeCharacters(
    communityId: string,
    search: string,
  ): Promise<Character[]> {
    const guildId = await this.dashboard.guildFor(communityId);
    // A character already in the pool can't be a second prize.
    const pooled = guildId
      ? await this.db.halloweenPrize.findMany({
          where: { guildId, characterId: { not: null } },
          select: { characterId: true },
        })
      : [];
    const pooledCharacterIds = pooled.flatMap((p) =>
      p.characterId ? [p.characterId] : [],
    );
    return this.db.character.findMany({
      where: {
        species: { communityId },
        ownerId: null,
        pendingOwnership: null,
        id: { notIn: pooledCharacterIds },
        name: nameContains(search),
        ...notDeleted,
      },
      orderBy: { name: "asc" },
      take: OPTIONS_LIMIT,
    });
  }

  private async findPrize(
    guildId: string,
    prizeId: string,
  ): Promise<HalloweenPrize> {
    const prize = await this.db.halloweenPrize.findUnique({
      where: { guildId_id: { guildId, id: prizeId } },
    });
    if (!prize) {
      throw new NotFoundException(`No prize called "${prizeId}"`);
    }
    return prize;
  }
}

/** How many matches the picker offers per search. */
const OPTIONS_LIMIT = 25;

const nameContains = (search: string) => ({
  contains: search.trim(),
  mode: "insensitive" as const,
});
