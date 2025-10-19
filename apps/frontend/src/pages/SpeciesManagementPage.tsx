import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Search, Plus, Trash2, Edit, Palette, Database } from 'lucide-react';
import { Button, Modal, Input, ErrorMessage } from '@chardb/ui';
import {
  useSpeciesByCommunityQuery,
  useCreateSpeciesMutation,
  useDeleteSpeciesMutation,
  useCommunityByIdQuery,
} from '../generated/graphql';
import { toast } from 'react-hot-toast';

/**
 * Species Management Dashboard
 *
 * Comprehensive species management interface for site administrators and community managers.
 * Provides CRUD operations for species with community-scoped filtering, search functionality,
 * and integrated navigation to trait builders and variant management.
 *
 * Features:
 * - Global species listing with pagination
 * - Community-scoped filtering via URL parameters
 * - Real-time search and filtering
 * - Species creation with community assignment
 * - Species deletion with confirmation dialogs
 * - Quick access to trait builders and variant management
 * - Responsive card-based layout
 * - Comprehensive error handling and loading states
 *
 * URL Parameters:
 * - communityId: Filter species by specific community
 *
 * Permissions:
 * - Requires canCreateSpecies permission for creation
 * - Requires canEditSpecies permission for editing/deletion
 * - Community-scoped permissions apply when filtering by community
 *
 * @example Usage in routing:
 * ```tsx
 * <Route
 *   path="/admin/species"
 *   element={<ProtectedRoute><SpeciesManagementPage /></ProtectedRoute>}
 * />
 * <Route
 *   path="/communities/:communityId/species"
 *   element={<ProtectedRoute><SpeciesManagementPage /></ProtectedRoute>}
 * />
 * ```
 */

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 0.5rem 0;
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 0;
`;

const Controls = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const SearchContainer = styled.div`
  position: relative;
  flex: 1;
  max-width: 400px;

  @media (max-width: 768px) {
    max-width: none;
  }
`;

const SearchInput = styled(Input)`
  padding-left: 2.5rem;
`;

const SearchIcon = styled(Search)`
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.colors.text.muted};
  width: 1rem;
  height: 1rem;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
`;

const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: 1.5rem;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const ClickableCard = styled(Link)`
  text-decoration: none;
  color: inherit;
  display: block;

  ${Card} {
    cursor: pointer;
  }
`;

const CardHeader = styled.div`
  margin-bottom: 1rem;
`;

const SpeciesName = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
  line-height: 1.2;
`;

const CardMeta = styled.div`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.875rem;
  margin-bottom: 1rem;

  p {
    margin: 0.25rem 0;
  }
`;

const ImageIndicator = styled.div<{ hasImage: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${({ theme, hasImage }) =>
    hasImage ? theme.colors.success : theme.colors.text.muted};
  font-size: 0.875rem;
  margin-bottom: 1rem;
`;

const Actions = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const ActionButton = styled(Button)`
  flex: 1;
  min-width: auto;
`;

const LoadingCard = styled(Card)`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: ${({ theme }) => theme.colors.text.muted};

  h3 {
    margin: 0 0 0.5rem 0;
    color: ${({ theme }) => theme.colors.text};
  }

  p {
    margin: 0;
  }
`;

const FilterInfo = styled.div`
  background: ${({ theme }) => theme.colors.primary}10;
  border: 1px solid ${({ theme }) => theme.colors.primary}30;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 500;
  }
`;

const CommunityDisplay = styled.div`
  padding: 0.75rem;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 4px;
  color: ${({ theme }) => theme.colors.text.muted};
  font-weight: 500;
