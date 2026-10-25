import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { Image as ImageIcon } from "lucide-react";
import { Button } from "@chardb/ui";
import { ImageUpload, type ImageFile } from "../ImageUpload";
import {
  isPickedImageBlocked,
  type PendingCharacterImage,
} from "../../lib/attachMainImage";

/**
 * The image column on the character create and edit forms (#406).
 *
 * The character is in view while its details and traits are written: pinned
 * beside the form on wide screens, first above it on narrow ones.
 */

/** A picked image plus the object URL it is previewed from. */
export type PickedCharacterImage = PendingCharacterImage & { preview: string };

const Layout = styled.div`
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: ${({ theme }) => theme.spacing.xl};
  align-items: start;

  @media (max-width: 1024px) {
    grid-template-columns: minmax(0, 1fr);
    gap: ${({ theme }) => theme.spacing.lg};
  }
`;

const Aside = styled.aside`
  position: sticky;
  top: ${({ theme }) => theme.spacing.lg};

  @media (max-width: 1024px) {
    position: static;
  }
`;

const Panel = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const PanelTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Preview = styled.img`
  width: 100%;
  max-height: 60vh;
  object-fit: contain;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme }) => theme.colors.background};
`;

const Placeholder = styled.div`
  padding: ${({ theme }) => theme.spacing.xl};
  text-align: center;
  border: 2px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const PanelLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const Note = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Refusal = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.error};
`;

const FlagGroup = styled.fieldset`
  border: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.md};
`;

const FlagLegend = styled.legend`
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const FlagLabel = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  cursor: pointer;
`;

const Description = styled.textarea`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  resize: vertical;
`;

interface CharacterFormLayoutProps {
  aside: React.ReactNode;
  children: React.ReactNode;
}

/** The form with the image column pinned to its left. */
export const CharacterFormLayout: React.FC<CharacterFormLayoutProps> = ({
  aside,
  children,
}) => (
  <Layout>
    <Aside>{aside}</Aside>
    <div>{children}</div>
  </Layout>
);

interface CharacterImagePickerProps {
  value: PickedCharacterImage | null;
  onChange: (value: PickedCharacterImage | null) => void;
  /** Set when the image cannot be attached, e.g. the role cannot upload. */
  disabledReason?: string;
}

/**
 * Picks the image a new character starts with. Nothing is uploaded here: the
 * file is held until the character exists, then attached by the page.
 */
export const CharacterImagePicker: React.FC<CharacterImagePickerProps> = ({
  value,
  onChange,
  disabledReason,
}) => {
  const preview = value?.preview;

  // The object URL lives as long as this pick does.
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const handleFilesChange = (files: ImageFile[]) => {
    const [first] = files;
    if (!first) return;
    onChange({
      file: first.file,
      preview: first.preview,
      nsfwSensitive: false,
      sensitiveContentDescription: "",
    });
  };

  return (
    <Panel data-testid="character-image-picker">
      <PanelTitle>
        <ImageIcon size={20} />
        Image
      </PanelTitle>

      {value ? (
        <>
          <Preview src={value.preview} alt={value.file.name} />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
          >
            Remove image
          </Button>

          <FlagGroup>
            <FlagLegend>NSFW Settings</FlagLegend>
            <FlagLabel>
              <input
                type="checkbox"
                checked={value.nsfwSensitive}
                onChange={(e) =>
                  onChange({ ...value, nsfwSensitive: e.target.checked })
                }
              />
              Sensitive Content
            </FlagLabel>
          </FlagGroup>

          {value.nsfwSensitive && (
            <Description
              rows={2}
              aria-label="Describe the sensitive content"
              placeholder="Briefly describe the sensitive content..."
              value={value.sensitiveContentDescription}
              onChange={(e) =>
                onChange({
                  ...value,
                  sensitiveContentDescription: e.target.value,
                })
              }
            />
          )}

          {isPickedImageBlocked(value) && (
            <Refusal>NSFW image uploads are not accepted at this time.</Refusal>
          )}
        </>
      ) : disabledReason ? (
        <>
          <Placeholder>No image</Placeholder>
          <Note>{disabledReason}</Note>
        </>
      ) : (
        <>
          <ImageUpload
            files={[]}
            onFilesChange={handleFilesChange}
            maxFiles={1}
          />
          <Note>
            Becomes the character&apos;s main image once it is created, and goes
            through moderation like any upload.
          </Note>
        </>
      )}
    </Panel>
  );
};

interface CharacterMainImagePreviewProps {
  image: { url: string; altText: string } | null;
  uploadHref: string;
}

/** The edit form's image column: the character's current main image. */
export const CharacterMainImagePreview: React.FC<
  CharacterMainImagePreviewProps
> = ({ image, uploadHref }) => (
  <Panel>
    <PanelTitle>
      <ImageIcon size={20} />
      Main Image
    </PanelTitle>
    {image ? (
      <Preview src={image.url} alt={image.altText} />
    ) : (
      <Placeholder>No main image yet</Placeholder>
    )}
    <PanelLink to={uploadHref}>Upload a new image</PanelLink>
  </Panel>
);
