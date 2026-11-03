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
}

export type DomainEventName = keyof DomainEventMap;

export interface UserSignedIn {
  userId: string;
}
