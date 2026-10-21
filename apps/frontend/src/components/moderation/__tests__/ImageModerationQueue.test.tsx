/**
 * The image moderation queue with no community: the site-wide queue site
 * admins work through (#404), which is the only place an avatar uploaded at
 * the apex can be approved.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MockedProvider, MockedResponse } from "@apollo/client/testing";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "@chardb/ui";

import {
  GlobalMediaModerationQueueDocument,
  ModerationStatus,
} from "../../../generated/graphql";
import { ImageModerationQueue } from "../ImageModerationQueue";

const uploader = {
  __typename: "User" as const,
  id: "user-1",
  username: "member",
  displayName: null,
};

const avatar = {
  __typename: "Media" as const,
  id: "media-1",
  title: "member's avatar",
  characterId: null,
  character: null,
  owner: uploader,
  image: {
    __typename: "Image" as const,
    id: "image-1",
    moderationStatus: ModerationStatus.Pending,
  },
  pendingModerationImage: {
    __typename: "Image" as const,
    id: "image-1",
    originalFilename: "avatar.png",
    originalUrl: "https://cdn.test/avatar.png",
    thumbnailUrl: "https://cdn.test/avatar-thumb.png",
    altText: null,
    width: 200,
    height: 100,
    isNsfw: false,
    moderationStatus: ModerationStatus.Pending,
    createdAt: "2026-10-21T00:00:00.000Z",
    deferredAt: null,
    deferralCount: 0,
    deferralNote: null,
    deferredBy: null,
    uploader,
  },
};

const globalQueue: MockedResponse = {
  request: {
    query: GlobalMediaModerationQueueDocument,
    variables: { first: 12, offset: 0 },
  },
  result: {
    data: {
      globalMediaModerationQueue: {
        __typename: "MediaConnection",
        media: [avatar],
        total: 1,
        hasMore: false,
      },
    },
  },
};

function renderQueue(mocks: MockedResponse[]) {
  return render(
    <MockedProvider mocks={mocks}>
      <ThemeProvider theme={lightTheme}>
        <MemoryRouter>
          <ImageModerationQueue />
        </MemoryRouter>
      </ThemeProvider>
    </MockedProvider>,
  );
}

describe("ImageModerationQueue without a community", () => {
  it("lists the site-wide queue", async () => {
    renderQueue([globalQueue]);

    expect(await screen.findByText("1 pending")).toBeInTheDocument();
    expect(screen.getByAltText("avatar.png")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /approve/i })).toBeEnabled();
  });
});
