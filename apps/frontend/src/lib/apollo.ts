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
import { apexUrl, ROOT_DOMAIN } from "./communityHost";

// The fallback is derived from the root domain rather than hardcoded, because
// the API has to be under it: the refresh cookie is scoped to the domain, and
// a `localhost:4000` default would never receive it from `dev.localhost`. That
// failure looks like being signed out on every page load, with no error.
const httpUrl = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/graphql`
  : `http://api.${ROOT_DOMAIN}:4000/graphql`;
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

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) =>
      console.log(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
      ),
    );
  }

  if (networkError) {
    console.log(`[Network error]: ${networkError}`);

    // Handle 401 errors by clearing the token and redirecting to login.
    // Login lives at the apex, so from a community host this leaves the
    // subdomain -- the session it establishes covers both.
    if (networkError.message.includes("401")) {
      setAccessToken(null);
      window.location.href = apexUrl("/login");
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
  from([errorLink, authLink, httpLink]),
);

export const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache({
    typePolicies: {
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
