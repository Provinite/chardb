import { gql } from "@apollo/client";
import { USER_BASIC_FRAGMENT } from "./users.graphql";
import { SPECIES_FRAGMENT, SPECIES_VARIANT_FRAGMENT } from "./species.graphql";

// ==================== ItemType Fragments ====================

export const ITEM_TYPE_FRAGMENT = gql`
  fragment ItemTypeFields on ItemType {
    id
    name
    description
    communityId
    category
    isTradeable
    isConsumable
    usePayout {
      id
      amount
      currency {
        id
        name
        code
        symbol
      }
    }
    useMyoGrant {
      id
      species {
        id
        name
      }
      variants {
        id
        name
      }
    }
    useTraitEditGrant {
      id
      species {
        id
        species {
          id
          name
        }
        variants {
          id
          name
        }
      }
    }
    image {
      id
      originalUrl
      thumbnailUrl
      altText
    }
    colorId
    color {
      id
      name
      hexCode
    }
    metadata
    createdAt
    updatedAt
  }
`;

// ==================== Item Fragments ====================

export const ITEM_FRAGMENT = gql`
  fragment ItemFields on Item {
    id
    itemTypeId
    ownerId
    destroyedAt
    metadata
    createdAt
    updatedAt
    pendingOwnership {
      id
      provider
      providerAccountId
      createdAt
    }
    itemType {
      ...ItemTypeFields
    }
    owner {
      ...UserBasic
    }
  }
  ${ITEM_TYPE_FRAGMENT}
  ${USER_BASIC_FRAGMENT}
`;

// ==================== ItemType Queries ====================

export const GET_ITEM_TYPES = gql`
  query GetItemTypes($filters: ItemTypeFiltersInput) {
    itemTypes(filters: $filters) {
      itemTypes {
        ...ItemTypeFields
      }
      total
      hasMore
    }
  }
  ${ITEM_TYPE_FRAGMENT}
`;

export const GET_ITEM_TYPE = gql`
  query GetItemType($id: ID!) {
    itemType(id: $id) {
      ...ItemTypeFields
      community {
        id
        name
      }
    }
  }
  ${ITEM_TYPE_FRAGMENT}
`;

// ==================== ItemType Mutations ====================

export const CREATE_ITEM_TYPE = gql`
  mutation CreateItemType($input: CreateItemTypeInput!) {
    createItemType(input: $input) {
      ...ItemTypeFields
    }
  }
  ${ITEM_TYPE_FRAGMENT}
`;

export const UPDATE_ITEM_TYPE = gql`
  mutation UpdateItemType($id: ID!, $input: UpdateItemTypeInput!) {
    updateItemType(id: $id, input: $input) {
      ...ItemTypeFields
    }
  }
  ${ITEM_TYPE_FRAGMENT}
`;

export const DELETE_ITEM_TYPE = gql`
  mutation DeleteItemType($id: ID!) {
    deleteItemType(id: $id)
  }
`;

// ==================== Inventory Fragments ====================

export const INVENTORY_FRAGMENT = gql`
  fragment InventoryFields on Inventory {
    communityId
    totalItems
    items {
      ...ItemFields
    }
  }
  ${ITEM_FRAGMENT}
`;

// ==================== Item Queries ====================

export const GET_MY_INVENTORY = gql`
  query GetMyInventory($communityId: ID) {
    me {
      id
      username
      inventories(communityId: $communityId) {
        ...InventoryFields
      }
    }
  }
  ${INVENTORY_FRAGMENT}
`;

// ==================== Item Mutations ====================

// Returns one Item per unit granted -- there is no stacking.
export const GRANT_ITEM = gql`
  mutation GrantItem($input: GrantItemInput!) {
    grantItem(input: $input) {
      ...ItemFields
    }
  }
  ${ITEM_FRAGMENT}
`;

export const UPDATE_ITEM = gql`
  mutation UpdateItem($id: ID!, $input: UpdateItemInput!) {
    updateItem(id: $id, input: $input) {
      ...ItemFields
    }
  }
  ${ITEM_FRAGMENT}
`;

