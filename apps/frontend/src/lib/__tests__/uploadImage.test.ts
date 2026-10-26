import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setAccessToken } from "../accessToken";
import { ImageUploadError, uploadImage } from "../uploadImage";

/**
 * Just enough of XMLHttpRequest to drive one upload from the test: the
 * request is captured on `send`, and the test decides how it ends.
 */
class FakeXhr {
  static last: FakeXhr | null = null;

  method = "";
  url = "";
  headers: Record<string, string> = {};
  body: FormData | null = null;
  status = 0;
  responseText = "";
  upload: { onprogress: ((event: ProgressEvent) => void) | null } = {
    onprogress: null,
  };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }

  send(body: FormData) {
    this.body = body;
    FakeXhr.last = this;
  }

  progress(loaded: number, total: number) {
    this.upload.onprogress?.({
      lengthComputable: true,
      loaded,
      total,
    } as ProgressEvent);
  }

  respond(status: number, body: unknown) {
    this.status = status;
    this.responseText = JSON.stringify(body);
    this.onload?.();
  }

  fail() {
    this.onerror?.();
  }
}

const file = new File(["x"], "portrait.png", { type: "image/png" });

describe("uploadImage", () => {
  beforeEach(() => {
    FakeXhr.last = null;
    vi.stubGlobal("XMLHttpRequest", FakeXhr);
    setAccessToken("token-123");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setAccessToken(null);
  });

  it("posts the fields and resolves with the media", async () => {
    const result = uploadImage({
      file,
      characterId: "char-1",
      title: "Portrait",
      visibility: "PUBLIC",
      isNsfw: false,
      thumbnailCrop: { x: 1, y: 2, width: 3, height: 3 },
    });

    const xhr = FakeXhr.last!;
    expect(xhr.method).toBe("POST");
    expect(xhr.url).toMatch(/\/images\/upload$/);
    expect(xhr.headers.Authorization).toBe("Bearer token-123");
    expect(xhr.body!.get("characterId")).toBe("char-1");
    expect(xhr.body!.get("title")).toBe("Portrait");
    expect(xhr.body!.get("isNsfw")).toBe("false");
    expect(xhr.body!.get("thumbnailCropWidth")).toBe("3");

    xhr.respond(201, { id: "media-1", title: "Portrait" });
    await expect(result).resolves.toMatchObject({ id: "media-1" });
  });

  it("reports progress as a fraction", async () => {
    const onProgress = vi.fn();
    const result = uploadImage({ file, isNsfw: false }, { onProgress });

    FakeXhr.last!.progress(25, 100);
    FakeXhr.last!.progress(100, 100);
    expect(onProgress.mock.calls).toEqual([[0.25], [1]]);

    FakeXhr.last!.respond(201, { id: "media-1" });
    await result;
  });

  it("rejects with the status and the server's reason", async () => {
    const result = uploadImage({ file, isNsfw: false });
    FakeXhr.last!.respond(413, { message: "File too large" });

    const error = await result.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ImageUploadError);
    expect(error).toMatchObject({
      message: "Image upload failed",
      status: 413,
      serverMessage: "File too large",
    });
  });

  it("rejects when the request never lands", async () => {
    const result = uploadImage({ file, isNsfw: false });
    FakeXhr.last!.fail();

    await expect(result).rejects.toMatchObject({ status: 0 });
  });
});
