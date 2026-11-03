/**
 * The knock button on a member's profile, and what it says about the door.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DoorKnockView } from "../DoorKnockView";
import {
  HalloweenDoorClosedReason,
  type HalloweenDoorFieldsFragment,
} from "../../../generated/graphql";

const door = (
  changes: Partial<HalloweenDoorFieldsFragment> = {},
): HalloweenDoorFieldsFragment => ({
  canKnock: true,
  closedReason: null,
  remainingKnocks: 2,
  knocksPerDay: 2,
  ...changes,
});

const knockButton = () => screen.getByRole("button", { name: /knock/i });

describe("DoorKnockView", () => {
  it("knocks on an open door", async () => {
    const onKnock = vi.fn();
    render(<DoorKnockView door={door()} knocking={false} onKnock={onKnock} />);

    expect(screen.getByText("2 door knocks left today")).toBeTruthy();
    await userEvent.click(knockButton());

    expect(onKnock).toHaveBeenCalledOnce();
  });

  it("counts one knock left in the singular", () => {
    render(
      <DoorKnockView
        door={door({ remainingKnocks: 1 })}
        knocking={false}
        onKnock={vi.fn()}
      />,
    );

    expect(screen.getByText("1 door knock left today")).toBeTruthy();
  });

  it.each([
    [HalloweenDoorClosedReason.AlreadyKnocked, "Already knocked today"],
    [HalloweenDoorClosedReason.NoKnocksLeft, "No door knocks left today"],
    [HalloweenDoorClosedReason.OwnDoor, "This is your door"],
    [HalloweenDoorClosedReason.NotAMember, "Only members have doors"],
  ])("says why a %s door is closed", async (closedReason, copy) => {
    const onKnock = vi.fn();
    render(
      <DoorKnockView
        door={door({ canKnock: false, closedReason })}
        knocking={false}
        onKnock={onKnock}
      />,
    );

    expect(screen.getByText(copy)).toBeTruthy();
    expect((knockButton() as HTMLButtonElement).disabled).toBe(true);
    await userEvent.click(knockButton());
    expect(onKnock).not.toHaveBeenCalled();
  });

  it("holds a disabled button while the door loads", () => {
    render(<DoorKnockView door={null} knocking={false} onKnock={vi.fn()} />);

    expect((knockButton() as HTMLButtonElement).disabled).toBe(true);
  });
});
