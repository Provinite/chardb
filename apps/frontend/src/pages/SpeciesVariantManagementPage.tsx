import React, { useState } from 'react';
import styled from 'styled-components';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Plus, Trash2, Palette, Database, Settings } from 'lucide-react';
import {
  Button, Modal, Input, ErrorMessage,
  Card, CardHeader, CardMeta, CardActions,
  Title, Subtitle
} from '@chardb/ui';
import {
  useSpeciesByIdQuery,
  useSpeciesVariantsBySpeciesQuery,
  useCreateSpeciesVariantMutation,
  useDeleteSpeciesVariantMutation,
} from '../generated/graphql';
import { toast } from 'react-hot-toast';
import { ColorPip } from '../components/colors';

/**
 * Species Variant Management Interface
 * 
 * Comprehensive variant management for species with trait inheritance configuration.
 * Allows creation, editing, and deletion of species variants along with their
 * trait configurations and enum value settings.
 */

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const Breadcrumb = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 2rem;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.muted};
  
  a {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
  }
`;

const HeaderLeft = styled.div`
  flex: 1;
`;

const HeaderRight = styled.div`
  display: flex;
  gap: 1rem;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
`;

const VariantName = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
  line-height: 1.2;
`;

const ActionButton = styled(Button)`
  flex: 1;
  min-width: auto;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: ${({ theme }) => theme.colors.text.muted};

  h3 {
    margin: 0 0 0.5rem 0;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  p {
    margin: 0 0 1rem 0;
  }
`;

// Create Variant Modal
interface VariantFormData {
  name: string;
}

interface VariantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: VariantFormData) => void;
}

const VariantModal: React.FC<VariantModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<VariantFormData>({
    name: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      setFormData({ name: '' });
      onClose();
    } catch (error) {
      console.error('Failed to create variant:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Variant">
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="variant-name">Variant Name</label>
          <Input
            id="variant-name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter variant name..."
            required
            disabled={isSubmitting}
          />
          <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
            Examples: "Common", "Rare", "Shiny", "Adult", "Juvenile", etc.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
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
            {isSubmitting ? 'Creating...' : 'Create Variant'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export const SpeciesVariantManagementPage: React.FC = () => {
  const { speciesId } = useParams<{ speciesId: string }>();
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  if (!speciesId) {
    return (
      <Container>
        <ErrorMessage message="Species ID is required" />
      </Container>
    );
  }

  // GraphQL operations
  const { data: speciesData, loading: speciesLoading, error: speciesError } = useSpeciesByIdQuery({
    variables: { id: speciesId }
  });

  const { data: variantsData, loading: variantsLoading, error: variantsError, refetch } = useSpeciesVariantsBySpeciesQuery({
    variables: { speciesId: speciesId!, first: 100 },
    skip: !speciesId,
  });

  const variants = variantsData?.speciesVariantsBySpecies?.nodes || [];

  const [createVariantMutation] = useCreateSpeciesVariantMutation({
    onCompleted: (data) => {
      toast.success(`Variant "${data.createSpeciesVariant.name}" created successfully!`);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create variant: ${error.message}`);
    }
  });

  const [deleteVariantMutation] = useDeleteSpeciesVariantMutation({
    onCompleted: (data) => {
      toast.success(data.removeSpeciesVariant.message);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete variant: ${error.message}`);
    }
  });

  // Event handlers
  const handleCreateVariant = async (formData: VariantFormData) => {
    await createVariantMutation({
      variables: {
        createSpeciesVariantInput: {
          name: formData.name,
          speciesId
        }
      }
    });
  };

  const handleDeleteVariant = async (variant: typeof variants[0]) => {
    if (!window.confirm(`Are you sure you want to delete the variant "${variant.name}"? This will also delete all associated trait configurations and character data.`)) {
      return;
    }

    await deleteVariantMutation({
      variables: { id: variant.id }
    });
  };

  const handleManageVariant = (variant: typeof variants[0]) => {
    navigate(`/variants/${variant.id}/manage`);
  };

  // Loading states
  if (speciesLoading || variantsLoading) {
    return (
      <Container>
        <Title>Species Variants</Title>
        <Subtitle>Loading variant configuration...</Subtitle>
      </Container>
    );
  }

  // Error states
  if (speciesError || variantsError) {
    return (
      <Container>
        <ErrorMessage 
          message={`Failed to load data: ${speciesError?.message || variantsError?.message}`}
        />
      </Container>
    );
  }

  const species = speciesData?.speciesById;

  if (!species) {
    return (
      <Container>
        <ErrorMessage message="Species not found" />
      </Container>
    );
  }

  return (
    <Container>
      <Breadcrumb>
        <Link to={`/communities/${species.communityId}/species`}>Species Management</Link>
        <span>/</span>
        <Link to={`/species/${species.id}`}>{species.name}</Link>
        <span>/</span>
        <span>Variants</span>
      </Breadcrumb>

      <Header>
        <HeaderLeft>
          <Title>Species Variants</Title>
          <Subtitle>
            Manage variants for {species.name} ({variants.length} variants)
          </Subtitle>
        </HeaderLeft>

        <HeaderRight>
          <Button
            variant="secondary"
            onClick={() => navigate(`/species/${speciesId}/traits`)}
            icon={<Database size={16} />}
          >
            Manage Traits
          </Button>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            icon={<Plus size={16} />}
          >
            Add Variant
          </Button>
        </HeaderRight>
      </Header>

      {variants.length === 0 ? (
        <EmptyState>
          <Palette size={48} />
          <h3>No variants configured</h3>
          <p>
            Variants allow you to create different versions of this species with unique trait configurations.
            For example: Common/Rare variants, Adult/Juvenile forms, or different color patterns.
          </p>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            icon={<Plus size={16} />}
          >
            Create Your First Variant
          </Button>
        </EmptyState>
      ) : (
        <Grid>
          {variants.map((variant) => (
            <Card key={variant.id}>
              <CardHeader>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <VariantName>{variant.name}</VariantName>
                  {variant.color && (
                    <ColorPip color={variant.color.hexCode} size="sm" />
                  )}
                </div>
              </CardHeader>

              <CardMeta>
                <p>Created: {new Date(variant.createdAt).toLocaleDateString()}</p>
                <p>Last updated: {new Date(variant.updatedAt).toLocaleDateString()}</p>
              </CardMeta>

              <CardActions>
                <ActionButton
                  variant="primary"
                  size="sm"
                  onClick={() => handleManageVariant(variant)}
                  icon={<Settings size={14} />}
                >
                  Manage
                </ActionButton>
                <ActionButton
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeleteVariant(variant)}
                  icon={<Trash2 size={14} />}
                >
                  Delete
                </ActionButton>
              </CardActions>
            </Card>
          ))}
        </Grid>
      )}

      {/* Create Variant Modal */}
      <VariantModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateVariant}
      />
    </Container>
  );
};