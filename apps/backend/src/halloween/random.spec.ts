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
});