`;

// Create Species Modal Form
interface CreateSpeciesFormData {
  name: string;
  hasImage: boolean;
}

interface CreateSpeciesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateSpeciesFormData) => void;
  communityName: string;
}

const CreateSpeciesModal: React.FC<CreateSpeciesModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  communityName,
}) => {
  const [formData, setFormData] = useState<CreateSpeciesFormData>({
    name: '',
    hasImage: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      setFormData({
        name: '',
        hasImage: false,
      });
      onClose();
    } catch (error) {
      console.error('Failed to create species:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Species">
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="species-name">Species Name</label>
          <Input
            id="species-name"
            type="text"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Enter species name..."
            required
            disabled={isSubmitting}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Community</label>
          <CommunityDisplay>{communityName}</CommunityDisplay>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label>
            <input
              type="checkbox"
              checked={formData.hasImage}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, hasImage: e.target.checked }))
              }
              disabled={isSubmitting}
              style={{ marginRight: '0.5rem' }}
            />
            Species has associated image
          </label>
        </div>

        <div
          style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}
        >
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !formData.name.trim()}
          >
            {isSubmitting ? 'Creating...' : 'Create Species'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export const SpeciesManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { communityId } = useParams<{ communityId: string }>();

  if (!communityId) {
    return (
      <Container>
        <Header>
          <Title>Species Management</Title>
          <Subtitle>Community ID is required</Subtitle>
        </Header>
      </Container>
    );
  }
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // GraphQL operations - Always use community-scoped query
  const {
    data: speciesData,
    loading: speciesLoading,
    error: speciesError,
    refetch,
  } = useSpeciesByCommunityQuery({
    variables: { communityId, first: 50 },
  });

  // Fetch the specific community
  const { data: communityData, loading: communityLoading } =
    useCommunityByIdQuery({
      variables: { id: communityId },
    });

  const [createSpeciesMutation] = useCreateSpeciesMutation({
    onCompleted: (data) => {
      toast.success(
        `Species "${data.createSpecies.name}" created successfully!`,
      );
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create species: ${error.message}`);
    },
  });

  const [deleteSpeciesMutation] = useDeleteSpeciesMutation({
    onCompleted: (data) => {
      toast.success(data.removeSpecies.message);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete species: ${error.message}`);
    },
  });

  // Get the specific community data
  const currentCommunity = communityData?.community;

  // Filtered species based on search query
  const filteredSpecies = useMemo(() => {
    if (!speciesData?.speciesByCommunity?.nodes) return [];

    const nodes = speciesData.speciesByCommunity.nodes;
    if (!searchQuery.trim()) return nodes;

    return nodes.filter((species) =>
      species.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [speciesData, searchQuery]);

  // Event handlers
  const handleCreateSpecies = async (formData: CreateSpeciesFormData) => {
    await createSpeciesMutation({
      variables: {
        createSpeciesInput: {
          name: formData.name,
          communityId: communityId,
          hasImage: formData.hasImage,
        },
      },
    });
  };

  const handleDeleteSpecies = async (species: (typeof filteredSpecies)[0]) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${species.name}"? This action cannot be undone and will also delete all associated variants, traits, and character data.`,
      )
    ) {
      return;
    }

    await deleteSpeciesMutation({
      variables: { id: species.id },
    });
  };

  const handleEditSpecies = (species: (typeof filteredSpecies)[0]) => {
    // Navigate to species detail/edit page
    navigate(`/species/${species.id}/edit`);
  };

  const handleManageTraits = (species: (typeof filteredSpecies)[0]) => {
    // Navigate to trait builder for this species
    navigate(`/species/${species.id}/traits`);
  };

  const handleManageVariants = (species: (typeof filteredSpecies)[0]) => {
    // Navigate to variant management for this species
    navigate(`/species/${species.id}/variants`);
  };

  // Loading state
  if (speciesLoading || communityLoading) {
    return (
      <Container>
        <Header>
          <Title>Species Management</Title>
          <Subtitle>Loading species data...</Subtitle>
        </Header>
        <Grid>
          {[...Array(6)].map((_, i) => (
            <LoadingCard key={i}>
              <Database size={24} />
              Loading...
            </LoadingCard>
          ))}
        </Grid>
      </Container>
    );
  }

  // Error state
  if (speciesError) {
    return (
      <Container>
        <Header>
          <Title>Species Management</Title>
          <Subtitle>Manage species across communities</Subtitle>
        </Header>
        <ErrorMessage
          message={`Failed to load species: ${speciesError.message}`}
        />
      </Container>
    );
  }

  const totalCount = speciesData?.speciesByCommunity?.totalCount || 0;

  return (
    <Container>
      <Header>
        <Title>Species Management</Title>
        <Subtitle>
          Manage species for {currentCommunity?.name || 'this community'} (
          {totalCount} species)
        </Subtitle>
      </Header>

      {communityId && currentCommunity && (
        <FilterInfo>
          <p>
            Explore all species in <strong>{currentCommunity.name}</strong>
          </p>
        </FilterInfo>
      )}

      <Controls>
        <SearchContainer>
          <SearchIcon />
          <SearchInput
            type="text"
            placeholder="Search species..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </SearchContainer>

        <Button
          onClick={() => setIsCreateModalOpen(true)}
          icon={<Plus size={16} />}
        >
          Create Species
        </Button>
      </Controls>

      {filteredSpecies.length === 0 && !speciesLoading ? (
        <EmptyState>
          <Database size={48} />
          <h3>No species found</h3>
          <p>
            {searchQuery
              ? `No species match your search for "${searchQuery}"`
              : 'Get started by creating your first species'}
          </p>
        </EmptyState>
      ) : (
        <Grid>
          {filteredSpecies.map((species) => (
            <ClickableCard key={species.id} to={`/species/${species.id}`}>
              <Card>
                <CardHeader>
                  <SpeciesName>{species.name}</SpeciesName>
                </CardHeader>

                <ImageIndicator hasImage={species.hasImage}>
                  <Palette size={16} />
                  {species.hasImage ? 'Has image' : 'No image'}
                </ImageIndicator>

                <CardMeta>
                  <p>
                    Created: {new Date(species.createdAt).toLocaleDateString()}
                  </p>
                  <p>
                    Last updated:{' '}
                    {new Date(species.updatedAt).toLocaleDateString()}
                  </p>
                </CardMeta>

                <Actions
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <ActionButton
                    variant="secondary"
                    size="sm"
                    onClick={() => handleManageTraits(species)}
                    icon={<Database size={14} />}
                  >
                    Traits
                  </ActionButton>
                  <ActionButton
                    variant="secondary"
                    size="sm"
                    onClick={() => handleManageVariants(species)}
                    icon={<Palette size={14} />}
                  >
                    Variants
                  </ActionButton>
                  <ActionButton
                    variant="secondary"
                    size="sm"
                    onClick={() => handleEditSpecies(species)}
                    icon={<Edit size={14} />}
                  >
                    Edit
                  </ActionButton>
                  <ActionButton
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteSpecies(species)}
                    icon={<Trash2 size={14} />}
                  >
                    Delete
                  </ActionButton>
                </Actions>
              </Card>
            </ClickableCard>
          ))}
        </Grid>
      )}

      <CreateSpeciesModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSpecies}
        communityName={currentCommunity?.name || 'Loading...'}
      />
    </Container>
  );
};
