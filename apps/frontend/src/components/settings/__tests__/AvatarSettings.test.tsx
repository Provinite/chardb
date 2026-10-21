/**
 * The avatar control since #410: an avatar is uploaded, never chosen from
 * your posts, and is never waiting on a moderator.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "@chardb/ui";

vi.mock("react-hot-toast", () => {
  const stub = { success: vi.fn(), error: vi.fn() };
  return { default: stub, toast: stub, Toaster: () => null };
});

import { AvatarSettings } from "../AvatarSettings";

function renderSettings(
  avatarImage: React.ComponentProps<typeof AvatarSettings>["avatarImage"],
) {
  return render(
    <MockedProvider mocks={[]}>
      <ThemeProvider theme={lightTheme}>
        <AvatarSettings name="Member" avatarImage={avatarImage} />
      </ThemeProvider>
    </MockedProvider>,
  );
}

describe("AvatarSettings", () => {
  it("offers an upload and no picker of existing media", () => {
    renderSettings(null);

    expect(
      screen.getByRole("button", { name: "Upload a picture" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Choose from your media" }),
    ).not.toBeInTheDocument();
  });

  it("never says it is waiting on a moderator", () => {
    renderSettings({
      id: "image-1",
      originalUrl: "https://cdn.test/avatar.png",
      thumbnailUrl: "https://cdn.test/avatar-thumb.png",
    });

    expect(
      screen.queryByText(/waiting on a moderator/i),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });
});
