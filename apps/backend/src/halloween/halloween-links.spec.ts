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
