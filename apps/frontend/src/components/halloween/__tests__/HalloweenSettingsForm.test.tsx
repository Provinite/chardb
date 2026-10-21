/**
 * The event's settings, as `/settings set` used to change them in Discord.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MockedProvider, type MockedResponse } from "@apollo/client/testing";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "@chardb/ui";
import { GraphQLError } from "graphql";

vi.mock("react-hot-toast", () => {
  const stub = { success: vi.fn(), error: vi.fn() };
  return { default: stub, toast: stub, Toaster: () => null };
});

import { UpdateHalloweenSettingsDocument } from "../../../generated/graphql";
import { HalloweenSettingsForm } from "../HalloweenSettingsForm";

const COMMUNITY_ID = "11111111-1111-4111-8111-111111111111";

// The inputs show the viewer's local time; these are whatever instants those
// local times are where the test runs.
const START = new Date("2026-10-01T00:00").toISOString();
const END = new Date("2026-11-01T00:00").toISOString();

const saved = {
  __typename: "HalloweenEventSettings" as const,
  startDate: START,
  endDate: END,
  knocksPerDay: 3,
  resetTime: 6,
  winRate: 0.4,
  winChannel: "300000000000000009",
};

const renderForm = (
  settings: typeof saved | null,
  mocks: MockedResponse[] = [],
  onSaved = vi.fn(),
) => {
  render(
    <MockedProvider mocks={mocks}>
      <ThemeProvider theme={lightTheme}>
        <HalloweenSettingsForm
          communityId={COMMUNITY_ID}
          settings={settings}
          onSaved={onSaved}
        />
      </ThemeProvider>
    </MockedProvider>,
  );
  return onSaved;
};

describe("HalloweenSettingsForm", () => {
  it("starts from sensible defaults the first time", () => {
    renderForm(null);
    expect(screen.getByLabelText(/Knocks per day/)).toHaveValue(2);
    expect(screen.getByLabelText(/Reset hour/)).toHaveValue(6);
    expect(screen.getByLabelText(/Win rate/)).toHaveValue(50);
    expect(
      screen.getByRole("button", { name: "Set up the event" }),
    ).toBeInTheDocument();
  });

  it("shows the current settings, with the win rate as a percentage", () => {
    renderForm(saved);
    expect(screen.getByLabelText(/Starts/)).toHaveValue("2026-10-01T00:00");
    expect(screen.getByLabelText(/Ends/)).toHaveValue("2026-11-01T00:00");
    expect(screen.getByLabelText(/Knocks per day/)).toHaveValue(3);
    expect(screen.getByLabelText(/Win rate/)).toHaveValue(40);
    expect(screen.getByLabelText(/Win channel/)).toHaveValue(
      "300000000000000009",
    );
  });

  it("saves the whole set", async () => {
    const result = vi.fn(() => ({
      data: {
        updateHalloweenSettings: { ...saved, knocksPerDay: 5, winRate: 0.25 },
      },
    }));
    const onSaved = renderForm(saved, [
      {
        request: {
          query: UpdateHalloweenSettingsDocument,
          variables: {
            communityId: COMMUNITY_ID,
            input: {
              startDate: START,
              endDate: END,
              knocksPerDay: 5,
              resetTime: 6,
              winRate: 0.25,
              winChannel: "300000000000000009",
            },
          },
        },
        result,
      },
    ]);

    const knocks = screen.getByLabelText(/Knocks per day/);
    await userEvent.clear(knocks);
    await userEvent.type(knocks, "5");
    const winRate = screen.getByLabelText(/Win rate/);
    await userEvent.clear(winRate);
    await userEvent.type(winRate, "25");
    await userEvent.click(
      screen.getByRole("button", { name: "Save settings" }),
    );

    await vi.waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(result).toHaveBeenCalled();
  });

  it("leaves dates and the win channel out when they are blank", async () => {
    const result = vi.fn(() => ({
      data: {
        updateHalloweenSettings: {
          ...saved,
          startDate: null,
          endDate: null,
          winChannel: null,
        },
      },
    }));
    const onSaved = renderForm(saved, [
      {
        request: {
          query: UpdateHalloweenSettingsDocument,
          variables: {
            communityId: COMMUNITY_ID,
            input: {
              startDate: null,
              endDate: null,
              knocksPerDay: 3,
              resetTime: 6,
              winRate: 0.4,
              winChannel: null,
            },
          },
        },
        result,
      },
    ]);
    await userEvent.clear(screen.getByLabelText(/Starts/));
    await userEvent.clear(screen.getByLabelText(/Ends/));
    await userEvent.clear(screen.getByLabelText(/Win channel/));
    await userEvent.click(
      screen.getByRole("button", { name: "Save settings" }),
    );
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it("shows why the server refused", async () => {
    renderForm(saved, [
      {
        request: {
          query: UpdateHalloweenSettingsDocument,
          variables: {
            communityId: COMMUNITY_ID,
            input: {
              startDate: START,
              endDate: END,
              knocksPerDay: 3,
              resetTime: 6,
              winRate: 0.4,
              winChannel: "300000000000000009",
            },
          },
        },
        result: {
          errors: [
            new GraphQLError(
              "Start date must be before end date if they are both set",
            ),
          ],
        },
      },
    ]);
    await userEvent.click(
      screen.getByRole("button", { name: "Save settings" }),
    );
    expect(
      await screen.findByText(
        "Start date must be before end date if they are both set",
      ),
    ).toBeInTheDocument();
  });
});
