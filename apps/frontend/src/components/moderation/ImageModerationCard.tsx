import React, { useState } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import {
  Check,
  X,
  User,
  Image as ImageIcon,
  Clock,
  ExternalLink,
  AlertTriangle,
  Undo2,
} from "lucide-react";
import { Button, SmallText, Caption } from "@chardb/ui";
import {
  ModerationRejectionReason,
  ModerationStatus,
} from "../../generated/graphql";
import { RejectImageModal } from "./RejectImageModal";
import { DeferQueueEntryModal } from "./DeferQueueEntryModal";
import { DeferralBadge, DeferralDetail } from "./DeferralNotice";
import {
  AwardRecipientsWidget,
  type AwardRecipient,
  type AwardCurrency,
} from "./AwardRecipientsWidget";

/** What the card hands back to the queue when Approve carries a reward. */
export interface ApproveAward {
  currencyId?: string;
  awards: Array<{ userId: string; amount: number }>;
}

/**
 * Local type for the image moderation card item.
 * Only includes fields actually used by this component.
 */
export interface ImageModerationCardItem {
  image: {
    id: string;
    originalFilename: string;
    originalUrl: string;
    thumbnailUrl?: string | null;
    altText?: string | null;
    width: number;
    height: number;
    isNsfw: boolean;
    moderationStatus: ModerationStatus;
    createdAt: string;
    deferredAt?: string | null;
    deferralCount: number;
    deferralNote?: string | null;
    deferredBy?: {
      id: string;
      username: string;
      displayName?: string | null;
    } | null;
    uploader?: {
      id: string;
      username: string;
      displayName?: string | null;
    } | null;
  };
  characterId?: string | null;
  characterName?: string | null;
  communityId?: string | null;
  communityName?: string | null;
  mediaTitle?: string | null;
  /**
   * Null when the viewer cannot grant currency -- the server decides this, so
   * the widget's absence is a permission outcome rather than a UI guess.
   */
  awardRecipients?: AwardRecipient[] | null;
}

const Card = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s ease;

  &:hover {
    box-shadow: ${({ theme }) => theme.shadows.md};
  }
`;

const ImageContainer = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  background: ${({ theme }) => theme.colors.surface};
  overflow: hidden;
`;

const StyledImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
  cursor: pointer;
`;

const ImagePlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const NsfwBadge = styled.div`
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: ${({ theme }) => theme.colors.error};
  color: white;
  font-size: 0.7rem;
  font-weight: 600;
  border-radius: 4px;
`;

const Content = styled.div`
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const MetaIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
`;

const MetaText = styled(SmallText)`
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const MetaLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    text-decoration: underline;
  }
`;

const Divider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.colors.border};
  margin: 0.25rem 0;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionButton = styled(Button)`
  flex: 1;
`;

const ApproveButton = styled(ActionButton)`
  background: ${({ theme }) => theme.colors.success};
  border-color: ${({ theme }) => theme.colors.success};
  color: white;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.success}dd;
    border-color: ${({ theme }) => theme.colors.success}dd;
  }
`;

const ImageModal = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.9);
  cursor: pointer;
`;

const FullImage = styled.img`
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
`;

