import { ConfigService } from "@nestjs/config";
import { HalloweenLinks } from "./halloween-links";
import { DatabaseService } from "../database/database.service";
import { GUILD_ID } from "./testing/fixtures";

describe("HalloweenLinks", () => {
  const db = {
    community: {
      findFirst: jest.fn().mockResolvedValue({ slug: "cloverse" }),
    },
  };

  const links = (env: Record<string, string | undefined>) =>
    new HalloweenLinks(
      new ConfigService(env),
      db as unknown as DatabaseService,
    );

  beforeEach(() => db.community.findFirst.mockClear());

  it("links to the Halloween page on the guild's community host", async () => {
    const url = await links({
      FRONTEND_URL: "https://chardb.cc",
      ROOT_DOMAIN: "chardb.cc",
    }).halloweenPage(GUILD_ID);
    expect(url).toBe("https://cloverse.chardb.cc/admin/halloween");
    expect(db.community.findFirst).toHaveBeenCalledWith({
      where: { discordGuildId: GUILD_ID },
      select: { slug: true },
    });
  });

  it("keeps the scheme and port of a local frontend", async () => {
    expect(
      await links({
        FRONTEND_URL: "http://dev.localhost:3000",
        ROOT_DOMAIN: "dev.localhost",
      }).halloweenPage(GUILD_ID),
    ).toBe("http://cloverse.dev.localhost:3000/admin/halloween");
  });

  it("has no link for a guild no community is linked to", async () => {
    db.community.findFirst.mockResolvedValueOnce(null);
    expect(
      await links({
        FRONTEND_URL: "https://chardb.cc",
        ROOT_DOMAIN: "chardb.cc",
      }).halloweenPage(GUILD_ID),
    ).toBeNull();
  });

  // Items and characters live on the community's own host: the apex has no
  // item pages at all.
  describe("chardbLink", () => {
    const chardb = links({
      FRONTEND_URL: "https://chardb.cc",
      ROOT_DOMAIN: "chardb.cc",
    });
    const none = { itemTypeId: null, characterId: null };

    it("links an item prize to its item type on the community's host", async () => {
      expect(
        await chardb.chardbLink(GUILD_ID, { ...none, itemTypeId: "it-1" }),
      ).toBe("[View on CharDB](https://cloverse.chardb.cc/item-types/it-1)");
    });

    it("links a character prize to the character on the community's host", async () => {
      expect(
        await chardb.chardbLink(GUILD_ID, { ...none, characterId: "ch-1" }),
      ).toBe("[View on CharDB](https://cloverse.chardb.cc/character/ch-1)");
    });

    it("has no link for a prize staff hand over, and asks nothing", async () => {
      expect(await chardb.chardbLink(GUILD_ID, none)).toBeUndefined();
      expect(db.community.findFirst).not.toHaveBeenCalled();
    });

    it("follows the configured site, not production", async () => {
      expect(
        await links({
          FRONTEND_URL: "http://dev.localhost:3000",
          ROOT_DOMAIN: "dev.localhost",
        }).chardbLink(GUILD_ID, { ...none, itemTypeId: "it-1" }),
      ).toBe(
        "[View on CharDB](http://cloverse.dev.localhost:3000/item-types/it-1)",
      );
    });

    it("has no link for a guild no community is linked to", async () => {
      db.community.findFirst.mockResolvedValueOnce(null);
      expect(
        await chardb.chardbLink(GUILD_ID, { ...none, itemTypeId: "it-1" }),
      ).toBeUndefined();
    });
  });

  // The same rule as chardbLink, for pages that already know the community.
  describe("prizeUrl", () => {
    const chardb = links({
      FRONTEND_URL: "https://chardb.cc",
      ROOT_DOMAIN: "chardb.cc",
    });
    const none = { itemTypeId: null, characterId: null };

    it("is the item type or character on the community's host", () => {
      expect(chardb.prizeUrl("cloverse", { ...none, itemTypeId: "it-1" })).toBe(
        "https://cloverse.chardb.cc/item-types/it-1",
      );
      expect(
        chardb.prizeUrl("cloverse", { ...none, characterId: "ch-1" }),
      ).toBe("https://cloverse.chardb.cc/character/ch-1");
    });

    it("is null for a prize staff hand over", () => {
      expect(chardb.prizeUrl("cloverse", none)).toBeNull();
    });
  });

  // Profiles live on the apex, not under a community.
  describe("profileUrl", () => {
    it("is the user's page on the apex", () => {
      expect(
        links({
          FRONTEND_URL: "https://chardb.cc",
          ROOT_DOMAIN: "chardb.cc",
        }).profileUrl("pumpkin"),
      ).toBe("https://chardb.cc/user/pumpkin");
    });

    it("keeps the scheme and port of a local frontend", () => {
      expect(
        links({
          FRONTEND_URL: "http://dev.localhost:3000",
          ROOT_DOMAIN: "dev.localhost",
        }).profileUrl("pumpkin"),
      ).toBe("http://dev.localhost:3000/user/pumpkin");
    });

    it("escapes the username", () => {
      expect(
        links({
          FRONTEND_URL: "https://chardb.cc",
          ROOT_DOMAIN: "chardb.cc",
        }).profileUrl("a b"),
      ).toBe("https://chardb.cc/user/a%20b");
    });
  });

  it("has no link without the site's address configured", async () => {
    expect(
      await links({ ROOT_DOMAIN: "chardb.cc" }).halloweenPage(GUILD_ID),
    ).toBeNull();
    expect(
      await links({ FRONTEND_URL: "https://chardb.cc" }).halloweenPage(
        GUILD_ID,
      ),
    ).toBeNull();
  });
});
