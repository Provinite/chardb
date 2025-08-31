import React from "react";
import { useQuery } from "@apollo/client";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useAuth } from "../contexts/AuthContext";
import { GET_LIKED_CHARACTERS } from "../graphql/characters.graphql";
import { LikeButton } from "../components/LikeButton";
import { LikeableType } from "../generated/graphql";

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.md};
`;

const Header = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize.xxl};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
`;

const CharacterCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  overflow: hidden;
  transition: all 0.2s ease-in-out;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }
`;

const CardContent = styled.div`
  padding: ${({ theme }) => theme.spacing.lg};
`;

const CharacterName = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const CharacterSpecies = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
`;

const CharacterDescription = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0 0 ${({ theme }) => theme.spacing.md} 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const CardActions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const ViewButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  text-decoration: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  transition: background-color 0.2s ease-in-out;

  &:hover {
    background: ${({ theme }) => theme.colors.secondary};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const EmptyIcon = styled.div`
  font-size: 4rem;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  opacity: 0.5;
`;

const EmptyTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const EmptyDescription = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  margin: 0 0 ${({ theme }) => theme.spacing.lg} 0;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
`;

const ExploreButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  text-decoration: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  transition: background-color 0.2s ease-in-out;

  &:hover {
    background: ${({ theme }) => theme.colors.secondary};
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.xxl};
`;

const ErrorContainer = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl};
  color: ${({ theme }) => theme.colors.error};
`;

export const LikedCharactersPage: React.FC = () => {
  const { user } = useAuth();

  const { data, loading, error } = useQuery(GET_LIKED_CHARACTERS, {
    skip: !user,
  });

  const likedCharacters = data?.likedCharacters || [];

  if (!user) {
    return (
      <Container>
        <ErrorContainer>
          <h3>Please log in to view your liked characters</h3>
        </ErrorContainer>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container>
        <LoadingContainer>
          <LoadingSpinner />
        </LoadingContainer>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorContainer>
          <h3>Error loading liked characters</h3>
          <p>{error.message}</p>
        </ErrorContainer>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>My Liked Characters</Title>
        <Subtitle>Characters you've shown love to</Subtitle>
      </Header>

      {likedCharacters.length === 0 ? (
        <EmptyState>
          <EmptyIcon>💖</EmptyIcon>
          <EmptyTitle>No liked characters yet</EmptyTitle>
          <EmptyDescription>
            Start exploring and liking characters you love! Your liked
            characters will appear here.
          </EmptyDescription>
          <ExploreButton to="/characters">Explore Characters</ExploreButton>
        </EmptyState>
      ) : (
        <Grid>
          {likedCharacters.map((character: any) => (
            <CharacterCard key={character.id}>
              <CardContent>
                <CharacterName>{character.name}</CharacterName>
                {character.species?.name && (
                  <CharacterSpecies>{character.species.name}</CharacterSpecies>
                )}
                {character.description && (
                  <CharacterDescription>
                    {character.description}
                  </CharacterDescription>
                )}

                <CardActions>
                  <ViewButton to={`/character/${character.id}`}>
                    View Character
                  </ViewButton>
                  <LikeButton
                    entityType={LikeableType.Character}
                    entityId={character.id}
                    size="small"
                  />
                </CardActions>
              </CardContent>
            </CharacterCard>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default LikedCharactersPage;
