/**
 * The site-admin page that looks up Discord names for pending owners, so staff
 * can find last year's event winners by name (#445).
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { MockedProvider, type MockedResponse } from "@apollo/client/testing";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "@chardb/ui";
import {
  DiscordNameBackfillStatusDocument,
  RunDiscordNameBackfillDocument,
} from "../../generated/graphql";
import { DiscordNameBackfillPage } from "../DiscordNameBackfillPage";

const status = (overrides: Partial<Record<string, unknown>> = {}) => ({
  __typename: "DiscordNameBackfillStatus" as const,
  running: false,
  total: 0,
  processed: 0,
  updated: 0,
  failed: 0,
  startedAt: null,
  finishedAt: null,
  ...overrides,
});

const statusMock = (s: ReturnType<typeof status>): MockedResponse => ({
  request: { query: DiscordNameBackfillStatusDocument },
  result: { data: { discordNameBackfillStatus: s } },
});

const renderPage = (mocks: MockedResponse[]) =>
  render(
    <MockedProvider mocks={mocks}>
      <ThemeProvider theme={lightTheme}>
        <MemoryRouter>
          <DiscordNameBackfillPage />
        </MemoryRouter>
      </ThemeProvider>
    </MockedProvider>,
  );

describe("DiscordNameBackfillPage", () => {
  it("offers to start when nothing has run", async () => {
    renderPage([statusMock(status())]);

    expect(
      await screen.findByRole("button", { name: "Look up Discord names" }),
    ).toBeEnabled();
    expect(screen.queryByTestId("backfill-progress")).toBeNull();
  });

  it("starts a run and shows its progress", async () => {
    const running = status({
      running: true,
      total: 124,
      processed: 3,
      updated: 3,
      startedAt: "2026-10-28T12:00:00.000Z",
    });
    renderPage([
      statusMock(status()),
      {
        request: { query: RunDiscordNameBackfillDocument },
        result: { data: { runDiscordNameBackfill: running } },
      },
      statusMock(running),
    ]);

    await userEvent.click(
      await screen.findByRole("button", { name: "Look up Discord names" }),
    );

    const progress = await screen.findByTestId("backfill-progress");
    expect(progress).toHaveTextContent("3 of 124");
    expect(
      screen.getByRole("button", { name: "Looking up names…" }),
    ).toBeDisabled();
  });

  it("shows what a finished run found", async () => {
    renderPage([
      statusMock(
        status({
          total: 124,
          processed: 124,
          updated: 120,
          failed: 4,
          startedAt: "2026-10-28T12:00:00.000Z",
          finishedAt: "2026-10-28T12:01:00.000Z",
        }),
      ),
    ]);

    const progress = await screen.findByTestId("backfill-progress");
    expect(progress).toHaveTextContent("124 of 124");
    expect(screen.getByTestId("backfill-named")).toHaveTextContent("120");
    expect(screen.getByTestId("backfill-not-found")).toHaveTextContent("4");
    // Rerunnable, to pick up names people have changed since.
    expect(
      screen.getByRole("button", { name: "Look up Discord names" }),
    ).toBeEnabled();
  });
});
