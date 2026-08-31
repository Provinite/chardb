import { gql } from "@apollo/client";
import { CURRENCY_FRAGMENT } from "./currencies.graphql";

export const SHOP_PRICE_FRAGMENT = gql`
  fragment ShopPriceFields on ShopPrice {
    id
    sortOrder
    # Advisory: computed from balances read a moment ago. Checkout decides.
    affordable
    components {
      id
      amount
      currency {
        ...CurrencyFields
      }
    }
  }
  ${CURRENCY_FRAGMENT}
`;

export const SHOP_ITEM_FRAGMENT = gql`
  fragment ShopItemFields on ShopItem {
    id
    communityId
    itemTypeId
    name
    description
    stock
    maxPerUser
    active
    sortOrder
    purchasedByViewer
    itemType {
      id
      name
      category
      isTradeable
      isConsumable
      image {
        id
        thumbnailUrl
        originalUrl
        altText
      }
    }
    prices {
      ...ShopPriceFields
    }
  }
  ${SHOP_PRICE_FRAGMENT}
`;

export const GET_SHOP_ITEMS = gql`
  query GetShopItems($communityId: ID!, $includeInactive: Boolean) {
    shopItems(communityId: $communityId, includeInactive: $includeInactive) {
      ...ShopItemFields
    }
  }
  ${SHOP_ITEM_FRAGMENT}
`;

/**
 * One line of a purchase, as both the sidebar panel and the history page show
 * it. Lines rather than purchases because that is the unit a buyer counts.
 */
export const MY_SHOP_PURCHASE_LINE_FRAGMENT = gql`
  fragment MyShopPurchaseLineFields on ShopPurchaseLine {
    id
    purchasedAt
    refundedAt
    # The server decides both, so the page never has to work out whether the
    # undo window has passed or the item has since been used.
    refundableByViewer
    refundBlockedReason
    costs {
      amount
      currency {
        ...CurrencyFields
      }
    }
    shopItem {
      id
      name
      itemType {
        id
        name
      }
    }
  }
  ${CURRENCY_FRAGMENT}
`;

export const GET_MY_SHOP_PURCHASE_LINES = gql`
  query GetMyShopPurchaseLines($filters: ShopPurchaseLineFiltersInput!) {
    myShopPurchaseLines(filters: $filters) {
      lines {
        ...MyShopPurchaseLineFields
      }
      # Counted against the same filters, so the panel can say what it is
      # showing eight of rather than silently dropping the rest.
      total
      hasMore
    }
  }
  ${MY_SHOP_PURCHASE_LINE_FRAGMENT}
`;

export const GET_COMMUNITY_SHOP_PURCHASES = gql`
  query GetCommunityShopPurchases(
    $communityId: ID!
    $buyerId: ID
    $limit: Int
  ) {
    communityShopPurchases(
      communityId: $communityId
      buyerId: $buyerId
      limit: $limit
    ) {
      id
      createdAt
      buyerId
      buyer {
        id
        username
        displayName
      }
      lines {
        id
        createdAt
        refundedAt
        # Computed for a staff viewer, so the undo window is not one of the
        # reasons and "not your purchase" never appears.
        refundableByViewer
        refundBlockedReason
        refundedBy {
          id
          username
        }
        costs {
          amount
          currency {
            ...CurrencyFields
          }
        }
        shopItem {
          id
          name
          itemType {
            id
            name
          }
        }
      }
    }
  }
  ${CURRENCY_FRAGMENT}
`;

export const CHECKOUT = gql`
  mutation Checkout($input: CheckoutInput!) {
    checkout(input: $input) {
      id
      createdAt
      lines {
        id
        costs {
          amount
          currency {
            ...CurrencyFields
          }
        }
        shopItem {
          id
          name
        }
      }
    }
  }
  ${CURRENCY_FRAGMENT}
`;

export const REFUND_SHOP_PURCHASE_LINE = gql`
  mutation RefundShopPurchaseLine($lineId: ID!) {
    refundShopPurchaseLine(lineId: $lineId) {
      id
      refundedAt
    }
  }
`;

export const CREATE_SHOP_ITEM = gql`
  mutation CreateShopItem($input: CreateShopItemInput!) {
    createShopItem(input: $input) {
      ...ShopItemFields
    }
  }
  ${SHOP_ITEM_FRAGMENT}
`;

export const UPDATE_SHOP_ITEM = gql`
  mutation UpdateShopItem($id: ID!, $input: UpdateShopItemInput!) {
    updateShopItem(id: $id, input: $input) {
      ...ShopItemFields
    }
  }
  ${SHOP_ITEM_FRAGMENT}
`;
