import {
  CREATE_CHARACTER,
  CREATE_COMMUNITY,
  CREATE_COMMUNITY_MEMBER,
  CREATE_ENUM_VALUE,
  CREATE_ROLE,
  CREATE_SPECIES,
  CREATE_SPECIES_VARIANT,
  CREATE_TRAIT,
  ROLES_BY_COMMUNITY,
} from "../gql.js";
import { definePreset, type Persona } from "../types.js";

export interface CommunityBasicWorld {
  community: { id: string; name: string; url: string };
  species: { id: string; name: string; variantId: string };
  traits: {
    eyeColor: { id: string; name: string; values: Record<string, string> };
  };
  roles: { admin: string; moderatorPlus: string; member: string };
  users: {
    siteadmin: Persona;
    commadmin: Persona;
    moderator: Persona;
    member: Persona;
    othermember: Persona;
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

    // --- community. Auto-creates Admin/Moderator/Member roles and binds the
    // creator (commadmin) to Admin.
    const { createCommunity: community } = await ctx
      .as("commadmin")
      .gql<{ createCommunity: { id: string; name: string } }>(CREATE_COMMUNITY, {
        createCommunityInput: { name: "Willowmere" },
      });

    const { rolesByCommunity } = await ctx
      .as("commadmin")
      .gql<{ rolesByCommunity: { nodes: Array<{ id: string; name: string }> } }>(
        ROLES_BY_COMMUNITY,
        { communityId: community.id },
      );
    const stock = Object.fromEntries(
      rolesByCommunity.nodes.map((r) => [r.name, r.id]),
    );

    // --- a custom role, because the stock Moderator role leaves
    // canDeleteCharacter false. #235 needs one role that can delete AND remove
    // from species, and one that can do neither, to prove the two permissions
    // gate independently rather than as one lump.
    const { createRole: modPlus } = await ctx
      .as("commadmin")
      .gql<{ createRole: { id: string } }>(CREATE_ROLE, {
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
      await ctx
        .as("siteadmin")
        .gql(CREATE_COMMUNITY_MEMBER, {
          createCommunityMemberInput: { userId, roleId },
        });
    }

    // --- species. createSpecies has NO global-admin bypass, so the actor must
    // genuinely hold canCreateSpecies here -- commadmin does, via Admin.
    const { createSpecies: species } = await ctx
      .as("commadmin")
      .gql<{ createSpecies: { id: string; name: string } }>(CREATE_SPECIES, {
        createSpeciesInput: {
          communityId: community.id,
          name: "Willowisp",
          hasImage: false,
        },
      });

    const { createSpeciesVariant: variant } = await ctx
      .as("commadmin")
      .gql<{ createSpeciesVariant: { id: string } }>(CREATE_SPECIES_VARIANT, {
        createSpeciesVariantInput: { speciesId: species.id, name: "Standard" },
      });

    const { createTrait: eyeColor } = await ctx
      .as("commadmin")
      .gql<{ createTrait: { id: string; name: string } }>(CREATE_TRAIT, {
        createTraitInput: {
          speciesId: species.id,
          name: "Eye Color",
          valueType: "ENUM",
          allowsClarifier: false,
          allowsMultipleValues: false,
        },
      });

    const values: Record<string, string> = {};
    for (const [i, name] of ["Blue", "Green"].entries()) {
      const { createEnumValue } = await ctx
        .as("commadmin")
        .gql<{ createEnumValue: { id: string } }>(CREATE_ENUM_VALUE, {
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
      .gql<{ createCharacter: { id: string; name: string } }>(CREATE_CHARACTER, {
        input: {
          name: "Mossbrand",
          speciesId: species.id,
          speciesVariantId: variant.id,
          traitValues: [{ traitId: eyeColor.id, value: "Blue" }],
        },
      });

    const { createCharacter: plain } = await ctx
      .as("othermember")
      .gql<{ createCharacter: { id: string; name: string } }>(CREATE_CHARACTER, {
        input: {
          name: "Cinderfall",
          speciesId: species.id,
          speciesVariantId: variant.id,
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
      },
      users: { siteadmin, commadmin, moderator, member, othermember },
      characters: {
        pending: {
          id: pending.id,
          name: pending.name,
          url: `/character/${pending.id}`,
        },
        plain: { id: plain.id, name: plain.name, url: `/character/${plain.id}` },
      },
    };
  },
});
