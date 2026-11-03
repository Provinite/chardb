import { NotificationKind } from "@chardb/database";
import { TestApp } from "../../../test/setup-e2e";
import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../../auth/auth.module";
import { DatabaseService } from "../../database/database.service";
import { Clock } from "../../clock/clock";
import { HalloweenModule } from "../halloween.module";
import { HalloweenDiscordClient } from "../discord/halloween-discord.client";
import { HalloweenRandom } from "../random";
import { CANDY_SLUGS } from "../discord/images.generated";
import { mockDiscord } from "../testing/command-harness";

const GUILD = "100000000000000001";
const HOUR = 60 * 60 * 1000;
const EVENT_START = new Date("2026-10-01T05:00:00Z");
const EVENT_END = new Date("2026-11-08T05:00:00Z");
/** Noon in Chicago, well after the 6 am reset. */
const MIDDAY = new Date("2026-10-20T17:00:00Z");

const KNOCK = `
  mutation Knock($communityId: ID!, $userId: ID!) {
    knockOnHalloweenDoor(communityId: $communityId, userId: $userId) {
      knockerCandies
      knockeeCandies
      remainingKnocks
    }
  }
`;

const DOOR = `
  query Door($communityId: ID!, $userId: ID!) {
    halloweenDoor(communityId: $communityId, userId: $userId) {
      canKnock
      closedReason
      remainingKnocks
      knocksPerDay
    }
  }
`;

type Player = { id: string; username: string; token: string };
type GqlResponse = {
  body: {
    data?: Record<string, unknown> | null;
    errors?: { message: string }[];
  };
};

