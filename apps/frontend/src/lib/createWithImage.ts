import type { Visibility } from "../generated/graphql";
import type { ThumbnailCropRect } from "../components/ThumbnailCropper";
import {
  ImageUploadError,
  uploadImage,
  type UploadImageFields,
} from "./uploadImage";

/**
 * The image picked on the create form, held until the character exists.
 *
 * Sensitive content is the one flag offered, because it is what the backend
 * stores: it becomes `isNsfw`, with the description beside it.
 */
export interface PendingCharacterImage {
  file: File;
  nsfwSensitive: boolean;
  sensitiveContentDescription: string;
  /**
   * The thumbnail framing, which is also the character's icon wherever it is
   * shown small (#418). Absent means the automatic centre crop.
   */
  thumbnailCrop?: ThumbnailCropRect;
}

/**
 * Whether a picked image stops the form from submitting. NSFW uploads are
 * refused site-wide for now, the same rule the upload page enforces.
 */
export const isPickedImageBlocked = (value: PendingCharacterImage | null) =>
  Boolean(value?.nsfwSensitive);

export type StepKey = "create" | "upload" | "setMain";
export type StepStatus = "todo" | "running" | "done" | "failed";

export interface Step {
  key: StepKey;
  status: StepStatus;
  /** Fraction uploaded, while the upload step runs. */
  progress?: number;
}

export interface CreateProgress {
  steps: Step[];
  outcome: "running" | "done" | "failed";
  failedStep?: StepKey;
  /** Shown to the member; the server's reason when it gave one. */
  error?: string;
  characterId?: string;
  mediaId?: string;
}

interface RunArgs {
  /** Makes the character -- create or redeem -- and returns its id. */
  create: () => Promise<string>;
  image: PendingCharacterImage | null;
  /** Captured at submit, so the image matches the character it goes on. */
  visibility: Visibility;
  setMainMedia: (characterId: string, mediaId: string) => Promise<unknown>;
  onChange: (progress: CreateProgress) => void;
  upload?: (
    fields: UploadImageFields,
    options?: { onProgress?: (fraction: number) => void },
  ) => Promise<{ id: string }>;
}

const reason = (err: unknown) =>
  err instanceof ImageUploadError
    ? err.serverMessage
    : err instanceof Error
      ? err.message
      : undefined;

/**
 * Create a character and attach its first image, reporting each step as it
 * moves (#424).
 *
 * Three requests: the character must exist before its image can be uploaded,
 * because moderation routes an upload by its character. Never throws -- a
 * failure is a state the dialog explains -- and once the character exists, no
 * later failure undoes it.
 */
export async function runCreateWithImage({
  create,
  image,
  visibility,
  setMainMedia,
  onChange,
  upload = uploadImage,
}: RunArgs): Promise<CreateProgress> {
  let state: CreateProgress = {
    outcome: "running",
    steps: [
      { key: "create", status: "running" },
      ...(image
        ? ([
            { key: "upload", status: "todo" },
            { key: "setMain", status: "todo" },
          ] as Step[])
        : []),
    ],
  };

  const update = (
    patch: Partial<CreateProgress>,
    step?: StepKey,
    stepPatch?: Partial<Step>,
  ) => {
    state = {
      ...state,
      ...patch,
      steps: state.steps.map((s) =>
        s.key === step ? { ...s, ...stepPatch } : s,
      ),
    };
    onChange(state);
    return state;
  };

  onChange(state);

  let characterId: string;
  try {
    characterId = await create();
  } catch (err) {
    return update(
      { outcome: "failed", failedStep: "create", error: reason(err) },
      "create",
      { status: "failed" },
    );
  }
  update({ characterId }, "create", { status: "done" });

  if (!image) return update({ outcome: "done" });

  update({}, "upload", { status: "running", progress: 0 });
  let mediaId: string;
  try {
    const media = await upload(
      {
        file: image.file,
        characterId,
        visibility,
        isNsfw: image.nsfwSensitive,
        sensitiveContentDescription: image.nsfwSensitive
          ? image.sensitiveContentDescription
          : undefined,
        thumbnailCrop: image.thumbnailCrop,
      },
      {
        onProgress: (fraction) =>
          update({}, "upload", { status: "running", progress: fraction }),
      },
    );
    mediaId = media.id;
  } catch (err) {
    return update(
      { outcome: "failed", failedStep: "upload", error: reason(err) },
      "upload",
      { status: "failed" },
    );
  }
  update({ mediaId }, "upload", { status: "done", progress: 1 });

  update({}, "setMain", { status: "running" });
  try {
    await setMainMedia(characterId, mediaId);
  } catch (err) {
    return update(
      { outcome: "failed", failedStep: "setMain", error: reason(err) },
      "setMain",
      { status: "failed" },
    );
  }
  update({}, "setMain", { status: "done" });

  return update({ outcome: "done" });
}
