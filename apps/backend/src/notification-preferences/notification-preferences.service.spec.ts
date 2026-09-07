import { Test, TestingModule } from "@nestjs/testing";
import { NotificationChannel, NotificationKind } from "@chardb/database";
import { NotificationPreferencesService } from "./notification-preferences.service";
import { DatabaseService } from "../database/database.service";
import { mockDatabaseService } from "../../test/setup";
import {
  NOTIFICATION_PREFERENCE_DEFAULTS,
  supportsEmail,
} from "./notification-preference-defaults";

/**
 * The table is sparse: no row means "the default applies", not "off". Every
 * test here is really about that one distinction, because getting it backwards
 * silently stops every notification for every member who has never opened the
 * settings page.
 */
describe("NotificationPreferencesService", () => {
  let service: NotificationPreferencesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationPreferencesService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get(NotificationPreferencesService);
    mockDatabaseService.notificationPreference.findUnique.mockResolvedValue(
      null,
    );
    mockDatabaseService.notificationPreference.findMany.mockResolvedValue([]);
  });

  describe("isEnabled", () => {
    it("falls back to the default when there is no row", async () => {
      await expect(
        service.isEnabled(
          "u1",
          NotificationKind.IMAGE_REJECTED,
          NotificationChannel.EMAIL,
        ),
      ).resolves.toBe(true);

      await expect(
        service.isEnabled(
          "u1",
          NotificationKind.IMAGE_APPROVED,
          NotificationChannel.EMAIL,
        ),
      ).resolves.toBe(false);
    });

    it("prefers a stored answer over the default", async () => {
      mockDatabaseService.notificationPreference.findUnique.mockResolvedValue({
        enabled: false,
      });

      await expect(
        service.isEnabled(
          "u1",
          NotificationKind.IMAGE_REJECTED,
          NotificationChannel.EMAIL,
        ),
      ).resolves.toBe(false);
    });

    it("honours a stored yes against a default of no", async () => {
      mockDatabaseService.notificationPreference.findUnique.mockResolvedValue({
        enabled: true,
      });

      await expect(
        service.isEnabled(
          "u1",
          NotificationKind.IMAGE_APPROVED,
          NotificationChannel.EMAIL,
        ),
      ).resolves.toBe(true);
    });
  });

  describe("filterEnabled", () => {
    it("keeps everyone with no row when the default is on", async () => {
      await expect(
        service.filterEnabled(
          ["u1", "u2"],
          NotificationKind.FOLLOW_RECEIVED,
          NotificationChannel.IN_APP,
        ),
      ).resolves.toEqual(["u1", "u2"]);
    });

    it("drops only the people who said no", async () => {
      mockDatabaseService.notificationPreference.findMany.mockResolvedValue([
        { userId: "u2", enabled: false },
      ]);

      await expect(
        service.filterEnabled(
          ["u1", "u2", "u3"],
          NotificationKind.FOLLOW_RECEIVED,
          NotificationChannel.IN_APP,
        ),
      ).resolves.toEqual(["u1", "u3"]);
    });

    it("does not query for an empty list", async () => {
      await expect(
        service.filterEnabled(
          [],
          NotificationKind.FOLLOW_RECEIVED,
          NotificationChannel.IN_APP,
        ),
      ).resolves.toEqual([]);
      expect(
        mockDatabaseService.notificationPreference.findMany,
      ).not.toHaveBeenCalled();
    });
  });

  describe("resolveForUser", () => {
    it("answers for every kind, even with no rows at all", async () => {
      const resolved = await service.resolveForUser("u1");

      expect(resolved).toHaveLength(
        Object.keys(NOTIFICATION_PREFERENCE_DEFAULTS).length,
      );
      for (const row of resolved) {
        expect(row.inApp).toBe(NOTIFICATION_PREFERENCE_DEFAULTS[row.kind].inApp);
        expect(row.email).toBe(NOTIFICATION_PREFERENCE_DEFAULTS[row.kind].email);
        expect(row.emailSupported).toBe(supportsEmail(row.kind));
      }
    });

    it("merges an override onto one channel without disturbing the other", async () => {
      mockDatabaseService.notificationPreference.findMany.mockResolvedValue([
        {
          kind: NotificationKind.IMAGE_REJECTED,
          channel: NotificationChannel.EMAIL,
          enabled: false,
        },
      ]);

      const rejected = (await service.resolveForUser("u1")).find(
        (row) => row.kind === NotificationKind.IMAGE_REJECTED,
      );

      expect(rejected?.email).toBe(false);
      expect(rejected?.inApp).toBe(true);
    });

    it("reports emailSupported false for kinds with no template", async () => {
      // The settings page hides the switch for these rather than offering one
      // that stores a decision about something that does not exist.
      const follow = (await service.resolveForUser("u1")).find(
        (row) => row.kind === NotificationKind.FOLLOW_RECEIVED,
      );

      expect(follow?.emailSupported).toBe(false);
    });
  });

  describe("disableEmail", () => {
    it("only ever writes false, and only on the email channel", async () => {
      // This is what an unsubscribe link is allowed to do. A leaked or replayed
      // link must not be able to switch anything back on.
      await service.disableEmail("u1", NotificationKind.IMAGE_APPROVED);

      const call =
        mockDatabaseService.notificationPreference.upsert.mock.calls.at(
          -1,
        )?.[0] as {
          create: { enabled: boolean; channel: NotificationChannel };
          update: { enabled: boolean };
        };

      expect(call.create.enabled).toBe(false);
      expect(call.update.enabled).toBe(false);
      expect(call.create.channel).toBe(NotificationChannel.EMAIL);
    });
  });

  describe("setPreference", () => {
    it("stores an answer that matches the default", async () => {
      // Recording the agreement is what stops a later change of default from
      // silently reversing a choice somebody made on purpose.
      await service.setPreference(
        "u1",
        NotificationKind.IMAGE_REJECTED,
        NotificationChannel.EMAIL,
        true,
      );

      expect(
        mockDatabaseService.notificationPreference.upsert,
      ).toHaveBeenCalled();
    });
  });
});
