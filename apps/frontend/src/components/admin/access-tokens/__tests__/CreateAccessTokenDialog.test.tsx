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
  it("creates nothing until it has a name and a community", async () => {
    renderDialog();
    const create = screen.getByRole("button", { name: "Create token" });

    expect(create).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Name"), "deploy bot");
    expect(create).toBeDisabled();
    await addCommunity("Willowmere");
    expect(create).toBeEnabled();
  });

  it("sends the name, lifetime and each community's grants", async () => {
    const { onSubmit } = renderDialog();

    await userEvent.type(screen.getByLabelText("Name"), " deploy bot ");
    await userEvent.selectOptions(screen.getByLabelText("Expires after"), "30");
    await addCommunity("Willowmere");
    const grant = screen.getByRole("group", { name: "Willowmere" });
    await userEvent.click(within(grant).getByLabelText("Member"));
    await userEvent.click(within(grant).getByLabelText("Manage Items"));
    await userEvent.click(screen.getByRole("button", { name: "Create token" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "deploy bot",
      expiresInDays: 30,
      communities: [
        { communityId: "c-1", member: false, permissions: ["canManageItems"] },
      ],
    });
  });

  it("will not send a community granted nothing", async () => {
    renderDialog();

    await userEvent.type(screen.getByLabelText("Name"), "deploy bot");
    await addCommunity("Willowmere");
    await userEvent.click(
      within(screen.getByRole("group", { name: "Willowmere" })).getByLabelText(
        "Member",
      ),
    );

    expect(screen.getByRole("button", { name: "Create token" })).toBeDisabled();
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
