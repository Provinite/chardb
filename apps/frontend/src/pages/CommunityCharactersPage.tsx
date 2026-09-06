import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { CharacterListView } from "../components/CharacterListView";
import { Visibility } from "../generated/graphql";
import {
  useCommunityId,
  useHostCommunity,
} from "../contexts/CommunityHostContext";

const Breadcrumb = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};

  a {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const Separator = styled.span`
  color: ${({ theme }) => theme.colors.text.muted};
`;

const ErrorContainer = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.error};

  h3 {
    margin-bottom: ${({ theme }) => theme.spacing.sm};
  }
`;

export const CommunityCharactersPage: React.FC = () => {
  const communityId = useCommunityId();

  // The host context already resolved this community; querying it back by id
  // fetched the same record a second time on every page load.
  const community = useHostCommunity();

  // No separate loading or error branch: this page only mounts on a community
  // host, and `App` renders the community route table only once that host has
  // resolved. If it is null here, the address names no community.
  if (!communityId || !community) {
    return (
      <ErrorContainer>
        <h3>Error</h3>
        <p>This address names no community</p>
      </ErrorContainer>
    );
  }

  const breadcrumb = (
    <Breadcrumb>
      <Link to="/">{community.name}</Link>
      <Separator>›</Separator>
      <span>Characters</span>
    </Breadcrumb>
  );

  return (
    <CharacterListView
      title={`${community.name} Characters`}
      breadcrumb={breadcrumb}
      baseFilters={{
        communityId,
      }}
      defaultFilters={{
        visibility: Visibility.Public,
      }}
    />
  );
};
