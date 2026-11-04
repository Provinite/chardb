import { TestApp } from "../../test/setup-e2e";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { SpeciesVariantsModule } from "./species-variants.module";
import { EnumValuesModule } from "../enum-values/enum-values.module";
import { TraitsModule } from "../traits/traits.module";
import { TraitValueType } from "@chardb/database";

const VARIANTS_BY_SPECIES = `
  query VariantsBySpecies($speciesId: ID!) {
    speciesVariantsBySpecies(speciesId: $speciesId, first: 50) {
      nodes { id name sortOrder }
    }
  }
`;

const CREATE_VARIANT = `
  mutation CreateVariant($input: CreateSpeciesVariantInput!) {
    createSpeciesVariant(createSpeciesVariantInput: $input) { id sortOrder }
  }
`;

const REORDER_VARIANTS = `
  mutation ReorderVariants($input: ReorderSpeciesVariantsInput!) {
    reorderSpeciesVariants(input: $input) { id name sortOrder }
  }
`;

const ENUM_VALUES_BY_TRAIT = `
  query EnumValuesByTrait($traitId: ID!) {
    enumValuesByTrait(traitId: $traitId, first: 50) {
      nodes { id name order }
    }
  }
`;

const REORDER_ENUM_VALUES = `
  mutation ReorderEnumValues($input: ReorderEnumValuesInput!) {
    reorderEnumValues(input: $input) { id name order }
  }
`;

type Named = { name: string };
const names = (rows: Named[]) => rows.map((row) => row.name);

