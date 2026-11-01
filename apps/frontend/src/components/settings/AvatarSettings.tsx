import React, { useRef, useState } from "react";
import styled from "styled-components";
import toast from "react-hot-toast";
import { useApolloClient } from "@apollo/client";
import { Avatar, Button } from "@chardb/ui";
import {
  useUpdateImageMutation,
  useUpdateProfileMutation,
} from "../../generated/graphql";
import { API_BASE_URL } from "../../lib/communityHost";
import { getAccessToken } from "../../lib/accessToken";
import { ThumbnailCropper, ThumbnailCropRect } from "../ThumbnailCropper";

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

const Note = styled.p`
  margin: 0;
  max-width: 46ch;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const HiddenFileInput = styled.input`
  display: none;
`;

interface AvatarSettingsProps {
  /** Shown when there is no avatar, and the alt text of last resort. */
  name: string;
  /** The avatar being served, if there is one. */
  avatarImage?: AvatarSettingsImage | null;
}

/**
 * Choose the picture that stands for you.
 *
 * Saves on the spot rather than waiting on the profile form's Save button:
 * uploading is a REST round trip that has already happened by the time you
 * would press Save, and a control that silently did nothing until a button
 * further down the page was pressed would be the surprising option here.
 *
 * Avatars are not moderated and are not posts (#410). An upload goes to
 * `POST /images/avatar`, which stores the picture and makes it your avatar in
 * one call, so it shows straight away. An avatar IS its image's 300x300
 * thumbnail, which is why re-framing one is an image update.
 */
export const AvatarSettings: React.FC<AvatarSettingsProps> = ({
  name,
  avatarImage,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const client = useApolloClient();

  const [updateProfile, { loading: saving }] = useUpdateProfileMutation({
    refetchQueries: ["Me"],
  });
  const [updateImage, { loading: reframeSaving }] = useUpdateImageMutation({
    refetchQueries: ["Me"],
  });

  const [uploading, setUploading] = useState(false);
  const [reframing, setReframing] = useState(false);
  /** A file staged for upload, with the object URL the cropper frames. */
  const [staged, setStaged] = useState<{ file: File; preview: string } | null>(
    null,
  );

  const busy = saving || uploading || reframeSaving;

  const removeAvatar = async () => {
    try {
      await updateProfile({ variables: { input: { avatarImageId: null } } });
      toast.success("Avatar removed");
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Could not remove your avatar",
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
      body.append("thumbnailCropX", String(crop.x));
      body.append("thumbnailCropY", String(crop.y));
      body.append("thumbnailCropWidth", String(crop.width));
      body.append("thumbnailCropHeight", String(crop.height));

      const response = await fetch(`${API_BASE_URL}/images/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getAccessToken()}` },
        body,
      });

      if (!response.ok) {
        const failure = await response.json().catch(() => ({}));
        throw new Error(failure.message || "Upload failed");
      }

      // The avatar is set from here on. Reported before the refetch, and the
      // refetch's own failure kept out of the catch below: told the upload
      // failed, someone would upload again and replace the avatar they just
      // set. A failed refetch only leaves this page a step behind.
      closeStaged();
      toast.success("Avatar updated");
      void client.refetchQueries({ include: ["Me"] }).catch(() => undefined);
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

  return (
    <>
      <Row>
        <Avatar image={avatarImage} name={name} size={96} />

        <Actions>
          <ButtonRow>
            <Button
              type="button"
              tone="primary"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload a picture
            </Button>
            {avatarImage && (
              <Button
                type="button"
                tone="secondary"
                disabled={busy}
                onClick={() => setReframing(true)}
              >
                Adjust framing
              </Button>
            )}
            {avatarImage && (
              <Button
                type="button"
                tone="ghost"
                disabled={busy}
                onClick={() => void removeAvatar()}
              >
                Remove
              </Button>
            )}
          </ButtonRow>

          <Note>
            Shown wherever you appear: your profile, your comments, and every
            card that names you.
          </Note>
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
    </>
  );
};
