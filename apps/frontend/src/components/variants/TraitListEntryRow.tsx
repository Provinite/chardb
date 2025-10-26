import React, { useState } from 'react';
import styled from 'styled-components';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronDown, ChevronUp, Trash2, Check, X, Save } from 'lucide-react';
import { Button, Input } from '@chardb/ui';
import { TraitValueType } from '../../generated/graphql';
import { TraitDefaultValueInput, DefaultValueState } from './TraitDefaultValueInput';

interface TraitListEntryRowProps {
  entry: {
    id: string;
    order: number;
    required: boolean;
    valueType: TraitValueType;
    defaultValueString?: string | null;
    defaultValueInt?: number | null;
    defaultValueTimestamp?: string | null;
    trait: {
      id: string;
      name: string;
      valueType: TraitValueType;
      enumValues?: Array<{
        id: string;
        name: string;
        order: number;
      }>;
    };
  };
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRemove: () => void;
  onUpdate: (updates: EntryUpdates) => Promise<void>;
  enumValueSettings?: Array<{
    id: string;
    enumValueId: string;
  }>;
  onToggleEnumValue?: (enumValueId: string, isEnabled: boolean, settingId?: string) => Promise<void>;
  disabled?: boolean;
}

export interface EntryUpdates {
  required?: boolean;
  defaultValueString?: string | null;
  defaultValueInt?: number | null;
  defaultValueTimestamp?: string | null;
}

interface SortableRowProps {
  $isDragging: boolean;
}

const RowContainer = styled.div<SortableRowProps>`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  transition: all 0.2s ease;
  opacity: ${({ $isDragging }) => ($isDragging ? 0.5 : 1)};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary}40;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
`;

const RowHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
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

const OrderInput = styled(Input)`
  width: 50px;
  text-align: center;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
`;

const TraitName = styled.div`
  flex: 1;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  min-width: 0;
`;

const ExpandableContent = styled.div`
  padding: 0 1rem 1rem 1rem;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const ConfigSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
`;

const RequiredToggle = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.primary};

  input[type='checkbox'] {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }
`;

const EnumOptionsSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const SectionTitle = styled.div`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 0.25rem;
`;

const EnumValuesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.5rem;
`;

const EnumValueCard = styled.div<{ $isEnabled: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: ${({ theme, $isEnabled }) =>
    $isEnabled ? `${theme.colors.success}10` : `${theme.colors.surface}`};
  border: 1px solid
    ${({ theme, $isEnabled }) =>
      $isEnabled ? theme.colors.success : theme.colors.border};
  border-radius: 6px;
  font-size: 0.875rem;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const EnumValueName = styled.span`
  flex: 1;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ToggleButton = styled.button<{ $isEnabled: boolean }>`
  padding: 0.25rem;
  border: none;
  background: transparent;
  cursor: pointer;
  color: ${({ theme, $isEnabled }) =>
    $isEnabled ? theme.colors.success : theme.colors.text.muted};
  display: flex;
  align-items: center;
  transition: all 0.2s ease;

  &:hover {
    color: ${({ theme, $isEnabled }) =>
      $isEnabled ? theme.colors.danger : theme.colors.success};
  }
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

export const TraitListEntryRow: React.FC<TraitListEntryRowProps> = ({
  entry,
  isExpanded,
  onToggleExpand,
  onRemove,
  onUpdate,
  enumValueSettings = [],
  onToggleEnumValue,
  disabled = false,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id });

  const [localRequired, setLocalRequired] = useState(entry.required);
  const [localDefaults, setLocalDefaults] = useState<DefaultValueState>({
    defaultValueString: entry.defaultValueString,
    defaultValueInt: entry.defaultValueInt,
    defaultValueTimestamp: entry.defaultValueTimestamp,
  });
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges =
    localRequired !== entry.required ||
    localDefaults.defaultValueString !== entry.defaultValueString ||
    localDefaults.defaultValueInt !== entry.defaultValueInt ||
    localDefaults.defaultValueTimestamp !== entry.defaultValueTimestamp;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate({
        required: localRequired,
        ...localDefaults,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setLocalRequired(entry.required);
    setLocalDefaults({
      defaultValueString: entry.defaultValueString,
      defaultValueInt: entry.defaultValueInt,
      defaultValueTimestamp: entry.defaultValueTimestamp,
    });
  };

  // Get enum values that are enabled for this variant
  const settingsLookup = new Map(
    enumValueSettings.map(setting => [setting.enumValueId, setting.id])
  );

  const sortedEnumValues = [...(entry.trait.enumValues || [])].sort(
    (a, b) => a.order - b.order
  );

  const enabledCount = sortedEnumValues.filter(ev =>
    settingsLookup.has(ev.id)
  ).length;

  return (
    <RowContainer ref={setNodeRef} style={style} $isDragging={isDragging} {...attributes}>
      <RowHeader>
        <DragHandle {...listeners}>
          <GripVertical size={20} />
        </DragHandle>

        <OrderInput
          type="text"
          value={`#${entry.order + 1}`}
          disabled
          readOnly
        />

        <TraitName>{entry.trait.name}</TraitName>

        <Button
          variant="secondary"
          size="sm"
          onClick={onToggleExpand}
          icon={isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </Button>

        <Button
          variant="danger"
          size="sm"
          onClick={onRemove}
          disabled={disabled}
          icon={<Trash2 size={14} />}
        >
          Remove
        </Button>
      </RowHeader>

      {isExpanded && (
        <ExpandableContent>
          <ConfigSection>
            <RequiredToggle>
              <input
                type="checkbox"
                checked={localRequired}
                onChange={(e) => setLocalRequired(e.target.checked)}
                disabled={disabled}
              />
              <span>Required Trait</span>
            </RequiredToggle>

            <TraitDefaultValueInput
              valueType={entry.valueType}
              defaultValueString={localDefaults.defaultValueString}
              defaultValueInt={localDefaults.defaultValueInt}
              defaultValueTimestamp={localDefaults.defaultValueTimestamp}
              enumValues={sortedEnumValues.filter(ev => settingsLookup.has(ev.id))}
              onChange={setLocalDefaults}
              disabled={disabled}
            />

            {entry.valueType === TraitValueType.Enum && sortedEnumValues.length > 0 && (
              <EnumOptionsSection>
                <SectionTitle>
                  Enum Options ({enabledCount} of {sortedEnumValues.length} enabled)
                </SectionTitle>
                <EnumValuesGrid>
                  {sortedEnumValues.map((enumValue) => {
                    const isEnabled = settingsLookup.has(enumValue.id);
                    const settingId = settingsLookup.get(enumValue.id);

                    return (
                      <EnumValueCard key={enumValue.id} $isEnabled={isEnabled}>
                        <EnumValueName>{enumValue.name}</EnumValueName>
                        <ToggleButton
                          $isEnabled={isEnabled}
                          onClick={() =>
                            onToggleEnumValue?.(enumValue.id, isEnabled, settingId)
                          }
                          disabled={disabled}
                          title={isEnabled ? 'Disable' : 'Enable'}
                        >
                          {isEnabled ? <Check size={16} /> : <X size={16} />}
                        </ToggleButton>
                      </EnumValueCard>
                    );
                  })}
                </EnumValuesGrid>
              </EnumOptionsSection>
            )}
          </ConfigSection>

          <Actions>
            {hasChanges && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleReset}
                disabled={disabled || isSaving}
              >
                Reset
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={disabled || !hasChanges || isSaving}
              icon={<Save size={14} />}
            >
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </Actions>
        </ExpandableContent>
      )}
    </RowContainer>
  );
};
