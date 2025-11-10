import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-hot-toast";
import styled from "styled-components";
import { ArrowLeft, User, FileText, Settings, Tag as TagIcon, Users } from "lucide-react";
import { Button, TagInput } from "@chardb/ui";
import { GrantTargetSelector, GrantTarget } from "../components/GrantTargetSelector";
import {
  useCreateCharacterMutation,
  SpeciesDetailsFragment,
  SpeciesVariantDetailsFragment,
  CharacterTraitValueInput,
  Visibility,
} from "../generated/graphql";
import { useGetCommunityMembersQuery } from "../graphql/communities.graphql";
import { useAuth } from "../contexts/AuthContext";
import { useTagSearch } from "../hooks/useTagSearch";
import { SpeciesSelector } from "../components/character/SpeciesSelector";
import { TraitForm } from "../components/character/TraitForm";
import { CharacterDetailsEditor } from "../components/character/CharacterDetailsEditor";
import { CustomFieldsEditor } from "../components/CustomFieldsEditor";

/**
 * Enhanced Character Creation Page with Species and Trait Integration
 *
 * Comprehensive character creation interface that integrates with the new
 * species management system. Provides species selection, variant configuration,
 * and dynamic trait value input while preserving all existing character
 * creation functionality.
 *
 * Features:
 * - Species and variant selection with search
 * - Dynamic trait forms based on species selection
 * - Trait value validation and type-specific inputs
 * - Integration with EnumValueSettings for variant-specific options
 * - Preserved character metadata (details with markdown support)
 * - Tag management with autocomplete
 * - Visibility and trading settings
 * - Form validation and error handling
 * - Responsive design with step-by-step flow
 *
 * New Workflow:
 * 1. Basic character info (name, details)
 * 2. Species and variant selection
 * 3. Trait configuration
 * 4. Character settings (visibility, trading)
 * 5. Tags and metadata
 */

const characterSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  details: z
    .string()
    .max(15000, "Details must be less than 15000 characters")
    .optional()
    .or(z.literal("")),
  customFields: z.string().optional(),
  visibility: z.nativeEnum(Visibility),
  isSellable: z.boolean(),
  isTradeable: z.boolean(),
  price: z
    .string()
    .refine(
      (val) => {
        if (!val || val === "") return true;
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0 && num <= 999999;
      },
      { message: "Price must be a valid number between 0 and 999,999" }
    )
    .optional()
    .or(z.literal("")),
});

type CharacterForm = z.infer<typeof characterSchema>;

const Container = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 2rem;

  &:hover {
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 2rem 0;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const Section = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SectionDescription = styled.p`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.875rem;
  margin: 0 0 1.5rem 0;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const Label = styled.label`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.875rem;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.875rem;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary}20;
  }

  &[aria-invalid="true"] {
    border-color: ${({ theme }) => theme.colors.danger};
  }
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.875rem;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary}20;
  }
`;

const CheckboxRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const CheckboxGroup = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: ${({ theme }) => theme.colors.primary};
`;

const ErrorMessage = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.danger};
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;

  @media (max-width: 768px) {
    flex-direction: column-reverse;
  }
