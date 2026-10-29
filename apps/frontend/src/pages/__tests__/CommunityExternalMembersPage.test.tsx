/**
 * External members: people something waits on here without an account,
 * looked up by search or browsed a page at a time (#445).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { MockedProvider } from "@apollo/client/testing";
import { ApolloLink, Observable } from "@apollo/client";
import { ThemeProvider } from "styled-components";
import { MantineProvider } from "@mantine/core";
import { lightTheme } from "@chardb/ui";
import { ExternalAccountProvider } from "../../generated/graphql";
import { CommunityExternalMembersPage } from "../CommunityExternalMembersPage";

const COMMUNITY_ID = "11111111-1111-4111-8111-111111111111";

vi.mock("../../contexts/CommunityHostContext", async () => {
  const actual = await vi.importActual<
    typeof import("../../contexts/CommunityHostContext")
  >("../../contexts/CommunityHostContext");
  return { ...actual, useCommunityId: () => COMMUNITY_ID };
});

type Vars = {
  search?: string | null;
  provider?: ExternalAccountProvider | null;
  limit: number;
  offset: number;
};

const neo = {
  __typename: "ExternalMember" as const,
  itemCount: 2,
  characterCount: 1,
  holder: {
    __typename: "PendingOwnership" as const,
    id: "po1",
    provider: ExternalAccountProvider.Discord,
    providerAccountId: "214000000000009071",
    displayIdentifier: "neo.baka",
    displayName: "Neo the Baka",
  },
};

/** Answers with Neo, and says there is more when browsing the first page. */
const recordingLink = (sent: Vars[]) =>
  new ApolloLink(
    (operation) =>
      new Observable((observer) => {
        const vars = operation.variables as Vars;
        sent.push(vars);
        observer.next({
          data: {
            externalMembers: {
              __typename: "ExternalMembersPage",
              members: [neo],
              hasMore: !vars.search && vars.offset === 0,
            },
          },
        });
        observer.complete();
      }),
  );

const renderPage = (sent: Vars[]) =>
  render(
    <MockedProvider link={recordingLink(sent)}>
      <ThemeProvider theme={lightTheme}>
        <MantineProvider>
          <MemoryRouter>
            <CommunityExternalMembersPage />
          </MemoryRouter>
        </MantineProvider>
      </ThemeProvider>
    </MockedProvider>,
  );

const searchBox = () =>
  screen.getByRole("searchbox", { name: "Search external members" });

describe("CommunityExternalMembersPage", () => {
  it("lists nobody until asked", async () => {
    const sent: Vars[] = [];
    renderPage(sent);

    expect(searchBox()).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(sent).toHaveLength(0);
    expect(screen.queryByTestId("external-member")).toBeNull();
  });

  it("finds someone by name and links to what waits on them", async () => {
    const sent: Vars[] = [];
    renderPage(sent);

    await userEvent.type(searchBox(), "neo");

    const row = await screen.findByTestId("external-member");
    expect(sent.at(-1)).toMatchObject({ search: "neo", offset: 0 });
    expect(row).toHaveTextContent("Neo the Baka (@neo.baka)");
    expect(row).toHaveTextContent("2 items");
    expect(row).toHaveTextContent("1 character");
    expect(screen.getByRole("link", { name: /Neo the Baka/ })).toHaveAttribute(
      "href",
      "/external-members/discord/214000000000009071",
    );
  });

  it("browses everyone a page at a time", async () => {
    const sent: Vars[] = [];
    renderPage(sent);

    await userEvent.click(screen.getByRole("button", { name: "Browse all" }));
    await screen.findByTestId("external-member");
    expect(sent.at(-1)).toMatchObject({ offset: 0 });
    expect(sent.at(-1)?.search ?? undefined).toBeUndefined();

    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(sent.at(-1)).toMatchObject({ offset: 25 }));
    expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled();
  });

  it("narrows to one kind of account", async () => {
    const sent: Vars[] = [];
    renderPage(sent);

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Account" }),
      "DeviantArt",
    );
    await userEvent.type(searchBox(), "art");

    await waitFor(() =>
      expect(sent.at(-1)).toMatchObject({
        search: "art",
        provider: ExternalAccountProvider.Deviantart,
      }),
    );
  });
});
