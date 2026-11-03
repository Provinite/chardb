import { CANDY_SLUGS } from "../discord/images.generated";
import {
  HALLOWEEN_HOSTS,
  HOST_CANDIES,
  HOUSE_OFFER_LIFETIME_MS,
  HOUSE_SPAWN_INTERVAL_MS,
  MAX_HOUSE_CATCH_UP,
  MAX_OPEN_HOUSE_OFFERS,
  balancedHosts,
  dueHouseSpawns,
  isHalloweenHost,
  leastAskedWants,
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

  describe("the schedule", () => {
    it("offers every five minutes", () => {
      expect(HOUSE_SPAWN_INTERVAL_MS).toBe(5 * MINUTE);
    });

    it("keeps an offer open until the full pool would roll over", () => {
      expect(HOUSE_OFFER_LIFETIME_MS).toBe(
        MAX_OPEN_HOUSE_OFFERS * HOUSE_SPAWN_INTERVAL_MS,
      );
    });
  });

  describe("dueHouseSpawns", () => {
    const interval = HOUSE_SPAWN_INTERVAL_MS / MINUTE;

    it("spawns one now when the house has never offered", () => {
      expect(dueHouseSpawns(null, NOW, 0)).toEqual([NOW]);
    });

    it("spawns nothing before an interval has passed", () => {
      expect(dueHouseSpawns(ago(interval - 1), NOW, 0)).toEqual([]);
    });

    it("spawns on the tick an interval after the last", () => {
      expect(dueHouseSpawns(ago(interval), NOW, 0)).toEqual([NOW]);
      expect(dueHouseSpawns(ago(interval + 2), NOW, 0)).toEqual([ago(2)]);
    });

    it("catches up one per interval missed", () => {
      expect(dueHouseSpawns(ago(3 * interval + 2), NOW, 0)).toEqual([
        ago(2 * interval + 2),
        ago(interval + 2),
        ago(2),
      ]);
    });

    it("catches up at most a batch at a time, keeping the latest ticks", () => {
      const due = dueHouseSpawns(ago(100 * interval), NOW, 0);
      expect(due).toHaveLength(MAX_HOUSE_CATCH_UP);
      expect(due[due.length - 1]).toEqual(NOW);
      expect(due[0]).toEqual(ago((MAX_HOUSE_CATCH_UP - 1) * interval));
    });

    it("tops up only to the cap, keeping the latest ticks", () => {
      const due = dueHouseSpawns(
        ago(6 * interval),
        NOW,
        MAX_OPEN_HOUSE_OFFERS - 2,
      );
      expect(due).toEqual([ago(interval), ago(0)]);
    });

    it("spawns nothing at or over the cap", () => {
      expect(
        dueHouseSpawns(ago(6 * interval), NOW, MAX_OPEN_HOUSE_OFFERS),
      ).toEqual([]);
      expect(
        dueHouseSpawns(ago(6 * interval), NOW, MAX_OPEN_HOUSE_OFFERS + 5),
      ).toEqual([]);
    });

    it("skips ticks whose offers would already have expired", () => {
      const lifetime = HOUSE_OFFER_LIFETIME_MS / MINUTE;
      const due = dueHouseSpawns(ago(lifetime * 3), NOW, 0);
      for (const at of due) {
        expect(at.getTime() + HOUSE_OFFER_LIFETIME_MS).toBeGreaterThan(
          NOW.getTime(),
        );
      }
    });
  });

  describe("leastAskedWants", () => {
    const pools = {
      Daphne: ["banana", "jelly-beans"],
      Luther: ["skull-candy"],
    } as const;

    it("offers every possible want while none is asked for", () => {
      expect(leastAskedWants(pools.Daphne, new Map())).toEqual([
        "banana",
        "jelly-beans",
      ]);
    });

    it("leaves out wants already asked for until every one is", () => {
      const asked = new Map([["banana", 1]]);
      expect(leastAskedWants(pools.Daphne, asked)).toEqual(["jelly-beans"]);
    });

    it("repeats the least-asked wants once every want is asked for", () => {
      const asked = new Map([
        ["banana", 2],
        ["jelly-beans", 1],
      ]);
      expect(leastAskedWants(pools.Daphne, asked)).toEqual(["jelly-beans"]);
    });

    it("counts only the asks for kinds in the pool", () => {
      const asked = new Map([["skull-candy", 5]]);
      expect(leastAskedWants(pools.Daphne, asked)).toEqual([
        "banana",
        "jelly-beans",
      ]);
    });
  });

  describe("balancedHosts", () => {
    it("picks the host with fewer open offers", () => {
      expect(balancedHosts({ Daphne: 3, Luther: 1 })).toEqual(["Luther"]);
      expect(balancedHosts({ Daphne: 0, Luther: 2 })).toEqual(["Daphne"]);
    });

    it("leaves either host when they are even", () => {
      expect(balancedHosts({ Daphne: 2, Luther: 2 })).toEqual([
        "Daphne",
        "Luther",
      ]);
    });
  });
});
