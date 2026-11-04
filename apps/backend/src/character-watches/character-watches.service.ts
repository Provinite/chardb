import { Injectable } from "@nestjs/common";
import {
  NotificationKind,
  NotificationSubjectType,
  Visibility,
} from "@chardb/database";
import { DatabaseService } from "../database/database.service";
import { CharactersService } from "../characters/characters.service";
import { NotificationsService } from "../notifications/notifications.service";
import { OnDomainEvent } from "../events/domain-events";
import type { CharacterAvailabilityChanged } from "../events/domain-event-map";

/**
 * Members watching characters, and telling them when a watched character's
 * trade advertisement changes.
 */
@Injectable()
export class CharacterWatchesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly characters: CharactersService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Starts watching. Idempotent. Refuses a character the member cannot see,
   * through the same check the character page uses.
   */
  async watch(userId: string, characterId: string) {
    const character = await this.characters.findOne(characterId, userId);
    await this.db.characterWatch.upsert({
      where: { userId_characterId: { userId, characterId } },
      create: { userId, characterId },
      update: {},
    });
    return character;
  }

  /**
   * Stops watching. Idempotent. The watch is removed before the visibility
   * check, so a character that has since gone private can still be let go of.
   */
  async unwatch(userId: string, characterId: string) {
    await this.db.characterWatch.deleteMany({ where: { userId, characterId } });
    return this.characters.findOne(characterId, userId);
  }

  async isWatching(userId: string, characterId: string): Promise<boolean> {
    const watch = await this.db.characterWatch.findUnique({
      where: { userId_characterId: { userId, characterId } },
      select: { id: true },
    });
    return watch !== null;
  }

  /**
   * Visibility is read now, after the edit, rather than trusted from the
   * watch: an edit that opens a character for trade and makes it private in
   * the same save must not put its name in anyone's feed.
   */
  @OnDomainEvent("character.availability_changed")
  async onAvailabilityChanged(event: CharacterAvailabilityChanged) {
    const character = await this.db.character.findUnique({
      where: { id: event.characterId },
      select: {
        name: true,
        visibility: true,
        deletedAt: true,
        species: { select: { communityId: true } },
      },
    });
    if (
      !character ||
      character.deletedAt ||
      character.visibility === Visibility.PRIVATE
    ) {
      return;
    }

    const watches = await this.db.characterWatch.findMany({
      where: { characterId: event.characterId },
      select: { userId: true },
    });

    await this.notifications.createMany(
      watches.map((w) => w.userId),
      {
        kind: NotificationKind.CHARACTER_AVAILABILITY_CHANGED,
        actorUserId: event.actorUserId,
        communityId: character.species?.communityId ?? null,
        subjectType: NotificationSubjectType.CHARACTER,
        subjectId: event.characterId,
        data: {
          subjectName: character.name,
          availabilityAdded: event.added,
          availabilityRemoved: event.removed,
          priceChanged: event.priceChanged,
          price: event.price,
        },
      },
    );
  }
}
