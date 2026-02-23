import { describe, it, expect } from "vitest";
import { extractArtistFromTitle } from "./extract-artist";

describe("extractArtistFromTitle", () => {
  describe("standard format: Name - Artist", () => {
    it("extracts simple usernames", () => {
      expect(extractArtistFromTitle("Standard: Painted - clovercoin")).toBe("clovercoin");
      expect(extractArtistFromTitle("Standard: Merry Merle - Toadhops")).toBe("Toadhops");
      expect(extractArtistFromTitle("Kit: Pandots - Spiritburn")).toBe("Spiritburn");
      expect(extractArtistFromTitle("MYO Pillowing 0066 - Krizpie")).toBe("Krizpie");
      expect(extractArtistFromTitle("MYO Pillowing: 0949 - Ceadar")).toBe("Ceadar");
    });

    it("extracts usernames with hyphens", () => {
      expect(extractArtistFromTitle("Kit: Diggity - Dessert-Dingo")).toBe("Dessert-Dingo");
      expect(extractArtistFromTitle("Flower Crown - Greenie-Ghost")).toBe("Greenie-Ghost");
      expect(extractArtistFromTitle("MYO Pillowing 0915 - Ethereum-Mercenary")).toBe("Ethereum-Mercenary");
      expect(extractArtistFromTitle("Kit: Witch's Helper - trash-gaylie")).toBe("trash-gaylie");
      expect(extractArtistFromTitle("Common Blue Heart - nate-draws")).toBe("nate-draws");
      expect(extractArtistFromTitle("MYO Pillowing: 1128 - Archival-system")).toBe("Archival-system");
    });

    it("extracts from redesign titles", () => {
      expect(extractArtistFromTitle("MYO Pillowing: 0929 Redesign - Sweetmelony")).toBe("Sweetmelony");
      expect(extractArtistFromTitle("MYO Pillowing: 1758 - Clovercoin")).toBe("Clovercoin");
    });
  });

  describe("non-standard dash formatting", () => {
    it("handles missing space after dash", () => {
      expect(extractArtistFromTitle("MYO Pillowing 1280 -Clovercoin")).toBe("Clovercoin");
      expect(extractArtistFromTitle("Priss E. Puff -LilDogMeat")).toBe("LilDogMeat");
    });

    it("handles no spaces around dash", () => {
      expect(extractArtistFromTitle("MYO Pillowing: 0773-RedRoadRot")).toBe("RedRoadRot");
    });

    it("handles missing space before dash", () => {
      expect(extractArtistFromTitle("MYO Pillowing: 1093- RedRoadRot")).toBe("RedRoadRot");
    });
  });

  describe("titles without extractable artist", () => {
    it("returns undefined for titles without dashes", () => {
      expect(extractArtistFromTitle("Brown")).toBeUndefined();
      expect(extractArtistFromTitle("MYO Pillowing 0092")).toBeUndefined();
      expect(extractArtistFromTitle("Witches Brew")).toBeUndefined();
      expect(extractArtistFromTitle("Quilt")).toBeUndefined();
      expect(extractArtistFromTitle("1")).toBeUndefined();
      expect(extractArtistFromTitle("Pillowing")).toBeUndefined();
      expect(extractArtistFromTitle("MYO Pillowing 0081 Clovercoin")).toBeUndefined();
    });

    it("returns undefined for random hash titles", () => {
      expect(extractArtistFromTitle("2745636 fSNVFg8c248rAMA")).toBeUndefined();
      expect(extractArtistFromTitle("91216389 O5HSN6CFSEZo01U")).toBeUndefined();
    });

    it("returns undefined for DA auto-generated UUID titles", () => {
      expect(extractArtistFromTitle("Dczf06o-4d937bc3-9b5b-4ff1-8a00-8e51ee7a9646")).toBeUndefined();
      expect(extractArtistFromTitle("Dczjg19-836d7bb8-bf56-4278-8c28-05d704880e08")).toBeUndefined();
      expect(extractArtistFromTitle("Abc1234-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")).toBeUndefined();
    });

    it("returns undefined for empty/blank input", () => {
      expect(extractArtistFromTitle("")).toBeUndefined();
      expect(extractArtistFromTitle(" - ")).toBeUndefined();
    });

    it("returns undefined when no valid username after any dash", () => {
      expect(extractArtistFromTitle("Pillowing Revamp  Sunflower Song Birds By Cloverco")).toBeUndefined();
      expect(extractArtistFromTitle("Dczjg19-836d7bb8-bf56-4278-8c28-05d704880e08")).toBeUndefined();
    });
  });

  describe("edge cases from real data", () => {
    it("handles leading space in title", () => {
      expect(extractArtistFromTitle(" MYO Pillowing: 1921 - Greenie-Ghost")).toBe("Greenie-Ghost");
    });

    it("picks first valid username scanning left-to-right", () => {
      // "Dessert-Dingo" is a valid username; the scan finds it from the first dash
      expect(extractArtistFromTitle("Kit: Diggity - Dessert-Dingo")).toBe("Dessert-Dingo");
      // First dash yields "Ghost" which isn't the full artist, but the
      // space-dash gives "Greenie-Ghost" as the full remainder
      expect(extractArtistFromTitle("Standard: Leaf Pile Puppy - Greenie-Ghost")).toBe("Greenie-Ghost");
    });
  });
});
