import { HalloweenRandom } from "./random";

/** A random source that replays the given values for every kind of draw. */
function scripted(values: number[]): HalloweenRandom {
  const random = new HalloweenRandom();
  let i = 0;
  const next = () => values[i++ % values.length];
  jest.spyOn(random, "unit").mockImplementation(next);
  jest
    .spyOn(random, "int")
    .mockImplementation((max: number) => Math.floor(next() * max));
  return random;
}

describe("HalloweenRandom", () => {
  describe("unit", () => {
    it("is in [0, 1)", () => {
      const random = new HalloweenRandom();
      for (let i = 0; i < 1000; i++) {
        const n = random.unit();
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThan(1);
      }
    });
  });

  describe("int", () => {
    it("is in [0, max)", () => {
      const random = new HalloweenRandom();
      for (let i = 0; i < 1000; i++) {
        const n = random.int(11);
        expect(Number.isInteger(n)).toBe(true);
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThan(11);
      }
    });
  });

  describe("element", () => {
    it("picks by position", () => {
      expect(scripted([0]).element(["a", "b", "c"])).toBe("a");
      expect(scripted([0.99]).element(["a", "b", "c"])).toBe("c");
    });
  });

  describe("weighted", () => {
    it("selects in proportion to weight", () => {
      // total weight 6: [0,1) -> a, [1,3) -> b, [3,6) -> c
      const items = ["a", "b", "c"];
      const weights = [1, 2, 3];
      expect(scripted([0 / 6]).weighted(items, weights)).toBe("a");
      expect(scripted([1 / 6]).weighted(items, weights)).toBe("b");
      expect(scripted([2.9 / 6]).weighted(items, weights)).toBe("b");
      expect(scripted([3 / 6]).weighted(items, weights)).toBe("c");
    });

    it("never selects a zero-weight element", () => {
      expect(scripted([0]).weighted(["a", "b"], [0, 5])).toBe("b");
    });

    it("rejects mismatched lengths", () => {
      expect(() => new HalloweenRandom().weighted(["a"], [1, 2])).toThrow(
        "elements and weights must be the same length",
      );
    });
  });

  describe("vagueNumberName", () => {
    it("calls one 'just one'", () => {
      expect(scripted([0]).vagueNumberName(1)).toBe("just one");
    });

    // The bot sorts its range keys as strings -- "1", "10", "20", "5",
    // "999999" -- so the "a few" bucket is never reached and everything from
    // 2 to 10 lands in the "10" bucket. Kept as-is.
    it("puts 2 through 10 in the 'bunch' bucket", () => {
      expect(scripted([0]).vagueNumberName(2)).toBe("a bunch");
      expect(scripted([0]).vagueNumberName(5)).toBe("a bunch");
      expect(scripted([0.99]).vagueNumberName(10)).toBe("many");
    });

    it("puts 11 through 20 in the 'bunches' bucket", () => {
      expect(scripted([0]).vagueNumberName(11)).toBe("bunches");
      expect(scripted([0.99]).vagueNumberName(20)).toBe("heaps");
    });

    it("puts anything larger in the 'tons' bucket", () => {
      expect(scripted([0]).vagueNumberName(21)).toBe("tons");
      expect(scripted([0.99]).vagueNumberName(500)).toBe("a truckload");
    });

    it("has a fallback past the last bucket", () => {
      expect(scripted([0]).vagueNumberName(1_000_000)).toBe(
        "an absolutely huge number",
      );
    });
  });

  describe("shuffle", () => {
    it("returns every element", () => {
      const out = new HalloweenRandom().shuffle([1, 2, 3, 4, 5]);
      expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
    });
  });
});
