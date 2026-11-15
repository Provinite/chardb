import type { DeviantArtService } from "../../deviantart/deviantart.service";
import type { PendingOwnerNames } from "../pending-ownership.service";

/**
 * Resolve the handle staff typed for a DeviantArt pending owner to the UUID a
 * linked account will carry, and the handle as DeviantArt spells it.
 *
 * Linking DeviantArt stores the UUID, and claims match on it exactly: a
 * pending owner stored as a handle can never be claimed (#449). The one
 * resolver for every grant path, items and characters alike.
 *
 * @throws NotFoundException if DeviantArt does not know the handle
 * @throws BadRequestException if DeviantArt cannot be asked
 */
export async function resolveDeviantArtOwner(
  deviantArt: Pick<DeviantArtService, "resolveUsername">,
  handle: string,
): Promise<{ accountId: string; names: PendingOwnerNames }> {
  const resolved = await deviantArt.resolveUsername(handle);
  return {
    accountId: resolved.uuid,
    names: { displayIdentifier: resolved.username },
  };
}
