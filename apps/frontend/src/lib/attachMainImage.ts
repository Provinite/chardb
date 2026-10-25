import { API_BASE_URL } from "./communityHost";
import { getAccessToken } from "./accessToken";
import type { Visibility } from "../generated/graphql";

/**
 * The image picked on the create form, held until the character exists.
 *
 * The category flags mirror the upload page's. Only `isNsfw` (any of them)
 * and the description are stored by the backend today; the flags are sent
 * anyway so both forms send the same request.
 */
export interface PendingCharacterImage {
  file: File;
  nsfwNudity: boolean;
  nsfwGore: boolean;
  nsfwSensitive: boolean;
  sensitiveContentDescription: string;
}

/**
 * Whether a picked image stops the form from submitting. NSFW uploads are
 * refused site-wide for now, the same rule the upload page enforces.
 */
export const isPickedImageBlocked = (value: PendingCharacterImage | null) =>
  Boolean(value && (value.nsfwNudity || value.nsfwGore || value.nsfwSensitive));

export type AttachMainImageResult =
  | { ok: true; mediaId: string }
  | { ok: false; step: "upload" | "setMain"; error: Error };

interface AttachMainImageArgs {
  characterId: string;
  image: PendingCharacterImage;
  /** The character's, so a private character's image is private too. */
  visibility: Visibility;
  setMainMedia: (characterId: string, mediaId: string) => Promise<unknown>;
}

const toError = (err: unknown) =>
  err instanceof Error ? err : new Error("Unknown error");

/**
 * Upload an image to a character that was just created and make it the
 * character's main image (#406).
 *
 * Two steps because moderation routes an upload by its character, so the
 * character has to exist first. Never throws: the character is already made
 * by the time this runs, so a failure here is reported for the caller to
 * explain, not something that should undo or block the create.
 */
export async function attachMainImage({
  characterId,
  image,
  visibility,
  setMainMedia,
}: AttachMainImageArgs): Promise<AttachMainImageResult> {
  const body = new FormData();
  body.append("file", image.file);
  body.append("characterId", characterId);
  body.append("visibility", visibility);

  const isNsfw = image.nsfwNudity || image.nsfwGore || image.nsfwSensitive;
  body.append("isNsfw", String(isNsfw));
  if (image.nsfwNudity) body.append("nsfwNudity", "true");
  if (image.nsfwGore) body.append("nsfwGore", "true");
  if (image.nsfwSensitive) {
    body.append("nsfwSensitive", "true");
    if (image.sensitiveContentDescription) {
      body.append(
        "sensitiveContentDescription",
        image.sensitiveContentDescription,
      );
    }
  }

  let mediaId: string;
  try {
    const response = await fetch(`${API_BASE_URL}/images/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getAccessToken()}` },
      body,
    });

    if (!response.ok) {
      const errorData: { message?: string } = await response
        .json()
        .catch(() => ({}));
      throw new Error(errorData.message || "Upload failed");
    }

    const media: { id: string } = await response.json();
    mediaId = media.id;
  } catch (err) {
    return { ok: false, step: "upload", error: toError(err) };
  }

  try {
    await setMainMedia(characterId, mediaId);
  } catch (err) {
    return { ok: false, step: "setMain", error: toError(err) };
  }

  return { ok: true, mediaId };
}
