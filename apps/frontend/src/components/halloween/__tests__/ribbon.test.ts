/**
 * The nameplate's ribbon picture, fetched once and kept as a data address:
 * an SVG shown as a picture loads nothing from outside itself.
 */
import { afterEach, describe, it, expect, vi } from "vitest";

/** A fresh copy of the module, with nothing yet fetched. */
const fresh = async () => {
  vi.resetModules();
  return import("../ribbon");
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadRibbon", () => {
  it("is the ribbon picture, as a data address", async () => {
    const fetched = vi.fn(async () => new Response(new Blob(["png"])));
    vi.stubGlobal("fetch", fetched);
    const { loadRibbon, RIBBON_SRC } = await fresh();

    expect(await loadRibbon()).toMatch(/^data:/);
    expect(fetched).toHaveBeenCalledWith(RIBBON_SRC);
  });

  it("fetches it only once", async () => {
    const fetched = vi.fn(async () => new Response(new Blob(["png"])));
    vi.stubGlobal("fetch", fetched);
    const { loadRibbon } = await fresh();

    await Promise.all([loadRibbon(), loadRibbon()]);
    await loadRibbon();
    expect(fetched).toHaveBeenCalledTimes(1);
  });

  it("is nothing when it will not load, and tries again next time", async () => {
    const fetched = vi
      .fn<() => Promise<Response>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValue(new Response(new Blob(["png"])));
    vi.stubGlobal("fetch", fetched);
    const { loadRibbon } = await fresh();

    expect(await loadRibbon()).toBeNull();
    expect(await loadRibbon()).toBeNull();
    expect(await loadRibbon()).toMatch(/^data:/);
  });
});
