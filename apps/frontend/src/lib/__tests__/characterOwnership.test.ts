import { describe, it, expect } from "vitest";
import { ExternalAccountProvider } from "../../generated/graphql";
import type { GrantTarget } from "../../components/GrantTargetSelector";
import { ownershipInput } from "../characterOwnership";

const SELF = "me";

const user = (userId: string): GrantTarget => ({
  type: "user",
  userId,
  user: { id: userId, username: userId, displayName: null, avatarImage: null },
});

const pending: GrantTarget = {
  type: "pending",
  provider: ExternalAccountProvider.Discord,
  providerAccountId: "123456789012345678",
};

describe("ownershipInput", () => {
  it("makes it yours when you choose yourself", () => {
    expect(ownershipInput(true, user(SELF), SELF)).toEqual({
      assignToSelf: true,
    });
  });

  it("names the member chosen as owner (#424)", () => {
    expect(ownershipInput(true, user("someone"), SELF)).toEqual({
      assignToSelf: true,
      ownerId: "someone",
    });
  });

  it("leaves it unowned when nobody is chosen", () => {
    expect(ownershipInput(true, null, SELF)).toEqual({ assignToSelf: false });
  });

  it("sends a pending owner", () => {
    expect(ownershipInput(true, pending, SELF)).toEqual({
      assignToSelf: true,
      pendingOwner: {
        provider: ExternalAccountProvider.Discord,
        providerAccountId: "123456789012345678",
      },
    });
  });

  it("ignores whatever the picker held once it is hidden", () => {
    // The picker hides on a species where you cannot create for others, and
    // what it held before stays in state. None of it may reach the server.
    expect(ownershipInput(false, pending, SELF)).toEqual({
      assignToSelf: true,
    });
    expect(ownershipInput(false, user("someone"), SELF)).toEqual({
      assignToSelf: true,
    });
    expect(ownershipInput(false, null, SELF)).toEqual({ assignToSelf: true });
  });
});
