import { signInAchievements } from "./sign-in-achievements";
import { findAchievement } from "./achievement-catalog";

const event2026 = {
  communityId: "c1",
  startDate: new Date("2026-10-01T11:00:00Z"),
  endDate: new Date("2026-11-08T05:00:00Z"),
};

describe("signInAchievements", () => {
  it("awards trick-or-treater 2026 while the 2026 event is on", () => {
    expect(
      signInAchievements([event2026], new Date("2026-10-15T00:00:00Z")),
    ).toEqual([{ communityId: "c1", slug: "trick-or-treater-2026" }]);
  });

  it("awards nothing before the event starts", () => {
    expect(
      signInAchievements([event2026], new Date("2026-09-30T00:00:00Z")),
    ).toEqual([]);
  });

  it("awards nothing after the event ends", () => {
    expect(
      signInAchievements([event2026], new Date("2026-11-09T00:00:00Z")),
    ).toEqual([]);
  });

  it("awards nothing for an event with no start date", () => {
    expect(
      signInAchievements(
        [{ ...event2026, startDate: null }],
        new Date("2026-10-15T00:00:00Z"),
      ),
    ).toEqual([]);
  });

  it("awards for an event with no end date", () => {
    expect(
      signInAchievements(
        [{ ...event2026, endDate: null }],
        new Date("2026-12-15T00:00:00Z"),
      ),
    ).toEqual([{ communityId: "c1", slug: "trick-or-treater-2026" }]);
  });

  it("awards nothing for an event in a year with no achievement", () => {
    expect(
      signInAchievements(
        [
          {
            communityId: "c1",
            startDate: new Date("2027-10-01T11:00:00Z"),
            endDate: null,
          },
        ],
        new Date("2027-10-15T00:00:00Z"),
      ),
    ).toEqual([]);
  });

  it("names the year by the start date in US Central", () => {
    // 2026-01-01 03:00 UTC is still New Year's Eve in Chicago.
    expect(
      signInAchievements(
        [
          {
            communityId: "c1",
            startDate: new Date("2027-01-01T03:00:00Z"),
            endDate: null,
          },
        ],
        new Date("2027-01-02T00:00:00Z"),
      ),
    ).toEqual([{ communityId: "c1", slug: "trick-or-treater-2026" }]);
  });

  it("awards each community separately", () => {
    expect(
      signInAchievements(
        [event2026, { ...event2026, communityId: "c2" }],
        new Date("2026-10-15T00:00:00Z"),
      ),
    ).toEqual([
      { communityId: "c1", slug: "trick-or-treater-2026" },
      { communityId: "c2", slug: "trick-or-treater-2026" },
    ]);
  });
});

describe("findAchievement", () => {
  it("knows trick-or-treater 2026", () => {
    expect(findAchievement("trick-or-treater-2026")?.name).toBe(
      "Trick-or-Treater 2026",
    );
  });

  it("knows nothing of an unlisted slug", () => {
    expect(findAchievement("nope")).toBeUndefined();
  });
});
