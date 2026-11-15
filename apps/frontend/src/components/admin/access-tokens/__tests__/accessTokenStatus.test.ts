import { describe, expect, it } from "vitest";
import { accessTokenStatus, describeGrant } from "../accessTokenStatus";

const now = new Date("2026-11-14T12:00:00Z");

describe("accessTokenStatus", () => {
  it("is active before it expires", () => {
    expect(
      accessTokenStatus(
        { expiresAt: "2026-11-15T00:00:00Z", revokedAt: null },
        now,
      ),
    ).toBe("active");
  });

  it("is expired from the moment it expires", () => {
    expect(
      accessTokenStatus(
        { expiresAt: "2026-11-14T12:00:00Z", revokedAt: null },
        now,
      ),
    ).toBe("expired");
  });

  it("is revoked once revoked, expired or not", () => {
    expect(
      accessTokenStatus(
        {
          expiresAt: "2026-11-01T00:00:00Z",
          revokedAt: "2026-10-30T00:00:00Z",
        },
        now,
      ),
    ).toBe("revoked");
  });
});

describe("describeGrant", () => {
  it("names membership first, then each permission by its label", () => {
    expect(
      describeGrant({
        member: true,
        permissions: ["canManageItems", "canEditCharacter"],
      }),
    ).toEqual(["Member", "Manage Items", "Edit Any Character (Profile)"]);
  });

  it("shows a permission it has no label for by its name", () => {
    expect(
      describeGrant({ member: false, permissions: ["canDoSomethingNew"] }),
    ).toEqual(["canDoSomethingNew"]);
  });
});
