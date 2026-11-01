import React from "react";
import { Outlet, useParams } from "react-router-dom";
import { useCommunityId } from "../contexts/CommunityHostContext";
import {
  useSpeciesByIdQuery,
  useSpeciesVariantByIdQuery,
  useTraitByIdQuery,
} from "../generated/graphql";
import { NotFoundPage } from "../routes/pages";

/**
 * Layout route for pages about one species, or one of its traits or variants.
 * A species belongs to one community and its pages live on that community's
 * host; on any other host they are not found.
 *
 * Asks with the same queries the pages do, so the page reads its data from
 * the cache. Renders nothing until it knows the species' community. A species
 * that does not exist is left to the page to report.
 */
export const SpeciesScopeRoute: React.FC = () => {
  const { speciesId, traitId, variantId } = useParams();
  const hostCommunityId = useCommunityId();

  const species = useSpeciesByIdQuery({
    variables: { id: speciesId ?? "" },
    skip: !speciesId,
    errorPolicy: "all",
  });
  const trait = useTraitByIdQuery({
    variables: { id: traitId ?? "" },
    skip: !traitId,
    errorPolicy: "all",
  });
  const variant = useSpeciesVariantByIdQuery({
    variables: { id: variantId ?? "" },
    skip: !variantId,
    errorPolicy: "all",
  });

  const loading =
    (species.loading && !species.data) ||
    (trait.loading && !trait.data) ||
    (variant.loading && !variant.data);

  if (loading) {
    return null;
  }

  const speciesCommunityId =
    species.data?.speciesById?.community?.id ??
    trait.data?.traitById?.species?.communityId ??
    variant.data?.speciesVariantById?.species?.communityId;

  if (speciesCommunityId && speciesCommunityId !== hostCommunityId) {
    return <NotFoundPage />;
  }

  return <Outlet />;
};
