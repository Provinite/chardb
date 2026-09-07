import React, { useCallback, useState } from "react";
import Cropper, { Area, MediaSize, Point } from "react-easy-crop";
import styled from "styled-components";
import { Button, Modal } from "@chardb/ui";

/**
 * A thumbnail framing rect in the image's natural pixels.
 *
 * "Natural" means what the browser reports, which for a photo carrying an EXIF
 * orientation tag is the rotated size -- browsers apply the tag when they paint.
 * The backend rotates before cropping for exactly this reason, so these numbers
 * can be sent as they are.
 */
export interface ThumbnailCropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ThumbnailCropperProps {
  isOpen: boolean;
  /** The image to frame: an object URL for a local file, or a stored original. */
  imageSrc: string;
  /** Framing to start from, when one has already been chosen. */
  initialCrop?: ThumbnailCropRect | null;
  onCancel: () => void;
  onConfirm: (crop: ThumbnailCropRect) => void;
  /** Reverts to the automatic centre crop. Hidden when not supplied. */
  onReset?: () => void;
  /** Disables the buttons while a save is in flight. */
  busy?: boolean;
  title?: string;
}

/**
 * Height gives way on a short window. The shared `Modal` caps itself at 80vh
 * and scrolls, so a fixed height pushes Cancel and the confirm button below
 * the fold -- reachable only by scrolling a dialog that does not look
 * scrollable.
 */
const CropArea = styled.div`
  position: relative;
  width: 100%;
  height: min(320px, 42vh);
  background: ${({ theme }) => theme.colors.text.primary};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  overflow: hidden;
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const ZoomLabel = styled.label`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
`;

const ZoomSlider = styled.input.attrs({ type: "range" })`
  flex: 1;
  accent-color: ${({ theme }) => theme.colors.primary};
`;

const Hint = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  margin: ${({ theme }) => theme.spacing.md} 0 0 0;
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const ResetSlot = styled.div`
  margin-right: auto;
`;

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}

/**
 * Round a cropper area to whole pixels inside the image.
 *
 * Both halves matter. The backend takes integers only, and the cropper reports
 * sub-pixel positions; and it can report an area a hair outside the image at
 * the extremes of a drag, which rounding can push further out. Left alone that
 * is a 400 on a crop the user drew correctly, so clamp rather than forward it.
 */
function toIntegerRect(
  area: Area,
  naturalWidth: number,
  naturalHeight: number,
): ThumbnailCropRect {
  const x = clamp(Math.round(area.x), 0, Math.max(0, naturalWidth - 1));
  const y = clamp(Math.round(area.y), 0, Math.max(0, naturalHeight - 1));

  return {
    x,
    y,
    width: clamp(Math.round(area.width), 1, naturalWidth - x),
    height: clamp(Math.round(area.height), 1, naturalHeight - y),
  };
}

/**
 * Square cropper for choosing how an image's thumbnail is framed.
 *
 * It produces a rect and nothing else -- no canvas, no re-encoded blob. The
 * backend re-renders from the untouched original, which keeps this component
 * free of the usual canvas problems (a cross-origin image would taint a canvas
 * and silently break `toBlob`; here the image only ever has to load).
 *
 * Square because the thumbnail is rendered 300x300 with `fit: "cover"`, and a
 * free-form rect would only be squashed back into that.
 */
export const ThumbnailCropper: React.FC<ThumbnailCropperProps> = ({
  isOpen,
  imageSrc,
  initialCrop,
  onCancel,
  onConfirm,
  onReset,
  busy = false,
  title = "Adjust thumbnail",
}) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [mediaSize, setMediaSize] = useState<MediaSize | null>(null);

  const handleCropComplete = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setArea(croppedAreaPixels);
    },
    [],
  );

  const handleConfirm = () => {
    if (!area || !mediaSize) return;
    onConfirm(
      toIntegerRect(area, mediaSize.naturalWidth, mediaSize.naturalHeight),
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      <CropArea>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          showGrid
          objectFit="contain"
          initialCroppedAreaPixels={initialCrop ?? undefined}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={handleCropComplete}
          onMediaLoaded={setMediaSize}
        />
      </CropArea>

      <Controls>
        <ZoomLabel htmlFor="thumbnail-crop-zoom">Zoom</ZoomLabel>
        <ZoomSlider
          id="thumbnail-crop-zoom"
          min={1}
          max={4}
          step={0.01}
          value={zoom}
          disabled={busy}
          onChange={(event) => setZoom(Number(event.target.value))}
        />
      </Controls>

      <Hint>Drag to reposition, zoom to tighten. Thumbnails are square.</Hint>

      <ButtonRow>
        {onReset && (
          <ResetSlot>
            <Button
              type="button"
              variant="ghost"
              onClick={onReset}
              disabled={busy}
            >
              Reset to centre
            </Button>
          </ResetSlot>
        )}
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={busy || !area || !mediaSize}
        >
          {busy ? "Saving..." : "Use this crop"}
        </Button>
      </ButtonRow>
    </Modal>
  );
};
