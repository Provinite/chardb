import type { GrantTarget } from "../components/GrantTargetSelector";
import type { PendingOwnerInput } from "../generated/graphql";

export interface OwnershipInput {
  assignToSelf: boolean;
  ownerId?: string;
  pendingOwner?: PendingOwnerInput;
}

/**
 * The ownership fields of `createCharacter`, from the create form's picker.
 *
 * `canCreateForOthers` is whether the picker is shown at all. When it is not,
 * the character is the creator's whatever the picker last held: it hides on a
 * species where you cannot create for others, and its state outlives it.
 */
export function ownershipInput(
  canCreateForOthers: boolean,
  target: GrantTarget | null,
  selfId: string | undefined,
): OwnershipInput {
  if (!canCreateForOthers) return { assignToSelf: true };

  // "Leave Unassigned".
  if (target === null) return { assignToSelf: false };

  if (target.type === "pending") {
    return {
      assignToSelf: true,
      pendingOwner: {
        provider: target.provider,
        providerAccountId: target.providerAccountId,
      },
    };
  }

  // Another member (#424). The picker used to stop here, and the character
  // went to its creator.
  return target.userId === selfId
    ? { assignToSelf: true }
    : { assignToSelf: true, ownerId: target.userId };
}
