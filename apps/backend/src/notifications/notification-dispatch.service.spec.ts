import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import {
  ModerationRejectionReason,
  NotificationChannel,
  NotificationKind,
} from "@chardb/database";
import { NotificationDispatchService } from "./notification-dispatch.service";
import { NotificationsService } from "./notifications.service";
import { DatabaseService } from "../database/database.service";
import { EmailService } from "../email/email.service";
import { NotificationPreferencesService } from "../notification-preferences/notification-preferences.service";
import { UnsubscribeTokenService } from "../notification-preferences/unsubscribe-token.service";
import { mockDatabaseService } from "../../test/setup";

/**
 * The behaviour issue #344 is actually about: an approval no longer mails the
 * uploader unless they asked it to, and a rejection still does.
 */
describe("NotificationDispatchService", () => {
  let service: NotificationDispatchService;

  const mockNotifications = { create: jest.fn() };
  const mockPreferences = { isEnabled: jest.fn() };
  const mockTokens = { issue: jest.fn() };
  const mockEmail = {
    sendImageApprovedEmail: jest.fn(),
    sendImageRejectedEmail: jest.fn(),
  };

  const approval = {
    recipientId: "u1",
    kind: NotificationKind.IMAGE_APPROVED,
    actorUserId: "mod-1",
    data: { subjectName: "sketch.png" },
  } as const;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationDispatchService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: NotificationsService, useValue: mockNotifications },
        {
          provide: NotificationPreferencesService,
          useValue: mockPreferences,
        },
        { provide: UnsubscribeTokenService, useValue: mockTokens },
        { provide: EmailService, useValue: mockEmail },
        {
          provide: ConfigService,
          useValue: { get: () => "https://chardb.test" },
        },
      ],
    }).compile();

    service = module.get(NotificationDispatchService);
    mockPreferences.isEnabled.mockResolvedValue(true);
    mockTokens.issue.mockReturnValue("TOKEN");
    mockDatabaseService.user.findUnique.mockResolvedValue({
      email: "member@test.local",
      username: "member",
    });
  });

  it("does not email an approval when the member has switched it off", async () => {
    mockPreferences.isEnabled.mockResolvedValue(false);

    await service.dispatch({ ...approval });

    expect(mockEmail.sendImageApprovedEmail).not.toHaveBeenCalled();
    // The badge is a separate question, and this one was not asked here.
    expect(mockNotifications.create).toHaveBeenCalled();
  });

  it("emails an approval when they have switched it on", async () => {
    await service.dispatch({ ...approval });

    expect(mockEmail.sendImageApprovedEmail).toHaveBeenCalledWith(
      "member@test.local",
      "member",
      "sketch.png",
      "https://chardb.test/unsubscribe/TOKEN",
    );
  });

  it("asks about the email channel for the kind being sent", async () => {
    await service.dispatch({ ...approval });

    expect(mockPreferences.isEnabled).toHaveBeenCalledWith(
      "u1",
      NotificationKind.IMAGE_APPROVED,
      NotificationChannel.EMAIL,
    );
  });

  it("mints the unsubscribe token for that member and that kind", async () => {
    // A token scoped to the whole account would let one unsubscribe link
    // silence rejections too.
    await service.dispatch({ ...approval });

    expect(mockTokens.issue).toHaveBeenCalledWith(
      "u1",
      NotificationKind.IMAGE_APPROVED,
    );
  });

  it("passes the rejection reason through as its enum name", async () => {
    await service.dispatch({
      recipientId: "u1",
      kind: NotificationKind.IMAGE_REJECTED,
      actorUserId: "mod-1",
      data: {
        subjectName: "sketch.png",
        reason: ModerationRejectionReason.NSFW_NOT_TAGGED,
        reasonText: "Please tag this.",
      },
    });

    expect(mockEmail.sendImageRejectedEmail).toHaveBeenCalledWith(
      "member@test.local",
      "member",
      "sketch.png",
      ModerationRejectionReason.NSFW_NOT_TAGGED,
      "https://chardb.test/unsubscribe/TOKEN",
      "Please tag this.",
    );
  });

  it("never emails a kind that has no template", async () => {
    // Every kind has an email default recorded, but only some have a template.
    // The preference must not even be consulted for the rest.
    await service.dispatch({
      recipientId: "u1",
      kind: NotificationKind.FOLLOW_RECEIVED,
      actorUserId: "u2",
      data: {},
    });

    expect(mockPreferences.isEnabled).not.toHaveBeenCalled();
    expect(mockEmail.sendImageApprovedEmail).not.toHaveBeenCalled();
  });

  it("does not look up an address it is not going to use", async () => {
    mockPreferences.isEnabled.mockResolvedValue(false);

    await service.dispatch({ ...approval });

    expect(mockDatabaseService.user.findUnique).not.toHaveBeenCalled();
  });

  it("still writes the notification when the mailer throws", async () => {
    // The approval already happened. Neither channel may take the other down
    // with it, and neither may fail the thing it describes.
    mockEmail.sendImageApprovedEmail.mockRejectedValue(new Error("smtp down"));

    await expect(service.dispatch({ ...approval })).resolves.toBeUndefined();
    expect(mockNotifications.create).toHaveBeenCalled();
  });

  it("still emails when writing the notification throws", async () => {
    mockNotifications.create.mockRejectedValue(new Error("db down"));

    await expect(service.dispatch({ ...approval })).resolves.toBeUndefined();
    expect(mockEmail.sendImageApprovedEmail).toHaveBeenCalled();
  });
});
