import { ApolloClient, InMemoryCache, createHttpLink, from, split } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';

const httpUrl = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/graphql` : 'http://localhost:4000/graphql';
const wsUrl = httpUrl.replace(/^http/, 'ws');

const httpLink = createHttpLink({
  uri: httpUrl,
});

const wsLink = new GraphQLWsLink(
  createClient({
    url: wsUrl,
    connectionParams: () => {
      const token = localStorage.getItem('accessToken');
      return token ? { authorization: `Bearer ${token}` } : {};
    },
  }),
);

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('accessToken');
  
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  }
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
    
    // Handle 401 errors by clearing tokens and redirecting to login
    if (networkError.message.includes('401')) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
  }
});

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
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
            merge(existing = { characters: [], total: 0 }, incoming, { variables }) {
              // If this is a fresh query (offset 0) or different filters, replace existing data
              const isLoadMore = variables?.filters?.offset && variables.filters.offset > 0;
              
              if (!isLoadMore) {
                // Fresh search - replace existing data
                return incoming;
              }
              
              // Load more - append to existing data
              return {
                ...incoming,
                characters: [...(existing.characters || []), ...(incoming.characters || [])],
              };
            },
          },
        },
      },
    },
  }),
});