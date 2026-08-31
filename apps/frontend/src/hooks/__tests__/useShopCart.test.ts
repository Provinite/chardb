import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useShopCart, MAX_UNITS_PER_ITEM } from "../useShopCart";

/**
 * The cart is the one piece of shop state the server does not hold, so it is
 * the one piece nothing else can correct. Everything here is about it agreeing
 * with the rules checkout will apply anyway -- a cart that can be filled with
 * something the server refuses is a cart that fails at the confirm button.
 */

const COMMUNITY = "comm-1";
const OTHER_COMMUNITY = "comm-2";
const POTION = "item-potion";
const LOCKET = "item-locket";
const CHEAP = "price-cheap";
const MIXED = "price-mixed";

const keyFor = (communityId: string) => `chardb.shopCart.${communityId}`;

/**
 * A localStorage that actually stores.
 *
 * `setupTests.ts` stubs the global one with `getItem: () => null`, which is
 * fine for components that only ever read a token, but makes it impossible to
 * test the half of this hook that exists to survive a reload. Vitest isolates
 * test files, so replacing it here reaches nothing else.
 */
beforeEach(() => {
  const store = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    },
    writable: true,
  });
});

describe("useShopCart", () => {
  it("starts empty", () => {
    const { result } = renderHook(() => useShopCart(COMMUNITY));
    expect(result.current.lines).toEqual([]);
    expect(result.current.count).toBe(0);
  });

  it("counts units, not lines", () => {
    const { result } = renderHook(() => useShopCart(COMMUNITY));

    act(() => result.current.add(POTION, CHEAP, 2));
    act(() => result.current.add(LOCKET, CHEAP, 1));

    expect(result.current.lines).toHaveLength(2);
    expect(result.current.count).toBe(3);
  });

  it("merges the same listing at the same price", () => {
    const { result } = renderHook(() => useShopCart(COMMUNITY));

    act(() => result.current.add(POTION, CHEAP, 1));
    act(() => result.current.add(POTION, CHEAP, 1));

    expect(result.current.lines).toEqual([
      { shopItemId: POTION, shopPriceId: CHEAP, quantity: 2 },
    ]);
  });

  it("keeps the same listing at two prices on separate lines", () => {
    // They are genuinely different purchases, and collapsing them would lose
    // which option was chosen -- which is the only thing the cart carries.
    const { result } = renderHook(() => useShopCart(COMMUNITY));

    act(() => result.current.add(POTION, CHEAP, 1));
    act(() => result.current.add(POTION, MIXED, 1));

    expect(result.current.lines).toHaveLength(2);
    expect(result.current.count).toBe(2);
  });

  it("removes a line when its quantity reaches zero", () => {
    const { result } = renderHook(() => useShopCart(COMMUNITY));

    act(() => result.current.add(POTION, CHEAP, 2));
    act(() => result.current.setQuantity(POTION, CHEAP, 0));

    expect(result.current.lines).toEqual([]);
  });

  it("treats a negative quantity as a removal, not a negative line", () => {
    const { result } = renderHook(() => useShopCart(COMMUNITY));

    act(() => result.current.add(POTION, CHEAP, 2));
    act(() => result.current.setQuantity(POTION, CHEAP, -5));

    expect(result.current.lines).toEqual([]);
  });

  it("clears everything", () => {
    const { result } = renderHook(() => useShopCart(COMMUNITY));

    act(() => result.current.add(POTION, CHEAP, 2));
    act(() => result.current.add(LOCKET, CHEAP, 1));
    act(() => result.current.clear());

    expect(result.current.lines).toEqual([]);
    expect(result.current.count).toBe(0);
  });

  describe("the per-listing cap", () => {
    it("stops adding past the cap instead of overshooting", () => {
      const { result } = renderHook(() => useShopCart(COMMUNITY));

      for (let i = 0; i < MAX_UNITS_PER_ITEM + 5; i++) {
        act(() => result.current.add(POTION, CHEAP, 1));
      }

      expect(result.current.count).toBe(MAX_UNITS_PER_ITEM);
    });

    it("clamps a quantity typed straight into the box", () => {
      const { result } = renderHook(() => useShopCart(COMMUNITY));

      act(() => result.current.add(POTION, CHEAP, 1));
      act(() => result.current.setQuantity(POTION, CHEAP, 999));

      expect(result.current.lines[0].quantity).toBe(MAX_UNITS_PER_ITEM);
    });

    it("counts the cap across price options, not per line", () => {
      // The server caps the listing. Six at one option and six at another is
      // twelve potions, and checkout would refuse the lot.
      const { result } = renderHook(() => useShopCart(COMMUNITY));

      act(() => result.current.add(POTION, CHEAP, 6));
      act(() => result.current.add(POTION, MIXED, 6));

      const potions = result.current.lines
        .filter((l) => l.shopItemId === POTION)
        .reduce((total, l) => total + l.quantity, 0);
      expect(potions).toBe(MAX_UNITS_PER_ITEM);
    });

    it("caps each listing separately", () => {
      const { result } = renderHook(() => useShopCart(COMMUNITY));

      act(() => result.current.add(POTION, CHEAP, MAX_UNITS_PER_ITEM));
      act(() => result.current.add(LOCKET, CHEAP, MAX_UNITS_PER_ITEM));

      expect(result.current.count).toBe(MAX_UNITS_PER_ITEM * 2);
    });

    it("adds nothing at all once a listing is already at the cap", () => {
      const { result } = renderHook(() => useShopCart(COMMUNITY));

      act(() => result.current.add(POTION, CHEAP, MAX_UNITS_PER_ITEM));
      act(() => result.current.add(POTION, MIXED, 1));

      // Not a second line holding zero.
      expect(result.current.lines).toHaveLength(1);
    });
  });

  describe("what it keeps between visits", () => {
    it("survives a remount", () => {
      const first = renderHook(() => useShopCart(COMMUNITY));
      act(() => first.result.current.add(POTION, CHEAP, 2));

      const second = renderHook(() => useShopCart(COMMUNITY));
      expect(second.result.current.count).toBe(2);
    });

    it("keeps one cart per community", () => {
      // Coin does not travel between communities, so nor should a cart.
      const first = renderHook(() => useShopCart(COMMUNITY));
      act(() => first.result.current.add(POTION, CHEAP, 2));

      const second = renderHook(() => useShopCart(OTHER_COMMUNITY));
      expect(second.result.current.lines).toEqual([]);
    });

    it("is empty with no community, rather than reading somebody else's", () => {
      const { result } = renderHook(() => useShopCart(undefined));
      expect(result.current.lines).toEqual([]);
    });
  });

  describe("what it refuses to read back", () => {
    // Anything can be in localStorage: another tab, an older version of this
    // code, or a person with the devtools open.

    it("ignores stored junk that is not a list", () => {
      window.localStorage.setItem(keyFor(COMMUNITY), '{"nope":true}');
      const { result } = renderHook(() => useShopCart(COMMUNITY));
      expect(result.current.lines).toEqual([]);
    });

    it("ignores unparseable storage", () => {
      window.localStorage.setItem(keyFor(COMMUNITY), "not json at all");
      const { result } = renderHook(() => useShopCart(COMMUNITY));
      expect(result.current.lines).toEqual([]);
    });

    it("drops malformed entries but keeps the good ones", () => {
      window.localStorage.setItem(
        keyFor(COMMUNITY),
        JSON.stringify([
          { shopItemId: POTION, shopPriceId: CHEAP, quantity: 2 },
          { shopItemId: LOCKET, quantity: 1 },
          { shopItemId: LOCKET, shopPriceId: CHEAP, quantity: "3" },
          { shopItemId: LOCKET, shopPriceId: CHEAP, quantity: 1.5 },
          { shopItemId: LOCKET, shopPriceId: CHEAP, quantity: 0 },
        ]),
      );

      const { result } = renderHook(() => useShopCart(COMMUNITY));
      expect(result.current.lines).toEqual([
        { shopItemId: POTION, shopPriceId: CHEAP, quantity: 2 },
      ]);
    });

    it("drops a hand-edited quantity above the cap", () => {
      // The server refuses it anyway; the point is that the cart never shows
      // a total the buyer cannot actually spend.
      window.localStorage.setItem(
        keyFor(COMMUNITY),
        JSON.stringify([
          {
            shopItemId: POTION,
            shopPriceId: CHEAP,
            quantity: MAX_UNITS_PER_ITEM + 1,
          },
        ]),
      );

      const { result } = renderHook(() => useShopCart(COMMUNITY));
      expect(result.current.lines).toEqual([]);
    });
  });
});
