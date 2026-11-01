import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../../../__tests__/test-utils";
import userEvent from "@testing-library/user-event";
import { GiveToCommunityDialog } from "../CharacterDisposalDialogs";

const renderDialog = (onConfirm = vi.fn()) =>
  render(
    <GiveToCommunityDialog
      open
      characterName="Pinefall"
      communityName="Willowmere"
      busy={false}
      onConfirm={onConfirm}
      onCancel={vi.fn()}
    />,
  );

describe("GiveToCommunityDialog", () => {
  it("names the community, and says the character goes public for good", () => {
    renderDialog();

    expect(
      screen.getByRole("dialog", { name: 'Give "Pinefall" to Willowmere?' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/made public/)).toBeInTheDocument();
    expect(screen.getByText(/no undo/i)).toBeInTheDocument();
  });

  it("gives only once the character's name is typed", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderDialog(onConfirm);

    const confirm = screen.getByRole("button", { name: "Give" });
    expect(confirm).toBeDisabled();

    await user.type(
      screen.getByLabelText(/Type Pinefall to confirm/),
      "Pinefall",
    );
    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