describe("Halloween door knocks (e2e)", () => {
  let testApp: TestApp;
  let db: DatabaseService;
  let communityId: string;
  let memberRoleId: string;
  let staffRoleId: string;
  let alice: Player;
  let bob: Player;
  let carol: Player;
  let now = MIDDAY;
  /** The dice's next answers; once used up, every draw is 0. */
  let rolls: number[] = [];

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup(
      { imports: [DatabaseModule, AuthModule, HalloweenModule] },
      (builder) =>
        builder
          .overrideProvider(HalloweenDiscordClient)
          .useValue(mockDiscord())
          .overrideProvider(Clock)
          .useValue({ now: () => now })
          .overrideProvider(HalloweenRandom)
          .useValue({
            int: (max: number) => {
              const next = rolls.shift() ?? 0;
              if (next >= max) throw new Error("Scripted roll out of range");
              return next;
            },
            unit: () => 0,
          }),
    );
    db = testApp.getDb();
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  const player = async (name: string): Promise<Player> => {
    const stamp = `${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
    const user = await testApp.createTestUser({
      username: `${name}_${stamp}`.slice(0, 30),
      email: `${name}_${stamp}@example.com`,
    });
    return {
      id: user.id,
      username: user.username,
      token: await testApp.generateTestToken(user.id, user.username),
    };
  };

  const member = async (name: string, roleId = memberRoleId) => {
    const p = await player(name);
    await testApp.createTestCommunityMember(p.id, roleId);
    return p;
  };

  beforeEach(async () => {
    now = MIDDAY;
    rolls = [];
    await testApp.clearDatabase();
    const community = await testApp.createTestCommunity();
    communityId = community.id;
    await db.community.update({
      where: { id: communityId },
      data: { discordGuildId: GUILD, halloweenEnabled: true },
    });
    await db.halloweenGuildSettings.create({
      data: {
        guildId: GUILD,
        resetTime: 6,
        knocksPerDay: 2,
        winRate: 0.4,
        startDate: EVENT_START,
        endDate: EVENT_END,
      },
    });
    memberRoleId = (await testApp.createTestRole(communityId)).id;
    staffRoleId = (
      await testApp.createTestRole(communityId, { canGrantItems: true })
    ).id;
    alice = await member("alice");
    bob = await member("bob");
    carol = await member("carol");
  });

  const gql = (query: string, variables: object, who: Player) =>
    testApp.authenticatedGraphqlRequest(
      query,
      { communityId, ...variables },
      who.token,
    ) as Promise<GqlResponse>;

  const knock = (who: Player, door: Player) =>
    gql(KNOCK, { userId: door.id }, who);

  const knocked = async (who: Player, door: Player) => {
    const res = await knock(who, door);
    expect(res.body.errors).toBeUndefined();
    return res.body.data?.knockOnHalloweenDoor as {
      knockerCandies: string[];
      knockeeCandies: string[];
      remainingKnocks: number;
    };
  };

  const door = async (who: Player, owner: Player) => {
    const res = await gql(DOOR, { userId: owner.id }, who);
    expect(res.body.errors).toBeUndefined();
    return res.body.data?.halloweenDoor as {
      canKnock: boolean;
      closedReason: string | null;
      remainingKnocks: number;
      knocksPerDay: number;
    } | null;
  };

  const error = (res: GqlResponse) => res.body.errors?.[0]?.message;

  const candiesOf = (who: Player) =>
    db.halloweenCandy.findMany({
      where: { guildId: GUILD, ownerId: who.id },
      orderBy: { id: "asc" },
    });

  describe("knocking", () => {
    it("gives each side 1-3 candies, rolled separately", async () => {
      // Knocker gets 3 (roll 2), knockee 1 (roll 0), then one slug each.
      rolls = [2, 0, 1, 2, 3, 4];

      const result = await knocked(alice, bob);

      expect(result.knockerCandies).toEqual([
        CANDY_SLUGS[1],
        CANDY_SLUGS[2],
        CANDY_SLUGS[3],
      ]);
      expect(result.knockeeCandies).toEqual([CANDY_SLUGS[4]]);
      expect((await candiesOf(alice)).map((c) => c.slug)).toEqual(
        result.knockerCandies,
      );
      const bobs = await candiesOf(bob);
      expect(bobs.map((c) => c.slug)).toEqual(result.knockeeCandies);
      expect(bobs[0]).toMatchObject({
        knockEventId: null,
        discordUserId: null,
        claimedAt: now,
        receivedAt: now,
      });
      expect(bobs[0].doorKnockId).not.toBeNull();
    });

    it("tells the player knocked on which candies they got", async () => {
      rolls = [0, 1, 5, 6, 7];

      await knocked(alice, bob);

      const notes = await db.notification.findMany({
        where: { recipientId: bob.id },
      });
      expect(notes).toEqual([
        expect.objectContaining({
          kind: NotificationKind.HALLOWEEN_DOOR_KNOCKED,
          actorUserId: alice.id,
          communityId,
          data: { candySlugs: [CANDY_SLUGS[6], CANDY_SLUGS[7]] },
        }),
      ]);
      expect(
        await db.notification.count({ where: { recipientId: alice.id } }),
      ).toBe(0);
    });

    it("still gives the candy when the Halloween candy switch is off", async () => {
      await db.notificationPreference.create({
        data: {
          userId: bob.id,
          kind: NotificationKind.HALLOWEEN_CANDY_TRADED,
          channel: "IN_APP",
          enabled: false,
        },
      });

      await knocked(alice, bob);

      expect(await candiesOf(bob)).toHaveLength(1);
      expect(
        await db.notification.count({ where: { recipientId: bob.id } }),
      ).toBe(0);
    });

    it("refuses your own door", async () => {
      const res = await knock(alice, alice);

      expect(error(res)).toBe("You can't knock on your own door");
      expect(await candiesOf(alice)).toEqual([]);
    });

    it("refuses a door outside the community", async () => {
      const stranger = await player("stranger");

      const res = await knock(alice, stranger);

      expect(error(res)).toBe("Only members of this community have a door");
    });

    it("refuses a knocker outside the community", async () => {
      const stranger = await player("stranger");

      const res = await knock(stranger, alice);

      expect(error(res)).toBe("Join this community to knock on doors");
    });

    it("refuses while the event is not running", async () => {
      now = new Date(EVENT_END.getTime() + HOUR);

      const res = await knock(alice, bob);

      expect(error(res)).toBe("Trick-or-treating is not running right now");
      expect(await candiesOf(bob)).toEqual([]);
    });
  });

  describe("limits", () => {
    it("lets you knock on each door once a day", async () => {
      await knocked(alice, bob);

      const again = await knock(alice, bob);

      expect(error(again)).toBe("You already knocked on this door today");
      now = new Date(now.getTime() + 24 * HOUR);
      await knocked(alice, bob);
    });

    it("lets the player knocked on knock back the same day", async () => {
      await knocked(alice, bob);

      await knocked(bob, alice);
    });

    it("gives members as many door knocks a day as /knock", async () => {
      const dave = await member("dave");
      expect((await knocked(alice, bob)).remainingKnocks).toBe(1);
      expect((await knocked(alice, carol)).remainingKnocks).toBe(0);

      const res = await knock(alice, dave);

      expect(error(res)).toBe("You have no door knocks left today");
      // The day resets at 6 am Chicago, 11:00 UTC.
      now = new Date("2026-10-21T11:00:00Z");
      expect((await knocked(alice, dave)).remainingKnocks).toBe(1);
    });

    it("gives Halloween staff twice as many", async () => {
      const staff = await member("staff", staffRoleId);
      const doors = await Promise.all(
        ["d1", "d2", "d3", "d4", "d5"].map((n) => member(n)),
      );

      for (const [i, d] of doors.slice(0, 4).entries()) {
        expect((await knocked(staff, d)).remainingKnocks).toBe(3 - i);
      }

      expect(error(await knock(staff, doors[4]))).toBe(
        "You have no door knocks left today",
      );
    });

    it("takes one knock at a time per knocker", async () => {
      const doors = await Promise.all(
        ["d1", "d2", "d3", "d4"].map((n) => member(n)),
      );

      const results = await Promise.all(doors.map((d) => knock(alice, d)));

      const ok = results.filter((r) => !r.body.errors);
      expect(ok).toHaveLength(2);
      expect(
        await db.halloweenDoorKnock.count({ where: { knockerId: alice.id } }),
      ).toBe(2);
    });
  });

  describe("the door", () => {
    it("is open with the day's knocks left", async () => {
      await expect(door(alice, bob)).resolves.toEqual({
        canKnock: true,
        closedReason: null,
        remainingKnocks: 2,
        knocksPerDay: 2,
      });
    });

    it("is closed once knocked on today", async () => {
      await knocked(alice, bob);

      await expect(door(alice, bob)).resolves.toEqual({
        canKnock: false,
        closedReason: "ALREADY_KNOCKED",
        remainingKnocks: 1,
        knocksPerDay: 2,
      });
    });

    it("is closed when you have no knocks left", async () => {
      const dave = await member("dave");
      await knocked(alice, bob);
      await knocked(alice, carol);

      await expect(door(alice, dave)).resolves.toMatchObject({
        canKnock: false,
        closedReason: "NO_KNOCKS_LEFT",
        remainingKnocks: 0,
      });
    });

    it("is closed on your own profile", async () => {
      await expect(door(alice, alice)).resolves.toMatchObject({
        canKnock: false,
        closedReason: "OWN_DOOR",
      });
    });

    it("is closed when either side is not a member", async () => {
      const stranger = await player("stranger");

      await expect(door(alice, stranger)).resolves.toMatchObject({
        canKnock: false,
        closedReason: "NOT_A_MEMBER",
      });
      await expect(door(stranger, alice)).resolves.toMatchObject({
        canKnock: false,
        closedReason: "NOT_A_MEMBER",
      });
    });

    it("shows staff their doubled allowance", async () => {
      const staff = await member("staff", staffRoleId);

      await expect(door(staff, bob)).resolves.toMatchObject({
        remainingKnocks: 4,
        knocksPerDay: 4,
      });
    });

    it("is not there while the event is not running", async () => {
      now = new Date(EVENT_START.getTime() - HOUR);

      await expect(door(alice, bob)).resolves.toBeNull();
    });

    it("is not there in a community without the event", async () => {
      await db.community.update({
        where: { id: communityId },
        data: { halloweenEnabled: false },
      });

      await expect(door(alice, bob)).resolves.toBeNull();
    });
  });
});
