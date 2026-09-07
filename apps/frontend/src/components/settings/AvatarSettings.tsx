import React, { useRef, useState } from "react";
import styled from "styled-components";
import toast from "react-hot-toast";
import { Avatar, Button, Modal } from "@chardb/ui";
import {
  MediaType,
  ModerationStatus,
  useMyAvatarCandidatesQuery,
  useUpdateImageMutation,
  useUpdateProfileMutation,
} from "../../generated/graphql";
import { useCommunityId } from "../../contexts/CommunityHostContext";
import { API_BASE_URL } from "../../lib/communityHost";
import { getAccessToken } from "../../lib/accessToken";
import { ThumbnailCropper, ThumbnailCropRect } from "../ThumbnailCropper";
import { LoadingSpinner } from "../LoadingSpinner";

/**
 * What the REST upload endpoint hands back -- only the parts read here. The
 * response is a whole Media row with its image nested inside.
 */
interface UploadImageResponse {
  id: string;
  image: { id: string };
}

/** The current avatar, as much of it as this control needs. */
export interface AvatarSettingsImage {
  id: string;
  originalUrl: string;
  thumbnailUrl?: string | null;
  altText?: string | null;
  thumbnailCrop?: ThumbnailCropRect | null;
}

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.lg};
  flex-wrap: wrap;
`;

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const ButtonRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  flex-wrap: wrap;
`;

