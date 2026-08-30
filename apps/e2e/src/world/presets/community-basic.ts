import {
  SeedCreateCharacterDocument,
  SeedCreateCommunityDocument,
  SeedCreateCommunityMemberDocument,
  SeedCreateEnumValueDocument,
  SeedCreateRoleDocument,
  SeedCreateSpeciesDocument,
  SeedCreateSpeciesVariantDocument,
  SeedCreateTraitDocument,
  SeedRolesByCommunityDocument,
  SeedCreateCurrencyDocument,
  TraitValueType,
} from "../../generated/graphql.js";
import { definePreset, type Persona } from "../types.js";

export interface CommunityBasicWorld {
  community: { id: string; name: string; url: string };
  species: { id: string; name: string; variantId: string };
  traits: {
    eyeColor: { id: string; name: string; values: Record<string, string> };
  };
  roles: {
    admin: string;
    moderatorPlus: string;
    member: string;
    /** canModerateImages only. Must NOT see the award widget. */
    imageMod: string;
    /** canModerateImages AND canGrantItems. Sees it. */
    payingMod: string;
  };
  /** One currency, so an approval has something to pay in. */
  currency: { id: string; code: string; name: string };
  /**
   * A PENDING image awaiting moderation, deliberately naming three different
   * people so the award widget's deduplication has something to separate:
   * uploaded and owned by `member`, drawn by `artist`, depicting a character
   * owned by `othermember`.
   */
  pendingImage: { imageId: string; mediaId: string };
  users: {
    siteadmin: Persona;
    commadmin: Persona;
    moderator: Persona;
    member: Persona;
    othermember: Persona;
    /** Can moderate images, cannot grant currency. */
    imagemod: Persona;
    /** Can moderate images AND grant currency. */
    payingmod: Persona;
    /** Credited as the artist on the pending image. */
    artist: Persona;
  };
  characters: {
    /** Owned by `member`; carries a trait value, so it has a PENDING review. */
    pending: { id: string; name: string; url: string };
    /** Owned by `othermember`. The "someone else's character" target. */
    plain: { id: string; name: string; url: string };
  };
}

