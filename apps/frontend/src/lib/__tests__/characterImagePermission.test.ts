import { describe, it, expect } from "vitest";
import { ExternalAccountProvider } from "../../generated/graphql";
import type { OwnershipInput } from "../characterOwnership";
import {
  imageBlockedReason,
  type ImageRole,
} from "../characterImagePermission";

const role = (overrides: Partial<ImageRole> = {}): ImageRole => ({
  canUploadOwnCharacterImages: false,
  canUploadCharacterImages: false,
  canCreateOrphanedCharacter: false,
  canEditCharacter: false,
  ...overrides,
});

const MINE: OwnershipInput = { assignToSelf: true };
const THEIRS: OwnershipInput = { assignToSelf: true, ownerId: "someone" };
const UNOWNED: OwnershipInput = { assignToSelf: false };
const PENDING: OwnershipInput = {
  assignToSelf: true,
  pendingOwner: {
    provider: ExternalAccountProvider.Discord,
    providerAccountId: "1",
  },
};

describe("imageBlockedReason", () => {
  it("lets a member upload to their own new character", () => {
    expect(
      imageBlockedReason(role({ canUploadOwnCharacterImages: true }), MINE),
    ).toBeUndefined();
    expect(imageBlockedReason(role(), MINE)).toMatch(/own/);
  });

  it("checks another member's character against the upload-to-any permission", () => {
    // What the server checks for a character the uploader does not own,
    // plus edit rights for making the upload its main image.
    expect(
      imageBlockedReason(role({ canUploadOwnCharacterImages: true }), THEIRS),
    ).toMatch(/other members/);
    expect(
      imageBlockedReason(
        role({ canUploadCharacterImages: true, canEditCharacter: true }),
        THEIRS,
      ),
    ).toBeUndefined();
    expect(
      imageBlockedReason(role({ canUploadCharacterImages: true }), THEIRS),
    ).toMatch(/other members/);
  });

  it("accepts either permission for an unowned or pending character", () => {
    for (const ownership of [UNOWNED, PENDING]) {
      expect(
        imageBlockedReason(
          role({ canCreateOrphanedCharacter: true, canEditCharacter: true }),
          ownership,
        ),
      ).toBeUndefined();
      expect(
        imageBlockedReason(
          role({ canUploadCharacterImages: true, canEditCharacter: true }),
          ownership,
        ),
      ).toBeUndefined();
      expect(
        imageBlockedReason(
          role({ canCreateOrphanedCharacter: true }),
          ownership,
        ),
      ).toMatch(/unowned/);
    }
  });

  it("blocks when the member has no role in the community", () => {
    expect(imageBlockedReason(null, MINE)).toMatch(/own/);
  });
});
