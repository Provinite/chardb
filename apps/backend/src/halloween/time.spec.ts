import {
  formatChicagoDate,
  formatChicagoDateUpper,
  formatLastReset,
  formatLegacyLocale,
  formatResetHour,
  getEventStatus,
  getLastReset,
  EventStatus,
} from "./time";

// October 2025 is CDT (UTC-5): midnight in Chicago is 05:00Z.
const chicago = (iso: string) => new Date(iso);

describe("getLastReset", () => {
  it("is today's reset hour once that hour has arrived", () => {
    // 10:30 CDT, reset at 6
    const now = chicago("2025-10-17T15:30:00Z");
    expect(getLastReset(6, now).toISOString()).toBe("2025-10-17T11:00:00.000Z");
  });

  it("counts the reset hour itself as having arrived", () => {
    // 06:59 CDT, reset at 6
    const now = chicago("2025-10-17T11:59:00Z");
    expect(getLastReset(6, now).toISOString()).toBe("2025-10-17T11:00:00.000Z");
  });

  it("is yesterday's reset hour before today's has arrived", () => {
    // 05:59 CDT, reset at 6
    const now = chicago("2025-10-17T10:59:00Z");
    expect(getLastReset(6, now).toISOString()).toBe("2025-10-16T11:00:00.000Z");
  });

  it("works in Chicago's day, not UTC's", () => {
    // 21:00 CDT on the 17th is already the 18th in UTC
    const now = chicago("2025-10-18T02:00:00Z");
    expect(getLastReset(22, now).toISOString()).toBe(
      "2025-10-17T03:00:00.000Z",
    );
  });
});

describe("getEventStatus", () => {
  const now = chicago("2025-10-17T15:00:00Z");

  it("has not started without a start date", () => {
    expect(getEventStatus({ startDate: null, endDate: null }, now)).toBe(
      EventStatus.NotStartedYet,
    );
  });

  it("has not started before the start date", () => {
    expect(
      getEventStatus(
        { startDate: chicago("2025-10-18T05:00:00Z"), endDate: null },
        now,
      ),
    ).toBe(EventStatus.NotStartedYet);
  });

  it("is ongoing between the dates", () => {
    expect(
      getEventStatus(
        {
          startDate: chicago("2025-10-01T05:00:00Z"),
          endDate: chicago("2025-11-01T05:00:00Z"),
        },
        now,
      ),
    ).toBe(EventStatus.Ongoing);
  });

  it("is ongoing with no end date", () => {
    expect(
      getEventStatus(
        { startDate: chicago("2025-10-01T05:00:00Z"), endDate: null },
        now,
      ),
    ).toBe(EventStatus.Ongoing);
  });

  it("has ended after the end date", () => {
    expect(
      getEventStatus(
        {
          startDate: chicago("2025-10-01T05:00:00Z"),
          endDate: chicago("2025-10-17T05:00:00Z"),
        },
        now,
      ),
    ).toBe(EventStatus.Ended);
  });
});

describe("formatters", () => {
  it("formats a date in Chicago time with a lowercase meridiem", () => {
    expect(formatChicagoDate(chicago("2025-10-01T05:00:00Z"))).toBe(
      "2025-10-01 12:00 am",
    );
    expect(formatChicagoDate(chicago("2025-10-01T22:05:00Z"))).toBe(
      "2025-10-01 5:05 pm",
    );
  });

  it("formats the uppercase variant the admin settings list uses", () => {
    expect(formatChicagoDateUpper(chicago("2025-10-01T22:05:00Z"))).toBe(
      "2025-10-01 5:05 PM",
    );
  });

  it("formats a reset hour", () => {
    const now = chicago("2025-10-17T15:00:00Z");
    expect(formatResetHour(6, now)).toBe("6 AM US Central Time");
    expect(formatResetHour(0, now)).toBe("12 AM US Central Time");
    expect(formatResetHour(13, now)).toBe("1 PM US Central Time");
  });

  it("formats the last reset with seconds", () => {
    expect(formatLastReset(chicago("2025-10-17T11:00:00Z"))).toBe(
      "2025-10-17 6:00:00 AM",
    );
  });

  // The bot ran on Lambda, where Date#toLocaleString meant en-US in UTC.
  it("formats event dates the way the bot's Lambda did", () => {
    expect(formatLegacyLocale(chicago("2025-10-01T05:00:00Z"))).toBe(
      "10/1/2025, 5:00:00 AM",
    );
  });
});