export default definePreset<CommunityBasicWorld>({
  name: "community-basic",
  description:
    "One community with Admin / Moderator+ / Member roles, a species with an " +
    "ENUM trait, and two characters -- one with a PENDING trait review.",

  async build(ctx) {
    // --- users. Global permission flags only exist as columns on User and
    // cannot be granted through the API, so these must be created directly.
    const siteadmin = await ctx.user("siteadmin", {
      isAdmin: true,
      canCreateCommunity: true,
      canGrantGlobalPermissions: true,
    });
    const commadmin = await ctx.user("commadmin", { canCreateCommunity: true });
    const moderator = await ctx.user("moderator");
    const member = await ctx.user("member");
    const othermember = await ctx.user("othermember");
    const imagemod = await ctx.user("imagemod");
    const payingmod = await ctx.user("payingmod");
    const artist = await ctx.user("artist");

    // --- community. Auto-creates Admin/Moderator/Member roles and binds the
    // creator (commadmin) to Admin.
    const { createCommunity: community } = await ctx
      .as("commadmin")
      .gql(SeedCreateCommunityDocument, {
        createCommunityInput: { name: "Willowmere" },
      });

    const { rolesByCommunity } = await ctx
      .as("commadmin")
      .gql(SeedRolesByCommunityDocument, { communityId: community.id });
    const stock = Object.fromEntries(
      rolesByCommunity.nodes.map((r) => [r.name, r.id]),
    );

    // --- a custom role, because the stock Moderator role leaves
    // canDeleteCharacter false. #235 needs one role that can delete AND remove
    // from species, and one that can do neither, to prove the two permissions
    // gate independently rather than as one lump.
    const { createRole: modPlus } = await ctx
      .as("commadmin")
      .gql(SeedCreateRoleDocument, {
        createRoleInput: {
          name: "Moderator Plus",
          communityId: community.id,
          canCreateCharacter: true,
          canEditCharacter: true,
          canEditOwnCharacter: true,
          canEditCharacterRegistry: true,
          canEditOwnCharacterRegistry: true,
          canDeleteCharacter: true,
          canEditSpecies: true,
        },
      });

    // --- memberships. createCommunityMember is gated on GLOBAL isAdmin, not on
    // any community permission, so this must run as siteadmin.
    for (const [userId, roleId] of [
      [moderator.userId, modPlus.id],
      [member.userId, stock.Member],
      [othermember.userId, stock.Member],
    ] as const) {
      await ctx.as("siteadmin").gql(SeedCreateCommunityMemberDocument, {
        createCommunityMemberInput: { userId, roleId },
      });
    }

    // --- species. createSpecies has NO global-admin bypass, so the actor must
    // genuinely hold canCreateSpecies here -- commadmin does, via Admin.
    const { createSpecies: species } = await ctx
      .as("commadmin")
      .gql(SeedCreateSpeciesDocument, {
        createSpeciesInput: {
          communityId: community.id,
          name: "Willowisp",
          hasImage: false,
        },
      });

    const { createSpeciesVariant: variant } = await ctx
      .as("commadmin")
      .gql(SeedCreateSpeciesVariantDocument, {
        createSpeciesVariantInput: { speciesId: species.id, name: "Standard" },
      });

    const { createTrait: eyeColor } = await ctx
      .as("commadmin")
      .gql(SeedCreateTraitDocument, {
        createTraitInput: {
          speciesId: species.id,
          name: "Eye Color",
          valueType: TraitValueType.Enum,
          allowsClarifier: false,
          allowsMultipleValues: false,
        },
      });

    const values: Record<string, string> = {};
    for (const [i, name] of ["Blue", "Green"].entries()) {
      const { createEnumValue } = await ctx
        .as("commadmin")
        .gql(SeedCreateEnumValueDocument, {
          createEnumValueInput: { traitId: eyeColor.id, name, order: i },
        });
      values[name.toLowerCase()] = createEnumValue.id;
    }

    // --- characters. Non-empty traitValues auto-creates a PENDING TraitReview
    // (source CREATION), which is the trait-review-queue fixture. The value is
    // seeded by NAME so that kickFromSpecies's flattenTraitValues resolves it
    // to the display name "Blue" when it flattens into custom fields.
    const { createCharacter: pending } = await ctx
      .as("member")
      .gql(SeedCreateCharacterDocument, {
        input: {
          name: "Mossbrand",
          speciesId: species.id,
          speciesVariantId: variant.id,
          traitValues: [{ traitId: eyeColor.id, value: "Blue" }],
        },
      });

    const { createCharacter: plain } = await ctx
      .as("othermember")
      .gql(SeedCreateCharacterDocument, {
        input: {
          name: "Cinderfall",
          speciesId: species.id,
          speciesVariantId: variant.id,
        },
      });

    // ==================== Image moderation + currency ====================
    //
    // Two moderator roles, because the whole design of the award widget turns
    // on the difference: moderating images and handing out prizes are separate
    // permissions, and most moderators hold only the first.
    const { createRole: imageMod } = await ctx
      .as("commadmin")
      .gql(SeedCreateRoleDocument, {
        createRoleInput: {
          name: "Image Moderator",
          communityId: community.id,
          canModerateImages: true,
        },
      });

    const { createRole: payingMod } = await ctx
      .as("commadmin")
      .gql(SeedCreateRoleDocument, {
        createRoleInput: {
          name: "Paying Moderator",
          communityId: community.id,
          canModerateImages: true,
          canGrantItems: true,
          canManageItems: true,
        },
      });

    for (const [userId, roleId] of [
      [imagemod.userId, imageMod.id],
      [payingmod.userId, payingMod.id],
      [artist.userId, stock.Member],
    ] as const) {
      await ctx.as("siteadmin").gql(SeedCreateCommunityMemberDocument, {
        createCommunityMemberInput: { userId, roleId },
      });
    }

    const { createCurrency: currency } = await ctx
      .as("payingmod")
      .gql(SeedCreateCurrencyDocument, {
        input: {
          communityId: community.id,
          name: "Hollow Coin",
          code: "HC",
          symbol: "\u2b21",
        },
      });

    // Seeded through Prisma rather than the upload API: creating a real image
    // means S3, sharp, and a multipart upload, none of which this fixture is
    // testing. What matters is the shape -- a PENDING image reachable from a
    // community through media -> character -> species.
    const image = await ctx.prisma.image.create({
      data: {
        filename: "ridley-lanternfall.png",
        originalFilename: "ridley-lanternfall.png",
        originalUrl: "https://example.test/ridley-lanternfall.png",
        uploaderId: member.userId,
        artistId: artist.userId,
        width: 800,
        height: 600,
        fileSize: 12345,
        mimeType: "image/png",
        moderationStatus: "PENDING",
      },
    });

    // Attached to `plain`, which othermember owns, so uploader, artist and
    // character owner are three different people.
    const pendingMedia = await ctx.prisma.media.create({
      data: {
        title: "Ridley at the lantern festival",
        ownerId: member.userId,
        characterId: plain.id,
        imageId: image.id,
      },
    });

    return {
      community: {
        id: community.id,
        name: community.name,
        url: `/communities/${community.id}`,
      },
      species: { id: species.id, name: species.name, variantId: variant.id },
      traits: { eyeColor: { id: eyeColor.id, name: eyeColor.name, values } },
      roles: {
        admin: stock.Admin,
        moderatorPlus: modPlus.id,
        member: stock.Member,
        imageMod: imageMod.id,
        payingMod: payingMod.id,
      },
      currency: { id: currency.id, code: currency.code, name: currency.name },
      pendingImage: { imageId: image.id, mediaId: pendingMedia.id },
      users: {
        siteadmin,
        commadmin,
        moderator,
        member,
        othermember,
        imagemod,
        payingmod,
        artist,
      },
      characters: {
        pending: {
          id: pending.id,
          name: pending.name,
          url: `/character/${pending.id}`,
        },
        plain: {
          id: plain.id,
          name: plain.name,
          url: `/character/${plain.id}`,
        },
      },
    };
  },
});
