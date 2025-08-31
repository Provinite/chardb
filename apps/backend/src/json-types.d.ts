declare global {
  namespace PrismaJson {
    /**
     * Type for character trait values stored as JSONB
     * Each trait has a traitId (UUID) and a value of various types
     */
    type CharacterTraitValuesJson = {
      /** UUID of the trait this value belongs to */
      traitId: string;
      /** The trait value - can be string, number, boolean, or null */
      value: string | number | boolean | null;
    }[];
  }
}

export {};
