import { ConfigService } from "@nestjs/config";
import { NotificationKind } from "@chardb/database";
import { UnsubscribeTokenService } from "./unsubscribe-token.service";

/**
 * These tokens travel in email, live for as long as the mail does, and are
 * accepted by an endpoint nobody has to be signed in to reach. That combination
 * is why forgery matters more here than anywhere else in the codebase.
 */
describe("UnsubscribeTokenService", () => {
  const build = (secret: string) =>
    new UnsubscribeTokenService({
      getOrThrow: () => secret,
    } as unknown as ConfigService);

  let service: UnsubscribeTokenService;

  beforeEach(() => {
    service = build("test-secret");
  });

  it("round-trips what it was given", () => {
    const token = service.issue("user-1", NotificationKind.IMAGE_APPROVED);

    expect(service.verify(token)).toEqual({
      userId: "user-1",
      kind: NotificationKind.IMAGE_APPROVED,
    });
  });

  it("issues the same token for the same inputs", () => {
    // Stateless on purpose: a link in a year-old email has to still work, and
    // nothing was stored that could tell us what we sent.
    expect(service.issue("user-1", NotificationKind.IMAGE_REJECTED)).toBe(
      service.issue("user-1", NotificationKind.IMAGE_REJECTED),
    );
  });

  it("issues different tokens per kind", () => {
    // Unsubscribing from approvals must not also silence rejections.
    expect(service.issue("user-1", NotificationKind.IMAGE_APPROVED)).not.toBe(
      service.issue("user-1", NotificationKind.IMAGE_REJECTED),
    );
  });

  it("rejects a token whose user was swapped", () => {
    // The attack this exists to stop: take your own valid link, paste in
    // somebody else's id, and switch their mail off.
    const mine = service.issue("user-1", NotificationKind.IMAGE_APPROVED);
    const theirs = service.issue("user-2", NotificationKind.IMAGE_APPROVED);

    const forged = `${theirs.split(".")[0]}.${mine
      .split(".")
      .slice(1)
      .join(".")}`;

    expect(service.verify(forged)).toBeNull();
  });

  it("rejects a token whose kind was swapped", () => {
    const approved = service.issue("user-1", NotificationKind.IMAGE_APPROVED);
    const rejected = service.issue("user-1", NotificationKind.IMAGE_REJECTED);

    const [userPart] = approved.split(".");
    const [, kindPart] = rejected.split(".");
    const [, , mac] = approved.split(".");

    expect(service.verify(`${userPart}.${kindPart}.${mac}`)).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const other = build("a-different-secret");

    expect(
      service.verify(other.issue("user-1", NotificationKind.IMAGE_APPROVED)),
    ).toBeNull();
  });

  it("rejects malformed input without throwing", () => {
    // A public endpoint gets fed junk. Every one of these has to be a quiet
    // null rather than a 500.
    for (const bad of ["", "nonsense", "a.b", "a.b.c.d", "....", "a.b.c"]) {
      expect(service.verify(bad)).toBeNull();
    }
  });

  it("rejects a kind this version does not know", () => {
    const token = service.issue("user-1", NotificationKind.IMAGE_APPROVED);
    // Signed by us, so the MAC is valid -- but naming something that is not a
    // kind. A rollback that removes a kind must not resolve to a bad write.
    const forged = build("test-secret");
    const rolled = forged.issue("user-1", "NOT_A_KIND" as NotificationKind);

    expect(service.verify(rolled)).toBeNull();
    expect(service.verify(token)).not.toBeNull();
  });
});
