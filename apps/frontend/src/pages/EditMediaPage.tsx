import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@apollo/client";
import { toast } from "react-hot-toast";
import styled from "styled-components";
import { Button } from "@chardb/ui";
import {
  GET_MEDIA_ITEM,
  UPDATE_MEDIA,
  UPDATE_TEXT_CONTENT,
  UPDATE_IMAGE,
  useGetMediaItemQuery,
} from "../graphql/media.graphql";
import { useGetMyGalleriesQuery } from "../graphql/galleries.graphql";
import { TextFormatting, Visibility } from "../generated/graphql";
import { useAuth } from "../contexts/AuthContext";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { MarkdownEditor } from "../components/MarkdownEditor";

const mediaSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title must be less than 255 characters"),
  description: z
    .string()
    .max(3000, "Description must be less than 3000 characters")
    .optional()
    .or(z.literal("")),
  content: z
    .string()
    .max(50000, "Content must be less than 50,000 characters")
    .optional()
    .or(z.literal("")),
  formatting: z.nativeEnum(TextFormatting).optional(),
  visibility: z.nativeEnum(Visibility),
  galleryId: z.string().optional(),
  // Image-specific fields
  altText: z
    .string()
    .max(200, "Alt text must be less than 200 characters")
    .optional()
    .or(z.literal("")),
  isNsfw: z.boolean().optional(),
  artistName: z
    .string()
    .max(100, "Artist name must be less than 100 characters")
    .optional()
    .or(z.literal("")),
  artistUrl: z
    .string()
    .optional()
    .refine(
      (val) => !val || val === "" || z.string().url().safeParse(val).success,
      {
        message: "Artist URL must be a valid URL",
      },
    ),
  source: z
    .string()
    .optional()
    .refine(
      (val) => !val || val === "" || z.string().url().safeParse(val).success,
      {
        message: "Source URL must be a valid URL",
      },
    ),
});

type MediaForm = z.infer<typeof mediaSchema>;

const Container = styled.div`
  max-width: 900px;
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
  gap: ${({ theme }) => theme.spacing.xl};
`;

const Section = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.lg} 0;
  padding-bottom: ${({ theme }) => theme.spacing.sm};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  margin-bottom: ${({ theme }) => theme.spacing.lg};

  &:last-child {
    margin-bottom: 0;
  }
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.lg};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const Label = styled.label`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Input = styled.input`
  padding: 0.75rem ${({ theme }) => theme.spacing.md};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &[aria-invalid="true"] {
    border-color: ${({ theme }) => theme.colors.error};
  }
`;

const Select = styled.select`
  padding: 0.75rem ${({ theme }) => theme.spacing.md};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  background: ${({ theme }) => theme.colors.background};
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &[aria-invalid="true"] {
    border-color: ${({ theme }) => theme.colors.error};
  }
`;

const TextArea = styled.textarea`
  padding: 0.75rem ${({ theme }) => theme.spacing.md};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  resize: vertical;
  min-height: 120px;
  font-family: inherit;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &[aria-invalid="true"] {
    border-color: ${({ theme }) => theme.colors.error};
  }
`;

const ContentTextArea = styled(TextArea)`
  min-height: 400px;
`;

const ErrorMessage = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.error};
`;

const ButtonRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  justify-content: flex-end;
  margin-top: ${({ theme }) => theme.spacing.xl};

  @media (max-width: 768px) {
    flex-direction: column-reverse;
  }
`;

const CancelButton = styled.button`
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  background: transparent;
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
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

