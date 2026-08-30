import React, { useState } from "react";
import styled from "styled-components";

/**
 * The shape of an uploaded image as every avatar call site needs it. Declared
 * structurally rather than imported from the generated GraphQL types, which
 * this package does not depend on.
 */
export interface AvatarImageSource {
  originalUrl: string;
  thumbnailUrl?: string | null;
  altText?: string | null;
}

export interface AvatarProps {
  /** The image to render. Absent or broken falls back to initials. */
  image?: AvatarImageSource | null;
  /**
   * Who the avatar stands for -- a display name where there is one, otherwise
   * a username. Supplies the initials and the alt text of last resort.
   */
  name: string;
  /** Diameter in pixels. */
  size?: number;
  className?: string;
}

/**
 * Up to two initials, the way a person would abbreviate the name: "Ada
 * Lovelace" gives AL, "ada_lovelace" gives AL, a bare username gives one
 * letter. Splitting on separators rather than whitespace alone matters because
 * usernames rarely contain spaces.
 */
const initialsOf = (name: string): string =>
  name
    .split(/[\s_.-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const Image = styled.img<{ $size: number }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  background: ${({ theme }) => theme.colors.surface};
`;

const Initials = styled.div<{ $size: number }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  font-weight: 600;
  font-size: ${({ $size }) => Math.round($size * 0.4)}px;
  line-height: 1;
  user-select: none;
`;

/**
 * A user's picture as a circle, or their initials when there is no picture.
 *
 * Every avatar in the app was its own `styled.img` before this, which is how
 * they drifted: some forgot `object-fit`, some rendered nothing at all in place
 * of a missing image, and the initials rule differed per page.
 */
export const Avatar: React.FC<AvatarProps> = ({
  image,
  name,
  size = 40,
  className,
}) => {
  // A URL that 404s used to leave a broken-image glyph in the circle. Falling
  // back to the initials makes a dead upload look like no upload.
  const [failed, setFailed] = useState(false);
  const src = image ? image.thumbnailUrl || image.originalUrl : null;

  if (!src || failed) {
    return (
      <Initials $size={size} className={className} aria-label={name}>
        {initialsOf(name)}
      </Initials>
    );
  }

  return (
    <Image
      $size={size}
      className={className}
      src={src}
      alt={image?.altText || name}
      onError={() => setFailed(true)}
    />
  );
};
