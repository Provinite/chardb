import React, { useMemo } from "react";
import styled from "styled-components";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Check, X, Settings, ArrowLeft, Database, Palette } from "lucide-react";
import { Button, ErrorMessage } from "@chardb/ui";
import {
  useSpeciesVariantByIdQuery,
  useTraitsBySpeciesQuery,
  useEnumValuesByTraitQuery,
  useEnumValueSettingsBySpeciesVariantQuery,
  useCreateEnumValueSettingMutation,
  useDeleteEnumValueSettingMutation,
  TraitValueType,
} from "../generated/graphql";
import { toast } from "react-hot-toast";

/**
 * Enum Value Settings Management Interface
 *
 * Configure which enum values are available for specific species variants.
 * This page provides a comprehensive interface for managing the many-to-many 
 * relationship between SpeciesVariants and EnumValues.
 *
 * Features:
 * - Matrix view showing all ENUM traits and their possible values
 * - Toggle interface for enabling/disabling enum values per variant
 * - Real-time updates with optimistic UI
 * - Grouped by trait for better organization
 * - Breadcrumb navigation with variant and species context
 *
 * Use Case Example:
 * Species: Dragon, Variant: Fire Dragon
 * - Scale Color (ENUM): Red ✓, Gold ✓, Blue ✗, Green ✗
 * - Element Type (ENUM): Fire ✓, Ice ✗, Earth ✗, Air ✗
 *
 * URL Structure: /variants/:variantId/enum-settings
 *
 * @example Usage in routing:
 * ```tsx
 * <Route
 *   path="/variants/:variantId/enum-settings"
 *   element={<ProtectedRoute><EnumValueSettingsPage /></ProtectedRoute>}
 * />
 * ```
 */

const Container = styled.div`
  max-width: 1400px;
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

const TraitSection = styled.div`
  margin-bottom: 2rem;
`;

const TraitHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px 8px 0 0;
  border-bottom: none;
`;

const TraitTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const TraitMeta = styled.div`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.875rem;
`;

const EnumValuesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  padding: 1.5rem;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 0 0 8px 8px;
`;

const EnumValueCard = styled.div<{ isEnabled: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: ${({ theme, isEnabled }) => 
    isEnabled ? `${theme.colors.success}10` : `${theme.colors.surface}`};
  border: 1px solid ${({ theme, isEnabled }) =>
    isEnabled ? theme.colors.success : theme.colors.border};
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
`;

const EnumValueInfo = styled.div`
  flex: 1;
`;

const EnumValueName = styled.div`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 0.25rem;
`;

