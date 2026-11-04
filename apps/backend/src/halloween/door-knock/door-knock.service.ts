import { Injectable, Logger } from "@nestjs/common";
import {
  NotificationKind,
  NotificationSubjectType,
  type HalloweenGuildSettings,
  type Prisma,
} from "@chardb/database";
import { Clock } from "../../clock/clock";
import { DatabaseService } from "../../database/database.service";
import { DomainEvents } from "../../events/domain-events";
import { NotificationsService } from "../../notifications/notifications.service";
import { HalloweenDashboardService } from "../dashboard/halloween-dashboard.service";
import { HalloweenStaffAccess } from "../dashboard/halloween-staff-access";
import { HalloweenUi } from "../discord/ui";
import { BusyError, MissingGuildSettingsError } from "../errors";
import { HalloweenLogEvent, type HalloweenLogLine } from "../logging";
import { HalloweenRandom } from "../random";
import { GuildSettingsService } from "../services/guild-settings.service";
import { lockedTransaction } from "../services/locked-transaction";
import { PlayerLock } from "../services/player-lock";
import { EventStatus } from "../time";
import {
  DoorClosedError,
  DoorKnockBusyError,
  DoorKnockEventClosedError,
  DoorKnockerNotMemberError,
} from "./door-knock.errors";
import {
  HalloweenDoorClosedReason,
  type HalloweenDoor,
  type HalloweenDoorKnockResult,
} from "./door-knock.types";

/** The fewest and most candies a door knock gives each side. */
export const MIN_DOOR_KNOCK_CANDIES = 1;
export const MAX_DOOR_KNOCK_CANDIES = 3;
/** How many times `/knock`'s allowance Halloween staff get in door knocks. */
const STAFF_ALLOWANCE_MULTIPLIER = 2;

interface RunningEvent {
  guildId: string;
  settings: HalloweenGuildSettings;
}

/** Everything a door's state depends on, read under the knocker's lock. */
interface Visit {
  knockerMember: boolean;
  knocksPerDay: number;
  used: number;
  closedReason: HalloweenDoorClosedReason | null;
}

/**
 * Knocking on another member's door: each side gets 1-3 candies and the
 * player knocked on is told what they got. A member has as many door knocks
 * a day as `/knock` gives, Halloween staff twice that, and knocks on each
 * door at most once a day. Door knocks reset with `/knock`.
 *
 * A knock runs under the knocker's door lock, so two at once cannot both
 * spend the last knock or both knock on the same door. The player knocked on
 * needs no lock: their candies are made, not taken from anywhere.
 */
@Injectable()
export class DoorKnockService {
  private readonly logger = new Logger(DoorKnockService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly dashboard: HalloweenDashboardService,
    private readonly guildSettings: GuildSettingsService,
    private readonly staff: HalloweenStaffAccess,
    private readonly lock: PlayerLock,
    private readonly random: HalloweenRandom,
    private readonly ui: HalloweenUi,
    private readonly notifications: NotificationsService,
    private readonly clock: Clock,
    private readonly events: DomainEvents,
  ) {}

  /** The door as `viewerId` finds it, or null while no event is running. */
  async door(
    communityId: string,
    viewerId: string,
    ownerId: string,
  ): Promise<HalloweenDoor | null> {
    const event = await this.runningEvent(communityId);
    if (!event) return null;
    const visit = await this.visit(event, communityId, viewerId, ownerId);
    return {
      canKnock: visit.closedReason === null,
      closedReason: visit.closedReason,
      remainingKnocks: Math.max(0, visit.knocksPerDay - visit.used),
      knocksPerDay: visit.knocksPerDay,
    };
  }

