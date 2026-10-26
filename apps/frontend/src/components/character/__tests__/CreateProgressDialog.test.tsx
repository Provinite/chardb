/**
 * The dialog that walks a character's creation step by step (#424).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "@chardb/ui";
import type { CreateProgress } from "../../../lib/createWithImage";
import { CreateProgressDialog } from "../CreateProgressDialog";

const wrap = (
  progress: CreateProgress | null,
  props: Partial<React.ComponentProps<typeof CreateProgressDialog>> = {},
) => {
  const onCreateAnother = vi.fn();
  const onBackToForm = vi.fn();
  render(
    <MemoryRouter>
      <ThemeProvider theme={lightTheme}>
        <CreateProgressDialog
          progress={progress}
          characterName="Lumen"
          isMyo={false}
          onCreateAnother={onCreateAnother}
          onBackToForm={onBackToForm}
          {...props}
        />
      </ThemeProvider>
    </MemoryRouter>,
  );
  return { onCreateAnother, onBackToForm };
};

const step = (name: RegExp) => screen.getByRole("listitem", { name });

describe("CreateProgressDialog", () => {
  it("is not shown before anything starts", () => {
    wrap(null);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows each step's state and offers nothing while running", () => {
    wrap({
      outcome: "running",
      characterId: "char-1",
      steps: [
        { key: "create", status: "done" },
        { key: "upload", status: "running", progress: 0.4 },
        { key: "setMain", status: "todo" },
      ],
    });

    const dialog = screen.getByRole("dialog", { name: /creating lumen/i });
    expect(step(/creating the character/i)).toHaveAttribute(
      "data-status",
      "done",
    );
    expect(step(/uploading the image/i)).toHaveAttribute(
      "data-status",
      "running",
    );
    expect(within(dialog).getByText("40%")).toBeVisible();
    expect(step(/setting it as the main image/i)).toHaveAttribute(
      "data-status",
      "todo",
    );
    expect(within(dialog).queryAllByRole("button")).toHaveLength(0);
    expect(within(dialog).queryAllByRole("link")).toHaveLength(0);
  });

  it("offers the character, or another, once done", async () => {
    const { onCreateAnother } = wrap({
      outcome: "done",
      characterId: "char-1",
      steps: [{ key: "create", status: "done" }],
    });

    expect(
      screen.getByRole("dialog", { name: /lumen is ready/i }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "View character" }),
    ).toHaveAttribute("href", "/character/char-1");

    await userEvent.click(
      screen.getByRole("button", { name: "Create another" }),
    );
    expect(onCreateAnother).toHaveBeenCalled();
  });

  it("sends a spent ticket back to the inventory instead", () => {
    wrap(
      {
        outcome: "done",
        characterId: "char-1",
        steps: [{ key: "create", status: "done" }],
      },
      { isMyo: true },
    );

    expect(step(/redeeming your ticket/i)).toBeVisible();
    // What the ticket's toast used to say, and still worth saying.
    expect(screen.getByText(/traits are with staff for review/i)).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Back to inventory" }),
    ).toHaveAttribute("href", "/inventory");
    expect(screen.queryByRole("button", { name: "Create another" })).toBeNull();
  });

  it("returns to the form when nothing was created", async () => {
    const { onBackToForm } = wrap({
      outcome: "failed",
      failedStep: "create",
      error: "Name is taken",
      steps: [{ key: "create", status: "failed" }],
    });

    expect(screen.getByText("Name is taken")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Back to form" }));
    expect(onBackToForm).toHaveBeenCalled();
  });

  it("offers a fresh upload when the upload failed", () => {
    wrap({
      outcome: "failed",
      failedStep: "upload",
      characterId: "char-1",
      steps: [
        { key: "create", status: "done" },
        { key: "upload", status: "failed" },
        { key: "setMain", status: "todo" },
      ],
    });

    expect(screen.getByRole("link", { name: "Upload again" })).toHaveAttribute(
      "href",
      "/image/upload?character=char-1",
    );
    expect(
      screen.getByRole("link", { name: "Go to character" }),
    ).toHaveAttribute("href", "/character/char-1");
  });

  it("points at the uploaded image rather than a re-upload when only setting it failed", () => {
    wrap({
      outcome: "failed",
      failedStep: "setMain",
      characterId: "char-1",
      mediaId: "media-1",
      steps: [
        { key: "create", status: "done" },
        { key: "upload", status: "done" },
        { key: "setMain", status: "failed" },
      ],
    });

    expect(
      screen.getByRole("link", { name: "Open the image" }),
    ).toHaveAttribute("href", "/media/media-1");
    expect(screen.queryByRole("link", { name: "Upload again" })).toBeNull();
  });
});
