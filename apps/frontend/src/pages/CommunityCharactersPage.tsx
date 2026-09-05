import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { CharacterListView } from "../components/CharacterListView";
import { useCommunityByIdQuery, Visibility } from "../generated/graphql";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useCommunityId } from "../contexts/CommunityHostContext";

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

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.xxl};
`;

export const CommunityCharactersPage: React.FC = () => {
  const communityId = useCommunityId();

  const { data, loading, error } = useCommunityByIdQuery({
    variables: { id: communityId! },
    skip: !communityId,
  });

  if (!communityId) {
    return (
      <ErrorContainer>
        <h3>Error</h3>
        <p>Community ID is required</p>
      </ErrorContainer>
    );
  }

  if (loading) {
    return (
      <LoadingContainer>
        <LoadingSpinner />
      </LoadingContainer>
    );
  }

  if (error || !data?.community) {
    return (
      <ErrorContainer>
        <h3>Error loading community</h3>
        <p>{error?.message || "Community not found"}</p>
      </ErrorContainer>
    );
  }

  const breadcrumb = (
    <Breadcrumb>
      <Link to="/">{data.community.name}</Link>
      <Separator>›</Separator>
      <span>Characters</span>
    </Breadcrumb>
  );

  return (
    <CharacterListView
      title={`${data.community.name} Characters`}
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
