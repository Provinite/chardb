import { Prisma } from "@chardb/database";
import {
  availabilityChange,
  CharacterAvailability,
  type CharacterAdvertisement,
} from "./character-availability";

const closed: CharacterAdvertisement = {
  isSellable: false,
  isSellableForCoin: false,
  isTradeable: false,
  isTradeableForArt: false,
  isOpenToOffers: false,
  isFreebie: false,
  price: null,
};

describe("availabilityChange", () => {
  it("is null when nothing advertised changed", () => {
    expect(availabilityChange(closed, { ...closed })).toBeNull();
  });

  it("names the flags that turned on and off", () => {
    const before = { ...closed, isOpenToOffers: true, isFreebie: true };
    const after = { ...closed, isTradeable: true, isFreebie: true };

    expect(availabilityChange(before, after)).toEqual({
      added: [CharacterAvailability.TRADE_CHARACTERS],
      removed: [CharacterAvailability.OFFERS],
      priceChanged: false,
      price: null,
    });
  });

  it("reports a new price to two places", () => {
    const before = {
      ...closed,
      isSellable: true,
      price: new Prisma.Decimal("10"),
    };
    const after = { ...before, price: new Prisma.Decimal("12.5") };

    expect(availabilityChange(before, after)).toEqual({
      added: [],
      removed: [],
      priceChanged: true,
      price: "12.50",
    });
  });

  it("treats an equal price written differently as unchanged", () => {
    const before = { ...closed, price: new Prisma.Decimal("12.5") };
    const after = { ...closed, price: new Prisma.Decimal("12.50") };

    expect(availabilityChange(before, after)).toBeNull();
  });

  it("ignores a price on a character not for sale, where it is not shown", () => {
    const before = { ...closed, price: new Prisma.Decimal("10") };
    const after = { ...closed, price: new Prisma.Decimal("40") };

    expect(availabilityChange(before, after)).toBeNull();
  });

  it("does not call a price new when the sale itself ended", () => {
    const before = {
      ...closed,
      isSellable: true,
      price: new Prisma.Decimal("20"),
    };
    const after = { ...closed, price: new Prisma.Decimal("30") };

    expect(availabilityChange(before, after)).toEqual({
      added: [],
      removed: [CharacterAvailability.FOR_SALE],
      priceChanged: false,
      price: "30.00",
    });
  });

  it("reports a cleared price as null", () => {
    const before = {
      ...closed,
      isSellable: true,
      price: new Prisma.Decimal("5"),
    };
    const after = { ...closed, isSellable: true };

    expect(availabilityChange(before, after)).toEqual({
      added: [],
      removed: [],
      priceChanged: true,
      price: null,
    });
  });
});
