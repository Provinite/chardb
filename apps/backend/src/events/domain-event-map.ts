import type { AvailabilityChange } from "../characters/character-availability";

/**
 * Every domain event, by name, with what it carries. A publisher announces
 * something that has already happened and committed; listeners react to it.
 *
 * Payloads name what happened, not what to do about it. A listener that
 * needs more reads it from the database, so a listener that misses an event
 * (a crash between commit and publish, a failure) can catch up later by
 * reading the same rows.
 */
export interface DomainEventMap {
  /** A user signed in or renewed their session. */
  "user.signed_in": UserSignedIn;
  /** A Discord player's `/knock` went through, won or lost. */
  "halloween.knock.completed": HalloweenKnockByDiscordUser;
  /** A `/knock` was refused for want of knocks or gifties. */
  "halloween.knock.out_of_knocks": HalloweenKnockByDiscordUser;
  "halloween.gifty.sent": HalloweenGiftySent;
  "halloween.candy_offer.placed": HalloweenCandyOfferPlaced;
  "halloween.candy.traded": HalloweenCandyTraded;
  /** A member knocked on another member's door on the site. */
  "halloween.door.knocked": HalloweenDoorKnocked;
  /** An edit changed a character's availability flags or price. */
  "character.availability_changed": CharacterAvailabilityChanged;
}

export type DomainEventName = keyof DomainEventMap;

/**
 * Carries the change itself, not just the character, because the before
 * state cannot be read back from the database afterwards.
 */
export interface CharacterAvailabilityChanged extends AvailabilityChange {
  characterId: string;
  /** Who made the edit: the owner, or staff. */
  actorUserId: string;
}

export interface UserSignedIn {
  userId: string;
}

/** Discord ids: the player may have no chardb account linked. */
export interface HalloweenKnockByDiscordUser {
  guildId: string;
  discordUserId: string;
}

export interface HalloweenGiftySent {
  guildId: string;
  fromDiscordUserId: string;
  toDiscordUserId: string;
}

export interface HalloweenCandyOfferPlaced {
  guildId: string;
  userId: string;
  offerId: string;
}

export interface HalloweenDoorKnocked {
  guildId: string;
  knockerId: string;
  knockeeId: string;
}

export interface HalloweenCandyTraded {
  guildId: string;
  tradeId: string;
  /** Null once their account is gone. */
  initiatorId: string | null;
  offererId: string | null;
}
