import { Test, TestingModule } from "@nestjs/testing";
import { NotificationKind, NotificationSubjectType } from "@chardb/database";
import { NotificationsService } from "./notifications.service";
import { DatabaseService } from "../database/database.service";
import { mockDatabaseService } from "../../test/setup";
import {
  parseNotificationPayload,
  validateNotificationPayload,
} from "./notification-payloads";

describe("notification payloads", () => {
  it("rejects a payload missing a field its kind requires", () => {
    expect(() =>
      validateNotificationPayload(NotificationKind.ITEM_GRANTED, {
        subjectName: "Rusty Locket",
      } as never),
    ).toThrow();
  });

  it("rejects an unexpected key on a write", () => {
    // Strict on the way in: an unrecognised key is a bug at the call site, and
    // silently dropping it would hide the bug until someone read the column.
    expect(() =>
      validateNotificationPayload(NotificationKind.FOLLOW_RECEIVED, {
        subjectName: "nope",
      } as never),
    ).toThrow();
  });

  it("rejects a count of zero", () => {
    expect(() =>
      validateNotificationPayload(NotificationKind.ITEM_REVOKED, {
        subjectName: "Rusty Locket",
        count: 0,
        reason: null,
      }),
    ).toThrow();
  });

  it("strips unknown keys when reading rather than rejecting the row", () => {
    // A rolling deploy has the old instance reading rows the new one wrote.
    // Rejecting those would break the feed for the length of the deploy.
    const parsed = parseNotificationPayload(NotificationKind.CURRENCY_RECEIVED, {
      subjectName: "Hollow Coin",
      amount: 500,
      fieldFromANewerVersion: true,
    });

    expect(parsed).toEqual({ subjectName: "Hollow Coin", amount: 500 });
  });

  it("returns null for a payload that does not match its kind", () => {
    // One bad row costs one unrenderable notification, not the whole feed.
    expect(
      parseNotificationPayload(NotificationKind.ITEM_GRANTED, { nonsense: 1 }),
    ).toBeNull();
  });
});

describe("NotificationsService", () => {
  let service: NotificationsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  /** The `data` handed to Prisma on the last create. */
  const lastCreate = () =>
    (
      mockDatabaseService.notification.create.mock.calls.at(-1)?.[0] as {
        data: Record<string, unknown>;
      }
    ).data;

  describe("create", () => {
    it("writes a user actor with no label", async () => {
      await service.create({
        recipientId: "u1",
        kind: NotificationKind.FOLLOW_RECEIVED,
        actorUserId: "u2",
        data: {},
      });

      expect(lastCreate().actorUserId).toBe("u2");
      expect(lastCreate().actorLabel).toBeNull();
    });

    it('labels an actorless notification "system"', async () => {
      // The CHECK constraint refuses a row naming neither, and ItemActor lets
      // both halves be null, so the service is what keeps producers honest.
      await service.create({
        recipientId: "u1",
        kind: NotificationKind.CURRENCY_RECEIVED,
        data: { subjectName: "Hollow Coin", amount: 5 },
      });

      expect(lastCreate().actorUserId).toBeNull();
      expect(lastCreate().actorLabel).toBe("system");
    });

    it("drops the label when a user actor is given", async () => {
      await service.create({
        recipientId: "u1",
        kind: NotificationKind.FOLLOW_RECEIVED,
        actorUserId: "u2",
        actorLabel: "discord-bot",
        data: {},
      });

      expect(lastCreate().actorLabel).toBeNull();
    });
  });

  describe("createMany", () => {
    it("does not notify the actor about their own action", async () => {
      await service.createMany(
        ["u1", "u2", "u3"],
        {
          kind: NotificationKind.ITEM_GRANTED,
          actorUserId: "u2",
          subjectType: NotificationSubjectType.ITEM,
          subjectId: "i1",
          data: { subjectName: "Rusty Locket", count: 1 },
        },
      );

      const rows = (
        mockDatabaseService.notification.createMany.mock.calls.at(-1)?.[0] as {
          data: Array<{ recipientId: string }>;
        }
      ).data;
      expect(rows.map((r) => r.recipientId)).toEqual(["u1", "u3"]);
    });

    it("writes one row per recipient, deduplicated", async () => {
      await service.createMany(["u1", "u1", "u2"], {
        kind: NotificationKind.FOLLOW_RECEIVED,
        actorLabel: "system",
        data: {},
      });

      const rows = (
        mockDatabaseService.notification.createMany.mock.calls.at(-1)?.[0] as {
          data: unknown[];
        }
      ).data;
      expect(rows).toHaveLength(2);
    });
  });

  describe("markRead", () => {
    it("scopes the update to the recipient", async () => {
      mockDatabaseService.notification.updateMany.mockResolvedValue({
        count: 1,
      });

      await service.markRead("u1", ["n1"]);

      const call = mockDatabaseService.notification.updateMany.mock.calls.at(
        -1,
      )?.[0] as { where: { recipientId: string } };
      // Someone else's id matches nothing rather than reporting that it exists.
      expect(call.where.recipientId).toBe("u1");
    });

    it("does not query at all for an empty list", async () => {
      await service.markRead("u1", []);
      expect(mockDatabaseService.notification.updateMany).not.toHaveBeenCalled();
    });
  });
});
