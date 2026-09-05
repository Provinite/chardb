import { describe, it, expect } from "vitest";
import {
  rejectCommunitySlug,
  suggestCommunitySlug,
  isValidCommunitySlug,
} from "@chardb/shared";
import { parseCommunitySlug, ROOT_DOMAIN } from "../communityHost";

/**
 * `ROOT_DOMAIN` is read from the environment once, at module load, so these
 * build their hostnames from it rather than hardcoding one. It differs between
 * a developer's machine (`dev.localhost`), the e2e harness (`e2e.localhost`)
 * and production, and none of what is asserted here depends on which.
 */
const root = ROOT_DOMAIN;

describe("parseCommunitySlug", () => {
  it("returns null for the apex", () => {
    expect(parseCommunitySlug(root)).toBeNull();
  });

  it("returns the label for a community host", () => {
    expect(parseCommunitySlug(`willowmere.${root}`)).toBe("willowmere");
    expect(parseCommunitySlug(`thornfield-hollow.${root}`)).toBe(
      "thornfield-hollow",
    );
  });

  it("treats www as the apex", () => {
    // `www` is a reserved slug precisely so it can never be a community.
    expect(parseCommunitySlug(`www.${root}`)).toBeNull();
  });

  it("returns null for more than one label", () => {
    // A community is exactly one label; `a.b.<root>` is not one.
    expect(parseCommunitySlug(`a.b.${root}`)).toBeNull();
  });

  it("returns null for a host that is not under the root domain", () => {
    expect(parseCommunitySlug("evil.example")).toBeNull();
    expect(parseCommunitySlug(`not${root}`)).toBeNull();
    // The near miss a suffix check would let through.
    expect(parseCommunitySlug(`${root}.evil.example`)).toBeNull();
  });

  it("returns null for a label that could never be a slug", () => {
    // The wildcard record answers for every label, so these are reachable.
    expect(parseCommunitySlug(`-leading.${root}`)).toBeNull();
    expect(parseCommunitySlug(`trailing-.${root}`)).toBeNull();
    expect(parseCommunitySlug(`ab.${root}`)).toBeNull();
  });

  it("is case insensitive about the host", () => {
    expect(parseCommunitySlug(`WILLOWMERE.${root.toUpperCase()}`)).toBe(
      "willowmere",
    );
  });
});

describe("rejectCommunitySlug", () => {
  it("accepts an ordinary slug", () => {
    expect(rejectCommunitySlug("willowmere")).toBeNull();
    expect(rejectCommunitySlug("thornfield-hollow")).toBeNull();
    expect(rejectCommunitySlug("arpg2")).toBeNull();
  });

  it("names the rule that was broken", () => {
    expect(rejectCommunitySlug("ab")).toBe("too-short");
    expect(rejectCommunitySlug("a".repeat(64))).toBe("too-long");
    expect(rejectCommunitySlug("Willowmere")).toBe("malformed");
    expect(rejectCommunitySlug("willow mere")).toBe("malformed");
    expect(rejectCommunitySlug("-willowmere")).toBe("malformed");
    expect(rejectCommunitySlug("willowmere-")).toBe("malformed");
    expect(rejectCommunitySlug("willow--mere")).toBe("malformed");
    expect(rejectCommunitySlug("api")).toBe("reserved");
    expect(rejectCommunitySlug("www")).toBe("reserved");
  });

  it("accepts exactly 63 characters, the DNS label limit", () => {
    expect(isValidCommunitySlug("a".repeat(63))).toBe(true);
  });
});

describe("suggestCommunitySlug", () => {
  // Must agree with the backfill migration, so a community created today and
  // one backfilled yesterday get the same answer from the same name.
  it("matches the migration's derivation", () => {
    expect(suggestCommunitySlug("Willowmere")).toBe("willowmere");
    expect(suggestCommunitySlug("Thornfield Hollow")).toBe("thornfield-hollow");
    expect(suggestCommunitySlug("The Cloverse")).toBe("the-cloverse");
    expect(suggestCommunitySlug("CloverCoin's ARPG!")).toBe("clovercoin-s-arpg");
  });

  it("can return something the rules then reject", () => {
    // Deliberate: the caller makes the person choose rather than mangling the
    // name further behind their back.
    expect(suggestCommunitySlug("  ---  ")).toBe("");
    expect(suggestCommunitySlug("API")).toBe("api");
    expect(isValidCommunitySlug(suggestCommunitySlug("API"))).toBe(false);
  });
});