// Soft: destroyed items keep their provenance. Returns the count revoked.
export const REVOKE_ITEMS = gql`
  mutation RevokeItems($itemIds: [ID!]!, $reason: String!, $staffNote: String) {
    revokeItems(itemIds: $itemIds, reason: $reason, staffNote: $staffNote)
  }
`;

// ==================== Item Ledger ====================

export const ITEM_TRANSACTION_FRAGMENT = gql`
  fragment ItemTransactionFields on ItemTransaction {
    id
    communityId
    kind
    batchId
    batchSize
    reason
    # Resolves to null for viewers without item permissions, so the same
    # document serves staff and members.
    staffNote
    actorLabel
    createdAt
    itemId
    itemType {
      id
      name
      category
      color {
        id
        hexCode
      }
      image {
        id
        thumbnailUrl
        originalUrl
        altText
      }
    }
    fromUser {
      ...UserBasic
    }
    toUser {
      ...UserBasic
    }
    actorUser {
      ...UserBasic
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

export const GET_ITEM_TRANSACTIONS = gql`
  query GetItemTransactions($filters: ItemTransactionFiltersInput!) {
    itemTransactions(filters: $filters) {
      transactions {
        ...ItemTransactionFields
      }
      total
      hasMore
    }
  }
  ${ITEM_TRANSACTION_FRAGMENT}
`;

export const GET_ITEM_PROVENANCE = gql`
  query GetItemProvenance($itemId: ID!) {
    itemProvenance(itemId: $itemId) {
      ...ItemTransactionFields
    }
  }
  ${ITEM_TRANSACTION_FRAGMENT}
`;

// One request for the page: the item and its history are useless apart.
// The community comes along so the page can name it and verify that the
// community in the URL is the one the item actually belongs to.
export const GET_ITEM_WITH_PROVENANCE = gql`
  query GetItemWithProvenance($itemId: ID!) {
    item(id: $itemId) {
      ...ItemFields
      itemType {
        community {
          id
          name
        }
      }
    }
    itemProvenance(itemId: $itemId) {
      ...ItemTransactionFields
    }
  }
  ${ITEM_FRAGMENT}
  ${ITEM_TRANSACTION_FRAGMENT}
`;

// ==================== Item Economy ====================

export const GET_ITEM_ECONOMY = gql`
  query GetItemEconomy($communityId: ID!) {
    itemEconomy(communityId: $communityId) {
      totalCirculation
      totalHolders
      totalUnclaimed
      netRecently
      itemTypes {
        circulation
        holderCount
        grantedRecently
        revokedRecently
        unclaimed
        itemType {
          id
        }
      }
    }
  }
