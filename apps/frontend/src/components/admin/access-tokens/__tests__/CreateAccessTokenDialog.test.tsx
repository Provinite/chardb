import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen, within } from "../../../../__tests__/test-utils";
import {
  CreateAccessTokenDialog,
  type CreateAccessTokenDialogProps,
} from "../CreateAccessTokenDialog";

const options: NonNullable<CreateAccessTokenDialogProps["options"]> = {
  __typename: "PersonalAccessTokenGrantOptions",
  communities: [
    {
      __typename: "PersonalAccessTokenCommunityRef",
      id: "c-1",
      name: "Willowmere",
    },
    {
      __typename: "PersonalAccessTokenCommunityRef",
      id: "c-2",
      name: "Ashgrove",
    },
  ],
  permissions: ["canManageItems", "canEditCharacter"],
  globalPermissions: ["isAdmin", "canListUsers"],
  lifetimesDays: [7, 30, 90, 365],
};

const renderDialog = (
  overrides: Partial<CreateAccessTokenDialogProps> = {},
) => {
  const props: CreateAccessTokenDialogProps = {
    open: true,
    options,
    onSubmit: vi.fn(),
    onCopy: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  render(<CreateAccessTokenDialog {...props} />);
  return props;
};

const addCommunity = async (name: string) => {
  await userEvent.click(screen.getByLabelText("Add a community"));
  await userEvent.click(await screen.findByRole("option", { name }));
};

describe("CreateAccessTokenDialog", () => {
  it("creates nothing until it has a name and a grant", async () => {
    renderDialog();
    const create = screen.getByRole("button", { name: "Create token" });

    expect(create).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Name"), "deploy bot");
    expect(create).toBeDisabled();
    await addCommunity("Willowmere");
    expect(create).toBeDisabled();
    await userEvent.click(screen.getByLabelText("Manage Items"));
    expect(create).toBeEnabled();
  });

  // Membership opens spending the owner's currency and buying from the shop
  // as them, so it is never granted without being asked for.
  it("grants nothing in a community until something is checked", async () => {
    renderDialog();

    await addCommunity("Willowmere");
    const grant = screen.getByRole("group", { name: "Willowmere" });

    expect(within(grant).getByLabelText("Member")).not.toBeChecked();
    expect(within(grant).getByLabelText("Member")).toHaveAccessibleDescription(
      /spending your currency/,
    );
  });

  it("sends the name, lifetime and each community's grants", async () => {
    const { onSubmit } = renderDialog();

    await userEvent.type(screen.getByLabelText("Name"), " deploy bot ");
    await userEvent.selectOptions(screen.getByLabelText("Expires after"), "30");
    await addCommunity("Willowmere");
    const grant = screen.getByRole("group", { name: "Willowmere" });
    await userEvent.click(within(grant).getByLabelText("Manage Items"));
    await userEvent.click(screen.getByRole("button", { name: "Create token" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "deploy bot",
      expiresInDays: 30,
      communities: [
        { communityId: "c-1", member: false, permissions: ["canManageItems"] },
      ],
      globalPermissions: [],
    });
  });

  it("offers the site permissions the creator holds", () => {
    renderDialog();
    const site = screen.getByRole("group", { name: "Site permissions" });

    expect(within(site).getAllByRole("checkbox")).toHaveLength(2);
    expect(within(site).getByLabelText("Site Admin")).not.toBeChecked();
    expect(
      within(site).getByLabelText("Site Admin"),
    ).toHaveAccessibleDescription(
      /cannot create, list or revoke access tokens/,
    );
    expect(within(site).getByLabelText("List Users")).not.toBeChecked();
  });

  it("offers no site permissions when the creator holds none", () => {
    renderDialog({ options: { ...options, globalPermissions: [] } });

    expect(
      screen.queryByRole("group", { name: "Site permissions" }),
    ).not.toBeInTheDocument();
  });

  it("creates a token with site permissions and no community", async () => {
    const { onSubmit } = renderDialog();
    const create = screen.getByRole("button", { name: "Create token" });

    await userEvent.type(screen.getByLabelText("Name"), "backfill");
    expect(create).toBeDisabled();
    await userEvent.click(screen.getByLabelText("Site Admin"));
    expect(create).toBeEnabled();
    await userEvent.click(create);

    expect(onSubmit).toHaveBeenCalledWith({
      name: "backfill",
      expiresInDays: 90,
      communities: [],
      globalPermissions: ["isAdmin"],
    });
  });

  it("shows the secret once made, and copies it", async () => {
    const { onCopy } = renderDialog({ secret: "chardb_pat_abc123" });

    expect(screen.getByTestId("access-token-secret")).toHaveTextContent(
      "chardb_pat_abc123",
    );
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(onCopy).toHaveBeenCalledWith("chardb_pat_abc123");
  });
});
