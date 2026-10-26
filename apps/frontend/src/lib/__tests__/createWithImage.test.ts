import { describe, it, expect, vi } from "vitest";
import { Visibility } from "../../generated/graphql";
import { ImageUploadError, type UploadImageFields } from "../uploadImage";
import {
  runCreateWithImage,
  type CreateProgress,
  type PendingCharacterImage,
} from "../createWithImage";

const image: PendingCharacterImage = {
  file: new File(["x"], "portrait.png", { type: "image/png" }),
  nsfwSensitive: false,
  sensitiveContentDescription: "",
  thumbnailCrop: { x: 1, y: 2, width: 3, height: 3 },
};

/** Every snapshot reported, as `step:status` strings for one step. */
const history = (snapshots: CreateProgress[], key: string) =>
  snapshots.map(
    (s) => s.steps.find((step) => step.key === key)?.status ?? "absent",
  );

describe("runCreateWithImage", () => {
  it("runs create, upload and set-main in order and finishes done", async () => {
    const snapshots: CreateProgress[] = [];
    const upload = vi.fn(
      async (
        _fields: UploadImageFields,
        options?: { onProgress?: (f: number) => void },
      ) => {
        options?.onProgress?.(0.5);
        return { id: "media-1" };
      },
    );
    const setMainMedia = vi.fn().mockResolvedValue(undefined);

    const result = await runCreateWithImage({
      create: async () => "char-1",
      image,
      visibility: Visibility.Private,
      upload,
      setMainMedia,
      onChange: (p) => snapshots.push(p),
    });

    expect(result).toMatchObject({
      outcome: "done",
      characterId: "char-1",
      mediaId: "media-1",
    });
    expect(upload).toHaveBeenCalledWith(
      expect.objectContaining({
        file: image.file,
        characterId: "char-1",
        visibility: Visibility.Private,
        isNsfw: false,
        thumbnailCrop: image.thumbnailCrop,
      }),
      expect.anything(),
    );
    expect(setMainMedia).toHaveBeenCalledWith("char-1", "media-1");

    expect(history(snapshots, "create")[0]).toBe("running");
    expect(history(snapshots, "upload")).toContain("running");
    expect(snapshots.some((s) => s.steps[1].progress === 0.5)).toBe(true);
    expect(snapshots.at(-1)!.steps.map((s) => s.status)).toEqual([
      "done",
      "done",
      "done",
    ]);
  });

  it("has only the create step when no image was picked", async () => {
    const result = await runCreateWithImage({
      create: async () => "char-1",
      image: null,
      visibility: Visibility.Public,
      upload: vi.fn(),
      setMainMedia: vi.fn(),
      onChange: () => undefined,
    });

    expect(result.outcome).toBe("done");
    expect(result.steps.map((s) => s.key)).toEqual(["create"]);
  });

  it("stops at a failed create with nothing made", async () => {
    const upload = vi.fn();
    const result = await runCreateWithImage({
      create: async () => {
        throw new Error("You do not have permission");
      },
      image,
      visibility: Visibility.Public,
      upload,
      setMainMedia: vi.fn(),
      onChange: () => undefined,
    });

    expect(result).toMatchObject({
      outcome: "failed",
      failedStep: "create",
      error: "You do not have permission",
    });
    expect(result.characterId).toBeUndefined();
    expect(upload).not.toHaveBeenCalled();
  });

  it("keeps the character when the upload fails", async () => {
    const setMainMedia = vi.fn();
    const result = await runCreateWithImage({
      create: async () => "char-1",
      image,
      visibility: Visibility.Public,
      upload: vi.fn().mockRejectedValue(new ImageUploadError(413, "Too big")),
      setMainMedia,
      onChange: () => undefined,
    });

    expect(result).toMatchObject({
      outcome: "failed",
      failedStep: "upload",
      characterId: "char-1",
      error: "Too big",
    });
    expect(setMainMedia).not.toHaveBeenCalled();
  });

  it("names the uploaded image when only setting it as main fails", async () => {
    const result = await runCreateWithImage({
      create: async () => "char-1",
      image,
      visibility: Visibility.Public,
      upload: vi.fn().mockResolvedValue({ id: "media-1" }),
      setMainMedia: vi.fn().mockRejectedValue(new Error("Forbidden")),
      onChange: () => undefined,
    });

    expect(result).toMatchObject({
      outcome: "failed",
      failedStep: "setMain",
      characterId: "char-1",
      mediaId: "media-1",
    });
  });
});
