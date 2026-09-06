import React, { useState } from "react";
import styled from "styled-components";
import { Plus, Settings, Trash2, ExternalLink, Search } from "lucide-react";
import {
  useCommunitiesQuery,
  useCreateCommunityMutation,
  useRemoveCommunityMutation,
  type Community,
  type CreateCommunityInput,
} from "../graphql/communities.graphql";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { Button, ErrorMessage, Modal, Input } from "@chardb/ui";
import { toast } from "react-hot-toast";
import {
  rejectCommunitySlug,
  suggestCommunitySlug,
  COMMUNITY_SLUG_MIN_LENGTH,
  COMMUNITY_SLUG_MAX_LENGTH,
  type CommunitySlugRejection,
} from "@chardb/shared";
import { ROOT_DOMAIN, communityUrl } from "../lib/communityHost";

const SLUG_ERRORS: Record<CommunitySlugRejection, string> = {
  "too-short": `At least ${COMMUNITY_SLUG_MIN_LENGTH} characters.`,
  "too-long": `At most ${COMMUNITY_SLUG_MAX_LENGTH} characters.`,
  malformed: "Lowercase letters, numbers and interior hyphens only.",
  reserved: "That address is reserved by the site.",
};

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.md};
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  gap: ${({ theme }) => theme.spacing.md};

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const HeaderContent = styled.div`
  flex: 1;
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize.xxl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
`;

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
`;

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  align-items: center;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: stretch;
  }
`;

const SearchContainer = styled.div`
  position: relative;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const SearchInput = styled(Input)`
  padding-left: 40px;
  max-width: 400px;
`;

const SearchIcon = styled(Search)`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.colors.text.secondary};
  width: 18px;
  height: 18px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
`;

const CommunityCard = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border-radius: 12px;
  box-shadow: ${({ theme }) => theme.shadows.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing.lg};
  transition: all 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.lg};
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const CommunityName = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.xs} 0;
`;

const CommunityStats = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

const CardActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  flex-wrap: wrap;
`;

const ActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;

  &:hover {
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &.danger {
    color: ${({ theme }) => theme.colors.error};
    border-color: ${({ theme }) => theme.colors.error};

    &:hover {
      background: ${({ theme }) => theme.colors.error};
      color: white;
    }
  }
`;

const FormGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const Label = styled.label`
  display: block;
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

const SlugHint = styled.p<{ $error: boolean }>`
  margin: ${({ theme }) => theme.spacing.xs} 0 0;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme, $error }) =>
    $error ? theme.colors.error : theme.colors.text.secondary};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

export function CommunityManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // The slug is permanent once the community exists, so the form has to show
  // what it will be before anyone commits to it. It tracks the name until
  // someone types in the slug field, after which it stops following.
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  const slugRejection = newSlug ? rejectCommunitySlug(newSlug) : null;
  const slugError = slugRejection && SLUG_ERRORS[slugRejection];

  const resetCreateForm = () => {
    setNewName("");
    setNewSlug("");
    setSlugEdited(false);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    resetCreateForm();
  };

  const { data, loading, error, refetch } = useCommunitiesQuery({
    variables: { first: 50 },
  });

  const [createCommunity, { loading: creating }] = useCreateCommunityMutation({
    onCompleted: () => {
      toast.success("Community created successfully");
      closeCreateModal();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create community");
    },
  });

  const [removeCommunity] = useRemoveCommunityMutation({
    onCompleted: () => {
      toast.success("Community deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete community");
    },
  });

  const communities = data?.communities.nodes || [];
  const filteredCommunities = communities.filter((community) =>
    community.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleCreateCommunity = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const input: CreateCommunityInput = {
      name: newName,
      slug: newSlug,
    };

    createCommunity({ variables: { createCommunityInput: input } });
  };

  const handleDeleteCommunity = (community: Pick<Community, "id" | "name">) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${community.name}"? This action cannot be undone.`,
      )
    ) {
      removeCommunity({ variables: { id: community.id } });
    }
  };

  if (loading) {
    return (
      <Container>
        <div
          style={{ display: "flex", justifyContent: "center", padding: "2rem" }}
        >
          <LoadingSpinner size="lg" />
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorMessage message={error.message} />
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <HeaderContent>
          <Title>Community Management</Title>
          <Subtitle>Manage communities across the platform</Subtitle>
        </HeaderContent>
        <Actions>
          <Button
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
            icon={<Plus size={16} />}
          >
            Create Community
          </Button>
        </Actions>
      </Header>

      <SearchContainer>
        <SearchIcon />
        <SearchInput
          type="text"
          placeholder="Search communities..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </SearchContainer>

      {filteredCommunities.length === 0 ? (
        <EmptyState>
          {searchTerm
            ? "No communities match your search."
            : "No communities created yet."}
        </EmptyState>
      ) : (
        <Grid>
          {filteredCommunities.map((community) => (
            <CommunityCard key={community.id}>
              <CardHeader>
                <div>
                  <CommunityName>{community.name}</CommunityName>
                </div>
              </CardHeader>

              <CommunityStats>
                <div>
                  Created {new Date(community.createdAt).toLocaleDateString()}
                </div>
              </CommunityStats>

              <CardActions>
                {/* An anchor rather than a Link: this is the site admin's
                    list of every community, so each row points at a different
                    origin and the router cannot get there. */}
                <ActionButton
                  as="a"
                  href={communityUrl(community.slug, "/invite-codes")}
                >
                  <ExternalLink size={14} />
                  Invite Codes
                </ActionButton>
                <ActionButton>
                  <Settings size={14} />
                  Manage
                </ActionButton>
                <ActionButton
                  className="danger"
                  onClick={() => handleDeleteCommunity(community)}
                >
                  <Trash2 size={14} />
                  Delete
                </ActionButton>
              </CardActions>
            </CommunityCard>
          ))}
        </Grid>
      )}

      <Modal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        title="Create Community"
      >
        <form onSubmit={handleCreateCommunity}>
          <FormGroup>
            <Label>Community Name</Label>
            <Input
              name="name"
              type="text"
              required
              placeholder="Enter community name"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                if (!slugEdited)
                  setNewSlug(suggestCommunitySlug(e.target.value));
              }}
            />
          </FormGroup>

          <FormGroup>
            <Label>Address</Label>
            <Input
              name="slug"
              type="text"
              required
              placeholder="community-address"
              value={newSlug}
              onChange={(e) => {
                setSlugEdited(true);
                setNewSlug(e.target.value.toLowerCase());
              }}
              aria-describedby="slug-hint"
            />
            <SlugHint id="slug-hint" $error={Boolean(slugError)}>
              {slugError ??
                `Members will use ${newSlug || "address"}.${ROOT_DOMAIN}. This cannot be changed later.`}
            </SlugHint>
          </FormGroup>

          <div
            style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}
          >
            <Button
              type="button"
              variant="secondary"
              onClick={closeCreateModal}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={creating}
              disabled={!newName || Boolean(slugError) || !newSlug}
            >
              Create Community
            </Button>
          </div>
        </form>
      </Modal>
    </Container>
  );
}
