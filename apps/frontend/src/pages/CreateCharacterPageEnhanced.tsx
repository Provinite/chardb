import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-hot-toast";
import styled from "styled-components";
import { ArrowLeft, User, FileText, Settings, Tag as TagIcon } from "lucide-react";
import { Button, TagInput } from "@chardb/ui";
import {
  useCreateCharacterMutation,
  SpeciesDetailsFragment,
  SpeciesVariantDetailsFragment,
  CharacterTraitValueInput,
  Visibility,
} from "../generated/graphql";
import { useTagSearch } from "../hooks/useTagSearch";
import { SpeciesSelector } from "../components/character/SpeciesSelector";
import { TraitForm } from "../components/character/TraitForm";
import { CharacterDetailsEditor } from "../components/character/CharacterDetailsEditor";

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

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Species and variant state
  const [selectedSpecies, setSelectedSpecies] = useState<SpeciesDetailsFragment | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<SpeciesVariantDetailsFragment | null>(null);
  
  // Trait values state
  const [traitValues, setTraitValues] = useState<CharacterTraitValueInput[]>([]);
  
  // Tags state
  const [tags, setTags] = useState<string[]>([]);
  const { searchTags, suggestions, loading: tagsLoading } = useTagSearch();

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
      await createCharacterMutation({
        variables: {
          input: {
            name: data.name,
            age: data.age || undefined,
            gender: data.gender || undefined,
            details: data.details || undefined,
            visibility: data.visibility,
            isSellable: data.isSellable,
            isTradeable: data.isTradeable,
            price: data.price ? parseFloat(data.price) : undefined,
            tags: tags.length > 0 ? tags : undefined,
            speciesId: selectedSpecies?.id || undefined,
            speciesVariantId: selectedVariant?.id || undefined,
            traitValues: traitValues.length > 0 ? traitValues : undefined,
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

          <FormGroup>
            <Label htmlFor="age">Age (Optional)</Label>
            <Input
              {...register("age")}
              id="age"
              type="text"
              placeholder="e.g., 25, Young Adult, etc."
            />
            {errors.age && <ErrorMessage>{errors.age.message}</ErrorMessage>}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="gender">Gender (Optional)</Label>
            <Input
              {...register("gender")}
              id="gender"
              type="text"
              placeholder="e.g., Male, Female, Non-binary, etc."
            />
            {errors.gender && <ErrorMessage>{errors.gender.message}</ErrorMessage>}
          </FormGroup>
        </Section>

        {/* Species Selection */}
        <Section>
          <SpeciesSelector
            selectedSpecies={selectedSpecies}
            selectedVariant={selectedVariant}
            onSpeciesChange={setSelectedSpecies}
            onVariantChange={setSelectedVariant}
          />
        </Section>

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
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Character"}
          </Button>
        </ButtonRow>
      </Form>
    </Container>
  );
};