const Note = styled.p<{ $tone?: "muted" | "warning" | "error" }>`
  margin: 0;
  max-width: 46ch;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme, $tone }) =>
    $tone === "error"
      ? theme.colors.error
      : $tone === "warning"
        ? theme.colors.text.primary
        : theme.colors.text.secondary};
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
  max-height: 50vh;
  overflow-y: auto;
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const Tile = styled.button<{ $selectable: boolean }>`
  position: relative;
  padding: 0;
  border: 2px solid
    ${({ theme, $selectable }) =>
      $selectable ? theme.colors.border : "transparent"};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme }) => theme.colors.surface};
  cursor: ${({ $selectable }) => ($selectable ? "pointer" : "not-allowed")};
  opacity: ${({ $selectable }) => ($selectable ? 1 : 0.45)};
  overflow: hidden;
  aspect-ratio: 1;

  &:hover:enabled {
    border-color: ${({ theme }) => theme.colors.primary};
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`;

const TileLabel = styled.span`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 2px 4px;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  background: rgba(0, 0, 0, 0.65);
  color: white;
`;

const Centred = styled.div`
  padding: ${({ theme }) => theme.spacing.xl};
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

/**
 * The shared `Modal` closes on a click outside and offers nothing else -- no
 * Escape handler, no close button of its own. The cropper brings its own
 * Cancel for that reason and so does this.
 */
const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

/** One pickable picture, flattened out of its media row. */
interface Candidate {
  mediaId: string;
  imageId: string;
  title: string;
  src: string;
  altText: string | null;
  approved: boolean;
}

interface AvatarSettingsProps {
  /** Shown when there is no avatar, and the alt text of last resort. */
  name: string;
  /** The avatar being served, if there is one that may be. */
  avatarImage?: AvatarSettingsImage | null;
  /**
   * Status of the image on the profile, whether or not it is being served.
   * Null when no avatar is set.
   */
  moderationStatus?: ModerationStatus | null;
}

/**
 * Choose the picture that stands for you.
 *
 * Saves on the spot rather than waiting on the profile form's Save button. The
 * two inputs it takes do not fit into one: uploading is a REST round trip that
 * has already happened by the time you would press Save, and picking an
 * existing image is a click on a picture, not a field. A control that silently
 * did nothing until a button further down the page was pressed would be the
 * surprising option here, not the consistent one.
 *
 * An avatar IS the image's 300x300 thumbnail, which is why this needs no
 * rendition of its own and why re-framing one is the same operation the media
 * page already offers -- and why doing it here moves that image's thumbnail
 * everywhere else too. The button says so.
 */
export const AvatarSettings: React.FC<AvatarSettingsProps> = ({
  name,
  avatarImage,
  moderationStatus,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hostCommunityId = useCommunityId();

  const [updateProfile, { loading: saving }] = useUpdateProfileMutation({
    refetchQueries: ["Me"],
  });
  const [updateImage, { loading: reframeSaving }] = useUpdateImageMutation({
    refetchQueries: ["Me"],
  });

  const [picking, setPicking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reframing, setReframing] = useState(false);
  /** A file staged for upload, with the object URL the cropper frames. */
  const [staged, setStaged] = useState<{ file: File; preview: string } | null>(
    null,
  );

  const { data, loading: loadingCandidates } = useMyAvatarCandidatesQuery({
    variables: { filters: { mediaType: MediaType.Image, limit: 60 } },
    skip: !picking,
    fetchPolicy: "cache-and-network",
  });

  const candidates: Candidate[] = (data?.myMedia.media ?? []).flatMap(
    (media) => {
      const image = media.image;
      if (!image) return [];

      return [
        {
          mediaId: media.id,
          imageId: image.id,
          title: media.title,
          // An unapproved image comes back with every URL masked, so its tile
          // shows the placeholder rather than art nobody has cleared yet.
          src: image.thumbnailUrl || image.originalUrl,
          altText: image.altText ?? null,
          approved: image.moderationStatus === ModerationStatus.Approved,
        },
      ];
    },
  );

  const busy = saving || uploading || reframeSaving;

  const setAvatar = async (imageId: string | null, message: string) => {
    try {
      await updateProfile({ variables: { input: { avatarImageId: imageId } } });
      toast.success(message);
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Could not save your avatar",
      );
    }
  };

  const handleFileChosen = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Cleared so picking the same file twice in a row still fires a change.
    event.target.value = "";
    if (!file) return;
    setStaged({ file, preview: URL.createObjectURL(file) });
  };

  const closeStaged = () => {
    if (staged) URL.revokeObjectURL(staged.preview);
    setStaged(null);
  };

  const handleUpload = async (crop: ThumbnailCropRect) => {
    if (!staged) return;
    setUploading(true);

    try {
      const body = new FormData();
      body.append("file", staged.file);
      body.append("title", `${name}'s avatar`);
      // PRIVATE keeps an avatar out of the owner's public media listing, where
      // it would otherwise sit among their artwork as a post in its own right.
      // It changes nothing about the avatar: that is served through the
      // profile, not through the media row's visibility.
      body.append("visibility", "PRIVATE");
      body.append("isNsfw", "false");
      body.append("thumbnailCropX", String(crop.x));
      body.append("thumbnailCropY", String(crop.y));
      body.append("thumbnailCropWidth", String(crop.width));
      body.append("thumbnailCropHeight", String(crop.height));
      // Which community reviews it. Absent at the apex, where only a site
      // admin can.
      if (hostCommunityId) body.append("communityId", hostCommunityId);

      const response = await fetch(`${API_BASE_URL}/images/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getAccessToken()}` },
        body,
      });

      if (!response.ok) {
        const failure = await response.json().catch(() => ({}));
        throw new Error(failure.message || "Upload failed");
      }

      const result = (await response.json()) as UploadImageResponse;
      closeStaged();
      await setAvatar(
        result.image.id,
        "Avatar uploaded. It appears once a moderator approves it.",
      );
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Could not upload that image",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleReframe = async (crop: ThumbnailCropRect) => {
    if (!avatarImage) return;

    try {
      await updateImage({
        variables: { id: avatarImage.id, input: { thumbnailCrop: crop } },
      });
      setReframing(false);
      toast.success("Framing saved");
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Could not save that framing",
      );
    }
  };

  const statusNote = () => {
    // A status with no image means the picture is set but not being served.
    if (!moderationStatus || avatarImage) return null;

    if (moderationStatus === ModerationStatus.Rejected) {
      return (
        <Note $tone="error">
          The image you chose was rejected in moderation, so your initials are
          showing instead. Pick another.
        </Note>
      );
    }

    return (
      <Note $tone="warning">
        Waiting on a moderator. Your initials show until your picture is
        approved.
      </Note>
    );
  };

  return (
    <>
      <Row>
        <Avatar image={avatarImage} name={name} size={96} />

        <Actions>
          <ButtonRow>
            <Button
              type="button"
              variant="primary"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload a picture
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => setPicking(true)}
            >
              Choose from your media
            </Button>
            {avatarImage && (
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => setReframing(true)}
              >
                Adjust framing
              </Button>
            )}
            {(avatarImage || moderationStatus) && (
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => void setAvatar(null, "Avatar removed")}
              >
                Remove
              </Button>
            )}
          </ButtonRow>

          {statusNote() ?? (
            <Note>
              Shown wherever you appear: your profile, your comments, and every
              card that names you.
            </Note>
          )}
        </Actions>
      </Row>

      <HiddenFileInput
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChosen}
      />

      {staged && (
        <ThumbnailCropper
          isOpen
          title="Frame your avatar"
          imageSrc={staged.preview}
          busy={uploading}
          onCancel={closeStaged}
          onConfirm={(crop) => void handleUpload(crop)}
        />
      )}

      {reframing && avatarImage && (
        <ThumbnailCropper
          isOpen
          // The original, not the thumbnail: re-framing has to be able to
          // reach the parts of the picture the current framing cut off.
          imageSrc={avatarImage.originalUrl}
          initialCrop={avatarImage.thumbnailCrop}
          busy={reframeSaving}
          title="Adjust your avatar"
          onCancel={() => setReframing(false)}
          onConfirm={(crop) => void handleReframe(crop)}
        />
      )}

      <Modal
        isOpen={picking}
        onClose={() => setPicking(false)}
        title="Choose from your media"
      >
        {loadingCandidates && candidates.length === 0 ? (
          <Centred>
            <LoadingSpinner />
          </Centred>
        ) : candidates.length === 0 ? (
          <Centred>
            You have not uploaded any images yet. Upload one and it shows up
            here.
          </Centred>
        ) : (
          <>
            <Note>
              A picture keeps one square thumbnail, and your avatar is it. If
              you adjust the framing afterwards, it moves on that
              picture&rsquo;s card and in every grid it appears in too.
            </Note>
            <Grid>
              {candidates.map((candidate) => (
                <Tile
                  key={candidate.mediaId}
                  type="button"
                  $selectable={candidate.approved}
                  disabled={!candidate.approved || busy}
                  title={
                    candidate.approved
                      ? candidate.title
                      : `${candidate.title} — waiting on moderation`
                  }
                  onClick={() => {
                    setPicking(false);
                    void setAvatar(candidate.imageId, "Avatar updated");
                  }}
                >
                  <img
                    src={candidate.src}
                    alt={candidate.altText ?? candidate.title}
                  />
                  {!candidate.approved && (
                    <TileLabel>Awaiting approval</TileLabel>
                  )}
                </Tile>
              ))}
            </Grid>
          </>
        )}

        <ModalFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setPicking(false)}
          >
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};