`;

const CancelButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: transparent;
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.text.secondary};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const TagsHelp = styled.p`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 0.25rem 0 0 0;
`;


export const CreateCharacterPageEnhanced: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Species and variant state
  const [selectedSpecies, setSelectedSpecies] = useState<SpeciesDetailsFragment | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<SpeciesVariantDetailsFragment | null>(null);

  // Trait values state
  const [traitValues, setTraitValues] = useState<CharacterTraitValueInput[]>([]);

  // Tags state
  const [tags, setTags] = useState<string[]>([]);
  const { searchTags, suggestions, loading: tagsLoading } = useTagSearch();

  // Character ownership/grant target state
  const [characterTarget, setCharacterTarget] = useState<GrantTarget | null>(null);
  const [isGrantTargetValid, setIsGrantTargetValid] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  // Query community members for user search (only when species is selected)
  const { data: membersData, loading: membersLoading } = useGetCommunityMembersQuery({
    variables: {
      communityId: selectedSpecies?.communityId || '',
      search: userSearch,
      limit: 10,
    },
    skip: !selectedSpecies?.communityId || !userSearch || userSearch.length < 2,
  });

  // Convert current user to SelectedUser format for GrantTargetSelector
  const currentUser = useMemo(() => {
    if (!user) return undefined;

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    };
  }, [user]);

  // Check if user has permission to create orphaned characters in the selected species' community
  const canCreateOrphanedCharacter = useMemo(() => {
    if (!user || !selectedSpecies) return false;
    return user.communityMemberships?.some(
      (membership) =>
        membership.role.communityId === selectedSpecies.communityId &&
        membership.role.canCreateOrphanedCharacter
    ) || false;
  }, [user, selectedSpecies]);

  // Form handling
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CharacterForm>({
    resolver: zodResolver(characterSchema),
    defaultValues: {
      visibility: Visibility.Public,
      isSellable: false,
      isTradeable: false,
      details: "",
    },
  });

  const isSellable = watch("isSellable");

  // GraphQL mutation
  const [createCharacterMutation] = useCreateCharacterMutation({
    onCompleted: (data) => {
      toast.success(`Character "${data.createCharacter.name}" created successfully!`);
      navigate(`/character/${data.createCharacter.id}`);
    },
    onError: (error) => {
      toast.error(`Failed to create character: ${error.message}`);
      setIsSubmitting(false);
    },
  });

  // Form submission
  const onSubmit = async (data: CharacterForm) => {
    setIsSubmitting(true);

    try {
      // Filter out empty keys from custom fields
      let cleanedCustomFields = data.customFields;
      if (data.customFields) {
        try {
          const parsed = JSON.parse(data.customFields);
          const filtered = Object.entries(parsed).reduce((acc, [key, value]) => {
            // Remove temporary keys and empty keys
            if (key && !key.startsWith('__empty_') && key.trim()) {
              acc[key] = value;
            }
            return acc;
          }, {} as Record<string, unknown>);
          cleanedCustomFields = Object.keys(filtered).length > 0
            ? JSON.stringify(filtered)
            : undefined;
        } catch {
          cleanedCustomFields = undefined;
        }
      }

      await createCharacterMutation({
        variables: {
          input: {
            name: data.name,
            details: data.details || undefined,
            customFields: cleanedCustomFields,
            visibility: data.visibility,
            isSellable: data.isSellable,
            isTradeable: data.isTradeable,
            price: data.price ? parseFloat(data.price) : undefined,
            tags: tags.length > 0 ? tags : undefined,
            speciesId: selectedSpecies?.id || undefined,
            speciesVariantId: selectedVariant?.id || undefined,
            traitValues: traitValues.length > 0 ? traitValues : undefined,
            // Add pending owner based on characterTarget
            pendingOwner: characterTarget?.type === 'pending'
              ? {
                  provider: characterTarget.provider as any,
                  providerAccountId: characterTarget.providerAccountId,
                }
              : undefined,
          },
        },
      });
    } catch (error) {
      console.error("Character creation failed:", error);
      setIsSubmitting(false);
    }
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  return (
    <Container>
      <BackButton type="button" onClick={handleBackClick}>
        <ArrowLeft size={16} />
        Back
      </BackButton>

      <Title>Create New Character</Title>

      <Form onSubmit={handleSubmit(onSubmit)}>
        {/* Basic Information */}
        <Section>
          <SectionTitle>
            <User size={20} />
            Basic Information
          </SectionTitle>
          <SectionDescription>
            Start with the essential details about your character.
          </SectionDescription>

          <FormGroup>
            <Label htmlFor="name">Character Name</Label>
            <Input
              {...register("name")}
              id="name"
              type="text"
              placeholder="Enter your character's name..."
              aria-invalid={!!errors.name}
            />
            {errors.name && <ErrorMessage>{errors.name.message}</ErrorMessage>}
          </FormGroup>

          <CustomFieldsEditor
            register={register}
            setValue={setValue}
            watch={watch}
          />
        </Section>

        {/* Species Selection */}
        <Section>
          <SpeciesSelector
            selectedSpecies={selectedSpecies}
            selectedVariant={selectedVariant}
            onSpeciesChange={setSelectedSpecies}
            onVariantChange={setSelectedVariant}
            error={!selectedSpecies ? "Species selection is required. Non-species character creation coming soon to all users!" : undefined}
          />
        </Section>

        {/* Character Ownership */}
        {canCreateOrphanedCharacter && (
          <Section>
            <SectionTitle>
              <Users size={20} />
              Character Ownership
            </SectionTitle>
            <SectionDescription>
              Choose whether this character will be owned by you or created as an orphaned character with pending ownership.
            </SectionDescription>

            <GrantTargetSelector
              value={characterTarget}
              onChange={setCharacterTarget}
              onUserSearch={setUserSearch}
              users={membersData?.community?.members || []}
              usersLoading={membersLoading}
              allowPendingOwner={true}
              discordGuildId={selectedSpecies?.community?.discordGuildId}
              discordGuildName={selectedSpecies?.community?.discordGuildName}
              userLabel="Owned By..."
              pendingOwnerLabel="Orphaned with Pending Owner"
              communityId={selectedSpecies?.communityId || ''}
              onValidationChange={setIsGrantTargetValid}
              currentUser={currentUser}
              defaultToSelf={true}
              includeSelf={false}
              searchQuery={userSearch}
            />
          </Section>
        )}

        {/* Trait Configuration */}
        {selectedSpecies && (
          <Section>
            <TraitForm
              speciesId={selectedSpecies.id}
              speciesVariant={selectedVariant}
              traitValues={traitValues}
              onChange={setTraitValues}
            />
          </Section>
        )}

        {/* Character Details */}
        <Section>
          <SectionTitle>
            <FileText size={20} />
            Character Details
          </SectionTitle>
          <SectionDescription>
            Provide details about your character using markdown formatting for rich text.
          </SectionDescription>

          <FormGroup>
            <Label htmlFor="details">Character Details</Label>
            <CharacterDetailsEditor
              value={watch("details") || ""}
              onChange={(value) => setValue("details", value, { shouldValidate: true })}
              error={errors.details?.message}
              maxLength={15000}
            />
          </FormGroup>
        </Section>

        {/* Settings */}
        <Section>
          <SectionTitle>
            <Settings size={20} />
            Character Settings
          </SectionTitle>
          <SectionDescription>
            Configure visibility, trading options, and other settings for your character.
          </SectionDescription>

          <FormGroup>
            <Label htmlFor="visibility">Visibility</Label>
            <Select {...register("visibility")} id="visibility">
              <option value={Visibility.Public}>Public - Anyone can view</option>
              <option value={Visibility.Unlisted}>Unlisted - Only via direct link</option>
              <option value={Visibility.Private}>Private - Only you can view</option>
            </Select>
          </FormGroup>

          <CheckboxRow>
            <CheckboxGroup>
              <Checkbox
                {...register("isSellable")}
                type="checkbox"
                id="isSellable"
              />
              Character is for sale
            </CheckboxGroup>

            <CheckboxGroup>
              <Checkbox
                {...register("isTradeable")}
                type="checkbox"
                id="isTradeable"
              />
              Character is available for trade
            </CheckboxGroup>
          </CheckboxRow>

          {isSellable && (
            <FormGroup>
              <Label htmlFor="price">Price</Label>
              <Input
                {...register("price")}
                id="price"
                type="text"
                placeholder="0.00"
                onInput={(e) => {
                  const target = e.target as HTMLInputElement;
                  let value = target.value.replace(/[^0-9.]/g, "");
                  const parts = value.split(".");
                  if (parts.length > 2) {
                    value = parts[0] + "." + parts.slice(1).join("");
                  }
                  if (parts[1] && parts[1].length > 2) {
                    value = parts[0] + "." + parts[1].slice(0, 2);
                  }
                  const cleaned = value.replace(/^0+(?=\d)/, "");
                  if (cleaned !== target.value) {
                    target.value = cleaned;
                  }
                }}
              />
              {errors.price && <ErrorMessage>{errors.price.message}</ErrorMessage>}
            </FormGroup>
          )}
        </Section>

        {/* Tags */}
        <Section>
          <SectionTitle>
            <TagIcon size={20} />
            Tags
          </SectionTitle>

          <FormGroup>
            <Label htmlFor="tags">Tags</Label>
            <TagInput
              value={tags}
              onChange={setTags}
              onSearch={searchTags}
              suggestions={suggestions}
              loading={tagsLoading}
              placeholder="Start typing to search tags..."
              maxTags={20}
            />
            <TagsHelp>
              Start typing to find existing tags or create new ones. Tags help
              others discover your character.
            </TagsHelp>
          </FormGroup>
        </Section>

        <ButtonRow>
          <CancelButton type="button" onClick={handleBackClick}>
            Cancel
          </CancelButton>
          <Button
            type="submit"
            disabled={isSubmitting || !selectedSpecies || (characterTarget?.type === 'pending' && !isGrantTargetValid)}
          >
            {isSubmitting ? "Creating..." : "Create Character"}
          </Button>
        </ButtonRow>
      </Form>
    </Container>
  );
};