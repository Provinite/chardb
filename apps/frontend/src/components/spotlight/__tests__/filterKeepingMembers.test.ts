import { describe, it, expect } from "vitest";
import type { SpotlightActionGroupData } from "@mantine/spotlight";
import { filterKeepingMembers } from "../filterKeepingMembers";
import { MEMBER_GROUP, MEMBER_PAGES_GROUP } from "../useSpotlightActions";

const noop = () => {};

const members: SpotlightActionGroupData = {
  group: MEMBER_GROUP,
  actions: [
    {
      id: "member-1",
      label: "Neo the Baka",
      description: "@neothebaka",
      onClick: noop,
    },
  ],
};

const memberPages: SpotlightActionGroupData = {
  group: MEMBER_PAGES_GROUP,
  actions: [
    { id: "profile", label: "Profile", description: "", onClick: noop },
    { id: "inventory", label: "Inventory", description: "", onClick: noop },
    { id: "characters", label: "Characters", description: "", onClick: noop },
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

const all = [members, memberPages, pages];

const groupNames = (result: ReturnType<typeof filterKeepingMembers>) =>
  result.map((item) => ("group" in item ? item.group : item.id));

const actionsOf = (result: ReturnType<typeof filterKeepingMembers>) =>
  (result[0] as SpotlightActionGroupData).actions.map((a) => a.id);

describe("filterKeepingMembers", () => {
  it("answers an @ query with people and nothing else", () => {
    // "inventory" is both a page label and one of a member's pages, so without
    // the mode this query would answer three questions at once.
    const result = filterKeepingMembers("@inventory", all);

    expect(groupNames(result)).toEqual([MEMBER_GROUP]);
  });

  it("keeps a member the query does not literally spell", () => {
    // The server matched "neoth" against the username; the label shows the
    // display name. Filtering it again here is what would lose them.
    const result = filterKeepingMembers("@neoth", all);

    expect(actionsOf(result)).toEqual(["member-1"]);
  });

  it("answers a drilled query with that person's pages", () => {
    const result = filterKeepingMembers("@neothebaka/", all);

    expect(groupNames(result)).toEqual([MEMBER_PAGES_GROUP]);
    expect(actionsOf(result)).toEqual(["profile", "inventory", "characters"]);
  });

  it("narrows a person's pages by what follows the slash", () => {
    // The username before the slash must not be part of the match, or nothing
    // would ever survive it.
    const result = filterKeepingMembers("@neothebaka/inv", all);

    expect(actionsOf(result)).toEqual(["inventory"]);
  });

  it("treats @/ as still choosing a person", () => {
    const result = filterKeepingMembers("@/", all);

    expect(groupNames(result)).toEqual([MEMBER_GROUP]);
  });

  it("narrows the pages when no @ was typed", () => {
    const result = filterKeepingMembers("ledger", all);

    expect(groupNames(result)).toEqual(["Thornwood"]);
    expect(actionsOf(result)).toEqual(["ledger"]);
  });

  it("drops people the moment the @ goes away", () => {
    // Backstop for the hook: deleting the sigil is a different question, and
    // the people you found a keystroke ago are not an answer to it.
    const result = filterKeepingMembers("overview", all);

    expect(groupNames(result)).toEqual(["Thornwood"]);
  });
});
