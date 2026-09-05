import { describe, it, expect } from "vitest";
import type { SpotlightActionGroupData } from "@mantine/spotlight";
import { filterKeepingMembers } from "../filterKeepingMembers";
import { MEMBER_INVENTORY_GROUP } from "../useSpotlightActions";

const noop = () => {};

const members: SpotlightActionGroupData = {
  group: MEMBER_INVENTORY_GROUP,
  actions: [
    {
      id: "member-inventory-1",
      label: "Neo the Baka",
      description: "Inventory in Thornwood",
      onClick: noop,
    },
  ],
};

const pages: SpotlightActionGroupData = {
  group: "Thornwood",
  actions: [
    { id: "overview", label: "Overview", description: "", onClick: noop },
    {
      id: "ledger",
      label: "Item Ledger",
      description: "Thornwood item ledger",
      onClick: noop,
    },
  ],
};

const groupNames = (result: ReturnType<typeof filterKeepingMembers>) =>
  result.map((item) => ("group" in item ? item.group : item.id));

describe("filterKeepingMembers", () => {
  it("answers an @ query with people and nothing else", () => {
    // "inventory" is a page label in every community group, so without the
    // mode this query would bury the person under them.
    const result = filterKeepingMembers("@inventory", [pages, members]);

    expect(groupNames(result)).toEqual([MEMBER_INVENTORY_GROUP]);
  });

  it("keeps a member the query does not literally spell", () => {
    // The server matched "neoth" against the username; the label shows the
    // display name. Filtering it again here is what would lose them.
    const result = filterKeepingMembers("@neoth", [members, pages]);

    const found = result[0] as SpotlightActionGroupData;
    expect(found.actions.map((a) => a.label)).toEqual(["Neo the Baka"]);
  });

  it("narrows the pages when no @ was typed", () => {
    const result = filterKeepingMembers("ledger", [members, pages]);

    const community = result.find(
      (item) => "group" in item && item.group === "Thornwood",
    ) as SpotlightActionGroupData;
    expect(community.actions.map((a) => a.id)).toEqual(["ledger"]);
  });

  it("drops a page group with nothing left in it", () => {
    const result = filterKeepingMembers("zzz", [pages]);

    expect(groupNames(result)).toEqual([]);
  });

  it("drops people the moment the @ goes away", () => {
    // Backstop for the hook: deleting the sigil is a different question, and
    // the people you found a keystroke ago are not an answer to it.
    const result = filterKeepingMembers("overview", [members, pages]);

    expect(groupNames(result)).not.toContain(MEMBER_INVENTORY_GROUP);
  });
});