  async knock(
    communityId: string,
    knockerId: string,
    knockeeId: string,
  ): Promise<HalloweenDoorKnockResult> {
    const event = await this.runningEvent(communityId);
    if (!event) throw new DoorKnockEventClosedError(communityId);
    const { guildId } = event;

    const result = await this.transaction(async (tx) => {
      await this.lock.acquire(tx, "door", guildId, knockerId);
      const visit = await this.visit(
        event,
        communityId,
        knockerId,
        knockeeId,
        tx,
      );
      if (!visit.knockerMember) {
        throw new DoorKnockerNotMemberError(communityId, knockerId);
      }
      if (visit.closedReason) {
        throw new DoorClosedError(visit.closedReason, knockerId, knockeeId);
      }

      const knockerCount = this.candyCount();
      const knockeeCount = this.candyCount();
      const knockerCandies = this.slugs(knockerCount);
      const knockeeCandies = this.slugs(knockeeCount);

      const at = this.clock.now();
      const doorKnock = await tx.halloweenDoorKnock.create({
        data: { guildId, knockerId, knockeeId, time: at },
      });
      const candy = (ownerId: string) => (slug: string) => ({
        guildId,
        slug,
        doorKnockId: doorKnock.id,
        ownerId,
        claimedAt: at,
        receivedAt: at,
      });
      await tx.halloweenCandy.createMany({
        data: [
          ...knockerCandies.map(candy(knockerId)),
          ...knockeeCandies.map(candy(knockeeId)),
        ],
      });
      await this.notifications.create(
        {
          kind: NotificationKind.HALLOWEEN_DOOR_KNOCKED,
          recipientId: knockeeId,
          actorUserId: knockerId,
          communityId,
          subjectType: NotificationSubjectType.HALLOWEEN_DOOR_KNOCK,
          subjectId: String(doorKnock.id),
          data: { candySlugs: knockeeCandies },
        },
        tx,
      );

      return {
        doorKnockId: doorKnock.id,
        knockerCandies,
        knockeeCandies,
        remainingKnocks: Math.max(0, visit.knocksPerDay - (visit.used + 1)),
      };
    });

    this.logger.log({
      event: HalloweenLogEvent.DoorKnocked,
      message: "Door knocked",
      guildId,
      doorKnockId: result.doorKnockId,
      knockerId,
      knockeeId,
      knockerCandyCount: result.knockerCandies.length,
      knockeeCandyCount: result.knockeeCandies.length,
    } satisfies HalloweenLogLine);
    this.events.publish("halloween.door.knocked", {
      guildId,
      knockerId,
      knockeeId,
    });
    return {
      knockerCandies: result.knockerCandies,
      knockeeCandies: result.knockeeCandies,
      remainingKnocks: result.remainingKnocks,
    };
  }

  /** The community's event, while it is linked, set up and running. */
  private async runningEvent(
    communityId: string,
  ): Promise<RunningEvent | null> {
    const running = await this.dashboard.runningEvent(communityId);
    if (!running) return null;
    let settings: HalloweenGuildSettings;
    try {
      settings = await this.guildSettings.getCached(running.guildId);
    } catch (error) {
      if (error instanceof MissingGuildSettingsError) return null;
      throw error;
    }
    if (this.guildSettings.eventStatus(settings) !== EventStatus.Ongoing) {
      return null;
    }
    return { guildId: running.guildId, settings };
  }

  /**
   * How many door knocks the knocker has and has used today, and why this
   * door is closed to them, if it is. The first reason that applies wins.
   */
  private async visit(
    { guildId, settings }: RunningEvent,
    communityId: string,
    knockerId: string,
    knockeeId: string,
    tx: Prisma.TransactionClient = this.db,
  ): Promise<Visit> {
    const since = this.guildSettings.lastReset(settings);
    const [knockerMember, knockeeMember, isStaff, used, knockedHere] =
      await Promise.all([
        this.isMember(tx, communityId, knockerId),
        this.isMember(tx, communityId, knockeeId),
        this.staff.isStaff(knockerId, communityId),
        tx.halloweenDoorKnock.count({
          where: { guildId, knockerId, time: { gte: since } },
        }),
        tx.halloweenDoorKnock.count({
          where: { guildId, knockerId, knockeeId, time: { gte: since } },
        }),
      ]);
    const knocksPerDay =
      settings.knocksPerDay * (isStaff ? STAFF_ALLOWANCE_MULTIPLIER : 1);

    const closedReason =
      knockerId === knockeeId
        ? HalloweenDoorClosedReason.OWN_DOOR
        : !knockerMember || !knockeeMember
          ? HalloweenDoorClosedReason.NOT_A_MEMBER
          : knockedHere > 0
            ? HalloweenDoorClosedReason.ALREADY_KNOCKED
            : used >= knocksPerDay
              ? HalloweenDoorClosedReason.NO_KNOCKS_LEFT
              : null;
    return { knockerMember, knocksPerDay, used, closedReason };
  }

  private async isMember(
    tx: Prisma.TransactionClient,
    communityId: string,
    userId: string,
  ): Promise<boolean> {
    const membership = await tx.communityMember.findFirst({
      where: { userId, role: { communityId } },
      select: { id: true },
    });
    return membership !== null;
  }

  private candyCount(): number {
    return (
      MIN_DOOR_KNOCK_CANDIES +
      this.random.int(MAX_DOOR_KNOCK_CANDIES - MIN_DOOR_KNOCK_CANDIES + 1)
    );
  }

  private slugs(count: number): string[] {
    return Array.from({ length: count }, () => this.ui.candySlug());
  }

  private async transaction<T>(
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await lockedTransaction(this.db, "DoorKnockService.knock", work);
    } catch (error) {
      if (error instanceof BusyError) throw new DoorKnockBusyError();
      throw error;
    }
  }
}
