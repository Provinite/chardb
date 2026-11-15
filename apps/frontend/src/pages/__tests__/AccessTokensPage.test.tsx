import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import type { MockedResponse } from "@apollo/client/testing";
import { render, screen } from "../../__tests__/test-utils";
import { AccessTokensPage } from "../AccessTokensPage";
import {
  CREATE_PERSONAL_ACCESS_TOKEN,
  PERSONAL_ACCESS_TOKEN_GRANT_OPTIONS,
  PERSONAL_ACCESS_TOKENS,
} from "../../graphql/personal-access-tokens.graphql";
import type { PersonalAccessTokenFieldsFragment } from "../../generated/graphql";

const created: PersonalAccessTokenFieldsFragment = {
  __typename: "PersonalAccessToken",
  id: "t-1",
  name: "deploy bot",
  displayHint: "x9Qa",
  createdAt: "2026-11-14T00:00:00Z",
  expiresAt: "2027-02-12T00:00:00Z",
  lastUsedAt: null,
  revokedAt: null,
  communities: [
    {
      __typename: "PersonalAccessTokenGrant",
      community: {
        __typename: "PersonalAccessTokenCommunityRef",
        id: "c-1",
        name: "Willowmere",
      },
      member: false,
      permissions: ["canManageItems"],
    },
  ],
};

const mocks: MockedResponse[] = [
  {
    request: { query: PERSONAL_ACCESS_TOKENS },
    result: { data: { personalAccessTokens: [] } },
  },
  {
    request: { query: PERSONAL_ACCESS_TOKEN_GRANT_OPTIONS },
    result: {
      data: {
        personalAccessTokenGrantOptions: {
          __typename: "PersonalAccessTokenGrantOptions",
          communities: [
            {
              __typename: "PersonalAccessTokenCommunityRef",
              id: "c-1",
              name: "Willowmere",
            },
          ],
          permissions: ["canManageItems"],
          lifetimesDays: [7, 30, 90, 365],
        },
      },
    },
  },
  {
    request: {
      query: CREATE_PERSONAL_ACCESS_TOKEN,
      variables: {
        input: {
          name: "deploy bot",
          expiresInDays: 90,
          communities: [
            {
              communityId: "c-1",
              member: false,
              permissions: ["canManageItems"],
            },
          ],
        },
      },
    },
    result: {
      data: {
        createPersonalAccessToken: {
          __typename: "CreatedPersonalAccessToken",
          secret: "chardb_pat_made",
          token: created,
        },
      },
    },
  },
  // The list refetched after creating fails.
  {
    request: { query: PERSONAL_ACCESS_TOKENS },
    error: new Error("Network down"),
  },
];

describe("AccessTokensPage", () => {
  it("shows the new secret even when refreshing the list fails", async () => {
    render(<AccessTokensPage />, { mocks });

    await userEvent.click(
      await screen.findByRole("button", { name: "Create token" }),
    );
    await userEvent.type(screen.getByLabelText("Name"), "deploy bot");
    await userEvent.click(screen.getByLabelText("Add a community"));
    await userEvent.click(
      await screen.findByRole("option", { name: "Willowmere" }),
    );
    await userEvent.click(screen.getByLabelText("Manage Items"));
    await userEvent.click(
      screen.getAllByRole("button", { name: "Create token" }).at(-1)!,
    );

    expect(
      await screen.findByTestId("access-token-secret"),
    ).toHaveTextContent("chardb_pat_made");
  });
});
