import { describe, it, expect } from "vitest";
import { InMemoryCache, gql } from "@apollo/client";
import { invalidateLists } from "../invalidateLists";

const MY_GALLERIES = gql`
  query MyGalleries($filters: GalleryFiltersInput) {
    myGalleries(filters: $filters) {
      total
    }
  }
`;

const ME = gql`
  query Me {
    me {
      id
    }
  }
`;

const seed = (cache: InMemoryCache) => {
  // Two cached copies of the same list under different variables: the
  // apex's and a community host's.
  cache.writeQuery({
    query: MY_GALLERIES,
    variables: { filters: {} },
    data: { myGalleries: { __typename: "GalleryConnection", total: 1 } },
  });
  cache.writeQuery({
    query: MY_GALLERIES,
    variables: { filters: { communityId: "c1" } },
    data: { myGalleries: { __typename: "GalleryConnection", total: 1 } },
  });
  cache.writeQuery({
    query: ME,
    data: { me: { __typename: "User", id: "u1" } },
  });
};

describe("invalidateLists", () => {
  // A list that is not on screen when the write happens still has to be
  // fetched fresh the next time it is, whatever variables it was cached under.
  it("drops every cached copy of the named lists", () => {
    const cache = new InMemoryCache();
    seed(cache);

    invalidateLists("myGalleries")(cache);

    expect(
      cache.readQuery({ query: MY_GALLERIES, variables: { filters: {} } }),
    ).toBeNull();
    expect(
      cache.readQuery({
        query: MY_GALLERIES,
        variables: { filters: { communityId: "c1" } },
      }),
    ).toBeNull();
  });

  it("leaves other queries alone", () => {
    const cache = new InMemoryCache();
    seed(cache);

    invalidateLists("myGalleries")(cache);

    expect(cache.readQuery({ query: ME })).toEqual({
      me: { __typename: "User", id: "u1" },
    });
  });
});
