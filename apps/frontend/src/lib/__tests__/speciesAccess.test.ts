import { describe, expect, it } from "vitest";
import { canManageSpecies } from "../speciesAccess";

const role = (canCreateSpecies: boolean, canEditSpecies: boolean) => ({
  canCreateSpecies,
  canEditSpecies,
});

describe("canManageSpecies", () => {
  it("allows a role that can create species", () => {
    expect(canManageSpecies(role(true, false), false)).toBe(true);
  });

  it("allows a role that can edit species", () => {
    expect(canManageSpecies(role(false, true), false)).toBe(true);
  });

  it("refuses a role with neither", () => {
    expect(canManageSpecies(role(false, false), false)).toBe(false);
  });

  it("refuses a viewer with no role in the community", () => {
    expect(canManageSpecies(null, false)).toBe(false);
  });

  it("allows a site admin whatever their role", () => {
    expect(canManageSpecies(role(false, false), true)).toBe(true);
    expect(canManageSpecies(null, true)).toBe(true);
  });
});