`;

// ==================== Member Holdings ====================

export const GET_MEMBER_HOLDINGS = gql`
  query GetMemberHoldings($communityId: ID!, $userId: ID!) {
    memberHoldings(communityId: $communityId, userId: $userId) {
      totalItems
      distinctTypes
      pendingItems
      member {
        ...UserBasic
      }
      holdings {
        count
        itemType {
          id
          name
          description
          category
          isTradeable
          isConsumable
          usePayout {
            id
            amount
            currency {
              id
              name
              code
              symbol
            }
          }
          useMyoGrant {
            id
            species {
              id
              name
            }
            variants {
              id
              name
            }
          }
          useTraitEditGrant {
            id
            species {
              id
              species {
                id
                name
              }
              variants {
                id
                name
              }
            }
          }
          color {
            id
            hexCode
          }
          image {
            id
            thumbnailUrl
            originalUrl
            altText
          }
        }
        items {
          id
          createdAt
        }
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

export const USE_ITEM = gql`
  mutation UseItem($input: UseItemInput!) {
    useItem(input: $input) {
      itemTypeName
      batchId
      payout {
        id
        amount
        currency {
          id
          name
          code
          symbol
        }
      }
    }
  }
`;

export const SET_ITEM_TYPE_USE_PAYOUT = gql`
  mutation SetItemTypeUsePayout($input: SetItemTypeUsePayoutInput!) {
    setItemTypeUsePayout(input: $input) {
      ...ItemTypeFields
    }
  }
  ${ITEM_TYPE_FRAGMENT}
`;

/**
 * A ticket about to be spent, and what it is allowed to make.
 *
 * Selects the full species and variant fragments rather than bare ids, so the
 * create page can drive its species header and variant picker straight off the
 * ticket instead of loading every species in the site and finding the one.
 */
export const GET_MYO_TICKET = gql`
  query GetMyoTicket($itemId: ID!) {
    item(id: $itemId) {
      id
      ownerId
      destroyedAt
      itemType {
        id
        name
        communityId
        useMyoGrant {
          id
          species {
            ...SpeciesDetails
          }
          variants {
            ...SpeciesVariantDetails
          }
        }
      }
    }
  }
  ${SPECIES_FRAGMENT}
  ${SPECIES_VARIANT_FRAGMENT}
`;

export const CREATE_CHARACTER_FROM_MYO_TICKET = gql`
  mutation CreateCharacterFromMyoTicket($input: RedeemMyoTicketInput!) {
    createCharacterFromMyoTicket(input: $input) {
      id
      name
    }
  }
`;

export const SET_ITEM_TYPE_MYO_GRANT = gql`
  mutation SetItemTypeMyoGrant($input: SetItemTypeMyoGrantInput!) {
    setItemTypeMyoGrant(input: $input) {
      ...ItemTypeFields
    }
  }
  ${ITEM_TYPE_FRAGMENT}
`;

export const SET_ITEM_TYPE_TRAIT_EDIT_GRANT = gql`
  mutation SetItemTypeTraitEditGrant(
    $input: SetItemTypeTraitEditGrantInput!
  ) {
    setItemTypeTraitEditGrant(input: $input) {
      ...ItemTypeFields
    }
  }
  ${ITEM_TYPE_FRAGMENT}
`;

/**
 * A kit about to be spent, and which characters it covers.
 *
 * `destroyedAt` and `ownerId` are selected and **used**: the grant hangs off
 * the item type, so a spent or borrowed kit would otherwise present a working
 * editor and only refuse at submit. Same trap the MYO create page fell into.
 */
export const GET_EDIT_KIT = gql`
  query GetEditKit($itemId: ID!) {
    item(id: $itemId) {
      id
      ownerId
      destroyedAt
      itemType {
        id
        name
        communityId
        useTraitEditGrant {
          id
          species {
            id
            species {
              id
              name
            }
            variants {
              id
              name
            }
          }
        }
      }
    }
  }
`;

/**
 * The edit kits a member holds in one community, for the character page's
 * "use a kit" offer and for the kit picker.
 */
export const GET_MY_EDIT_KITS = gql`
  query GetMyEditKits($communityId: ID!, $userId: ID!) {
    memberHoldings(communityId: $communityId, userId: $userId) {
      holdings {
        count
        items {
          id
        }
        itemType {
          id
          name
          useTraitEditGrant {
            id
            species {
              id
              species {
                id
                name
              }
              variants {
                id
                name
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * Just enough of a member's characters to decide which a kit covers.
 *
 * Its own query rather than widening GET_MY_CHARACTERS: that one already
 * selects twenty fields for a grid, is used on every My Characters load, and
 * does not carry the variant this needs. Adding two fields there would make
 * every page pay for one picker.
 */
export const GET_MY_CHARACTERS_FOR_EDIT_KIT = gql`
  query GetMyCharactersForEditKit($filters: CharacterFiltersInput) {
    myCharacters(filters: $filters) {
      characters {
        id
        name
        speciesId
        speciesVariantId
        traitReviewStatus
        species {
          id
          name
        }
        speciesVariant {
          id
          name
        }
      }
      total
      hasMore
    }
  }
`;

export const EDIT_CHARACTER_TRAITS_WITH_KIT = gql`
  mutation EditCharacterTraitsWithKit(
    $input: EditCharacterTraitsWithKitInput!
  ) {
    editCharacterTraitsWithKit(input: $input) {
      id
      status
      characterId
    }
  }
`;
