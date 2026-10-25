import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { Image as ImageIcon } from "lucide-react";
import { Button } from "@chardb/ui";
import { ImageUpload, type ImageFile } from "../ImageUpload";
import { ThumbnailCropper, type ThumbnailCropRect } from "../ThumbnailCropper";
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

const ThumbnailRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const ThumbnailSquare = styled.div`
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background-color: ${({ theme }) => theme.colors.background};
  background-repeat: no-repeat;
`;

const ThumbnailImage = styled.img`
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  object-fit: cover;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const ThumbnailText = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing.xs};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

/**
 * Paint `src` as the server will thumbnail it: the crop rect scaled to fill
 * the square, or a centred cover when there is none. CSS rather than a canvas
 * so the preview follows the crop without re-encoding anything.
 */
const thumbnailBackground = (
  src: string,
  crop: ThumbnailCropRect | undefined,
  natural: { width: number; height: number } | null,
): React.CSSProperties => {
  if (!crop || !natural) {
    return {
      backgroundImage: `url(${src})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }

  const offset = (start: number, size: number, total: number) =>
    total === size ? 0 : (start / (total - size)) * 100;

  return {
    backgroundImage: `url(${src})`,
    backgroundSize: `${(natural.width / crop.width) * 100}% ${(natural.height / crop.height) * 100}%`,
    backgroundPosition: `${offset(crop.x, crop.width, natural.width)}% ${offset(crop.y, crop.height, natural.height)}%`,
  };
};

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
  const [cropping, setCropping] = useState(false);
  // The picked file's size as the browser paints it, which is the space the
  // crop rect is measured in. Read off the preview once it loads.
  const [natural, setNatural] = useState<{
    width: number;
    height: number;
  } | null>(null);

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
          <Preview
            src={value.preview}
            alt={value.file.name}
            onLoad={(e) =>
              setNatural({
                width: e.currentTarget.naturalWidth,
                height: e.currentTarget.naturalHeight,
              })
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
          >
            Remove image
          </Button>

          {/* The thumbnail is the character's icon in cards and pickers, so
              this is where its face gets framed (#418). */}
          <ThumbnailRow>
            <ThumbnailSquare
              role="img"
              aria-label="Thumbnail preview"
              style={thumbnailBackground(
                value.preview,
                value.thumbnailCrop,
                natural,
              )}
            />
            <ThumbnailText>
              {value.thumbnailCrop
                ? "Thumbnail: your crop"
                : "Thumbnail: centre of the image"}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCropping(true)}
              >
                {value.thumbnailCrop ? "Change crop" : "Choose crop"}
              </Button>
            </ThumbnailText>
          </ThumbnailRow>

          {cropping && (
            <ThumbnailCropper
              isOpen
              title="Frame the thumbnail"
              imageSrc={value.preview}
              initialCrop={value.thumbnailCrop}
              onCancel={() => setCropping(false)}
              onConfirm={(crop) => {
                onChange({ ...value, thumbnailCrop: crop });
                setCropping(false);
              }}
              onReset={
                value.thumbnailCrop
                  ? () => {
                      onChange({ ...value, thumbnailCrop: undefined });
                      setCropping(false);
                    }
                  : undefined
              }
            />
          )}

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
  image: {
    mediaId: string;
    /** The full image, at display size. */
    url: string;
    /** The square thumbnail: the character's icon in cards and pickers. */
    thumbnailUrl: string;
    altText: string;
  } | null;
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
      <>
        <Preview src={image.url} alt={image.altText} />
        <ThumbnailRow>
          <ThumbnailImage
            src={image.thumbnailUrl}
            alt={`Thumbnail of ${image.altText}`}
          />
          <ThumbnailText>
            The thumbnail stands for the character in cards and pickers.
            {/* Reframing lives on the image's own page, which owns the rules
                for who may do it. */}
            <PanelLink to={`/media/${image.mediaId}`}>Adjust framing</PanelLink>
          </ThumbnailText>
        </ThumbnailRow>
      </>
    ) : (
      <Placeholder>No main image yet</Placeholder>
    )}
    <PanelLink to={uploadHref}>Upload a new image</PanelLink>
  </Panel>
);