export const EditMediaPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, loading, error } = useGetMediaItemQuery({
    variables: { id: id! },
    skip: !id,
  });

  // Get user's galleries for selection
  const { data: galleriesData } = useGetMyGalleriesQuery({
    variables: {
      filters: {
        limit: 100,
        offset: 0,
      },
    },
    skip: !user,
  });

  const galleries = galleriesData?.myGalleries?.galleries || [];
  const media = data?.mediaItem;
  const isTextMedia = media?.textContentId && media?.textContent;
  const isImageMedia = media?.imageId && media?.image;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
    clearErrors,
    control,
  } = useForm<MediaForm>({
    resolver: zodResolver(mediaSchema),
    defaultValues: {
      title: "",
      description: "",
      content: "",
      formatting: TextFormatting.Markdown,
      visibility: Visibility.Public,
      galleryId: undefined,
      // Image fields
      altText: "",
      isNsfw: false,
      artistName: "",
      artistUrl: "",
      source: "",
    },
  });

  const [updateMedia] = useMutation(UPDATE_MEDIA, {
    refetchQueries: [{ query: GET_MEDIA_ITEM, variables: { id } }],
  });

  const [updateTextContent] = useMutation(UPDATE_TEXT_CONTENT, {
    refetchQueries: [{ query: GET_MEDIA_ITEM, variables: { id } }],
  });

  const [updateImage] = useMutation(UPDATE_IMAGE, {
    refetchQueries: [{ query: GET_MEDIA_ITEM, variables: { id } }],
  });

  // Reset form when media data loads
  useEffect(() => {
    if (media) {
      reset({
        title: media.title,
        description: media.description || "",
        content: media.textContent?.content || "",
        formatting: media.textContent?.formatting || TextFormatting.Markdown,
        visibility: media.visibility,
        galleryId: media.galleryId || undefined,
        // Image fields
        altText: media.image?.altText || "",
        isNsfw: media.image?.isNsfw || false,
        artistName: media.image?.artistName || "",
        artistUrl: media.image?.artistUrl || "",
        source: media.image?.source || "",
      });
    }
  }, [media, reset]);

  const handleBackClick = () => {
    navigate(`/media/${id}`);
  };

  const onSubmit = async (data: MediaForm) => {
    if (!media || !user) return;

    // Custom validation for text media content
    if (isTextMedia && (!data.content || data.content.trim() === "")) {
      setError("content", {
        type: "manual",
        message: "Content is required for text media",
      });
      return;
    }

    // Clear any existing content errors
    clearErrors("content");

    console.log("Form submission started");
    console.log("Form data:", data);
    console.log("Is image media:", isImageMedia);
    console.log("Media object:", media);

    setIsSubmitting(true);
    try {
      console.log("Step 1: Starting updateMedia mutation");
      // Update basic media information
      const mediaResult = await updateMedia({
        variables: {
          id: media.id,
          input: {
            title: data.title,
            description: data.description || undefined,
            visibility: data.visibility,
            galleryId: data.galleryId || undefined,
          },
        },
      });
      console.log("Step 1: updateMedia completed:", mediaResult);

      // Update text content if this is a text media item
      if (isTextMedia && data.content && data.formatting) {
        console.log("Step 2: Starting updateTextContent mutation");
        const textResult = await updateTextContent({
          variables: {
            mediaId: media.id,
            input: {
              content: data.content,
              formatting: data.formatting,
            },
          },
        });
        console.log("Step 2: updateTextContent completed:", textResult);
      }

      // Update image metadata if this is an image media item
      if (isImageMedia && media.image) {
        console.log("Step 3: Starting updateImage mutation");
        const imageResult = await updateImage({
          variables: {
            id: media.image.id,
            input: {
              altText: data.altText || undefined,
              isNsfw: data.isNsfw,
              artistName: data.artistName || undefined,
              artistUrl: data.artistUrl || undefined,
              source: data.source || undefined,
            },
          },
        });
        console.log("Step 3: updateImage completed:", imageResult);
      }

      console.log("All mutations completed successfully");
      toast.success("Media updated successfully!");
      navigate(`/media/${media.id}`);
    } catch (error) {
      console.error("Error updating media:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update media. Please try again.",
      );
    } finally {
      console.log("Setting isSubmitting to false");
      setIsSubmitting(false);
    }
  };

  // Check if user owns this media
  if (media && user && media.ownerId !== user.id) {
    return (
      <Container>
        <BackButton onClick={handleBackClick}>Back to Media</BackButton>
        <ErrorContainer>
          <h3>Access Denied</h3>
          <p>You can only edit your own media.</p>
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

  if (error || !media) {
    return (
      <Container>
        <BackButton onClick={handleBackClick}>Back</BackButton>
        <ErrorContainer>
          <h3>Media not found</h3>
          <p>
            The media you are trying to edit does not exist or you do not have
            permission to view it.
          </p>
        </ErrorContainer>
      </Container>
    );
  }

  return (
    <Container>
      <BackButton onClick={handleBackClick}>Back to Media</BackButton>

      <Title>Edit Media</Title>

      <Form onSubmit={handleSubmit(onSubmit)}>
        {/* Basic Information */}
        <Section>
          <SectionTitle>Basic Information</SectionTitle>

          <FormGroup>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              {...register("title")}
              aria-invalid={!!errors.title}
              placeholder="Enter a title for your media"
            />
            {errors.title && (
              <ErrorMessage>{errors.title.message}</ErrorMessage>
            )}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="description">Description</Label>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <MarkdownEditor
                  value={field.value || ""}
                  onChange={field.onChange}
                  error={errors.description?.message}
                  maxLength={3000}
                  placeholder="Optional description or summary..."
                  minHeight="150px"
                />
              )}
            />
          </FormGroup>
        </Section>

        {/* Content Settings */}
        <Section>
          <SectionTitle>Settings</SectionTitle>

          <FormRow>
            <FormGroup>
              <Label htmlFor="visibility">Visibility</Label>
              <Select
                id="visibility"
                {...register("visibility")}
                aria-invalid={!!errors.visibility}
              >
                <option value={Visibility.Public}>
                  Public - Visible to everyone
                </option>
                <option value={Visibility.Unlisted}>
                  Unlisted - Only visible with direct link
                </option>
                <option value={Visibility.Private}>
                  Private - Only visible to you
                </option>
              </Select>
              {errors.visibility && (
                <ErrorMessage>{errors.visibility.message}</ErrorMessage>
              )}
            </FormGroup>

            <FormGroup>
              <Label htmlFor="galleryId">Gallery (Optional)</Label>
              {galleries.length === 0 ? (
                <>
                  <Select id="galleryId" {...register("galleryId")} disabled>
                    <option value="">No galleries yet</option>
                  </Select>
                  <div style={{ marginTop: "0.5rem" }}>
                    <a
                      href="/gallery/create"
                      style={{
                        fontSize: "0.875rem",
                        color: "var(--color-primary)",
                      }}
                    >
                      Create your first gallery
                    </a>
                  </div>
                </>
              ) : (
                <Select
                  id="galleryId"
                  {...register("galleryId")}
                  aria-invalid={!!errors.galleryId}
                >
                  <option value="">Select a gallery...</option>
                  {galleries.map((gallery) => (
                    <option key={gallery.id} value={gallery.id}>
                      {gallery.name}
                    </option>
                  ))}
                </Select>
              )}
              {errors.galleryId && (
                <ErrorMessage>{errors.galleryId.message}</ErrorMessage>
              )}
            </FormGroup>
          </FormRow>
        </Section>

        {/* Text Content Section - only show for text media */}
        {isTextMedia && (
          <Section>
            <SectionTitle>Content</SectionTitle>

            <FormGroup>
              <Label htmlFor="formatting">Formatting</Label>
              <Select
                id="formatting"
                {...register("formatting")}
                aria-invalid={!!errors.formatting}
              >
                <option value={TextFormatting.Markdown}>Markdown</option>
                <option value={TextFormatting.Plaintext}>Plain Text</option>
              </Select>
              {errors.formatting && (
                <ErrorMessage>{errors.formatting.message}</ErrorMessage>
              )}
            </FormGroup>

            <FormGroup>
              <Label htmlFor="content">Content *</Label>
              <ContentTextArea
                id="content"
                {...register("content")}
                aria-invalid={!!errors.content}
                placeholder="Write your story, character description, backstory, or any other text content..."
              />
              {errors.content && (
                <ErrorMessage>{errors.content.message}</ErrorMessage>
              )}
            </FormGroup>
          </Section>
        )}

        {/* Image Content Section - only show for image media */}
        {isImageMedia && (
          <Section>
            <SectionTitle>Image Information</SectionTitle>

            <FormGroup>
              <Label htmlFor="altText">Alt Text</Label>
              <Input
                id="altText"
                {...register("altText")}
                aria-invalid={!!errors.altText}
                placeholder="Describe the image for accessibility..."
              />
              {errors.altText && (
                <ErrorMessage>{errors.altText.message}</ErrorMessage>
              )}
            </FormGroup>

            <FormRow>
              <FormGroup>
                <Label htmlFor="artistName">Artist Name</Label>
                <Input
                  id="artistName"
                  {...register("artistName")}
                  aria-invalid={!!errors.artistName}
                  placeholder="Name of the artist (if known)"
                />
                {errors.artistName && (
                  <ErrorMessage>{errors.artistName.message}</ErrorMessage>
                )}
              </FormGroup>

              <FormGroup>
                <Label htmlFor="artistUrl">Artist URL</Label>
                <Input
                  id="artistUrl"
                  {...register("artistUrl")}
                  aria-invalid={!!errors.artistUrl}
                  placeholder="https://artist-website.com"
                />
                {errors.artistUrl && (
                  <ErrorMessage>{errors.artistUrl.message}</ErrorMessage>
                )}
              </FormGroup>
            </FormRow>

            <FormGroup>
              <Label htmlFor="source">Source URL</Label>
              <Input
                id="source"
                {...register("source")}
                aria-invalid={!!errors.source}
                placeholder="https://original-source.com"
              />
              {errors.source && (
                <ErrorMessage>{errors.source.message}</ErrorMessage>
              )}
            </FormGroup>

            <FormGroup>
              <CheckboxLabel>
                <Checkbox {...register("isNsfw")} />
                Mark as NSFW (Not Safe for Work)
              </CheckboxLabel>
            </FormGroup>
          </Section>
        )}

        <ButtonRow>
          <CancelButton type="button" onClick={handleBackClick}>
            Cancel
          </CancelButton>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </ButtonRow>
      </Form>
    </Container>
  );
};
