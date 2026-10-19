import { validateGuildSettings } from "./guild-settings.service";
import { validatePrize } from "./prize.service";
import { validateKnockEventForCreate } from "./knock-event.service";

describe("validateGuildSettings", () => {
  const valid = {
    guildId: "100000000000000001",
    resetTime: 6,
    knocksPerDay: 2,
    startDate: null,
    endDate: null,
    winRate: 0.5,
    winChannel: null,
  };

  it("accepts the defaults", () => {
    expect(validateGuildSettings(valid)).toBe(true);
  });

  it("requires the start before the end when both are set", () => {
    expect(
      validateGuildSettings({
        ...valid,
        startDate: new Date("2025-11-01"),
        endDate: new Date("2025-10-01"),
      }),
    ).toEqual([
      {
        field: "startDate",
        error: "Start date must be before end date if they are both set",
      },
    ]);
  });

  it("requires a numeric guild id", () => {
    expect(validateGuildSettings({ ...valid, guildId: "abc" })).toEqual([
      { field: "guildId", error: "Guild ID should be a numeric string" },
    ]);
  });

  it("requires a positive whole number of knocks", () => {
    for (const knocksPerDay of [0, -1, 1.5]) {
      expect(validateGuildSettings({ ...valid, knocksPerDay })).toEqual([
        {
          field: "knocksPerDay",
          error: "Knocks per day should be a positive whole number",
        },
      ]);
    }
  });

  it("requires a reset hour of 0-23", () => {
    expect(validateGuildSettings({ ...valid, resetTime: 24 })).toEqual([
      {
        field: "resetTime",
        error: "Reset time must be a whole number between 0 and 23",
      },
    ]);
    expect(validateGuildSettings({ ...valid, resetTime: 0 })).toBe(true);
  });

  it("requires a win rate of 0-1", () => {
    expect(validateGuildSettings({ ...valid, winRate: 1.01 })).toEqual([
      { field: "winRate", error: "Win rate must be a decimal between 0 and 1" },
    ]);
    expect(validateGuildSettings({ ...valid, winRate: 1 })).toBe(true);
  });

  it("reports every failing rule", () => {
    const result = validateGuildSettings({
      ...valid,
      guildId: "x",
      winRate: 2,
    });
    expect(result).toHaveLength(2);
  });
});

describe("validatePrize", () => {
  const valid = {
    id: "myo-common",
    guildId: "100000000000000001",
    name: "Common MYO Pillowing",
    initialStock: 5,
    weight: 10,
    image: "https://i.imgur.com/a.png",
  };

  it("accepts a complete prize", () => {
    expect(validatePrize(valid)).toBe(true);
  });

  const chardbPrize = { ...valid, image: null };

  it("accepts a CharDB item type or character, with no image of its own", () => {
    expect(validatePrize({ ...chardbPrize, itemTypeId: "it-1" })).toBe(true);
    expect(
      validatePrize({ ...chardbPrize, characterId: "ch-1", initialStock: 1 }),
    ).toBe(true);
  });

  // A character is one of a kind.
  it("refuses a character prize with more than one in stock", () => {
    expect(
      validatePrize({ ...chardbPrize, characterId: "ch-1", initialStock: 2 }),
    ).toEqual([
      { field: "initialStock", error: "A character prize has a stock of 1" },
    ]);
  });

  it("refuses an image URL on a CharDB prize", () => {
    expect(validatePrize({ ...valid, itemTypeId: "it-1" })).toEqual([
      {
        field: "image",
        error: "A chardb prize shows its item's or character's own image",
      },
    ]);
  });

  it("requires an image for a prize staff hand over", () => {
    expect(validatePrize({ ...valid, image: null })).toEqual([
      {
        field: "image",
        error:
          "image must be an https or http string URL to a png or jpg image",
      },
    ]);
  });

  it("requires every field", () => {
    expect(validatePrize({ ...valid, name: "" })).toContainEqual({
      field: "*",
      error: "All prize fields are required",
    });
  });

  it.each([
    ["uppercase", "MYO"],
    ["one character", "m"],
    ["26 characters", "a".repeat(26)],
    ["a leading hyphen", "-myo"],
    ["a digit", "myo2"],
  ])("refuses an id with %s", (_why, id) => {
    expect(validatePrize({ ...valid, id })).toContainEqual({
      field: "id",
      error:
        "id must be 2-25 lowercase letters and hyphens, starting with a letter",
    });
  });

  it.each([["my"], ["a".repeat(25)], ["myo-common"]])(
    "accepts the id %s",
    (id) => {
      expect(validatePrize({ ...valid, id })).toBe(true);
    },
  );

  it("requires 1-999 stock", () => {
    expect(validatePrize({ ...valid, initialStock: 1000 })).toContainEqual({
      field: "initialStock",
      error: "initialStock must be a positive integer less than 1000",
    });
  });

  it.each([[0], [1001]])("requires a weight of 1-1000, not %s", (weight) => {
    expect(validatePrize({ ...valid, weight })).toContainEqual({
      field: "weight",
      error: "weight must be an integer between 1 and 1000",
    });
  });

  it("requires an http(s) png or jpg image", () => {
    for (const image of [
      "https://i.imgur.com/a.gif",
      "ftp://i.imgur.com/a.png",
      "not a url",
    ]) {
      expect(validatePrize({ ...valid, image })).toContainEqual({
        field: "image",
        error:
          "image must be an https or http string URL to a png or jpg image",
      });
    }
    expect(validatePrize({ ...valid, image: "http://x.test/a.jpg" })).toBe(
      true,
    );
  });

  it("refuses both an item type and a character", () => {
    expect(
      validatePrize({
        ...chardbPrize,
        initialStock: 1,
        itemTypeId: "it-1",
        characterId: "ch-1",
      }),
    ).toEqual([
      {
        field: "*",
        error: "Only one of itemTypeId or characterId can be set, not both",
      },
    ]);
  });

  it("refuses empty CharDB ids", () => {
    expect(validatePrize({ ...chardbPrize, itemTypeId: "" })).toContainEqual({
      field: "itemTypeId",
      error: "itemTypeId must be a non-empty string if provided",
    });
  });
});

describe("validateKnockEventForCreate", () => {
  it("accepts a knock", () => {
    expect(
      validateKnockEventForCreate({
        guildId: "1",
        userId: "2",
        prizeId: null,
      }),
    ).toBe(true);
  });

  it("requires a numeric user id", () => {
    expect(
      validateKnockEventForCreate({ guildId: "1", userId: "x", prizeId: null }),
    ).toEqual([
      { field: "userId", error: "UserID should be a numeric string" },
    ]);
  });

  it("requires ids", () => {
    expect(
      validateKnockEventForCreate({ guildId: "", userId: "", prizeId: null }),
    ).toEqual([
      { field: "userId", error: "UserID is required" },
      { field: "guildId", error: "GuildID is required" },
      { field: "userId", error: "UserID should be a numeric string" },
    ]);
  });
});
