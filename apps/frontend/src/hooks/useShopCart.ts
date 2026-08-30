import { useCallback, useEffect, useState } from "react";

/**
 * A shop cart, held in the browser.
 *
 * Client-side on purpose. A server-side cart needs tables, sync, and a story
 * for what happens when a listing changes underneath one — for a feature where
 * nobody expects their basket to follow them to another device.
 *
 * It holds ids and a chosen price option, never amounts. Everything that
 * matters — what it costs, whether it is affordable, whether there is stock —
 * is decided at checkout against the server's own copy. A cart is a list of
 * intentions, not a quote.
 */

export interface CartLine {
  shopItemId: string;
  shopPriceId: string;
  quantity: number;
}

const KEY_PREFIX = "chardb.shopCart.";

/**
 * How many of one listing a single checkout may buy. Mirrors the server's
 * `MAX_UNITS_PER_ITEM`; it is the server's rule, this just stops the cart
 * asking for something it will be refused.
 */
export const MAX_UNITS_PER_ITEM = 10;

/**
 * The most this line may hold without the listing exceeding the cap.
 *
 * Counted across price options, not per line, because the cap is on the
 * listing: five potions bought one way and six bought another is eleven
 * potions, which is what the server will say too.
 */
function clampForItem(
  lines: CartLine[],
  shopItemId: string,
  shopPriceId: string,
  desired: number,
): number {
  const otherOptions = lines
    .filter((l) => l.shopItemId === shopItemId && l.shopPriceId !== shopPriceId)
    .reduce((total, l) => total + l.quantity, 0);
  return Math.max(0, Math.min(desired, MAX_UNITS_PER_ITEM - otherOptions));
}

/** Carts are per community: coin does not travel between them, so nor should carts. */
const keyFor = (communityId: string) => `${KEY_PREFIX}${communityId}`;

function read(communityId: string): CartLine[] {
  try {
    const raw = window.localStorage.getItem(keyFor(communityId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Anything can be in localStorage -- another tab, an older version of this
    // code, a person with the devtools open. Only keep entries that still have
    // the shape this expects.
    return parsed.filter(
      (line): line is CartLine =>
        typeof line === "object" &&
        line !== null &&
        typeof (line as CartLine).shopItemId === "string" &&
        typeof (line as CartLine).shopPriceId === "string" &&
        Number.isInteger((line as CartLine).quantity) &&
        (line as CartLine).quantity > 0 &&
        (line as CartLine).quantity <= MAX_UNITS_PER_ITEM,
    );
  } catch {
    // A private window, cleared site data, or storage disabled entirely. An
    // empty cart is a perfectly good answer.
    return [];
  }
}

function write(communityId: string, lines: CartLine[]) {
  try {
    window.localStorage.setItem(keyFor(communityId), JSON.stringify(lines));
  } catch {
    // Nothing to do and nothing worth telling the buyer: the cart still works
    // for this page view, it just will not survive a reload.
  }
}

export function useShopCart(communityId: string | undefined) {
  const [lines, setLines] = useState<CartLine[]>([]);

  useEffect(() => {
    setLines(communityId ? read(communityId) : []);
  }, [communityId]);

  const persist = useCallback(
    (next: CartLine[]) => {
      setLines(next);
      if (communityId) write(communityId, next);
    },
    [communityId],
  );

  /**
   * Add to the cart, merging on item AND price.
   *
   * Two of the same potion at different price options are two lines, not one:
   * they are genuinely different purchases, and collapsing them would lose
   * which option was chosen.
   */
  const add = useCallback(
    (shopItemId: string, shopPriceId: string, quantity = 1) => {
      const existing = lines.find(
        (l) => l.shopItemId === shopItemId && l.shopPriceId === shopPriceId,
      );
      const wanted = (existing?.quantity ?? 0) + quantity;
      const capped = clampForItem(lines, shopItemId, shopPriceId, wanted);
      if (capped === (existing?.quantity ?? 0)) return;

      persist(
        existing
          ? lines.map((l) => (l === existing ? { ...l, quantity: capped } : l))
          : [...lines, { shopItemId, shopPriceId, quantity: capped }],
      );
    },
    [lines, persist],
  );

  const setQuantity = useCallback(
    (shopItemId: string, shopPriceId: string, quantity: number) => {
      const capped = clampForItem(lines, shopItemId, shopPriceId, quantity);
      persist(
        capped <= 0
          ? lines.filter(
              (l) =>
                !(l.shopItemId === shopItemId && l.shopPriceId === shopPriceId),
            )
          : lines.map((l) =>
              l.shopItemId === shopItemId && l.shopPriceId === shopPriceId
                ? { ...l, quantity: capped }
                : l,
            ),
      );
    },
    [lines, persist],
  );

  const remove = useCallback(
    (shopItemId: string, shopPriceId: string) =>
      setQuantity(shopItemId, shopPriceId, 0),
    [setQuantity],
  );

  const clear = useCallback(() => persist([]), [persist]);

  const count = lines.reduce((total, line) => total + line.quantity, 0);

  return { lines, add, setQuantity, remove, clear, count };
}
