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
}

export type DomainEventName = keyof DomainEventMap;

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

export interface HalloweenCandyTraded {
  guildId: string;
  tradeId: string;
  /** Null once their account is gone. */
  initiatorId: string | null;
  offererId: string | null;
}
