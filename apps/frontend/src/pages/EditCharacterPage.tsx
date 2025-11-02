import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-hot-toast";
import styled from "styled-components";
import { AlertTriangle } from "lucide-react";
import { Button, TagInput, Input, GrantTargetSelector, GrantTarget } from "@chardb/ui";
import {
  useGetCharacterQuery,
  useUpdateCharacterMutation,
  useUpdateCharacterTraitsMutation,
  UpdateCharacterInput,
  CharacterTraitValueInput,
  Visibility,
} from "../graphql/characters.graphql";
import { useAuth } from "../contexts/AuthContext";
import { useUserCommunityRole } from "../hooks/useUserCommunityRole";
import { canUserEditCharacter } from "../lib/characterPermissions";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useTagSearch } from "../hooks/useTagSearch";
import { SpeciesSelector } from "../components/character/SpeciesSelector";
import { TraitForm } from "../components/character/TraitForm";
import { SpeciesDetailsFragment, SpeciesVariantDetailsFragment } from "../generated/graphql";
import { CharacterDetailsEditor } from "../components/character/CharacterDetailsEditor";

const characterSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  age: z
    .string()
    .max(20, "Age must be less than 20 characters")
    .optional()
    .or(z.literal("")),
  gender: z
    .string()
    .max(20, "Gender must be less than 20 characters")
    .optional()
    .or(z.literal("")),
  details: z
    .string()
    .max(15000, "Details must be less than 15000 characters")
    .optional()
    .or(z.literal("")),
  visibility: z.enum(["PUBLIC", "UNLISTED", "PRIVATE"]),
  isSellable: z.boolean(),
  isTradeable: z.boolean(),
  price: z
    .string()
    .optional()
    .refine((val) => {
      if (!val || val === "") return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, "Price must be a valid positive number"),
  tags: z.array(z.string()).optional().default([]),
});

type CharacterForm = z.infer<typeof characterSchema>;

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.md};
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: ${({ theme }) => theme.spacing.xl};

  &:hover {
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  &::before {
    content: "←";
    font-weight: bold;
  }
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.xl} 0;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const FormSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const SectionTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
  padding-bottom: ${({ theme }) => theme.spacing.xs};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing.md};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const Label = styled.label`
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

const Select = styled.select<{ hasError?: boolean }>`
  padding: ${({ theme }) => theme.spacing.sm};
  border: 2px solid
    ${({ theme, hasError }) =>
      hasError ? theme.colors.error : theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: ${({ theme, hasError }) =>
      hasError ? theme.colors.error : theme.colors.primary};
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
`;

const Checkbox = styled.input.attrs({ type: "checkbox" })`
  width: 16px;
  height: 16px;
  accent-color: ${({ theme }) => theme.colors.primary};
`;

const ErrorMessage = styled.span`
  color: ${({ theme }) => theme.colors.error};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

const TagsHelp = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  margin: ${({ theme }) => theme.spacing.xs} 0 0 0;
`;

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  justify-content: flex-end;
  margin-top: ${({ theme }) => theme.spacing.xl};
  padding-top: ${({ theme }) => theme.spacing.lg};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
`;

const ErrorContainer = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.error};
`;

const WarningBox = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  background: #fef3cd;
  border: 1px solid #ffd700;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: #856404;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing.sm};

  svg {
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

const InfoBox = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.primary}10;
  border: 1px solid ${({ theme }) => theme.colors.primary}30;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const CurrentSpeciesDisplay = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.surface};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  margin-bottom: ${({ theme }) => theme.spacing.md};

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.text.secondary};
    font-size: ${({ theme }) => theme.typography.fontSize.sm};
  }
`;

const TraitActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  justify-content: flex-end;
  margin-top: ${({ theme }) => theme.spacing.lg};
  padding-top: ${({ theme }) => theme.spacing.md};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

