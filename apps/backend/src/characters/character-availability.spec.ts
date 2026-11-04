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

  it("reports a cleared price as null", () => {
    const before = { ...closed, price: new Prisma.Decimal("5") };

    expect(availabilityChange(before, closed)).toEqual({
      added: [],
      removed: [],
      priceChanged: true,
      price: null,
    });
  });
});
