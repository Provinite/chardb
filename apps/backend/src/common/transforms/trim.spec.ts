import { plainToInstance, type ClassConstructor } from "class-transformer";
import { validate } from "class-validator";
import {
  CreateCharacterInput,
  UpdateCharacterProfileInput,
} from "../../characters/dto/character.dto";
import { RedeemMyoTicketInput } from "../../myo/dto/myo.dto";
import {
  CreateSpeciesInput,
  UpdateSpeciesInput,
} from "../../species/dto/species.dto";

/**
 * Names are typed back to confirm destructive actions (#430), so a stored
 * stray space makes them unconfirmable. Every input that sets a character or
 * species name trims it.
 */
const cases: [string, ClassConstructor<{ name?: string }>][] = [
  ["CreateCharacterInput", CreateCharacterInput],
  ["UpdateCharacterProfileInput", UpdateCharacterProfileInput],
  ["RedeemMyoTicketInput", RedeemMyoTicketInput],
  ["CreateSpeciesInput", CreateSpeciesInput],
  ["UpdateSpeciesInput", UpdateSpeciesInput],
];

describe.each(cases)("%s name", (_, Input) => {
  it("trims surrounding whitespace", () => {
    const input = plainToInstance(Input, { name: "  Pinefall \t" });
    expect(input.name).toBe("Pinefall");
  });

  it("keeps inner spacing as typed", () => {
    const input = plainToInstance(Input, { name: " Ember  Wisp " });
    expect(input.name).toBe("Ember  Wisp");
  });

  it("rejects a name that is only whitespace", async () => {
    const input = plainToInstance(Input, { name: "   " });
    const errors = await validate(input);
    expect(errors.map((e) => e.property)).toContain("name");
  });
});