export const EditCharacterPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tags, setTags] = useState<string[]>([]);

  // Species and variant selection state
  const [selectedSpecies, setSelectedSpecies] = useState<SpeciesDetailsFragment | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<SpeciesVariantDetailsFragment | null>(null);

  // Trait values state
  const [traitValues, setTraitValues] = useState<CharacterTraitValueInput[]>([]);
  const [isSubmittingTraits, setIsSubmittingTraits] = useState(false);

  // Pending ownership state
  const [characterTarget, setCharacterTarget] = useState<GrantTarget | null>(null);

  const { searchTags, suggestions, loading: tagsLoading } = useTagSearch();

  const { data, loading, error } = useGetCharacterQuery({
    variables: { id: id! },
    skip: !id,
  });

  const [updateCharacter] = useUpdateCharacterMutation();
  const [updateCharacterTraits] = useUpdateCharacterTraitsMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<CharacterForm>({
    resolver: zodResolver(characterSchema),
    defaultValues: {
      name: "",
      age: "",
      gender: "",
      details: "",
      visibility: "PUBLIC",
      isSellable: false,
      isTradeable: false,
      price: "",
      tags: [],
    },
  });

  const character = data?.character;

  // Get user's permissions in the character's community
  const { permissions } = useUserCommunityRole(
    character?.species?.community?.id
  );

  // Reset form when character data loads
  useEffect(() => {
    if (character) {
      reset({
        name: character.name,
        age: character.age || "",
        gender: character.gender || "",
        details: character.details || "",
        visibility: character.visibility,
        isSellable: character.isSellable,
        isTradeable: character.isTradeable,
        price: character.price?.toString() || "",
        tags: [],
      });
      setTags(character.tags || []);

      // Set species and variant if they exist
      if (character.species) {
        setSelectedSpecies(character.species as any);
      }
      if (character.speciesVariant) {
        setSelectedVariant(character.speciesVariant as any);
      }

      // Set trait values if they exist
      if (character.traitValues) {
        setTraitValues(character.traitValues.map(tv => ({
          traitId: tv.traitId,
          value: tv.value || "",
        })));
      }

      // Initialize pending ownership state
      if (character.pendingOwnership) {
        setCharacterTarget({
          type: 'pending',
          provider: character.pendingOwnership.provider as 'DISCORD' | 'DEVIANTART',
          providerAccountId: character.pendingOwnership.displayIdentifier || character.pendingOwnership.providerAccountId,
        });
      } else {
        setCharacterTarget(null);
      }
    }
  }, [character, reset]);

  const isSellable = watch("isSellable");

  const onSubmit = async (data: CharacterForm) => {
    if (!character || !user) return;

    setIsSubmitting(true);
    try {
      // Build pending owner input
      let pendingOwnerInput: any = undefined;
      if (characterTarget?.type === 'pending') {
        pendingOwnerInput = {
          provider: characterTarget.provider,
          providerAccountId: characterTarget.providerAccountId,
        };
      } else if (character.pendingOwnership && !characterTarget) {
        // Clear existing pending ownership if target is null
        pendingOwnerInput = null;
      }

      const input: UpdateCharacterInput = {
        name: data.name,
        age: data.age || undefined,
        gender: data.gender || undefined,
        details: data.details || undefined,
        visibility: data.visibility as Visibility,
        isSellable: data.isSellable,
        isTradeable: data.isTradeable,
        price:
          data.price && data.isSellable ? parseFloat(data.price) : undefined,
        tags, // Use the tags state directly
        // Only include species if it's being set for the first time (character doesn't have one yet)
        speciesId: !character.speciesId && selectedSpecies ? selectedSpecies.id : undefined,
        speciesVariantId: !character.speciesId && selectedVariant ? selectedVariant.id : undefined,
        pendingOwner: pendingOwnerInput,
      };

      await updateCharacter({
        variables: {
          id: character.id,
          input,
        },
      });

      toast.success("Character updated successfully!");
      navigate(`/character/${character.id}`);
    } catch (error) {
      console.error("Failed to update character:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update character. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveTraits = async () => {
    if (!character || !user) return;

    setIsSubmittingTraits(true);
    try {
      await updateCharacterTraits({
        variables: {
          id: character.id,
          updateCharacterTraitsInput: {
            traitValues,
          },
        },
      });

      toast.success("Traits updated successfully!");
    } catch (error) {
      console.error("Failed to update traits:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update traits. Please try again.",
      );
    } finally {
      setIsSubmittingTraits(false);
    }
  };

  const handleBack = () => {
    navigate(`/character/${id}`);
  };

  // Check if user has permission to edit this character
  if (character && !canUserEditCharacter(character, user, permissions)) {
    return (
      <Container>
        <ErrorContainer>
          <h3>Access Denied</h3>
          <p>You do not have permission to edit this character.</p>
        </ErrorContainer>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container>
        <LoadingContainer>
          <LoadingSpinner />
        </LoadingContainer>
      </Container>
    );
  }

  if (error || !character) {
    return (
      <Container>
        <ErrorContainer>
          <h3>Character not found</h3>
          <p>
            The character you are trying to edit does not exist or you do not
            have permission to view it.
          </p>
        </ErrorContainer>
      </Container>
    );
  }

  return (
    <Container>
      <BackButton onClick={handleBack}>Back to Character</BackButton>

      <Title>Edit Character</Title>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <FormSection>
          <SectionTitle>Basic Information</SectionTitle>

          <FormRow>
            <FormGroup>
              <Label>Name *</Label>
              <Input
                {...register("name")}
                placeholder="Character name"
                hasError={!!errors.name}
              />
              {errors.name && (
                <ErrorMessage>{errors.name.message}</ErrorMessage>
              )}
            </FormGroup>
          </FormRow>

          <FormRow>
            <FormGroup>
              <Label>Age</Label>
              <Input
                {...register("age")}
                placeholder="e.g., 25, Young Adult"
                hasError={!!errors.age}
              />
              {errors.age && <ErrorMessage>{errors.age.message}</ErrorMessage>}
            </FormGroup>

            <FormGroup>
              <Label>Gender</Label>
              <Input
                {...register("gender")}
                placeholder="e.g., Male, Female, Non-binary"
                hasError={!!errors.gender}
              />
              {errors.gender && (
                <ErrorMessage>{errors.gender.message}</ErrorMessage>
              )}
            </FormGroup>
          </FormRow>
        </FormSection>

        <FormSection>
          <SectionTitle>Character Details</SectionTitle>

          <FormGroup>
            <Label>Character Details</Label>
            <CharacterDetailsEditor
              value={watch("details") || ""}
              onChange={(value) => setValue("details", value, { shouldValidate: true })}
              error={errors.details?.message}
              maxLength={15000}
            />
          </FormGroup>
        </FormSection>

        <FormSection>
          <SectionTitle>Settings & Trading</SectionTitle>

          <FormRow>
            <FormGroup>
              <Label>Visibility</Label>
              <Select
                {...register("visibility")}
                hasError={!!errors.visibility}
              >
                <option value="PUBLIC">Public - Anyone can view</option>
                <option value="UNLISTED">
                  Unlisted - Only with direct link
                </option>
                <option value="PRIVATE">Private - Only you can view</option>
              </Select>
              {errors.visibility && (
                <ErrorMessage>{errors.visibility.message}</ErrorMessage>
              )}
            </FormGroup>

            <FormGroup>
              <Label>Trading Options</Label>
              <CheckboxGroup>
                <CheckboxLabel>
                  <Checkbox {...register("isTradeable")} />
                  Available for trading
                </CheckboxLabel>
                <CheckboxLabel>
                  <Checkbox {...register("isSellable")} />
                  Available for sale
                </CheckboxLabel>
              </CheckboxGroup>
            </FormGroup>
          </FormRow>

          {isSellable && (
            <FormGroup>
              <Label>Price (USD)</Label>
              <Input
                {...register("price")}
                placeholder="0.00"
                type="number"
                step="0.01"
                min="0"
                pattern="^[0-9]*\.?[0-9]*$"
                hasError={!!errors.price}
                onInput={(e) => {
                  const target = e.target as HTMLInputElement;
                  const value = target.value;
                  // Remove any invalid characters, keeping only digits and decimal point
                  const cleaned = value.replace(/[^0-9.]/g, "");
                  // Ensure only one decimal point
                  const parts = cleaned.split(".");
                  if (parts.length > 2) {
                    target.value = parts[0] + "." + parts.slice(1).join("");
                  } else {
                    target.value = cleaned;
                  }
                }}
              />
              {errors.price && (
                <ErrorMessage>{errors.price.message}</ErrorMessage>
              )}
            </FormGroup>
          )}
        </FormSection>

        <FormSection>
          <SectionTitle>Tags</SectionTitle>

          <FormGroup>
            <Label>Tags</Label>
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
            {errors.tags && <ErrorMessage>{errors.tags.message}</ErrorMessage>}
          </FormGroup>
        </FormSection>

        {/* Species Selection Section */}
        <FormSection>
          <SectionTitle>Species</SectionTitle>

          {character.speciesId ? (
            // Character already has a species - show it as read-only
            <>
              <InfoBox>
                Species assignment is permanent and cannot be changed once set.
              </InfoBox>
              <CurrentSpeciesDisplay>
                <p>
                  <strong>Current Species:</strong> {character.species?.name || "Unknown"}
                </p>
                {character.speciesVariant && (
                  <p style={{ marginTop: "0.5rem" }}>
                    <strong>Variant:</strong> {character.speciesVariant.name}
                  </p>
                )}
              </CurrentSpeciesDisplay>
            </>
          ) : (
            // Character doesn't have a species yet - allow selection
            <>
              <WarningBox>
                <AlertTriangle size={20} />
                <div>
                  <strong>Important:</strong> Once you assign a species to this character,
                  it cannot be changed. Choose carefully!
                </div>
              </WarningBox>
              <SpeciesSelector
                selectedSpecies={selectedSpecies}
                selectedVariant={selectedVariant}
                onSpeciesChange={setSelectedSpecies}
                onVariantChange={setSelectedVariant}
              />
            </>
          )}
        </FormSection>

        {/* Pending Ownership Section - only show for orphaned characters with permission */}
        {!character.owner && character.speciesId && permissions.canCreateOrphanedCharacter && (
          <FormSection>
            <SectionTitle>Pending Ownership</SectionTitle>
            <InfoBox>
              Set a pending owner if this character will be transferred to someone who hasn't registered yet.
            </InfoBox>

            <GrantTargetSelector
              value={characterTarget}
              onChange={setCharacterTarget}
              onUserSearch={() => {}} // No user search needed for editing
              allowPendingOwner={true}
              discordGuildId={character.species?.community?.discordGuildId}
              discordGuildName={character.species?.community?.discordGuildName}
              userLabel="No Pending Owner"
              pendingOwnerLabel="Set Pending Owner"
            />
          </FormSection>
        )}

        {/* Traits Section - only show if character has a species */}
        {character.speciesId && (
          <FormSection>
            <SectionTitle>Character Traits</SectionTitle>
            <TraitForm
              speciesId={character.speciesId}
              speciesVariant={character.speciesVariant as SpeciesVariantDetailsFragment | null}
              traitValues={traitValues}
              onChange={setTraitValues}
              disabled={isSubmittingTraits}
            />
            <TraitActions>
              <Button
                type="button"
                variant="primary"
                onClick={handleSaveTraits}
                disabled={isSubmittingTraits}
              >
                {isSubmittingTraits ? "Saving Traits..." : "Save Traits"}
              </Button>
            </TraitActions>
          </FormSection>
        )}

        <Actions>
          <Button
            type="button"
            variant="ghost"
            onClick={handleBack}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </Actions>
      </Form>
    </Container>
  );
};