const TimestampText = styled(Caption)`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

interface ImageModerationCardProps {
  item: ImageModerationCardItem;
  /** Currencies the community defines. Empty means nothing can be awarded. */
  currencies?: AwardCurrency[];
  onApprove: (imageId: string, award?: ApproveAward) => Promise<void>;
  onReject: (
    imageId: string,
    reason: ModerationRejectionReason,
    reasonText?: string,
  ) => Promise<void>;
  onDefer: (imageId: string, note: string | undefined) => Promise<void>;
  approving?: boolean;
  rejecting?: boolean;
  deferring?: boolean;
}

export const ImageModerationCard: React.FC<ImageModerationCardProps> = ({
  item,
  currencies = [],
  onApprove,
  onReject,
  onDefer,
  approving = false,
  rejecting = false,
  deferring = false,
}) => {
  const [showFullImage, setShowFullImage] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDeferModal, setShowDeferModal] = useState(false);
  const [currencyId, setCurrencyId] = useState(currencies[0]?.id ?? "");
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  const { image, characterId, characterName, communityName, mediaTitle } = item;
  const isLoading = approving || rejecting || deferring;
  const recipients = item.awardRecipients ?? [];

  const handleApprove = async () => {
    // Only positive amounts for people who can actually be paid. A number
    // typed against a non-member has no input to be typed into, but filtering
    // here too keeps the request honest regardless of how it was produced.
    const payable = recipients.filter((r) => r.isMember);
    const awards = payable
      .map((r) => ({
        userId: r.userId,
        amount: Number(amounts[r.userId] ?? ""),
      }))
      .filter((a) => Number.isFinite(a.amount) && a.amount > 0);

    await onApprove(
      image.id,
      awards.length > 0
        ? { currencyId: currencyId || currencies[0]?.id, awards }
        : undefined,
    );
  };

  const handleRejectConfirm = async (
    reason: ModerationRejectionReason,
    reasonText?: string,
  ) => {
    await onReject(image.id, reason, reasonText);
    setShowRejectModal(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <Card>
        <ImageContainer>
          {image.thumbnailUrl || image.originalUrl ? (
            <StyledImage
              src={image.thumbnailUrl || image.originalUrl}
              alt={image.altText || image.originalFilename || "Pending image"}
              onClick={() => setShowFullImage(true)}
            />
          ) : (
            <ImagePlaceholder>
              <ImageIcon size={32} />
            </ImagePlaceholder>
          )}
          {image.isNsfw && (
            <NsfwBadge>
              <AlertTriangle size={12} />
              NSFW
            </NsfwBadge>
          )}
        </ImageContainer>

        <Content>
          {image.deferralCount > 0 && (
            <MetaRow>
              <DeferralBadge deferralCount={image.deferralCount} />
            </MetaRow>
          )}

          <DeferralDetail info={image} formatTimeAgo={formatDate} />
          <MetaRow>
            <MetaIcon>
              <User size={14} />
            </MetaIcon>
            {image.uploader ? (
              <MetaLink to={`/user/${image.uploader.username}`}>
                {image.uploader.displayName || image.uploader.username}
              </MetaLink>
            ) : (
              <MetaText>Unknown uploader</MetaText>
            )}
          </MetaRow>

          {characterId && characterName && (
            <MetaRow>
              <MetaIcon>
                <ExternalLink size={14} />
              </MetaIcon>
              <MetaLink to={`/character/${characterId}`}>
                {mediaTitle || characterName}
              </MetaLink>
            </MetaRow>
          )}

          {communityName && (
            <MetaRow>
              <MetaIcon>
                <ImageIcon size={14} />
              </MetaIcon>
              <MetaText>{communityName}</MetaText>
            </MetaRow>
          )}

          <MetaRow>
            <MetaIcon>
              <Clock size={14} />
            </MetaIcon>
            <TimestampText>{formatDate(image.createdAt)}</TimestampText>
          </MetaRow>

          <Divider />

          {/* Absent entirely for moderators without grant permission: the
              server returns null rather than an empty list, so there is
              nothing to render and Approve behaves exactly as before. */}
          {item.awardRecipients && (
            <AwardRecipientsWidget
              recipients={recipients}
              currencies={currencies}
              currencyId={currencyId || currencies[0]?.id || ""}
              onCurrencyChange={setCurrencyId}
              amounts={amounts}
              onAmountChange={(userId, value) =>
                setAmounts((current) => ({ ...current, [userId]: value }))
              }
              disabled={isLoading}
            />
          )}

          <ActionButtons>
            <ApproveButton
              size="sm"
              onClick={handleApprove}
              disabled={isLoading}
              loading={approving}
              icon={<Check size={14} />}
            >
              Approve
            </ApproveButton>
            {/* Between the two outcomes and neither of them: the image stays
                pending, the uploader hears nothing. */}
            <ActionButton
              variant="outline"
              size="sm"
              onClick={() => setShowDeferModal(true)}
              disabled={isLoading}
              loading={deferring}
              icon={<Undo2 size={14} />}
            >
              Send to back
            </ActionButton>
            <ActionButton
              variant="danger"
              size="sm"
              onClick={() => setShowRejectModal(true)}
              disabled={isLoading}
              loading={rejecting}
              icon={<X size={14} />}
            >
              Reject
            </ActionButton>
          </ActionButtons>
        </Content>
      </Card>

      {showFullImage && (
        <ImageModal onClick={() => setShowFullImage(false)}>
          <FullImage
            src={image.originalUrl}
            alt={image.altText || image.originalFilename || "Full size image"}
            onClick={(e) => e.stopPropagation()}
          />
        </ImageModal>
      )}

      <RejectImageModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onConfirm={handleRejectConfirm}
        loading={rejecting}
        imageName={image.originalFilename || undefined}
      />

      {showDeferModal && (
        <DeferQueueEntryModal
          entryName={mediaTitle || image.originalFilename || "this image"}
          deferralCount={image.deferralCount}
          onDefer={async (note) => {
            await onDefer(image.id, note);
            setShowDeferModal(false);
          }}
          onCancel={() => setShowDeferModal(false)}
          submitting={deferring}
        />
      )}
    </>
  );
};
