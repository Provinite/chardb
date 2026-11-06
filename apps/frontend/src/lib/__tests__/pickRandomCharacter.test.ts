import { describe, it, expect, vi } from "vitest";
import { pickRandomCharacterId } from "../pickRandomCharacter";

describe("pickRandomCharacterId", () => {
  it("asks for one character at a random offset across every match", async () => {
    const fetchAt = vi.fn(async () => ({ id: "c-87", total: 100 }));

    const id = await pickRandomCharacterId(fetchAt, 100, () => 0.875);

    expect(fetchAt).toHaveBeenCalledWith(87);
    expect(id).toBe("c-87");
  });

  it("picks again against the fresh total when the matches shrank", async () => {
    const fetchAt = vi
      .fn()
      .mockResolvedValueOnce({ id: null, total: 10 })
      .mockResolvedValueOnce({ id: "c-5", total: 10 });

    const id = await pickRandomCharacterId(fetchAt, 100, () => 0.5);

    expect(fetchAt).toHaveBeenNthCalledWith(1, 50);
    expect(fetchAt).toHaveBeenNthCalledWith(2, 5);
    expect(id).toBe("c-5");
  });

  it("gives up after the retry misses", async () => {
    const fetchAt = vi.fn(async () => ({ id: null, total: 3 }));

    const id = await pickRandomCharacterId(fetchAt, 100, () => 0.5);

    expect(fetchAt).toHaveBeenCalledTimes(2);
    expect(id).toBeNull();
  });

  it("asks nothing when nothing matches", async () => {
    const fetchAt = vi.fn();

    expect(await pickRandomCharacterId(fetchAt, 0)).toBeNull();
    expect(fetchAt).not.toHaveBeenCalled();
  });
});
