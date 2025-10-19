import React, { useState } from 'react';
import styled from 'styled-components';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Plus,
  Edit,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Button, Modal, Input, ErrorMessage } from '@chardb/ui';
import {
  useEnumValuesByTraitQuery,
  useTraitByIdQuery,
  useCreateEnumValueMutation,
  useUpdateEnumValueMutation,
  useDeleteEnumValueMutation,
  EnumValuesByTraitQuery,
} from '../generated/graphql';
import { toast } from 'react-hot-toast';

/**
 * Enum Value Management Interface for ENUM-type Traits
 *
 * Comprehensive enum value management system for configuring predefined options
 * for ENUM-type traits. Provides CRUD operations, ordering management, and
 * real-time validation for enum values.
 *
 * Features:
 * - Visual enum value listing with drag-and-drop ordering (future)
 * - Real-time enum value CRUD operations
 * - Order management with up/down arrows
 * - Comprehensive error handling and loading states
 * - Breadcrumb navigation with trait and species context
 * - Responsive design optimized for enum value workflows
 *
 * URL Structure: /traits/:traitId/enum-values
 *
 * @example Usage in routing:
 * ```tsx
 * <Route
 *   path="/traits/:traitId/enum-values"
 *   element={<ProtectedRoute><EnumValueManagementPage /></ProtectedRoute>}
 * />
 * ```
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

const Title = styled.h1`
  font-size: 2rem;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 0.5rem 0;
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 0;
`;

const HeaderRight = styled.div`
  display: flex;
  gap: 1rem;
`;

const EnumValueList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
`;

const EnumValueCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
`;

const EnumValueInfo = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const OrderBadge = styled.div`
  background: ${({ theme }) => theme.colors.primary}20;
  color: ${({ theme }) => theme.colors.primary};
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  min-width: 40px;
  text-align: center;
`;

const EnumValueName = styled.div`
  font-size: 1.125rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const EnumValueMeta = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const EnumValueActions = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
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

// Create/Edit Enum Value Modal Form
interface EnumValueFormData {
  name: string;
  order: number;
}

interface EnumValueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EnumValueFormData) => void;
  enumValue?: EnumValuesByTraitQuery['enumValuesByTrait']['nodes'][0];
  title: string;
  maxOrder: number;
}

const EnumValueModal: React.FC<EnumValueModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  enumValue,
  title,
  maxOrder,
}) => {
  const [formData, setFormData] = useState<EnumValueFormData>({
    name: enumValue?.name || '',
    order: enumValue?.order || maxOrder + 1,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      if (!enumValue) {
        setFormData({ name: '', order: maxOrder + 1 });
      }
      onClose();
    } catch (error) {
      console.error('Failed to save enum value:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="enum-value-name">Option Name</label>
          <Input
            id="enum-value-name"
            type="text"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Enter option name..."
            required
            disabled={isSubmitting}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="enum-value-order">Display Order</label>
          <Input
            id="enum-value-order"
            type="number"
            min="1"
            value={formData.order}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                order: parseInt(e.target.value) || 1,
              }))
            }
            required
            disabled={isSubmitting}
          />
          <p
            style={{
              fontSize: '0.875rem',
              color: '#666',
              margin: '0.25rem 0 0 0',
            }}
          >
            Lower numbers appear first in selection lists
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
              : enumValue
                ? 'Update Option'
                : 'Create Option'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export const EnumValueManagementPage: React.FC = () => {
  const { traitId } = useParams<{ traitId: string }>();
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingEnumValue, setEditingEnumValue] = useState<
    EnumValuesByTraitQuery['enumValuesByTrait']['nodes'][0] | null
  >(null);

  const {
    data: enumValuesData,
    loading: enumValuesLoading,
    error: enumValuesError,
    refetch,
  } = useEnumValuesByTraitQuery({
    variables: { traitId: traitId || '', first: 100 },
    skip: !traitId,
  });

  const {
    data: traitData,
    loading: traitLoading,
    error: traitError,
  } = useTraitByIdQuery({
    variables: { id: traitId || '' },
    skip: !traitId,
  });

  const [createEnumValueMutation] = useCreateEnumValueMutation({
    onCompleted: (data) => {
      toast.success(
        `Option "${data.createEnumValue.name}" created successfully!`,
      );
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create option: ${error.message}`);
    },
  });

  const [updateEnumValueMutation] = useUpdateEnumValueMutation({
    onCompleted: (data) => {
      toast.success(
        `Option "${data.updateEnumValue.name}" updated successfully!`,
      );
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update option: ${error.message}`);
    },
  });

  const [deleteEnumValueMutation] = useDeleteEnumValueMutation({
    onCompleted: (data) => {
      toast.success(data.removeEnumValue.message);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete option: ${error.message}`);
    },
  });

  if (!traitId) {
    return (
      <Container>
        <ErrorMessage message="Trait ID is required" />
      </Container>
    );
  }

  const enumValues = enumValuesData?.enumValuesByTrait?.nodes || [];
  const sortedEnumValues = [...enumValues].sort((a, b) => a.order - b.order);
  const maxOrder = enumValues.reduce((max, ev) => Math.max(max, ev.order), 0);

  // Event handlers
  const handleCreateEnumValue = async (formData: EnumValueFormData) => {
    await createEnumValueMutation({
      variables: {
        createEnumValueInput: {
          name: formData.name,
          order: formData.order,
          traitId,
        },
      },
    });
  };

  const handleUpdateEnumValue = async (formData: EnumValueFormData) => {
    if (!editingEnumValue) return;

    await updateEnumValueMutation({
      variables: {
        id: editingEnumValue.id,
        updateEnumValueInput: {
          name: formData.name,
          order: formData.order,
        },
      },
    });
  };

  const handleDeleteEnumValue = async (
    enumValue: (typeof sortedEnumValues)[0],
  ) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the option "${enumValue.name}"? This will also delete all associated character trait data using this value.`,
      )
    ) {
      return;
    }

    await deleteEnumValueMutation({
      variables: { id: enumValue.id },
    });
  };

  const handleEditEnumValue = (enumValue: (typeof sortedEnumValues)[0]) => {
    setEditingEnumValue(enumValue);
  };

  const handleMoveUp = async (enumValue: (typeof sortedEnumValues)[0]) => {
    const currentIndex = sortedEnumValues.findIndex(
      (ev) => ev.id === enumValue.id,
    );
    if (currentIndex <= 0) return;

    const newOrder = sortedEnumValues[currentIndex - 1].order;
    await updateEnumValueMutation({
      variables: {
        id: enumValue.id,
        updateEnumValueInput: { order: newOrder - 0.5 },
      },
    });
  };

  const handleMoveDown = async (enumValue: (typeof sortedEnumValues)[0]) => {
    const currentIndex = sortedEnumValues.findIndex(
      (ev) => ev.id === enumValue.id,
    );
    if (currentIndex >= sortedEnumValues.length - 1) return;

    const newOrder = sortedEnumValues[currentIndex + 1].order;
    await updateEnumValueMutation({
      variables: {
        id: enumValue.id,
        updateEnumValueInput: { order: newOrder + 0.5 },
      },
    });
  };

  // Loading states
  if (traitLoading || enumValuesLoading) {
    return (
      <Container>
        <Title>Enum Value Management</Title>
        <Subtitle>Loading trait and options...</Subtitle>
      </Container>
    );
  }

  // Error states
  if (traitError || enumValuesError) {
    return (
      <Container>
        <ErrorMessage
          message={`Failed to load data: ${traitError?.message || enumValuesError?.message}`}
        />
      </Container>
    );
  }

  const trait = traitData?.traitById;

  if (!trait) {
    return (
      <Container>
        <ErrorMessage message="Trait not found" />
      </Container>
    );
  }

  return (
    <Container>
      <Breadcrumb>
        <Link to={`/communities/${trait.species?.communityId}/species`}>
          Species Management
        </Link>
        <span>/</span>
        <Link to={`/species/${trait.species?.id}`}>
          {trait.species?.name || 'Species'}
        </Link>
        <span>/</span>
        <Link to={`/species/${trait.species?.id}/traits`}>Traits</Link>
        <span>/</span>
        <span>{trait.name}</span>
        <span>/</span>
        <span>Options</span>
      </Breadcrumb>

      <Header>
        <HeaderLeft>
          <Title>Manage Options</Title>
          <Subtitle>
            Configure options for "{trait.name}" trait (
            {sortedEnumValues.length} options)
          </Subtitle>
        </HeaderLeft>

        <HeaderRight>
          <Button
            variant="secondary"
            onClick={() => navigate(`/species/${trait.species?.id}/traits`)}
          >
            Back to Traits
          </Button>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            icon={<Plus size={16} />}
          >
            Add Option
          </Button>
        </HeaderRight>
      </Header>

      {sortedEnumValues.length === 0 ? (
        <EmptyState>
          <ArrowUpDown size={48} />
          <h3>No options configured</h3>
          <p>Add predefined options that users can select for this trait.</p>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            icon={<Plus size={16} />}
          >
            Create Your First Option
          </Button>
        </EmptyState>
      ) : (
        <EnumValueList>
          {sortedEnumValues.map((enumValue, index) => (
            <EnumValueCard key={enumValue.id}>
              <EnumValueInfo>
                <OrderBadge>#{enumValue.order}</OrderBadge>
                <div>
                  <EnumValueName>{enumValue.name}</EnumValueName>
                  <EnumValueMeta>
                    Created:{' '}
                    {new Date(enumValue.createdAt).toLocaleDateString()}
                  </EnumValueMeta>
                </div>
              </EnumValueInfo>

              <EnumValueActions>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleMoveUp(enumValue)}
                  disabled={index === 0}
                  icon={<ArrowUp size={14} />}
                >
                  Up
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleMoveDown(enumValue)}
                  disabled={index === sortedEnumValues.length - 1}
                  icon={<ArrowDown size={14} />}
                >
                  Down
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleEditEnumValue(enumValue)}
                  icon={<Edit size={14} />}
                >
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeleteEnumValue(enumValue)}
                  icon={<Trash2 size={14} />}
                >
                  Delete
                </Button>
              </EnumValueActions>
            </EnumValueCard>
          ))}
        </EnumValueList>
      )}

      {/* Create Enum Value Modal */}
      <EnumValueModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateEnumValue}
        title="Create New Option"
        maxOrder={maxOrder}
      />

      {/* Edit Enum Value Modal */}
      <EnumValueModal
        isOpen={!!editingEnumValue}
        onClose={() => setEditingEnumValue(null)}
        onSubmit={handleUpdateEnumValue}
        enumValue={editingEnumValue || undefined}
        title="Edit Option"
        maxOrder={maxOrder}
      />
    </Container>
  );
};
