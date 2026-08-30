import type { AnyNotificationPayload } from "./notifications/notification-payloads";

declare global {
  namespace PrismaJson {
    /**
     * The snapshot stored on a notification, as a union of every kind's
     * payload. Inferred from the zod schemas in notification-payloads.ts, so
     * the column, the validators and the types cannot drift apart.
     *
     * Reading a row gives the union; `Notification.kind` narrows it, which is
     * what `parseNotificationPayload` does at the boundary.
     */
    type NotificationDataJson = AnyNotificationPayload;

    /**
     * Type for character trait values stored as JSONB
     * Each trait has a traitId (UUID) and a value of various types
     */
    type CharacterTraitValuesJson = {
      /** UUID of the trait this value belongs to */
      traitId: string;
      /** The trait value - can be string, number, boolean, or null */
      value: string | number | boolean | null;
      /** Optional free-text clarifier displayed parenthetically with the value */
      clarifier?: string | null;
    }[];
  }
}

export {};
