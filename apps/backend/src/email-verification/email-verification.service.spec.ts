import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import * as crypto from "crypto";

import {
  EmailVerificationService,
  EMAIL_VERIFICATION_LIFETIME_LIMIT,
} from "./email-verification.service";
import { DatabaseService } from "../database/database.service";
import { EmailService } from "../email/email.service";
import { mockDatabaseService } from "../../test/setup";

const sha256 = (value: string): string =>
  crypto.createHash("sha256").update(value).digest("hex");

/**
 * The two properties this service exists for: a link that confirms exactly one
 * address, and a hard ceiling on how much mail one address can be made to
 * receive.
 */
describe("EmailVerificationService", () => {
  let service: EmailVerificationService;

  const mockEmail = { sendEmailVerification: jest.fn() };

  const member = {
    id: "u1",
    email: "member@test.local",
    username: "member",
    isVerified: false,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailVerificationService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: EmailService, useValue: mockEmail },
      ],
    }).compile();

    service = module.get(EmailVerificationService);

    mockDatabaseService.user.findUnique.mockResolvedValue(member);
    mockDatabaseService.emailVerificationToken.count.mockResolvedValue(0);
    mockDatabaseService.emailVerificationToken.create.mockResolvedValue({});
  });

  describe("sending", () => {
    it("stores only the hash, and mails only the raw token", async () => {
      await service.sendForNewUser(member.id);

      const [[mailArgs]] = mockEmail.sendEmailVerification.mock.calls;
      expect(mailArgs).toBe("member@test.local");

      const rawToken = mockEmail.sendEmailVerification.mock.calls[0][1];
      const stored =
        mockDatabaseService.emailVerificationToken.create.mock.calls[0][0].data;

      expect(stored.tokenHash).toBe(sha256(rawToken));
      expect(stored.tokenHash).not.toBe(rawToken);
    });

    it("mints a token that can ride in a URL path segment", async () => {
      await service.sendForNewUser(member.id);

      // Hex, so no dot. A dot in the last segment makes the dev server's
      // history fallback skip its rewrite and the SPA route 404s.
      const rawToken = mockEmail.sendEmailVerification.mock.calls[0][1];
      expect(rawToken).toMatch(/^[0-9a-f]{64}$/);
    });

    it("records the address on the token, lower-cased", async () => {
      mockDatabaseService.user.findUnique.mockResolvedValue({
        ...member,
        email: "Member@Test.Local",
      });

      await service.resend("Member@Test.Local");

      const stored =
        mockDatabaseService.emailVerificationToken.create.mock.calls[0][0].data;
      expect(stored.email).toBe("member@test.local");
    });

    it("refuses once the address has had its lifetime allowance", async () => {
      mockDatabaseService.emailVerificationToken.count.mockResolvedValue(
        EMAIL_VERIFICATION_LIFETIME_LIMIT,
      );

      await service.resend(member.email);

      expect(mockEmail.sendEmailVerification).not.toHaveBeenCalled();
      expect(
        mockDatabaseService.emailVerificationToken.create,
      ).not.toHaveBeenCalled();
    });

    it("counts the allowance against the address, not the account", async () => {
      await service.resend(member.email);

      const [countArgs] =
        mockDatabaseService.emailVerificationToken.count.mock.calls[0];
      expect(countArgs.where).toEqual({ email: "member@test.local" });
    });

    it("refuses a burst even when the lifetime allowance is not spent", async () => {
      mockDatabaseService.emailVerificationToken.count
        .mockResolvedValueOnce(3) // lifetime: under the limit
        .mockResolvedValueOnce(3); // recent: at the burst limit

      await service.resend(member.email);

      expect(mockEmail.sendEmailVerification).not.toHaveBeenCalled();
    });

    it("says nothing and sends nothing for an address with no account", async () => {
      mockDatabaseService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.resend("nobody@test.local"),
      ).resolves.toBeUndefined();
      expect(mockEmail.sendEmailVerification).not.toHaveBeenCalled();
    });

    it("says nothing and sends nothing for an address already confirmed", async () => {
      mockDatabaseService.user.findUnique.mockResolvedValue({
        ...member,
        isVerified: true,
      });

      await expect(service.resend(member.email)).resolves.toBeUndefined();
      expect(mockEmail.sendEmailVerification).not.toHaveBeenCalled();
    });

    it("does not fail a signup when the mail cannot be delivered", async () => {
      mockEmail.sendEmailVerification.mockRejectedValue(new Error("smtp down"));

      // The account row is already committed by the time this runs. Throwing
      // would report a signup that in fact happened as a failure.
      await expect(service.sendForNewUser(member.id)).resolves.toBeUndefined();
    });
  });

  describe("redeeming", () => {
    const token = "a".repeat(64);

    const unusedToken = {
      tokenHash: sha256(token),
      used: false,
      expiresAt: new Date(Date.now() + 60_000),
      user: { id: "u1", isVerified: false },
    };

    it("marks the account confirmed and the token spent, together", async () => {
      mockDatabaseService.emailVerificationToken.findUnique.mockResolvedValue(
        unusedToken,
      );

      await service.redeem(token);

      expect(mockDatabaseService.user.update).toHaveBeenCalledWith({
        where: { id: "u1" },
        data: { isVerified: true },
      });
      expect(
        mockDatabaseService.emailVerificationToken.update,
      ).toHaveBeenCalledWith({
        where: { tokenHash: sha256(token) },
        data: { used: true },
      });
      expect(mockDatabaseService.$transaction).toHaveBeenCalled();
    });

    it("looks the token up by its hash, never by the token", async () => {
      mockDatabaseService.emailVerificationToken.findUnique.mockResolvedValue(
        unusedToken,
      );

      await service.redeem(token);

      const [lookup] =
        mockDatabaseService.emailVerificationToken.findUnique.mock.calls[0];
      expect(lookup.where).toEqual({ tokenHash: sha256(token) });
    });

    it("rejects a token nobody minted", async () => {
      mockDatabaseService.emailVerificationToken.findUnique.mockResolvedValue(
        null,
      );

      await expect(service.redeem(token)).rejects.toThrow(BadRequestException);
    });

    it("rejects an expired token", async () => {
      mockDatabaseService.emailVerificationToken.findUnique.mockResolvedValue({
        ...unusedToken,
        expiresAt: new Date(Date.now() - 60_000),
      });

      await expect(service.redeem(token)).rejects.toThrow(
        "This verification link has expired",
      );
    });

    it("rejects a spent token whose account is somehow still unconfirmed", async () => {
      mockDatabaseService.emailVerificationToken.findUnique.mockResolvedValue({
        ...unusedToken,
        used: true,
      });

      await expect(service.redeem(token)).rejects.toThrow(
        "This verification link has already been used",
      );
    });

    it("succeeds on a second visit to a link that already worked", async () => {
      // A mail client or link scanner spends the token before the human clicks.
      // Reporting failure to the person who then clicks would be a lie about
      // the state of their account.
      mockDatabaseService.emailVerificationToken.findUnique.mockResolvedValue({
        ...unusedToken,
        used: true,
        user: { id: "u1", isVerified: true },
      });

      await expect(service.redeem(token)).resolves.toBeUndefined();
      expect(mockDatabaseService.user.update).not.toHaveBeenCalled();
    });

    it("rejects a token whose account has since been deleted", async () => {
      mockDatabaseService.emailVerificationToken.findUnique.mockResolvedValue({
        ...unusedToken,
        user: null,
      });

      await expect(service.redeem(token)).rejects.toThrow(BadRequestException);
    });
  });
});
