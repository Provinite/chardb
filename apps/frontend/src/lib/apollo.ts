import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  from,
  split,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { Kind, OperationTypeNode } from "graphql";
import { createClient } from "graphql-ws";
import { getAccessToken, setAccessToken } from "./accessToken";
import { API_BASE_URL, loginUrlReturningHere } from "./communityHost";
import { hasRateLimitError, notifyRateLimited } from "./rateLimit";
import { rateLimitBackoff } from "./rateLimitBackoff";

const httpUrl = `${API_BASE_URL}/graphql`;
const wsUrl = httpUrl.replace(/^http/, "ws");

const httpLink = createHttpLink({
  uri: httpUrl,
  // The refresh token is an HttpOnly cookie on the parent domain now, so the
  // browser has to be told to attach it. Without this the session does not
  // survive a reload, and the API answers every call as a signed-out visitor.
  credentials: "include",
});

const wsLink = new GraphQLWsLink(
  createClient({
    url: wsUrl,
    connectionParams: () => {
      const token = getAccessToken();
      return token ? { authorization: `Bearer ${token}` } : {};
    },
  }),
);

const authLink = setContext((_, { headers }) => {
  const token = getAccessToken();

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    },
  };
});

const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  // Throttled anywhere in the app gets the same single toast, unless the
  // screen that sent it says it shows the message itself.
  if (
    hasRateLimitError(graphQLErrors) &&
    !operation.getContext().handlesRateLimit
  ) {
    notifyRateLimited();
  }

  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) =>
      console.log(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
      ),
    );
  }

  if (networkError) {
    console.log(`[Network error]: ${networkError}`);

    // Handle 401 errors by clearing the token and sending the visitor to this
    // host's sign-in, which brings them back to where they were. Not from the
    // sign-in page itself: that would reload it in a loop.
    if (networkError.message.includes("401")) {
      setAccessToken(null);
      if (window.location.pathname !== "/login") {
        window.location.href = loginUrlReturningHere();
      }
    }
  }
});

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === Kind.OPERATION_DEFINITION &&
      definition.operation === OperationTypeNode.SUBSCRIPTION
    );
  },
  wsLink,
  // The backoff sits inside errorLink so a request it holds back still gets
  // the usual rate-limit toast.
  from([errorLink, rateLimitBackoff.link, authLink, httpLink]),
);

export const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache({
    typePolicies: {
      // Keyed by kind rather than by an id, because it has none: a preference
      // row is always the viewer's own, so the kind alone identifies it. Without
      // this the type is unnormalisable, the mutation's reply cannot be merged
      // into the query that rendered the switches, and a toggle visibly snaps
      // back until the next refetch.
      NotificationPreference: {
        keyFields: ["kind"],
      },
      Query: {
        fields: {
          users: {
            keyArgs: [],
            merge(existing = { nodes: [], totalCount: 0 }, incoming) {
              return {
                ...incoming,
                nodes: [...existing.nodes, ...incoming.nodes],
              };
            },
          },
          characters: {
            keyArgs: ["filters"],
            merge(
              existing = { characters: [], total: 0 },
              incoming,
              { variables },
            ) {
              // If this is a fresh query (offset 0) or different filters, replace existing data
              const isLoadMore =
                variables?.filters?.offset && variables.filters.offset > 0;

              if (!isLoadMore) {
                // Fresh search - replace existing data
                return incoming;
              }

              // Load more - append to existing data
              return {
                ...incoming,
                characters: [
                  ...(existing.characters || []),
                  ...(incoming.characters || []),
                ],
              };
            },
          },
        },
      },
    },
  }),
});
