/**
 * The image column on the character create and edit forms (#406).
 */
import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "@chardb/ui";
import {
  CharacterImagePicker,
  CharacterMainImagePreview,
  type PickedCharacterImage,
} from "../CharacterImagePanel";
import { isPickedImageBlocked } from "../../../lib/attachMainImage";

beforeAll(() => {
  // jsdom has no object URLs.
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});

const wrap = (ui: React.ReactElement) =>
  render(
    <MemoryRouter>
      <ThemeProvider theme={lightTheme}>{ui}</ThemeProvider>
    </MemoryRouter>,
  );

const picked = (
  overrides: Partial<PickedCharacterImage> = {},
): PickedCharacterImage => ({
  file: new File(["x"], "portrait.png", { type: "image/png" }),
  preview: "blob:picked",
  nsfwSensitive: false,
  sensitiveContentDescription: "",
  ...overrides,
});

describe("CharacterImagePicker", () => {
  it("hands over the picked file with no flags set", async () => {
    const onChange = vi.fn();
    const { container } = wrap(
      <CharacterImagePicker value={null} onChange={onChange} />,
    );

    const input = container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error("no file input");
    const file = new File(["x"], "portrait.png", { type: "image/png" });
    await userEvent.upload(input, file);

    expect(onChange).toHaveBeenCalledWith({
      file,
      preview: "blob:preview",
      nsfwSensitive: false,
      sensitiveContentDescription: "",
    });
  });

  it("shows the picked image and can remove it", async () => {
    const onChange = vi.fn();
    wrap(<CharacterImagePicker value={picked()} onChange={onChange} />);

    expect(screen.getByRole("img", { name: "portrait.png" })).toHaveAttribute(
      "src",
      "blob:picked",
    );

    await userEvent.click(
      screen.getByRole("button", { name: /remove image/i }),
    );
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("records a content flag and says flagged images are refused", async () => {
    const onChange = vi.fn();
    const { rerender } = wrap(
      <CharacterImagePicker value={picked()} onChange={onChange} />,
    );

    expect(screen.queryByText(/not accepted at this time/i)).toBeNull();

    await userEvent.click(
      screen.getByRole("checkbox", { name: "Sensitive Content" }),
    );
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ nsfwSensitive: true }),
    );

    rerender(
      <MemoryRouter>
        <ThemeProvider theme={lightTheme}>
          <CharacterImagePicker
            value={picked({ nsfwSensitive: true })}
            onChange={onChange}
          />
        </ThemeProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText(/not accepted at this time/i)).toBeVisible();
  });

  it("offers no flags the backend does not store", () => {
    wrap(<CharacterImagePicker value={picked()} onChange={vi.fn()} />);

    expect(screen.queryByRole("checkbox", { name: "Nudity" })).toBeNull();
    expect(screen.queryByRole("checkbox", { name: "Gore" })).toBeNull();
  });

  it("asks for a description once sensitive content is ticked", () => {
    wrap(
      <CharacterImagePicker
        value={picked({ nsfwSensitive: true })}
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByPlaceholderText(/describe the sensitive content/i),
    ).toBeVisible();
  });

  it("offers to frame the thumbnail, centred until one is chosen", async () => {
    wrap(<CharacterImagePicker value={picked()} onChange={vi.fn()} />);

    expect(screen.getByText("Thumbnail: centre of the image")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Choose crop" }));
    expect(await screen.findByText("Frame the thumbnail")).toBeVisible();
  });

  it("says when the thumbnail has been framed", () => {
    wrap(
      <CharacterImagePicker
        value={picked({
          thumbnailCrop: { x: 0, y: 0, width: 10, height: 10 },
        })}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Thumbnail: your crop")).toBeVisible();
    expect(screen.getByRole("button", { name: "Change crop" })).toBeVisible();
  });

  it("explains why it cannot take an image instead of offering one", () => {
    const { container } = wrap(
      <CharacterImagePicker
        value={null}
        onChange={vi.fn()}
        disabledReason="Your role here cannot upload images."
      />,
    );

    expect(
      screen.getByText("Your role here cannot upload images."),
    ).toBeVisible();
    expect(container.querySelector('input[type="file"]')).toBeNull();
  });
});

describe("isPickedImageBlocked", () => {
  it("blocks only a flagged image", () => {
    expect(isPickedImageBlocked(null)).toBe(false);
    expect(isPickedImageBlocked(picked())).toBe(false);
    expect(isPickedImageBlocked(picked({ nsfwSensitive: true }))).toBe(true);
  });
});

describe("CharacterMainImagePreview", () => {
  const main = {
    mediaId: "media-1",
    url: "https://img/main.png",
    thumbnailUrl: "https://img/thumb.png",
    altText: "Moth in a hat",
  };

  it("shows the current main image and its thumbnail", () => {
    wrap(
      <CharacterMainImagePreview
        image={main}
        uploadHref="/image/upload?character=char-1"
      />,
    );

    expect(screen.getByRole("img", { name: "Moth in a hat" })).toHaveAttribute(
      "src",
      "https://img/main.png",
    );
    expect(
      screen.getByRole("img", { name: "Thumbnail of Moth in a hat" }),
    ).toHaveAttribute("src", "https://img/thumb.png");
  });

  it("links to the image's page to adjust its framing", () => {
    wrap(
      <CharacterMainImagePreview
        image={main}
        uploadHref="/image/upload?character=char-1"
      />,
    );

    expect(
      screen.getByRole("link", { name: /adjust framing/i }),
    ).toHaveAttribute("href", "/media/media-1");
  });

  it("says when there is none and links to the upload page", () => {
    wrap(
      <CharacterMainImagePreview
        image={null}
        uploadHref="/image/upload?character=char-1"
      />,
    );

    expect(screen.getByText(/no main image yet/i)).toBeVisible();
    expect(
      screen.getByRole("link", { name: /upload a new image/i }),
    ).toHaveAttribute("href", "/image/upload?character=char-1");
  });
});
