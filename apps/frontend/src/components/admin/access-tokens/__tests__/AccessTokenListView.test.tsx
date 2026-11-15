import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen, within } from "../../../../__tests__/test-utils";
import { AccessTokenListView } from "../AccessTokenListView";
import type { PersonalAccessTokenFieldsFragment } from "../../../../generated/graphql";

const now = new Date("2026-11-14T12:00:00Z");

const token = (
  overrides: Partial<PersonalAccessTokenFieldsFragment> = {},
): PersonalAccessTokenFieldsFragment => ({
  __typename: "PersonalAccessToken",
  id: "t-1",
  name: "deploy bot",
  displayHint: "x9Qa",
  createdAt: "2026-11-01T00:00:00Z",
  expiresAt: "2027-01-30T00:00:00Z",
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
      member: true,
      permissions: ["canManageItems"],
    },
  ],
  ...overrides,
});

describe("AccessTokenListView", () => {
  it("shows what each token may do, where, and until when", () => {
    render(
      <AccessTokenListView tokens={[token()]} now={now} onRevoke={vi.fn()} />,
    );

    const card = screen.getByRole("listitem", { name: "deploy bot" });
    expect(within(card).getByText("…x9Qa")).toBeInTheDocument();
    expect(within(card).getByText("Active")).toBeInTheDocument();
    expect(card).toHaveTextContent("Willowmere: Member, Manage Items");
    expect(card).toHaveTextContent("Last used Never");
  });

  it("revokes an active token", async () => {
    const onRevoke = vi.fn();
    render(
      <AccessTokenListView tokens={[token()]} now={now} onRevoke={onRevoke} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Revoke" }));

    expect(onRevoke).toHaveBeenCalledWith(
      expect.objectContaining({ id: "t-1" }),
    );
  });

  it.each([
    ["revoked", { revokedAt: "2026-11-10T00:00:00Z" }, "Revoked"],
    ["expired", { expiresAt: "2026-11-10T00:00:00Z" }, "Expired"],
  ])("cannot revoke a token that is %s", (_case, overrides, label) => {
    render(
      <AccessTokenListView
        tokens={[token(overrides)]}
        now={now}
        onRevoke={vi.fn()}
      />,
    );

    expect(screen.getByText(label, { selector: "span" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revoke" })).toBeDisabled();
  });

  it("says when there are none", () => {
    render(<AccessTokenListView tokens={[]} now={now} onRevoke={vi.fn()} />);

    expect(screen.getByText(/No access tokens yet/)).toBeInTheDocument();
  });
});
