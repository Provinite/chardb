import type { OwnershipInput } from "./characterOwnership";

/** The role fields the image check reads, in the species' community. */
export interface ImageRole {
  canUploadOwnCharacterImages: boolean;
  canUploadCharacterImages: boolean;
  canCreateOrphanedCharacter: boolean;
  canEditCharacter: boolean;
}

/**
 * Why the create form cannot take an image for the character as it will be
 * owned, or undefined when it can (#424).
 *
 * Mirrors the server: the upload is checked in
 * `ImagesService.verifyCharacterEditPermission` against who owns the new
 * character, and making it the main image needs edit rights on a character
 * that is not yours. Not a security boundary -- the server checks both again
 * -- but finding out after the character exists is the worse way to learn.
 */
export function imageBlockedReason(
  role: ImageRole | null,
  ownership: OwnershipInput,
): string | undefined {
  const r = role ?? {
    canUploadOwnCharacterImages: false,
    canUploadCharacterImages: false,
    canCreateOrphanedCharacter: false,
    canEditCharacter: false,
  };

  if (ownership.ownerId) {
    return r.canUploadCharacterImages && r.canEditCharacter
      ? undefined
      : "Your role in this community cannot add images to other members' characters.";
  }

  if (ownership.pendingOwner || !ownership.assignToSelf) {
    return (r.canUploadCharacterImages || r.canCreateOrphanedCharacter) &&
      r.canEditCharacter
      ? undefined
      : "Your role in this community cannot add images to unowned characters.";
  }

  return r.canUploadOwnCharacterImages
    ? undefined
    : "Your role in this community cannot add images to your own characters.";
}
