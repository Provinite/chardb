import React, { useState } from "react";
import styled from "styled-components";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Plus,
  Edit,
  Trash2,
  Type,
  Hash,
  Calendar,
  List,
  Settings,
} from "lucide-react";
import { Button, Modal, Input, ErrorMessage } from "@chardb/ui";
import {
  useTraitsBySpeciesQuery,
  useSpeciesByIdQuery,
  useCreateTraitMutation,
  useUpdateTraitMutation,
  useDeleteTraitMutation,
  TraitValueType,
  TraitsBySpeciesQuery,
} from "../generated/graphql";
import { toast } from "react-hot-toast";

/**
 * Trait Builder Interface for Species Configuration
 *
 * Advanced trait management system for configuring species characteristics.
 * Supports all trait value types (STRING, INTEGER, TIMESTAMP, ENUM) with
 * specialized interfaces for each type. Provides comprehensive trait CRUD
 * operations, ordering, and enum value management.
 *
 * Features:
 * - Visual trait type selection with icons and descriptions
 * - Drag-and-drop trait ordering (future enhancement)
 * - Enum value management for ENUM-type traits
 * - Real-time trait validation and error handling
 * - Breadcrumb navigation with species context
 * - Responsive design for trait configuration workflows
 *
 * Trait Types Supported:
 * - STRING: Text-based traits (names, descriptions, etc.)
 * - INTEGER: Numeric traits (age, level, stats, etc.)
 * - TIMESTAMP: Date/time traits (birthdate, events, etc.)
 * - ENUM: Predefined value sets (colors, rarities, etc.)
 *
 *
 * URL Structure: /species/:speciesId/traits
 *
 * @example Usage in routing:
 * ```tsx
 * <Route
 *   path="/species/:speciesId/traits"
 *   element={<ProtectedRoute><TraitBuilderPage /></ProtectedRoute>}
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

const TraitGrid = styled.div`
  display: grid;
  gap: 1rem;
  margin-bottom: 2rem;
`;

const TraitCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  padding: 1.5rem;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
`;

const TraitHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const TraitInfo = styled.div`
  flex: 1;
`;

const TraitName = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 0.5rem 0;
`;

const TraitType = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.875rem;
`;

const TraitActions = styled.div`
  display: flex;
  gap: 0.5rem;
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

// Type icon mapping
const getTraitTypeIcon = (type: TraitValueType) => {
  switch (type) {
    case TraitValueType.String:
      return <Type size={16} />;
    case TraitValueType.Integer:
      return <Hash size={16} />;
    case TraitValueType.Timestamp:
      return <Calendar size={16} />;
    case TraitValueType.Enum:
      return <List size={16} />;
    default:
      return <Settings size={16} />;
  }
};

const getTraitTypeLabel = (type: TraitValueType) => {
  switch (type) {
    case TraitValueType.String:
      return "Text";
    case TraitValueType.Integer:
      return "Number";
    case TraitValueType.Timestamp:
      return "Date/Time";
    case TraitValueType.Enum:
      return "Selection";
    default:
      return "Unknown";
  }
};

const getTraitTypeDescription = (type: TraitValueType) => {
  switch (type) {
    case TraitValueType.String:
      return "Text-based traits like names, descriptions, or free-form content";
    case TraitValueType.Integer:
      return "Numeric traits for ages, levels, stats, or measurements";
    case TraitValueType.Timestamp:
      return "Date and time traits for birthdays, events, or milestones";
    case TraitValueType.Enum:
      return "Predefined options like colors, rarities, or categories";
    default:
      return "";
  }
};

// Styled components for the modal
const ValueTypeOption = styled.label<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  padding: 0.75rem;
  border: 1px solid ${({ theme, $selected }) => 
    $selected ? theme.colors.primary : theme.colors.border};
  border-radius: 4px;
  cursor: pointer;
  background-color: ${({ theme, $selected }) => 
    $selected ? theme.colors.primary + '20' : theme.colors.surface};
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    background-color: ${({ theme }) => theme.colors.primary + '10'};
  }
`;

const ValueTypeContent = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
`;

const ValueTypeLabel = styled.div`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ValueTypeDescription = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const ValueTypeRadio = styled.input.attrs({ type: 'radio' })`
  margin-right: 0.75rem;
  accent-color: ${({ theme }) => theme.colors.primary};
`;

const FormSection = styled.div`
  margin-bottom: 1rem;
`;

const FormLabel = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ValueTypeGrid = styled.div`
  display: grid;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const FormNote = styled.p`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.muted};
  margin-top: 0.5rem;
  margin-bottom: 0;
`;

const FormActions = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
`;

// Create/Edit Trait Modal
interface TraitFormData {
  name: string;
  valueType: TraitValueType;
  allowsMultipleValues?: boolean;
}

interface TraitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TraitFormData) => void;
  trait?: TraitsBySpeciesQuery['traitsBySpecies']['nodes'][0];
  title: string;
}

const TraitModal: React.FC<TraitModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  trait,
  title,
}) => {
  const [formData, setFormData] = useState<TraitFormData>({
    name: trait?.name || "",
    valueType: trait?.valueType || TraitValueType.String,
    allowsMultipleValues: trait?.allowsMultipleValues || false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      if (!trait) {
        setFormData({ name: "", valueType: TraitValueType.String, allowsMultipleValues: false });
      }
      onClose();
    } catch (error) {
      console.error("Failed to save trait:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit}>
        <FormSection>
          <FormLabel htmlFor="trait-name">Trait Name</FormLabel>
          <Input
            id="trait-name"
            type="text"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Enter trait name..."
            required
            disabled={isSubmitting}
          />
        </FormSection>

        <FormSection style={{ marginBottom: "1.5rem" }}>
          <FormLabel>Value Type</FormLabel>
          <ValueTypeGrid>
            {Object.values(TraitValueType).map((type) => (
              <ValueTypeOption
                key={type}
                $selected={formData.valueType === type}
              >
                <ValueTypeRadio
                  value={type}
                  checked={formData.valueType === type}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      valueType: e.target.value as TraitValueType,
                    }))
                  }
                  disabled={isSubmitting || !!trait} // Disable type changes for existing traits
                />
                <ValueTypeContent>
                  {getTraitTypeIcon(type)}
                  <div>
                    <ValueTypeLabel>
                      {getTraitTypeLabel(type)}
                    </ValueTypeLabel>
                    <ValueTypeDescription>
                      {getTraitTypeDescription(type)}
                    </ValueTypeDescription>
                  </div>
                </ValueTypeContent>
              </ValueTypeOption>
            ))}
          </ValueTypeGrid>
          {trait && (
            <FormNote>
              Note: Cannot change value type for existing traits
            </FormNote>
          )}
        </FormSection>

        <FormSection>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={formData.allowsMultipleValues || false}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  allowsMultipleValues: e.target.checked,
                }))
              }
              disabled={isSubmitting}
              style={{ width: "18px", height: "18px", cursor: "pointer" }}
            />
            <span style={{ fontSize: "0.875rem" }}>
              Allow multiple values
            </span>
          </label>
          <FormNote>
            When enabled, characters can have multiple values for this trait
            (e.g., "Stitching" and "Patches")
          </FormNote>
        </FormSection>

        <FormActions>
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
              ? "Saving..."
              : trait
                ? "Update Trait"
                : "Create Trait"}
          </Button>
        </FormActions>
      </form>
    </Modal>
  );
};

export const TraitBuilderPage: React.FC = () => {
  const { speciesId } = useParams<{ speciesId: string }>();
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // GraphQL operations
  const {
    data: traitsData,
    loading: traitsLoading,
    error: traitsError,
    refetch,
  } = useTraitsBySpeciesQuery({
    variables: { speciesId: speciesId!, first: 100 },
    skip: !speciesId,
  });

  const traits = traitsData?.traitsBySpecies?.nodes || [];
  const [editingTrait, setEditingTrait] = useState<TraitsBySpeciesQuery['traitsBySpecies']['nodes'][0] | null>(null);

  if (!speciesId) {
    return (
      <Container>
        <ErrorMessage message="Species ID is required" />
      </Container>
    );
  }

  const {
    data: speciesData,
    loading: speciesLoading,
    error: speciesError,
  } = useSpeciesByIdQuery({
    variables: { id: speciesId! },
    skip: !speciesId,
  });

  const [createTraitMutation] = useCreateTraitMutation({
    onCompleted: (data) => {
      toast.success(`Trait "${data.createTrait.name}" created successfully!`);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create trait: ${error.message}`);
    },
  });

  const [updateTraitMutation] = useUpdateTraitMutation({
    onCompleted: (data) => {
      toast.success(`Trait "${data.updateTrait.name}" updated successfully!`);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update trait: ${error.message}`);
    },
  });

  const [deleteTraitMutation] = useDeleteTraitMutation({
    onCompleted: (data) => {
      toast.success(data.removeTrait.message);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete trait: ${error.message}`);
    },
  });

  // Event handlers
  const handleCreateTrait = async (formData: TraitFormData) => {
    await createTraitMutation({
      variables: {
        createTraitInput: {
          name: formData.name,
          valueType: formData.valueType,
          allowsMultipleValues: formData.allowsMultipleValues || false,
          speciesId,
        },
      },
    });
  };

  const handleUpdateTrait = async (formData: TraitFormData) => {
    if (!editingTrait) return;

    await updateTraitMutation({
      variables: {
        id: editingTrait.id,
        updateTraitInput: {
          name: formData.name,
          allowsMultipleValues: formData.allowsMultipleValues,
          // Note: valueType cannot be changed for existing traits
        },
      },
    });
  };

  const handleDeleteTrait = async (trait: typeof traits[0]) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the trait "${trait.name}"? This will also delete all associated enum values and character trait data.`
      )
    ) {
      return;
    }

    await deleteTraitMutation({
      variables: { id: trait.id },
    });
  };

  const handleEditTrait = (trait: typeof traits[0]) => {
    setEditingTrait(trait);
  };

  const handleManageEnumValues = (trait: typeof traits[0]) => {
    navigate(`/traits/${trait.id}/enum-values`);
  };

  // Loading states
  if (speciesLoading || traitsLoading) {
    return (
      <Container>
        <Title>Trait Builder</Title>
        <Subtitle>Loading trait configuration...</Subtitle>
      </Container>
    );
  }

  // Error states
  if (speciesError || traitsError) {
    return (
      <Container>
        <ErrorMessage
          message={`Failed to load data: ${speciesError?.message || traitsError?.message}`}
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
        <span>Traits</span>
      </Breadcrumb>

      <Header>
        <HeaderLeft>
          <Title>Trait Builder</Title>
          <Subtitle>
            Configure traits for {species.name} ({traits.length} traits)
          </Subtitle>
        </HeaderLeft>

        <HeaderRight>
          <Button
            variant="secondary"
            onClick={() => navigate(`/species/${speciesId}/variants`)}
            icon={<Settings size={16} />}
          >
            Manage Variants
          </Button>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            icon={<Plus size={16} />}
          >
            Add Trait
          </Button>
        </HeaderRight>
      </Header>

      {traits.length === 0 ? (
        <EmptyState>
          <Settings size={48} />
          <h3>No traits configured</h3>
          <p>
            Traits define the characteristics that characters of this species
            can have.
          </p>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            icon={<Plus size={16} />}
          >
            Create Your First Trait
          </Button>
        </EmptyState>
      ) : (
        <TraitGrid>
          {traits.map((trait) => (
            <TraitCard key={trait.id}>
              <TraitHeader>
                <TraitInfo>
                  <TraitName>{trait.name}</TraitName>
                  <TraitType>
                    {getTraitTypeIcon(trait.valueType)}
                    {getTraitTypeLabel(trait.valueType)}
                    {trait.valueType === TraitValueType.Enum && (
                      <span
                        style={{ marginLeft: "0.5rem", fontSize: "0.75rem" }}
                      >
                        (Click "Options" to manage values)
                      </span>
                    )}
                  </TraitType>
                </TraitInfo>

                <TraitActions>
                  {trait.valueType === TraitValueType.Enum && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleManageEnumValues(trait)}
                      icon={<List size={14} />}
                    >
                      Options
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleEditTrait(trait)}
                    icon={<Edit size={14} />}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDeleteTrait(trait)}
                    icon={<Trash2 size={14} />}
                  >
                    Delete
                  </Button>
                </TraitActions>
              </TraitHeader>

              <div
                style={{
                  fontSize: "0.875rem",
                  fontStyle: "italic",
                }}
              >
                <ValueTypeDescription>
                  {getTraitTypeDescription(trait.valueType)}
                </ValueTypeDescription>
              </div>
            </TraitCard>
          ))}
        </TraitGrid>
      )}

      {/* Create Trait Modal */}
      <TraitModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTrait}
        title="Create New Trait"
      />

      {/* Edit Trait Modal */}
      <TraitModal
        isOpen={!!editingTrait}
        onClose={() => setEditingTrait(null)}
        onSubmit={handleUpdateTrait}
        trait={editingTrait || undefined}
        title="Edit Trait"
      />
    </Container>
  );
};