import type { AnyNotificationPayload } from "./notifications/notification-payloads";
import type {
  CandyBackgroundEffects,
  CandyLighting,
  CandyPlacement,
} from "./halloween/board/candy-board.schema";
import type { BoardName } from "./halloween/board/board-names";

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
     * Where a player's candies sit on their Halloween candy board, bottom of
     * the pile first. Inferred from the zod schema in candy-board.schema.ts,
     * which the service also validates against.
     */
    type HalloweenCandyPlacementsJson = CandyPlacement[];

    /**
     * Where the light over a Halloween candy board is, which casts the
     * candies' shadows. Inferred from the zod schema in
     * candy-board.schema.ts, which the service validates against.
     */
    type HalloweenCandyLightingJson = CandyLighting;

    /**
     * How a Halloween candy board's background is dimmed and tinted. Inferred
     * from the zod schema in candy-board.schema.ts.
     */
    type HalloweenCandyBackgroundEffectsJson = CandyBackgroundEffects;

    /**
     * What a Halloween candy board is called. Inferred from the zod schema in
     * board-names.ts.
     */
    type HalloweenCandyBoardNameJson = BoardName;

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

    /**
     * A snapshot of every form a character had, and what each one's traits
     * were, at one moment. This is what the review and audit tables store --
     * see CharacterForm for the live rows.
     *
     * `name` and `sortOrder` are copied in rather than read back through
     * `formId` because a snapshot has to outlive the form it describes: a
     * form deleted next year must still render in the review that approved
     * it. `formId` is therefore a correlation key, not a foreign key, and is
     * allowed to point at nothing.
     */
    type CharacterFormsJson = {
      /** Id of the CharacterForm this was taken from. Not an FK. */
      formId: string;
      /** The form's name when the snapshot was taken. */
      name: string;
      /** The form's position in the character's order when it was taken. */
      sortOrder: number;
      /** The form's trait values when it was taken. */
      traitValues: CharacterTraitValuesJson;
    }[];
  }
}

export {};
