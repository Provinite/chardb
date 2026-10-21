import { readdirSync, readFileSync, statSync } from "fs";
import * as path from "path";

/**
 * Joining a community also hands over what was waiting there for the new
 * member's linked accounts, so every membership has to be created through
 * CommunityMembershipService.join. A sixth path that writes the row directly
 * would let someone become a member without receiving their prizes.
 */
describe("creating a community membership", () => {
  const SRC = path.resolve(__dirname, "..");
  const ALLOWED = path.join(
    SRC,
    "community-membership",
    "community-membership.service.ts",
  );

  const sources = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) return sources(full);
      return name.endsWith(".ts") && !name.includes(".spec.") ? [full] : [];
    });

  it("happens only in CommunityMembershipService.join", () => {
    const offenders = sources(SRC).filter(
      (file) =>
        file !== ALLOWED &&
        /communityMember\s*\.\s*create\s*\(/.test(readFileSync(file, "utf8")),
    );
    expect(offenders.map((f) => path.relative(SRC, f))).toEqual([]);
  });
});
