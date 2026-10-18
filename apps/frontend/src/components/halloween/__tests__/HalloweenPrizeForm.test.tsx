/**
 * Adding and editing Halloween prizes, as `/prize admin add` used to.
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

import {
  CreateHalloweenPrizeDocument,
  HalloweenPrizeDelivery,
  HalloweenPrizeOptionsDocument,
  UpdateHalloweenPrizeDocument,
} from "../../../generated/graphql";
import { HalloweenPrizeForm } from "../HalloweenPrizeForm";

const COMMUNITY_ID = "11111111-1111-4111-8111-111111111111";

const prizeView = (overrides: Record<string, unknown> = {}) => ({
  __typename: "HalloweenPrizeView" as const,
  id: "adopt",
  name: "Spooky Adopt",
  initialStock: 2,
  currentStock: 2,
  weight: 10,
  image: "https://i.test/adopt.png",
  delivery: HalloweenPrizeDelivery.Staff,
  itemTypeId: null,
  characterId: null,
  ...overrides,
});

const optionsMock = (search: string | null): MockedResponse => ({
  request: {
    query: HalloweenPrizeOptionsDocument,
    variables: { communityId: COMMUNITY_ID, search },
  },
  result: {
    data: {
      halloweenPrizeOptions: {
        __typename: "HalloweenPrizeOptions",
        itemTypes: [
          {
            __typename: "HalloweenPrizeOption",
            id: "it-1",
            name: "Edit Kit",
            image: "https://cdn.test/kit.webp",
          },
        ],
        characters: [
          {
            __typename: "HalloweenPrizeOption",
            id: "ch-1",
            name: "Free Ghost",
            image: null,
          },
        ],
      },
    },
  },
});

const renderForm = (
  props: Partial<React.ComponentProps<typeof HalloweenPrizeForm>>,
  mocks: MockedResponse[],
) => {
  const onSaved = vi.fn();
  render(
    <MockedProvider mocks={mocks}>
      <ThemeProvider theme={lightTheme}>
        <HalloweenPrizeForm
          communityId={COMMUNITY_ID}
          prize={null}
          onSaved={onSaved}
          onCancel={vi.fn()}
          {...props}
        />
      </ThemeProvider>
    </MockedProvider>,
  );
  return onSaved;
};

const fillBasics = async () => {
  await userEvent.type(screen.getByLabelText(/Short name/), "edit-kit");
  await userEvent.type(screen.getByLabelText(/^Name/), "Edit Kit");
  const stock = screen.getByLabelText(/^Stock/);
  await userEvent.clear(stock);
  await userEvent.type(stock, "300");
};

describe("HalloweenPrizeForm", () => {
  describe("adding", () => {
    it("adds a prize staff hand over, with an image URL", async () => {
      const result = vi.fn(() => ({
        data: { createHalloweenPrize: prizeView() },
      }));
      const onSaved = renderForm({}, [
        {
          request: {
            query: CreateHalloweenPrizeDocument,
            variables: {
              communityId: COMMUNITY_ID,
              input: {
                id: "adopt",
                name: "Spooky Adopt",
                stock: 2,
                weight: 10,
                image: "https://i.test/adopt.png",
              },
            },
          },
          result,
        },
      ]);
      await userEvent.type(screen.getByLabelText(/Short name/), "adopt");
      await userEvent.type(screen.getByLabelText(/^Name/), "Spooky Adopt");
      const stock = screen.getByLabelText(/^Stock/);
      await userEvent.clear(stock);
      await userEvent.type(stock, "2");
      await userEvent.type(
        screen.getByLabelText(/Image URL/),
        "https://i.test/adopt.png",
      );
      await userEvent.click(screen.getByRole("button", { name: "Add prize" }));
      await vi.waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(result).toHaveBeenCalled();
    });

    it("picks a chardb item, which brings its own image", async () => {
      const result = vi.fn(() => ({
        data: {
          createHalloweenPrize: prizeView({
            id: "edit-kit",
            delivery: HalloweenPrizeDelivery.ChardbItem,
            itemTypeId: "it-1",
          }),
        },
      }));
      const onSaved = renderForm({}, [
        optionsMock(null),
        optionsMock("edit"),
        {
          request: {
            query: CreateHalloweenPrizeDocument,
            variables: {
              communityId: COMMUNITY_ID,
              input: {
                id: "edit-kit",
                name: "Edit Kit",
                stock: 300,
                weight: 10,
                itemTypeId: "it-1",
              },
            },
          },
          result,
        },
      ]);
      await fillBasics();
      await userEvent.click(screen.getByLabelText("A chardb item"));
      expect(screen.queryByLabelText(/Image URL/)).not.toBeInTheDocument();

      await userEvent.type(screen.getByLabelText(/Search item types/), "edit");
      await userEvent.click(screen.getByRole("button", { name: "Search" }));
      await userEvent.click(
        await screen.findByRole("button", { name: /Edit Kit/ }),
      );
      expect(screen.getByText(/Selected: Edit Kit/)).toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "Add prize" }));
      await vi.waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(result).toHaveBeenCalled();
    });

    it("picks a chardb character", async () => {
      const result = vi.fn(() => ({
        data: {
          createHalloweenPrize: prizeView({
            delivery: HalloweenPrizeDelivery.ChardbCharacter,
            characterId: "ch-1",
          }),
        },
      }));
      const onSaved = renderForm({}, [
        optionsMock(null),
        {
          request: {
            query: CreateHalloweenPrizeDocument,
            variables: {
              communityId: COMMUNITY_ID,
              input: {
                id: "edit-kit",
                name: "Edit Kit",
                stock: 300,
                weight: 10,
                characterId: "ch-1",
              },
            },
          },
          result,
        },
      ]);
      await fillBasics();
      await userEvent.click(screen.getByLabelText("A chardb character"));
      await userEvent.click(
        await screen.findByRole("button", { name: /Free Ghost/ }),
      );
      await userEvent.click(screen.getByRole("button", { name: "Add prize" }));
      await vi.waitFor(() => expect(onSaved).toHaveBeenCalled());
    });

    it("needs a pick before a chardb prize can be added", async () => {
      renderForm({}, [optionsMock(null)]);
      await fillBasics();
      await userEvent.click(screen.getByLabelText("A chardb item"));
      expect(screen.getByRole("button", { name: "Add prize" })).toBeDisabled();
    });

    it("shows why the server refused", async () => {
      renderForm({}, [
        {
          request: {
            query: CreateHalloweenPrizeDocument,
            variables: {
              communityId: COMMUNITY_ID,
              input: {
                id: "edit-kit",
                name: "Edit Kit",
                stock: 300,
                weight: 10,
                image: "https://i.test/kit.png",
              },
            },
          },
          result: {
            errors: [
              new GraphQLError('There is already a prize called "edit-kit"'),
            ],
          },
        },
      ]);
      await fillBasics();
      await userEvent.type(
        screen.getByLabelText(/Image URL/),
        "https://i.test/kit.png",
      );
      await userEvent.click(screen.getByRole("button", { name: "Add prize" }));
      expect(
        await screen.findByText('There is already a prize called "edit-kit"'),
      ).toBeInTheDocument();
    });
  });

  describe("editing", () => {
    it("changes the stock left and the weight", async () => {
      const result = vi.fn(() => ({
        data: {
          updateHalloweenPrize: prizeView({ currentStock: 10, weight: 3 }),
        },
      }));
      const onSaved = renderForm({ prize: prizeView({ currentStock: 1 }) }, [
        {
          request: {
            query: UpdateHalloweenPrizeDocument,
            variables: {
              communityId: COMMUNITY_ID,
              prizeId: "adopt",
              input: {
                name: "Spooky Adopt",
                currentStock: 10,
                weight: 3,
                image: "https://i.test/adopt.png",
              },
            },
          },
          result,
        },
      ]);
      expect(screen.getByLabelText(/Short name/)).toBeDisabled();
      const stock = screen.getByLabelText(/^Stock left/);
      expect(stock).toHaveValue(1);
      await userEvent.clear(stock);
      await userEvent.type(stock, "10");
      const weight = screen.getByLabelText(/^Weight/);
      await userEvent.clear(weight);
      await userEvent.type(weight, "3");
      await userEvent.click(screen.getByRole("button", { name: "Save prize" }));
      await vi.waitFor(() => expect(onSaved).toHaveBeenCalled());
      expect(result).toHaveBeenCalled();
    });

    it("does not offer an image URL for a chardb prize", () => {
      renderForm(
        {
          prize: prizeView({
            image: "https://cdn.test/kit.webp",
            delivery: HalloweenPrizeDelivery.ChardbItem,
            itemTypeId: "it-1",
          }),
        },
        [],
      );
      expect(screen.queryByLabelText(/Image URL/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText("A chardb item")).not.toBeInTheDocument();
    });
  });
});
