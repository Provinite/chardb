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
  it("keeps a member the query does not literally spell", () => {
    // The server matched "neoth" against the username; the label shows the
    // display name. Filtering it again here is what would lose them.
    const result = filterKeepingMembers("neoth", [members, pages]);

    expect(groupNames(result)).toContain(MEMBER_INVENTORY_GROUP);
  });

  it("still narrows the static pages", () => {
    const result = filterKeepingMembers("ledger", [members, pages]);

    const community = result.find(
      (item) => "group" in item && item.group === "Thornwood",
    ) as SpotlightActionGroupData;
    expect(community.actions.map((a) => a.id)).toEqual(["ledger"]);
  });

  it("drops a page group with nothing left in it", () => {
    const result = filterKeepingMembers("zzz", [members, pages]);

    expect(groupNames(result)).toEqual([MEMBER_INVENTORY_GROUP]);
  });

  it("puts members above pages", () => {
    // Both match "inventory": the member action by description, any page by
    // label. The person is the more specific answer.
    const result = filterKeepingMembers("inventory", [pages, members]);

    expect(groupNames(result)[0]).toBe(MEMBER_INVENTORY_GROUP);
  });
});
