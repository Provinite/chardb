import React, { useState } from "react";
import { usePageMeta } from "../lib/pageMeta";
import styled from "styled-components";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Plus, Edit, Trash2, ArrowUpDown } from "lucide-react";
import { Button, Cluster, Modal, Input, ErrorMessage } from "@chardb/ui";
import {
  useEnumValuesByTraitQuery,
  useTraitByIdQuery,
  useCreateEnumValueMutation,
  useUpdateEnumValueMutation,
  useDeleteEnumValueMutation,
  useReorderEnumValuesMutation,
  EnumValuesByTraitQuery,
} from "../generated/graphql";
import { toast } from "react-hot-toast";
import { ColorSelector, ColorPip } from "../components/colors";
import { SortableList } from "../components/reorder/SortableList";
import { sortCachedConnection, sortCachedListField } from "../lib/reorderCache";
import { useCanEditSpecies } from "../hooks/useCanManageSpecies";

/**
 * Enum Value Management Interface for ENUM-type Traits
 *
 * Comprehensive enum value management system for configuring predefined options
 * for ENUM-type traits. Provides CRUD operations, ordering management, and
 * real-time validation for enum values.
 *
 * Features:
 * - Enum value listing, ordered by drag-and-drop or up/down buttons
 * - Real-time enum value CRUD operations
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

const EnumValueName = styled.div`
  font-size: 1.125rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow-wrap: anywhere;
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
  colorId?: string | null;
}

interface EnumValueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EnumValueFormData) => void;
  enumValue?: EnumValuesByTraitQuery["enumValuesByTrait"]["nodes"][0];
  title: string;
  communityId: string;
}

const EnumValueModal: React.FC<EnumValueModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  enumValue,
  title,
  communityId,
}) => {
  const [formData, setFormData] = useState<EnumValueFormData>({
    name: enumValue?.name || "",
    colorId: enumValue?.colorId || null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form data when enumValue changes (e.g., when opening edit modal for a different enum value)
  React.useEffect(() => {
    setFormData({
      name: enumValue?.name || "",
      colorId: enumValue?.colorId || null,
    });
  }, [enumValue]);

  // Check if form has changes (for edit mode)
  const hasChanges = enumValue
    ? formData.name !== enumValue.name || formData.colorId !== enumValue.colorId
    : true; // For create mode, always allow submission if name is filled

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      if (!enumValue) {
        setFormData({ name: "", colorId: null });
      }
      onClose();
    } catch (error) {
      console.error("Failed to save enum value:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
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

        <div style={{ marginBottom: "1.5rem" }}>
          <ColorSelector
            communityId={communityId}
            value={formData.colorId}
            onChange={(colorId) =>
              setFormData((prev) => ({ ...prev, colorId }))
            }
            label="Color (Optional)"
            placeholder="No color"
            disabled={isSubmitting}
          />
          <p
            style={{
              fontSize: "0.875rem",
              color: "#666",
              margin: "0.25rem 0 0 0",
            }}
          >
            Assign a color to help visually distinguish this option
          </p>
        </div>

        <div
          style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}
        >
          <Button
            type="button"
            tone="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !formData.name.trim() || !hasChanges}
          >
            {isSubmitting
              ? "Saving..."
              : enumValue
                ? "Update Option"
                : "Create Option"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export const EnumValueManagementPage: React.FC = () => {
  usePageMeta({ title: "Trait Values" });

  const { traitId } = useParams<{ traitId: string }>();
  const navigate = useNavigate();
  const canEdit = useCanEditSpecies();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingEnumValue, setEditingEnumValue] = useState<
    EnumValuesByTraitQuery["enumValuesByTrait"]["nodes"][0] | null
  >(null);

  // GraphQL operations
  const {
    data: enumValuesData,
    loading: enumValuesLoading,
    error: enumValuesError,
    refetch,
  } = useEnumValuesByTraitQuery({
    // A reorder names every option, so the page must hold them all.
    variables: { traitId: traitId ?? "", first: 500 },
    skip: !traitId,
  });

  const {
    data: traitData,
    loading: traitLoading,
    error: traitError,
  } = useTraitByIdQuery({
    variables: { id: traitId ?? "" },
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

  const [reorderEnumValuesMutation] = useReorderEnumValuesMutation({
    onError: (error) => {
      toast.error(`Failed to reorder options: ${error.message}`);
      void refetch();
    },
  });

  const enumValues = enumValuesData?.enumValuesByTrait?.nodes || [];
  const sortedEnumValues = [...enumValues].sort((a, b) => a.order - b.order);

  if (!traitId) {
    return (
      <Container>
        <ErrorMessage message="Trait ID is required" />
      </Container>
    );
  }

  // Event handlers
  const handleCreateEnumValue = async (formData: EnumValueFormData) => {
    await createEnumValueMutation({
      variables: {
        createEnumValueInput: {
          name: formData.name,
          traitId,
          colorId: formData.colorId,
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
          colorId: formData.colorId,
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

  const handleReorder = (enumValueIds: string[]) => {
    void reorderEnumValuesMutation({
      variables: { input: { traitId, enumValueIds } },
      optimisticResponse: {
        reorderEnumValues: enumValueIds.map((id, order) => ({
          __typename: "EnumValue" as const,
          id,
          order,
        })),
      },
      update: (cache) => {
        sortCachedConnection(cache, "enumValuesByTrait", "order");
        sortCachedListField(
          cache,
          cache.identify({ __typename: "Trait", id: traitId }),
          "enumValues",
          "order",
        );
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
        <Link to="/species">Species Management</Link>
        <span>/</span>
        <Link to={`/species/${trait.species?.id}`}>
          {trait.species?.name || "Species"}
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
            tone="secondary"
            onClick={() => navigate(`/species/${trait.species?.id}/traits`)}
          >
            Back to Traits
          </Button>
          {canEdit && (
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              icon={<Plus size={16} />}
            >
              Add Option
            </Button>
          )}
        </HeaderRight>
      </Header>

      {sortedEnumValues.length === 0 ? (
        <EmptyState>
          <ArrowUpDown size={48} />
          <h3>No options configured</h3>
          <p>Add predefined options that users can select for this trait.</p>
          {canEdit && (
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              icon={<Plus size={16} />}
            >
              Create Your First Option
            </Button>
          )}
        </EmptyState>
      ) : (
        <SortableList
          aria-label={`${trait.name} options`}
          items={sortedEnumValues}
          getId={(enumValue) => enumValue.id}
          getName={(enumValue) => enumValue.name}
          onReorder={handleReorder}
          editable={canEdit}
        >
          {(enumValue) => (
            <Cluster justify="space-between" gap="sm">
              <Cluster gap="sm">
                {enumValue.color && (
                  <ColorPip color={enumValue.color.hexCode} size="md" />
                )}
                <EnumValueName>{enumValue.name}</EnumValueName>
              </Cluster>
              {canEdit && (
                <Cluster gap="sm">
                  <Button
                    tone="secondary"
                    size="sm"
                    onClick={() => handleEditEnumValue(enumValue)}
                    icon={<Edit size={14} aria-hidden />}
                  >
                    Edit
                  </Button>
                  <Button
                    tone="danger"
                    size="sm"
                    onClick={() => handleDeleteEnumValue(enumValue)}
                    icon={<Trash2 size={14} aria-hidden />}
                  >
                    Delete
                  </Button>
                </Cluster>
              )}
            </Cluster>
          )}
        </SortableList>
      )}

      {/* Create Enum Value Modal */}
      <EnumValueModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateEnumValue}
        title="Create New Option"
        communityId={trait.species?.communityId || ""}
      />

      {/* Edit Enum Value Modal */}
      <EnumValueModal
        isOpen={!!editingEnumValue}
        onClose={() => setEditingEnumValue(null)}
        onSubmit={handleUpdateEnumValue}
        enumValue={editingEnumValue || undefined}
        title="Edit Option"
        communityId={trait.species?.communityId || ""}
      />
    </Container>
  );
};