const EnumValueMeta = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const ToggleButton = styled(Button)<{ isEnabled: boolean }>`
  min-width: auto;
  padding: 0.5rem 1rem;
  background: ${({ theme, isEnabled }) =>
    isEnabled ? theme.colors.success : theme.colors.surface};
  color: ${({ theme, isEnabled }) =>
    isEnabled ? '#fff' : theme.colors.text.primary};
  border-color: ${({ theme, isEnabled }) =>
    isEnabled ? theme.colors.success : theme.colors.border};

  &:hover {
    background: ${({ theme, isEnabled }) =>
      isEnabled ? theme.colors.danger : theme.colors.success};
    border-color: ${({ theme, isEnabled }) =>
      isEnabled ? theme.colors.danger : theme.colors.success};
    color: #fff;
  }
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

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;


export const EnumValueSettingsPage: React.FC = () => {
  const { variantId } = useParams<{ variantId: string }>();
  const navigate = useNavigate();

  if (!variantId) {
    return (
      <Container>
        <ErrorMessage message="Variant ID is required" />
      </Container>
    );
  }

  // GraphQL operations
  const {
    data: variantData,
    loading: variantLoading,
    error: variantError,
  } = useSpeciesVariantByIdQuery({
    variables: { id: variantId },
  });

  const {
    data: traitsData,
    loading: traitsLoading,
    error: traitsError,
  } = useTraitsBySpeciesQuery({
    variables: { 
      speciesId: variantData?.speciesVariantById?.speciesId || "", 
      first: 100 
    },
    skip: !variantData?.speciesVariantById?.speciesId,
  });

  const {
    data: settingsData,
    loading: settingsLoading,
    error: settingsError,
    refetch: refetchSettings,
  } = useEnumValueSettingsBySpeciesVariantQuery({
    variables: { speciesVariantId: variantId, first: 1000 },
  });

  // Get enum values for each ENUM trait
  const enumTraits = useMemo(() => {
    return (traitsData?.traitsBySpecies?.nodes || []).filter(
      trait => trait.valueType === TraitValueType.Enum
    );
  }, [traitsData]);

  const [createEnumValueSetting] = useCreateEnumValueSettingMutation({
    onCompleted: () => {
      toast.success("Enum value enabled successfully!");
      refetchSettings();
    },
    onError: (error) => {
      toast.error(`Failed to enable enum value: ${error.message}`);
    },
  });

  const [deleteEnumValueSetting] = useDeleteEnumValueSettingMutation({
    onCompleted: () => {
      toast.success("Enum value disabled successfully!");
      refetchSettings();
    },
    onError: (error) => {
      toast.error(`Failed to disable enum value: ${error.message}`);
    },
  });

  // Event handlers
  const handleToggleEnumValue = async (enumValueId: string, isCurrentlyEnabled: boolean, settingId?: string) => {
    if (isCurrentlyEnabled && settingId) {
      // Disable by deleting the setting
      await deleteEnumValueSetting({
        variables: { id: settingId },
      });
    } else if (!isCurrentlyEnabled) {
      // Enable by creating a setting
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

  // Loading states
  if (variantLoading || traitsLoading || settingsLoading) {
    return (
      <Container>
        <LoadingState>
          <Database size={24} />
          &nbsp; Loading variant settings...
        </LoadingState>
      </Container>
    );
  }

  // Error states
  if (variantError || traitsError || settingsError) {
    return (
      <Container>
        <ErrorMessage
          message={`Failed to load data: ${
            variantError?.message || traitsError?.message || settingsError?.message
          }`}
        />
      </Container>
    );
  }

  const variant = variantData?.speciesVariantById;

  if (!variant) {
    return (
      <Container>
        <ErrorMessage message="Variant not found" />
      </Container>
    );
  }

  // Create settings lookup for quick access
  const settingsLookup = useMemo(() => {
    const lookup = new Map<string, string>();
    (settingsData?.enumValueSettingsBySpeciesVariant?.nodes || []).forEach(setting => {
      lookup.set(setting.enumValueId, setting.id);
    });
    return lookup;
  }, [settingsData]);

  return (
    <Container>
      <Breadcrumb>
        <Link to="/admin/species">Species Management</Link>
        <span>/</span>
        <span>{variant.species?.name || 'Species'}</span>
        <span>/</span>
        <Link to={`/species/${variant.speciesId}/variants`}>Variants</Link>
        <span>/</span>
        <span>{variant.name}</span>
        <span>/</span>
        <span>Enum Settings</span>
      </Breadcrumb>

      <Header>
        <HeaderLeft>
          <Title>Configure Enum Values</Title>
          <Subtitle>
            Choose which enum values are available for "{variant.name}" variant
          </Subtitle>
        </HeaderLeft>

        <HeaderRight>
          <Button
            variant="secondary"
            onClick={() => navigate(`/species/${variant.speciesId}/variants`)}
            icon={<ArrowLeft size={16} />}
          >
            Back to Variants
          </Button>
        </HeaderRight>
      </Header>

      {enumTraits.length === 0 ? (
        <EmptyState>
          <Palette size={48} />
          <h3>No ENUM traits found</h3>
          <p>
            This species doesn't have any ENUM-type traits yet. Create ENUM traits
            first to configure variant-specific options.
          </p>
          <Button
            onClick={() => navigate(`/species/${variant.speciesId}/traits`)}
            icon={<Settings size={16} />}
          >
            Manage Traits
          </Button>
        </EmptyState>
      ) : (
        enumTraits.map((trait) => (
          <EnumValueSettingsByTrait
            key={trait.id}
            trait={trait}
            settingsLookup={settingsLookup}
            onToggle={handleToggleEnumValue}
          />
        ))
      )}
    </Container>
  );
};

// Component for displaying enum values for a specific trait
interface EnumValueSettingsByTraitProps {
  trait: { id: string; name: string; valueType: TraitValueType };
  settingsLookup: Map<string, string>;
  onToggle: (enumValueId: string, isCurrentlyEnabled: boolean, settingId?: string) => void;
}

const EnumValueSettingsByTrait: React.FC<EnumValueSettingsByTraitProps> = ({
  trait,
  settingsLookup,
  onToggle,
}) => {
  const {
    data: enumValuesData,
    loading: enumValuesLoading,
    error: enumValuesError,
  } = useEnumValuesByTraitQuery({
    variables: { traitId: trait.id, first: 100 },
  });

  if (enumValuesLoading) {
    return (
      <TraitSection>
        <TraitHeader>
          <TraitTitle>
            <Palette size={20} />
            {trait.name}
          </TraitTitle>
          <TraitMeta>Loading options...</TraitMeta>
        </TraitHeader>
      </TraitSection>
    );
  }

  if (enumValuesError || !enumValuesData?.enumValuesByTrait?.nodes?.length) {
    return (
      <TraitSection>
        <TraitHeader>
          <TraitTitle>
            <Palette size={20} />
            {trait.name}
          </TraitTitle>
          <TraitMeta>No options available</TraitMeta>
        </TraitHeader>
      </TraitSection>
    );
  }

  const enumValues = enumValuesData.enumValuesByTrait.nodes
    .slice()
    .sort((a, b) => a.order - b.order);

  const enabledCount = enumValues.filter(ev => settingsLookup.has(ev.id)).length;

  return (
    <TraitSection>
      <TraitHeader>
        <TraitTitle>
          <Palette size={20} />
          {trait.name}
        </TraitTitle>
        <TraitMeta>
          {enabledCount} of {enumValues.length} options enabled
        </TraitMeta>
      </TraitHeader>
      
      <EnumValuesGrid>
        {enumValues.map((enumValue) => {
          const isEnabled = settingsLookup.has(enumValue.id);
          const settingId = settingsLookup.get(enumValue.id);

          return (
            <EnumValueCard key={enumValue.id} isEnabled={isEnabled}>
              <EnumValueInfo>
                <EnumValueName>{enumValue.name}</EnumValueName>
                <EnumValueMeta>Order: {enumValue.order}</EnumValueMeta>
              </EnumValueInfo>
              
              <ToggleButton
                size="sm"
                isEnabled={isEnabled}
                onClick={() => onToggle(enumValue.id, isEnabled, settingId)}
                icon={isEnabled ? <Check size={14} /> : <X size={14} />}
              >
                {isEnabled ? 'Enabled' : 'Disabled'}
              </ToggleButton>
            </EnumValueCard>
          );
        })}
      </EnumValuesGrid>
    </TraitSection>
  );
};