import React, { useState } from 'react';
import styled from 'styled-components';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Settings, Palette, Database } from 'lucide-react';
import {
  Button,
  Modal,
  Input,
  ErrorMessage,
  Card,
  CardHeader,
  CardMeta,
  CardActions,
  CardSection,
  CardSectionTitle,
  CardSectionContent,
  Title,
  Subtitle,
} from '@chardb/ui';
import {
  useSpeciesByIdQuery,
  useSpeciesVariantsBySpeciesQuery,
  useCreateSpeciesVariantMutation,
  useUpdateSpeciesVariantMutation,
  useDeleteSpeciesVariantMutation,
  SpeciesVariantsBySpeciesQuery,
} from '../generated/graphql';
import { toast } from 'react-hot-toast';

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

// Create/Edit Variant Modal
interface VariantFormData {
  name: string;
}

interface VariantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: VariantFormData) => void;
  variant?: SpeciesVariantsBySpeciesQuery['speciesVariantsBySpecies']['nodes'][0];
  title: string;
}

const VariantModal: React.FC<VariantModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  variant,
  title,
}) => {
  const [formData, setFormData] = useState<VariantFormData>({
    name: variant?.name || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      if (!variant) {
        setFormData({ name: '' });
      }
      onClose();
    } catch (error) {
      console.error('Failed to save variant:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="variant-name">Variant Name</label>
          <Input
            id="variant-name"
            type="text"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Enter variant name..."
            required
            disabled={isSubmitting}
          />
          <p
            style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}
          >
            Examples: "Common", "Rare", "Shiny", "Adult", "Juvenile", etc.
          </p>
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
            {isSubmitting
              ? 'Saving...'
              : variant
                ? 'Update Variant'
                : 'Create Variant'}
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
  const [editingVariant, setEditingVariant] = useState<
    SpeciesVariantsBySpeciesQuery['speciesVariantsBySpecies']['nodes'][0] | null
  >(null);

  const {
    data: speciesData,
    loading: speciesLoading,
    error: speciesError,
  } = useSpeciesByIdQuery({
    variables: { id: speciesId || '' },
    skip: !speciesId,
  });

  const {
    data: variantsData,
    loading: variantsLoading,
    error: variantsError,
    refetch,
  } = useSpeciesVariantsBySpeciesQuery({
    variables: { speciesId: speciesId || '', first: 100 },
    skip: !speciesId,
  });

  const [createVariantMutation] = useCreateSpeciesVariantMutation({
    onCompleted: (data) => {
      toast.success(
        `Variant "${data.createSpeciesVariant.name}" created successfully!`,
      );
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create variant: ${error.message}`);
    },
  });

  const [updateVariantMutation] = useUpdateSpeciesVariantMutation({
    onCompleted: (data) => {
      toast.success(
        `Variant "${data.updateSpeciesVariant.name}" updated successfully!`,
      );
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update variant: ${error.message}`);
    },
  });

  const [deleteVariantMutation] = useDeleteSpeciesVariantMutation({
    onCompleted: (data) => {
      toast.success(data.removeSpeciesVariant.message);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete variant: ${error.message}`);
    },
  });

  if (!speciesId) {
    return (
      <Container>
        <ErrorMessage message="Species ID is required" />
      </Container>
    );
  }

  const variants = variantsData?.speciesVariantsBySpecies?.nodes || [];

  // Event handlers
  const handleCreateVariant = async (formData: VariantFormData) => {
    await createVariantMutation({
      variables: {
        createSpeciesVariantInput: {
          name: formData.name,
          speciesId,
        },
      },
    });
  };

  const handleUpdateVariant = async (formData: VariantFormData) => {
    if (!editingVariant) return;

    await updateVariantMutation({
      variables: {
        id: editingVariant.id,
        updateSpeciesVariantInput: {
          name: formData.name,
        },
      },
    });
  };

  const handleDeleteVariant = async (variant: (typeof variants)[0]) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the variant "${variant.name}"? This will also delete all associated trait configurations and character data.`,
      )
    ) {
      return;
    }

    await deleteVariantMutation({
      variables: { id: variant.id },
    });
  };

  const handleEditVariant = (variant: (typeof variants)[0]) => {
    setEditingVariant(variant);
  };

  const handleConfigureTraits = (variant: (typeof variants)[0]) => {
    navigate(`/variants/${variant.id}/trait-config`);
  };

  const handleManageEnumSettings = (variant: (typeof variants)[0]) => {
    navigate(`/variants/${variant.id}/enum-settings`);
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
        <Link to={`/communities/${species.communityId}/species`}>
          Species Management
        </Link>
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
            Variants allow you to create different versions of this species with
            unique trait configurations. For example: Common/Rare variants,
            Adult/Juvenile forms, or different color patterns.
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
                <VariantName>{variant.name}</VariantName>
              </CardHeader>

              <CardMeta>
                <p>
                  Created: {new Date(variant.createdAt).toLocaleDateString()}
                </p>
                <p>
                  Last updated:{' '}
                  {new Date(variant.updatedAt).toLocaleDateString()}
                </p>
              </CardMeta>

              <CardSection>
                <CardSectionTitle>
                  <Settings size={14} />
                  Trait Configuration
                </CardSectionTitle>
                <CardSectionContent>
                  Configure which traits are available for this variant and
                  their default values. Set up enum value restrictions and
                  inheritance rules.
                </CardSectionContent>
              </CardSection>

              <CardActions>
                <ActionButton
                  variant="secondary"
                  size="sm"
                  onClick={() => handleConfigureTraits(variant)}
                  icon={<Database size={14} />}
                >
                  Traits
                </ActionButton>
                <ActionButton
                  variant="secondary"
                  size="sm"
                  onClick={() => handleManageEnumSettings(variant)}
                  icon={<Settings size={14} />}
                >
                  Options
                </ActionButton>
                <ActionButton
                  variant="secondary"
                  size="sm"
                  onClick={() => handleEditVariant(variant)}
                  icon={<Edit size={14} />}
                >
                  Edit
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
        title="Create New Variant"
      />

      {/* Edit Variant Modal */}
      <VariantModal
        isOpen={!!editingVariant}
        onClose={() => setEditingVariant(null)}
        onSubmit={handleUpdateVariant}
        variant={editingVariant || undefined}
        title="Edit Variant"
      />
    </Container>
  );
};
