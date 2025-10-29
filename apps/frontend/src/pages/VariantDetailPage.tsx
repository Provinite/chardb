import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, ChevronDown, ChevronUp } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Button, Input, ErrorMessage } from '@chardb/ui';
import { ColorSelector } from '../components/colors';
import {
  useSpeciesVariantByIdQuery,
  useTraitListEntriesByVariantQuery,
  useTraitsBySpeciesQuery,
  useSpeciesVariantWithEnumValueSettingsQuery,
  useUpdateSpeciesVariantMutation,
  useCreateTraitListEntryMutation,
  useUpdateTraitListEntryMutation,
  useRemoveTraitListEntryMutation,
  useUpdateTraitOrdersMutation,
  useCreateEnumValueSettingMutation,
  useDeleteEnumValueSettingMutation,
  TraitListEntryDetailsFragment,
} from '../generated/graphql';
import { toast } from 'react-hot-toast';
import { TraitListEntryRow, EntryUpdates } from '../components/variants/TraitListEntryRow';
import { InactiveTraitCard } from '../components/variants/InactiveTraitCard';

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
  margin-bottom: 2rem;
`;

const HeaderTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
  }
`;

const HeaderLeft = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const VariantNameInput = styled(Input)`
  font-size: 1.5rem;
  font-weight: 600;
  flex: 1;
  max-width: 400px;
`;

const HeaderRight = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ColorRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const ColorLabel = styled.label`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  min-width: 100px;
`;

const Section = styled.div`
  margin-bottom: 2rem;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const TraitList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${({ theme }) => theme.colors.text.muted};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
`;

const CollapsibleHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;

  &:hover {
    opacity: 0.8;
  }