describe("variant and enum value order (e2e)", () => {
  let testApp: TestApp;
  let staffToken: string;
  let memberToken: string;
  let speciesId: string;
  let otherSpeciesId: string;

  /** Variants created a second apart, so their creation order is certain. */
  const createVariants = async (species: string, variantNames: string[]) => {
    const base = Date.now() - variantNames.length * 1000;
    const ids: string[] = [];
    for (const [index, name] of variantNames.entries()) {
      const row = await testApp.getDb().speciesVariant.create({
        data: {
          name,
          speciesId: species,
          sortOrder: variantNames.length - 1 - index,
          createdAt: new Date(base + index * 1000),
        },
      });
      ids.push(row.id);
    }
    return ids;
  };

  const listVariants = async (species: string) => {
    const response = await testApp.authenticatedGraphqlRequest(
      VARIANTS_BY_SPECIES,
      { speciesId: species },
      staffToken,
    );
    expect(response.body.errors).toBeUndefined();
    return response.body.data.speciesVariantsBySpecies.nodes as Named[];
  };

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup({
      imports: [
        DatabaseModule,
        AuthModule,
        SpeciesVariantsModule,
        TraitsModule,
        EnumValuesModule,
      ],
    });
  });

  beforeEach(async () => {
    await testApp.clearDatabase();

    const staff = await testApp.createTestUser();
    const setup = await testApp.createTestCommunitySetup(staff.id);
    speciesId = setup.speciesId;
    staffToken = await testApp.generateTestToken(staff.id);

    const member = await testApp.createTestUser({
      email: "member@test.local",
      username: "plainmember",
    });
    const memberRole = await testApp.createTestRole(setup.communityId, {
      canCreateCharacter: true,
    });
    await testApp.createTestCommunityMember(member.id, memberRole.id);
    memberToken = await testApp.generateTestToken(member.id);

    const otherSpecies = await testApp.createTestSpecies(
      setup.communityId,
      "Other Species",
    );
    otherSpeciesId = otherSpecies.id;
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  describe("speciesVariantsBySpecies", () => {
    it("lists variants by sortOrder rather than by creation date", async () => {
      const [common, uncommon, rare] = await createVariants(speciesId, [
        "Common",
        "Uncommon",
        "Rare",
      ]);
      await testApp.getDb().speciesVariant.update({
        where: { id: common },
        data: { sortOrder: 0 },
      });
      await testApp.getDb().speciesVariant.update({
        where: { id: uncommon },
        data: { sortOrder: 1 },
      });
      await testApp.getDb().speciesVariant.update({
        where: { id: rare },
        data: { sortOrder: 2 },
      });

      expect(names(await listVariants(speciesId))).toEqual([
        "Common",
        "Uncommon",
        "Rare",
      ]);
    });
  });

  describe("createSpeciesVariant", () => {
    it("puts a new variant after the species' existing ones", async () => {
      await createVariants(speciesId, ["Common", "Uncommon"]);

      const response = await testApp.authenticatedGraphqlRequest(
        CREATE_VARIANT,
        { input: { name: "Rare", speciesId } },
        staffToken,
      );

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.createSpeciesVariant.sortOrder).toBe(2);
      expect(names(await listVariants(speciesId)).at(-1)).toBe("Rare");
    });
  });

  describe("reorderSpeciesVariants", () => {
    it("stores the order it is given", async () => {
      const [common, uncommon, rare] = await createVariants(speciesId, [
        "Common",
        "Uncommon",
        "Rare",
      ]);

      const response = await testApp.authenticatedGraphqlRequest(
        REORDER_VARIANTS,
        { input: { speciesId, variantIds: [common, uncommon, rare] } },
        staffToken,
      );

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.reorderSpeciesVariants).toEqual([
        { id: common, name: "Common", sortOrder: 0 },
        { id: uncommon, name: "Uncommon", sortOrder: 1 },
        { id: rare, name: "Rare", sortOrder: 2 },
      ]);
      expect(names(await listVariants(speciesId))).toEqual([
        "Common",
        "Uncommon",
        "Rare",
      ]);
    });

    it("refuses a list that leaves a variant out", async () => {
      const [common, uncommon] = await createVariants(speciesId, [
        "Common",
        "Uncommon",
        "Rare",
      ]);

      const response = await testApp.authenticatedGraphqlRequest(
        REORDER_VARIANTS,
        { input: { speciesId, variantIds: [uncommon, common] } },
        staffToken,
      );

      expect(response.body.errors?.[0].extensions.code).toBe("BAD_REQUEST");
      expect(names(await listVariants(speciesId))).toEqual([
        "Rare",
        "Uncommon",
        "Common",
      ]);
    });

    it("refuses another species' variant", async () => {
      const [common, uncommon] = await createVariants(speciesId, [
        "Common",
        "Uncommon",
      ]);
      const [foreign] = await createVariants(otherSpeciesId, ["Foreign"]);

      const response = await testApp.authenticatedGraphqlRequest(
        REORDER_VARIANTS,
        { input: { speciesId, variantIds: [foreign, common] } },
        staffToken,
      );
      expect(response.body.errors?.[0].extensions.code).toBe("BAD_REQUEST");

      const padded = await testApp.authenticatedGraphqlRequest(
        REORDER_VARIANTS,
        { input: { speciesId, variantIds: [common, uncommon, foreign] } },
        staffToken,
      );
      expect(padded.body.errors?.[0].extensions.code).toBe("BAD_REQUEST");

      const foreignRow = await testApp
        .getDb()
        .speciesVariant.findUniqueOrThrow({ where: { id: foreign } });
      expect(foreignRow.sortOrder).toBe(0);
    });

    it("refuses a list that names a variant twice", async () => {
      const [common, uncommon] = await createVariants(speciesId, [
        "Common",
        "Uncommon",
      ]);

      const response = await testApp.authenticatedGraphqlRequest(
        REORDER_VARIANTS,
        { input: { speciesId, variantIds: [common, common, uncommon] } },
        staffToken,
      );

      expect(response.body.errors?.[0].extensions.code).toBe("BAD_REQUEST");
    });

    it("is staff-only", async () => {
      const [common, uncommon] = await createVariants(speciesId, [
        "Common",
        "Uncommon",
      ]);

      const response = await testApp.authenticatedGraphqlRequest(
        REORDER_VARIANTS,
        { input: { speciesId, variantIds: [common, uncommon] } },
        memberToken,
      );

      expect(response.body.errors?.[0].extensions.code).toBe("FORBIDDEN");
    });
  });

  describe("reorderEnumValues", () => {
    let traitId: string;
    let otherTraitId: string;

    const createEnumValues = async (trait: string, valueNames: string[]) => {
      const ids: string[] = [];
      for (const [order, name] of valueNames.entries()) {
        const row = await testApp
          .getDb()
          .enumValue.create({ data: { name, order, traitId: trait } });
        ids.push(row.id);
      }
      return ids;
    };

    const listEnumValues = async (trait: string) => {
      const response = await testApp.authenticatedGraphqlRequest(
        ENUM_VALUES_BY_TRAIT,
        { traitId: trait },
        staffToken,
      );
      expect(response.body.errors).toBeUndefined();
      return response.body.data.enumValuesByTrait.nodes as Named[];
    };

    beforeEach(async () => {
      const trait = await testApp.getDb().trait.create({
        data: { name: "Rarity", valueType: TraitValueType.ENUM, speciesId },
      });
      traitId = trait.id;
      const otherTrait = await testApp.getDb().trait.create({
        data: { name: "Eyes", valueType: TraitValueType.ENUM, speciesId },
      });
      otherTraitId = otherTrait.id;
    });

    it("swaps neighbours despite the unique (trait, order) constraint", async () => {
      const [uncommon, common, rare] = await createEnumValues(traitId, [
        "Uncommon",
        "Common",
        "Rare",
      ]);

      const response = await testApp.authenticatedGraphqlRequest(
        REORDER_ENUM_VALUES,
        { input: { traitId, enumValueIds: [common, uncommon, rare] } },
        staffToken,
      );

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.reorderEnumValues).toEqual([
        { id: common, name: "Common", order: 0 },
        { id: uncommon, name: "Uncommon", order: 1 },
        { id: rare, name: "Rare", order: 2 },
      ]);
      expect(names(await listEnumValues(traitId))).toEqual([
        "Common",
        "Uncommon",
        "Rare",
      ]);
    });

    it("refuses another trait's value or a partial list", async () => {
      const [uncommon, common] = await createEnumValues(traitId, [
        "Uncommon",
        "Common",
      ]);
      const [blue] = await createEnumValues(otherTraitId, ["Blue"]);

      const foreign = await testApp.authenticatedGraphqlRequest(
        REORDER_ENUM_VALUES,
        { input: { traitId, enumValueIds: [common, uncommon, blue] } },
        staffToken,
      );
      expect(foreign.body.errors?.[0].extensions.code).toBe("BAD_REQUEST");

      const partial = await testApp.authenticatedGraphqlRequest(
        REORDER_ENUM_VALUES,
        { input: { traitId, enumValueIds: [common] } },
        staffToken,
      );
      expect(partial.body.errors?.[0].extensions.code).toBe("BAD_REQUEST");

      expect(names(await listEnumValues(traitId))).toEqual([
        "Uncommon",
        "Common",
      ]);
    });

    it("is staff-only", async () => {
      const [uncommon, common] = await createEnumValues(traitId, [
        "Uncommon",
        "Common",
      ]);

      const response = await testApp.authenticatedGraphqlRequest(
        REORDER_ENUM_VALUES,
        { input: { traitId, enumValueIds: [common, uncommon] } },
        memberToken,
      );

      expect(response.body.errors?.[0].extensions.code).toBe("FORBIDDEN");
    });
  });
});
