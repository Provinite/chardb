import { CANDY_SLUGS } from "../discord/images.generated";
import {
  HALLOWEEN_HOSTS,
  HOST_CANDIES,
  HOUSE_OFFER_LIFETIME_MS,
  HOUSE_SPAWN_INTERVAL_MS,
  MAX_OPEN_HOUSE_OFFERS,
  dueHouseSpawns,
  isHalloweenHost,
} from "./house-offers";

const MINUTE = 60_000;
const NOW = new Date("2026-10-20T12:00:00Z");
const ago = (minutes: number) => new Date(NOW.getTime() - minutes * MINUTE);

describe("house offers", () => {
  describe("HOST_CANDIES", () => {
    it("gives every candy to exactly one host", () => {
      const assigned = HALLOWEEN_HOSTS.flatMap((host) => HOST_CANDIES[host]);
      expect([...assigned].sort()).toEqual([...CANDY_SLUGS].sort());
      expect(new Set(assigned).size).toBe(assigned.length);
    });

    it("splits the candies close to evenly", () => {
      const [daphne, luther] = HALLOWEEN_HOSTS.map(
        (host) => HOST_CANDIES[host].length,
      );
      expect(Math.abs(daphne - luther)).toBeLessThanOrEqual(2);
    });
  });

  describe("isHalloweenHost", () => {
    it("knows the two hosts and nobody else", () => {
      expect(isHalloweenHost("Daphne")).toBe(true);
      expect(isHalloweenHost("Luther")).toBe(true);
      expect(isHalloweenHost("luther")).toBe(false);
      expect(isHalloweenHost(null)).toBe(false);
    });
  });

  describe("dueHouseSpawns", () => {
    it("spawns one now when the house has never offered", () => {
      expect(dueHouseSpawns(null, NOW, 0)).toEqual([NOW]);
    });

    it("spawns nothing before an interval has passed", () => {
      expect(dueHouseSpawns(ago(9), NOW, 0)).toEqual([]);
    });

    it("spawns on the tick an interval after the last", () => {
      expect(dueHouseSpawns(ago(10), NOW, 0)).toEqual([NOW]);
      expect(dueHouseSpawns(ago(15), NOW, 0)).toEqual([ago(5)]);
    });

    it("catches up one per interval missed", () => {
      expect(dueHouseSpawns(ago(35), NOW, 0)).toEqual([
        ago(25),
        ago(15),
        ago(5),
      ]);
    });

    it("tops up only to the cap, keeping the latest ticks", () => {
      const due = dueHouseSpawns(ago(60), NOW, MAX_OPEN_HOUSE_OFFERS - 2);
      expect(due).toEqual([ago(10), ago(0)]);
    });

    it("spawns nothing at or over the cap", () => {
      expect(dueHouseSpawns(ago(60), NOW, MAX_OPEN_HOUSE_OFFERS)).toEqual([]);
      expect(dueHouseSpawns(ago(60), NOW, MAX_OPEN_HOUSE_OFFERS + 5)).toEqual(
        [],
      );
    });

    it("skips ticks whose offers would already have expired", () => {
      const lifetime = HOUSE_OFFER_LIFETIME_MS / MINUTE;
      const interval = HOUSE_SPAWN_INTERVAL_MS / MINUTE;
      const due = dueHouseSpawns(ago(lifetime * 3), NOW, 0);
      expect(due.length).toBeLessThanOrEqual(lifetime / interval);
      for (const at of due) {
        expect(at.getTime() + HOUSE_OFFER_LIFETIME_MS).toBeGreaterThan(
          NOW.getTime(),
        );
      }
    });
  });
});