`;

export const VariantDetailPage: React.FC = () => {
  const { variantId } = useParams<{ variantId: string }>();
  const navigate = useNavigate();

  // State
  const [variantName, setVariantName] = useState('');
  const [variantColorId, setVariantColorId] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [entries, setEntries] = useState<TraitListEntryDetailsFragment[]>([]);
  const [hasOrderChanges, setHasOrderChanges] = useState(false);
  const [isInactiveTraitsExpanded, setIsInactiveTraitsExpanded] = useState(false);

  if (!variantId) {
    return (
      <Container>
        <ErrorMessage message="Variant ID is required" />
      </Container>
    );
  }

  // GraphQL queries
  const { data: variantData, loading: variantLoading, error: variantError } =
    useSpeciesVariantByIdQuery({
      variables: { id: variantId },
      onCompleted: (data) => {
        if (data.speciesVariantById) {
          setVariantName(data.speciesVariantById.name);
          setVariantColorId(data.speciesVariantById.colorId || null);
        }
      },
    });

  const {
    data: entriesData,
    loading: entriesLoading,
    error: entriesError,
  } = useTraitListEntriesByVariantQuery({
    variables: { variantId, first: 100 },
  });

  // Initialize/reset entries state when query data changes (from initial load or refetch)
  React.useEffect(() => {
    if (entriesData?.traitListEntriesBySpeciesVariant?.nodes) {
      setEntries([...entriesData.traitListEntriesBySpeciesVariant.nodes]);
      setHasOrderChanges(false);
    }
  }, [entriesData]);

  const variant = variantData?.speciesVariantById;
  const speciesId = variant?.speciesId;

  const { data: speciesTraitsData } = useTraitsBySpeciesQuery({
    variables: { speciesId: speciesId!, first: 100 },
    skip: !speciesId,
  });

  const { data: enumSettingsData } =
    useSpeciesVariantWithEnumValueSettingsQuery({
      variables: { variantId },
    });

  // Mutations
  const [updateVariantName] = useUpdateSpeciesVariantMutation({
    onCompleted: () => {
      toast.success('Variant name updated successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to update variant name: ${error.message}`);
    },
  });

  const [createTraitListEntry] = useCreateTraitListEntryMutation({
    refetchQueries: ['TraitListEntriesByVariant'],
    onCompleted: () => {
      toast.success('Trait added to variant!');
    },
    onError: (error) => {
      toast.error(`Failed to add trait: ${error.message}`);
    },
  });

  const [updateTraitListEntry] = useUpdateTraitListEntryMutation({
    refetchQueries: ['TraitListEntriesByVariant'],
    onCompleted: () => {
      toast.success('Trait configuration updated!');
    },
    onError: (error) => {
      toast.error(`Failed to update trait: ${error.message}`);
    },
  });

  const [removeTraitListEntry] = useRemoveTraitListEntryMutation({
    refetchQueries: ['TraitListEntriesByVariant'],
    onCompleted: () => {
      toast.success('Trait removed from variant!');
    },
    onError: (error) => {
      toast.error(`Failed to remove trait: ${error.message}`);
    },
  });

  const [updateTraitOrders] = useUpdateTraitOrdersMutation({
    refetchQueries: ['TraitListEntriesByVariant'],
    onCompleted: () => {
      toast.success('Trait order updated!');
      setHasOrderChanges(false);
    },
    onError: (error) => {
      toast.error(`Failed to update order: ${error.message}`);
    },
  });

  const [createEnumValueSetting] = useCreateEnumValueSettingMutation({
    refetchQueries: ['SpeciesVariantWithEnumValueSettings'],
    onCompleted: () => {
      toast.success('Enum value enabled!');
    },
    onError: (error) => {
      toast.error(`Failed to enable enum value: ${error.message}`);
    },
  });

  const [deleteEnumValueSetting] = useDeleteEnumValueSettingMutation({
    refetchQueries: ['SpeciesVariantWithEnumValueSettings'],
    onCompleted: () => {
      toast.success('Enum value disabled!');
    },
    onError: (error) => {
      toast.error(`Failed to disable enum value: ${error.message}`);
    },
  });

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Calculate inactive traits
  const inactiveTraits = useMemo(() => {
    if (!speciesTraitsData?.traitsBySpecies?.nodes) return [];

    const activeTraitIds = new Set(entries.map((e) => e.traitId));
    return speciesTraitsData.traitsBySpecies.nodes.filter(
      (trait) => !activeTraitIds.has(trait.id)
    );
  }, [speciesTraitsData, entries]);

  // Handlers
  const handleSaveVariantName = async () => {
    if (!variant) return;

    const hasNameChange = variantName !== variant.name;
    const hasColorChange = variantColorId !== variant.colorId;

    if (!hasNameChange && !hasColorChange) return;

    await updateVariantName({
      variables: {
        id: variantId,
        updateSpeciesVariantInput: {
          name: variantName,
          colorId: variantColorId,
        },
      },
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setEntries((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        setHasOrderChanges(true);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSaveOrder = async () => {
    const traitOrders = entries.map((entry, index) => ({
      traitId: entry.traitId,
      order: index,
    }));

    await updateTraitOrders({
      variables: {
        input: {
          variantId,
          traitOrders,
        },
      },
    });
  };

  const handleResetOrder = () => {
    if (entriesData?.traitListEntriesBySpeciesVariant?.nodes) {
      setEntries([...entriesData.traitListEntriesBySpeciesVariant.nodes]);
      setHasOrderChanges(false);
    }
  };

  const handleToggleExpand = (entryId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
  };

  const handleRemoveEntry = async (entryId: string) => {
    if (!window.confirm('Are you sure you want to remove this trait from the variant?')) {
      return;
    }

    await removeTraitListEntry({
      variables: { id: entryId },
    });
  };

  const handleUpdateEntry = async (entryId: string, updates: EntryUpdates) => {
    await updateTraitListEntry({
      variables: {
        id: entryId,
        input: updates,
      },
    });
  };

  const handleAddTrait = async (traitId: string) => {
    // Add trait at the bottom of the list
    const maxOrder = entries.length > 0 ? Math.max(...entries.map((e) => e.order)) : -1;

    await createTraitListEntry({
      variables: {
        input: {
          traitId,
          speciesVariantId: variantId,
          order: maxOrder + 1,
          required: false,
          valueType: speciesTraitsData?.traitsBySpecies?.nodes.find((t) => t.id === traitId)
            ?.valueType!,
        },
      },
    });
  };

  const handleToggleEnumValue = async (
    enumValueId: string,
    isEnabled: boolean,
    settingId?: string
  ) => {
    if (isEnabled && settingId) {
      await deleteEnumValueSetting({
        variables: { id: settingId },
      });
    } else if (!isEnabled) {
      await createEnumValueSetting({
        variables: {
          createEnumValueSettingInput: {
            enumValueId,
            speciesVariantId: variantId,
          },
        },
      });
    }
  };

  // Loading state
  if (variantLoading || entriesLoading) {
    return (
      <Container>
        <LoadingState>Loading variant details...</LoadingState>
      </Container>
    );
  }

  // Error state
  if (variantError || entriesError) {
    return (
      <Container>
        <ErrorMessage
          message={`Failed to load data: ${variantError?.message || entriesError?.message}`}
        />
      </Container>
    );
  }

  if (!variant) {
    return (
      <Container>
        <ErrorMessage message="Variant not found" />
      </Container>
    );
  }

  const hasNameChanges = variantName !== variant.name;
  const hasColorChanges = variantColorId !== variant.colorId;
  const hasChanges = hasNameChanges || hasColorChanges;

  return (
    <Container>
      <Breadcrumb>
        <Link to={`/communities/${variant.species?.communityId}/species`}>
          Species Management
        </Link>
        <span>/</span>
        <Link to={`/species/${variant.speciesId}`}>{variant.species?.name}</Link>
        <span>/</span>
        <Link to={`/species/${variant.speciesId}/variants`}>Variants</Link>
        <span>/</span>
        <span>{variant.name}</span>
      </Breadcrumb>

      <Header>
        <HeaderTop>
          <HeaderLeft>
            <VariantNameInput
              type="text"
              value={variantName}
              onChange={(e) => setVariantName(e.target.value)}
              placeholder="Variant name..."
            />
          </HeaderLeft>

          <HeaderRight>
            <Button
              variant="secondary"
              onClick={() => navigate(`/species/${variant.speciesId}/variants`)}
              icon={<ArrowLeft size={16} />}
            >
              Back
            </Button>
          </HeaderRight>
        </HeaderTop>

        <ColorRow>
          <ColorLabel>Species:</ColorLabel>
          <span>{variant.species?.name}</span>
        </ColorRow>

        <ColorRow>
          <ColorLabel>Color:</ColorLabel>
          <ColorSelector
            communityId={variant.species?.communityId || ''}
            value={variantColorId}
            onChange={setVariantColorId}
            label=""
            placeholder="No color"
          />
          {hasChanges && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveVariantName}
              icon={<Save size={14} />}
            >
              Save Changes
            </Button>
          )}
        </ColorRow>
      </Header>

      <Section>
        <SectionHeader>
          <SectionTitle>Active Traits</SectionTitle>
          {hasOrderChanges && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="secondary" size="sm" onClick={handleResetOrder}>
                Reset Order
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveOrder}
                icon={<Save size={14} />}
              >
                Save Order
              </Button>
            </div>
          )}
        </SectionHeader>

        {entries.length === 0 ? (
          <EmptyState>
            <p>No traits have been added to this variant yet.</p>
            <p>Use the "Available Traits" section below to add traits.</p>
          </EmptyState>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={entries.map((e) => e.id)}
              strategy={verticalListSortingStrategy}
            >
              <TraitList>
                {entries.map((entry) => (
                  <TraitListEntryRow
                    key={entry.id}
                    entry={entry}
                    isExpanded={expandedRows.has(entry.id)}
                    onToggleExpand={() => handleToggleExpand(entry.id)}
                    onRemove={() => handleRemoveEntry(entry.id)}
                    onUpdate={(updates) => handleUpdateEntry(entry.id, updates)}
                    enumValueSettings={
                      enumSettingsData?.speciesVariantById?.enumValueSettings || []
                    }
                    onToggleEnumValue={handleToggleEnumValue}
                  />
                ))}
              </TraitList>
            </SortableContext>
          </DndContext>
        )}
      </Section>

      <Section>
        <CollapsibleHeader
          onClick={() => setIsInactiveTraitsExpanded(!isInactiveTraitsExpanded)}
        >
          <SectionTitle>Available Traits ({inactiveTraits.length})</SectionTitle>
          {isInactiveTraitsExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </CollapsibleHeader>

        {isInactiveTraitsExpanded && (
          <>
            {inactiveTraits.length === 0 ? (
              <EmptyState style={{ marginTop: '1rem' }}>
                All species traits have been added to this variant.
              </EmptyState>
            ) : (
              <TraitList style={{ marginTop: '1rem' }}>
                {inactiveTraits.map((trait) => (
                  <InactiveTraitCard
                    key={trait.id}
                    trait={trait}
                    onAdd={handleAddTrait}
                  />
                ))}
              </TraitList>
            )}
          </>
        )}
      </Section>
    </Container>
  );
};
