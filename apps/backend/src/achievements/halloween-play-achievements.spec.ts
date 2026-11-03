import {
  halloweenPlaySlugs,
  knockedEveryDay,
  type HalloweenPlay,
} from "./halloween-play-achievements";

const nothing: HalloweenPlay = {
  trades: 0,
  offeredThreeForOne: false,
  tookThreeForOne: false,
  giftedSelf: false,
  giftedBot: false,
  knockedEveryDay: false,
  knockedWithNoneLeft: false,
};

describe("halloweenPlaySlugs", () => {
  it("earns nothing for nothing done", () => {
    expect(halloweenPlaySlugs(nothing, 2026)).toEqual([]);
  });

  it.each([
    [4, []],
    [5, ["candy-trades-5-2026"]],
    [14, ["candy-trades-5-2026"]],
    [15, ["candy-trades-5-2026", "candy-trades-15-2026"]],
    [
      30,
      ["candy-trades-5-2026", "candy-trades-15-2026", "candy-trades-30-2026"],
    ],
  ])("earns every trade tier reached by %i trades", (trades, slugs) => {
    expect(halloweenPlaySlugs({ ...nothing, trades }, 2026)).toEqual(slugs);
  });

  it("earns one achievement for each thing done", () => {
    expect(
      halloweenPlaySlugs(
        {
          trades: 0,
          offeredThreeForOne: true,
          tookThreeForOne: true,
          giftedSelf: true,
          giftedBot: true,
          knockedEveryDay: true,
          knockedWithNoneLeft: true,
        },
        2026,
      ),
    ).toEqual([
      "generous-offer-2026",
      "bargain-hunter-2026",
      "treat-yourself-2026",
      "faustian-bargain-2026",
      "every-night-2026",
      "nobody-home-2026",
    ]);
  });

  it("earns nothing in a year with no achievements in the catalog", () => {
    expect(
      halloweenPlaySlugs({ ...nothing, trades: 30, giftedSelf: true }, 2031),
    ).toEqual([]);
  });
});

describe("knockedEveryDay", () => {
  // Resets at 6 AM Chicago, which is 11:00Z in October (CDT).
  const event = {
    startDate: new Date("2026-10-10T11:00:00Z"),
    endDate: new Date("2026-10-13T11:00:00Z"),
    resetTime: 6,
  };
  const day1 = new Date("2026-10-10T15:00:00Z");
  const day2 = new Date("2026-10-11T15:00:00Z");
  // 5 AM Chicago on the 13th: still the 12th's reset day.
  const day3Late = new Date("2026-10-13T10:00:00Z");

  it("holds when every reset day has a knock", () => {
    expect(knockedEveryDay([day1, day2, day3Late], event)).toBe(true);
  });

  it("fails with a day missed", () => {
    expect(knockedEveryDay([day1, day3Late], event)).toBe(false);
  });

  it("fails with no knocks", () => {
    expect(knockedEveryDay([], event)).toBe(false);
  });

  it("fails for an event with no end date", () => {
    expect(
      knockedEveryDay([day1, day2, day3Late], { ...event, endDate: null }),
    ).toBe(false);
  });

  it("counts a day the event starts part way through", () => {
    const lateStart = { ...event, startDate: new Date("2026-10-10T20:00:00Z") };
    expect(
      knockedEveryDay([new Date("2026-10-10T21:00:00Z"), day2, day3Late], {
        ...lateStart,
      }),
    ).toBe(true);
  });

  it("counts a day whose reset falls in the hour repeated when daylight saving ends", () => {
    // Resets at 1 AM: Nov 1 has two, 06:00Z (CDT) and 07:00Z (CST).
    const event = {
      startDate: new Date("2026-10-31T06:00:00Z"),
      endDate: new Date("2026-11-03T07:00:00Z"),
      resetTime: 1,
    };
    expect(
      knockedEveryDay(
        [
          new Date("2026-10-31T12:00:00Z"),
          new Date("2026-11-01T08:00:00Z"),
          new Date("2026-11-02T12:00:00Z"),
        ],
        event,
      ),
    ).toBe(true);
  });

  it("keeps reset days at 6 AM local across the end of daylight saving", () => {
    // DST ends 2026-11-01 at 2 AM; 6 AM is 11:00Z before and 12:00Z after.
    const overDst = {
      startDate: new Date("2026-10-31T11:00:00Z"),
      endDate: new Date("2026-11-03T12:00:00Z"),
      resetTime: 6,
    };
    const knocks = [
      new Date("2026-10-31T12:00:00Z"),
      new Date("2026-11-01T12:30:00Z"),
      new Date("2026-11-02T12:30:00Z"),
    ];
    expect(knockedEveryDay(knocks, overDst)).toBe(true);
    // 11:30Z on the 2nd is 5:30 AM CST: still the 1st's reset day.
    expect(
      knockedEveryDay(
        [knocks[0], knocks[1], new Date("2026-11-02T11:30:00Z")],
        overDst,
      ),
    ).toBe(false);
  });
});
