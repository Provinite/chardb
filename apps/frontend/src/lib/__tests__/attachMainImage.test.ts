import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setAccessToken } from "../accessToken";
import { Visibility } from "../../generated/graphql";
import {
  attachMainImage,
  type PendingCharacterImage,
} from "../attachMainImage";

const image = (
  overrides: Partial<PendingCharacterImage> = {},
): PendingCharacterImage => ({
  file: new File(["x"], "portrait.png", { type: "image/png" }),
  nsfwSensitive: false,
  sensitiveContentDescription: "",
  ...overrides,
});

const okResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

describe("attachMainImage", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    setAccessToken("token-123");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    setAccessToken(null);
  });

  it("uploads to the character and then makes the upload its main image", async () => {
    fetchMock.mockResolvedValue(okResponse({ id: "media-1" }));
    const setMainMedia = vi.fn().mockResolvedValue(undefined);

    const result = await attachMainImage({
      characterId: "char-1",
      image: image(),
      visibility: Visibility.Public,
      setMainMedia,
    });

    expect(result).toEqual({ ok: true, mediaId: "media-1" });
    expect(setMainMedia).toHaveBeenCalledWith("char-1", "media-1");

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/images\/upload$/);
    expect(init?.headers).toEqual({ Authorization: "Bearer token-123" });
    const body = init?.body as FormData;
    expect(body.get("characterId")).toBe("char-1");
    expect(body.get("visibility")).toBe("PUBLIC");
    expect(body.get("isNsfw")).toBe("false");
    // jsdom's FormData renames appended files to "blob", so check the bytes
    // went rather than the name.
    expect(body.get("file")).toBeInstanceOf(Blob);
  });

  it("flags the upload as mature when sensitive content is ticked", async () => {
    fetchMock.mockResolvedValue(okResponse({ id: "media-1" }));

    await attachMainImage({
      characterId: "char-1",
      image: image({
        nsfwSensitive: true,
        sensitiveContentDescription: "Spiders",
      }),
      visibility: Visibility.Public,
      setMainMedia: vi.fn().mockResolvedValue(undefined),
    });

    const body = fetchMock.mock.calls[0][1]?.body as FormData;
    expect(body.get("isNsfw")).toBe("true");
    expect(body.get("sensitiveContentDescription")).toBe("Spiders");
  });

  it("reports the upload step when the upload is refused", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: "Too large" }), { status: 413 }),
    );
    const setMainMedia = vi.fn();

    const result = await attachMainImage({
      characterId: "char-1",
      image: image(),
      visibility: Visibility.Public,
      setMainMedia,
    });

    expect(result).toMatchObject({ ok: false, step: "upload" });
    expect(setMainMedia).not.toHaveBeenCalled();
  });

  it("reports the upload step when the request never lands", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const result = await attachMainImage({
      characterId: "char-1",
      image: image(),
      visibility: Visibility.Public,
      setMainMedia: vi.fn(),
    });

    expect(result).toMatchObject({ ok: false, step: "upload" });
  });

  it("reports the main-image step when the upload landed but setting it failed", async () => {
    fetchMock.mockResolvedValue(okResponse({ id: "media-1" }));

    const result = await attachMainImage({
      characterId: "char-1",
      image: image(),
      visibility: Visibility.Public,
      setMainMedia: vi.fn().mockRejectedValue(new Error("Forbidden")),
    });

    expect(result).toMatchObject({ ok: false, step: "setMain" });
  });
});
