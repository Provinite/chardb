/**
 * The avatar control since #410: an avatar is uploaded, never chosen from
 * your posts, and is never waiting on a moderator.
 */
import { describe, it, expect, vi, afterEach, onTestFinished } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "@chardb/ui";

const toastStub = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("react-hot-toast", () => ({
  default: toastStub,
  toast: toastStub,
  Toaster: () => null,
}));

const apollo = vi.hoisted(() => ({ refetchQueries: vi.fn() }));
vi.mock("@apollo/client", async () => {
  const actual =
    await vi.importActual<typeof import("@apollo/client")>("@apollo/client");
  return {
    ...actual,
    useApolloClient: () => ({ refetchQueries: apollo.refetchQueries }),
  };
});

// The real cropper needs a canvas; this one confirms a fixed square.
vi.mock("../../ThumbnailCropper", () => ({
  ThumbnailCropper: ({
    onConfirm,
  }: {
    onConfirm: (crop: {
      x: number;
      y: number;
      width: number;
      height: number;
    }) => void;
  }) => (
    <button
      type="button"
      onClick={() => onConfirm({ x: 0, y: 0, width: 10, height: 10 })}
    >
      Use this crop
    </button>
  ),
}));

import { AvatarSettings } from "../AvatarSettings";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

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

  /**
   * The upload is what sets the avatar. Once it has answered, a failed
   * refetch afterwards must not be reported as a failed upload -- someone told
   * that would upload again, replacing and deleting the avatar they just set.
   */
  it("reports a successful upload even if the refetch after it fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ id: "image-1" }))),
    );
    // Just the two statics jsdom lacks, so `new URL(...)` keeps working.
    const objectUrls = {
      create: URL.createObjectURL,
      revoke: URL.revokeObjectURL,
    };
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
    onTestFinished(() => {
      URL.createObjectURL = objectUrls.create;
      URL.revokeObjectURL = objectUrls.revoke;
    });
    apollo.refetchQueries.mockRejectedValue(new Error("network down"));

    const { container } = renderSettings(null);
    const input =
      container.querySelector<HTMLInputElement>('input[type="file"]')!;
    fireEvent.change(input, {
      target: {
        files: [new File(["x"], "avatar.png", { type: "image/png" })],
      },
    });
    fireEvent.click(
      await screen.findByRole("button", { name: "Use this crop" }),
    );

    await waitFor(() =>
      expect(toastStub.success).toHaveBeenCalledWith("Avatar updated"),
    );
    expect(toastStub.error).not.toHaveBeenCalled();
  });
});
