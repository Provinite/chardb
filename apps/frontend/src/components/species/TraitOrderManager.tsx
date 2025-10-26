import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Save, AlertCircle } from 'lucide-react';
import { Button } from '@chardb/ui';
import {
  useTraitListEntriesByVariantQuery,
  useUpdateTraitOrdersMutation,
  TraitListEntryDetailsFragment,
} from '../../generated/graphql';
import { toast } from 'react-hot-toast';

interface TraitOrderManagerProps {
  variantId: string;
  variantName: string;
}

const Container = styled.div`
  padding: ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
`;

const Header = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Title = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.xs} 0;
`;

const Description = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 0;
`;

const TraitList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

interface SortableItemProps {
  $isDragging: boolean;
}

const SortableItem = styled.div<SortableItemProps>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: ${({ $isDragging }) => ($isDragging ? 'grabbing' : 'grab')};
  transition: all 0.2s ease;
  opacity: ${({ $isDragging }) => ($isDragging ? 0.5 : 1)};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary}40;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
`;

const DragHandle = styled.div`
  color: ${({ theme }) => theme.colors.text.muted};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
`;

const TraitInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const TraitName = styled.div`
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const TraitMeta = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const OrderBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => theme.colors.primary}15;
  color: ${({ theme }) => theme.colors.primary};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const LoadingState = styled.div`
  padding: ${({ theme }) => theme.spacing.xl};
  text-align: center;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const ErrorState = styled.div`
  padding: ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.error}10;
  border: 1px solid ${({ theme }) => theme.colors.error}30;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.error};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const EmptyState = styled.div`
  padding: ${({ theme }) => theme.spacing.xl};
  text-align: center;
  color: ${({ theme }) => theme.colors.text.muted};
`;

interface SortableTraitItemProps {
  entry: TraitListEntryDetailsFragment;
  index: number;
}

const SortableTraitItem: React.FC<SortableTraitItemProps> = ({ entry, index }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <SortableItem
      ref={setNodeRef}
      style={style}
      $isDragging={isDragging}
      {...attributes}
    >
      <DragHandle {...listeners}>
        <GripVertical size={20} />
      </DragHandle>
      <OrderBadge>{index + 1}</OrderBadge>
      <TraitInfo>
        <TraitName>{entry.trait.name}</TraitName>
        <TraitMeta>
          {entry.required ? 'Required' : 'Optional'} • {entry.valueType}
        </TraitMeta>
      </TraitInfo>
    </SortableItem>
  );
};

export const TraitOrderManager: React.FC<TraitOrderManagerProps> = ({
  variantId,
  variantName,
}) => {
  const [entries, setEntries] = useState<TraitListEntryDetailsFragment[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch trait list entries
  const { data, loading, error, refetch } = useTraitListEntriesByVariantQuery({
    variables: { variantId, first: 100 },
    skip: !variantId,
  });

  // Update trait orders mutation
  const [updateTraitOrders, { loading: saving }] = useUpdateTraitOrdersMutation({
    onCompleted: () => {
      toast.success('Trait order updated successfully');
      setHasChanges(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update trait order: ${error.message}`);
    },
  });

  // Initialize entries from query data
  useEffect(() => {
    if (data?.traitListEntriesBySpeciesVariant?.nodes) {
      setEntries([...data.traitListEntriesBySpeciesVariant.nodes]);
      setHasChanges(false);
    }
  }, [data]);

  // Set up sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setEntries((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        setHasChanges(true);
        return newItems;
      });
    }
  };

  const handleSave = async () => {
    // Build the trait orders array with new order values
    const traitOrders = entries.map((entry, index) => ({
      traitId: entry.trait.id,
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

  const handleReset = () => {
    if (data?.traitListEntriesBySpeciesVariant?.nodes) {
      setEntries([...data.traitListEntriesBySpeciesVariant.nodes]);
      setHasChanges(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <Header>
          <Title>Trait Display Order</Title>
        </Header>
        <LoadingState>Loading traits...</LoadingState>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Header>
          <Title>Trait Display Order</Title>
        </Header>
        <ErrorState>
          <AlertCircle size={20} />
          Failed to load traits: {error.message}
        </ErrorState>
      </Container>
    );
  }

  if (entries.length === 0) {
    return (
      <Container>
        <Header>
          <Title>Trait Display Order</Title>
          <Description>for {variantName}</Description>
        </Header>
        <EmptyState>
          No traits configured for this variant yet.
          <br />
          Add traits to the variant to manage their display order.
        </EmptyState>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Trait Display Order</Title>
        <Description>
          Drag and drop to reorder how traits appear in character forms for{' '}
          {variantName}
        </Description>
      </Header>

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
            {entries.map((entry, index) => (
              <SortableTraitItem
                key={entry.id}
                entry={entry}
                index={index}
              />
            ))}
          </TraitList>
        </SortableContext>
      </DndContext>

      <Actions>
        {hasChanges && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleReset}
            disabled={saving}
          >
            Reset
          </Button>
        )}
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={!hasChanges || saving}
        >
          <Save size={16} />
          {saving ? 'Saving...' : 'Save Order'}
        </Button>
      </Actions>
    </Container>
  );
};
