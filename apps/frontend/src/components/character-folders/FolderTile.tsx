import React from "react";
import styled, { css, DefaultTheme } from "styled-components";
import { Folder as FolderGlyph, FolderLock, Lock } from "lucide-react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { countCharacters, Folder } from "./folderTree";

/**
 * Drag ids are prefixed rather than bare, because a tile is a drop target and
 * a drag handle at once and dnd-kit keys both off one id space. The prefix is
 * also how `onDragEnd` tells a character from a folder without looking
 * anything up.
 */
export const DROP_PREFIX = "drop-folder:";
export const DRAG_FOLDER_PREFIX = "drag-folder:";
export const DRAG_CHARACTER_PREFIX = "drag-character:";
export const ROOT_DROP_ID = "drop-folder:root";

/**
 * The glyph in front of a folder's name, and the only thing that says a folder
 * is private wherever one is listed.
 *
 * Lucide rather than an emoji: the rest of the app's iconography is lucide,
 * and an emoji renders at whatever size and weight the platform's font decides
 * -- or as a tofu box where the font has no glyph at all.
 */
export const FolderIcon: React.FC<{ isPrivate: boolean; size?: number }> = ({
  isPrivate,
  size = 16,
}) =>
  isPrivate ? (
    <FolderLock size={size} aria-label="Private folder" />
  ) : (
    <FolderGlyph size={size} aria-hidden />
  );

/**
 * Public folders take the brand colour and private ones slate, hatched, so the
 * two read apart at a glance across a row of tiles -- the lock glyph alone was
 * a few pixels wide and nobody saw it.
 */
const folderTint = (isPrivate: boolean, theme: DefaultTheme) => {
  // Theme colours are six-digit hex, so a two-digit suffix is an alpha --
  // the same trick the shared Button uses, and unlike color-mix() it works in
  // every browser the app supports.
  const ink = isPrivate ? theme.colors.text.secondary : theme.colors.primary;
  return css`
    --folder-ink: ${ink};
    --folder-fill: ${ink}${isPrivate ? "0f" : "17"};
    --folder-edge: ${ink}4d;
    --folder-hatch: ${ink}12;
  `;
};

/**
 * A folder drawn as one: a tab on top of a body. Characters are bordered cards
 * too, and with both as plain boxes nothing said which of them held the other.
 */
const Tile = styled.div<{
  $over: boolean;
  $dragging: boolean;
  $private: boolean;
}>`
  ${({ $private, theme }) => folderTint($private, theme)}
  position: relative;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  min-height: 96px;
  margin-top: 10px;
  padding: ${({ theme }) => theme.spacing.md};
  border: 1px solid var(--folder-edge);
  border-radius: 0 ${({ theme }) => theme.borderRadius.lg}
    ${({ theme }) => theme.borderRadius.lg}
    ${({ theme }) => theme.borderRadius.lg};
  /* The tint laid over the page colour rather than left translucent, so the
     tab can sit over the body's top edge and hide it. */
  --folder-solid:
    linear-gradient(var(--folder-fill), var(--folder-fill)),
    ${({ theme }) => theme.colors.background};
  background: var(--folder-solid);
  ${({ $private, theme }) =>
    $private &&
    css`
      background:
        repeating-linear-gradient(
          -45deg,
          transparent 0 8px,
          var(--folder-hatch) 8px 9px
        ),
        linear-gradient(var(--folder-fill), var(--folder-fill)),
        ${theme.colors.background};
    `}
  cursor: pointer;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
  opacity: ${({ $dragging }) => ($dragging ? 0.4 : 1)};

  &::before {
    content: "";
    position: absolute;
    top: -11px;
    left: -1px;
    width: 40%;
    max-width: 96px;
    height: 12px;
    border: 1px solid var(--folder-edge);
    border-bottom: none;
    border-radius: ${({ theme }) => theme.borderRadius.md}
      ${({ theme }) => theme.borderRadius.md} 0 0;
    background: var(--folder-solid);
  }

  &:hover,
  &:focus-visible {
    border-color: var(--folder-ink);
    outline: none;
  }

  &:hover::before,
  &:focus-visible::before {
    border-color: var(--folder-ink);
  }

  &:focus-visible {
    box-shadow: 0 0 0 2px var(--folder-ink);
  }

  ${({ $over, theme }) =>
    $over &&
    css`
      border-color: ${theme.colors.primary};
      box-shadow: 0 0 0 2px ${theme.colors.primary};
      background: ${theme.colors.primary}2e;
    `}
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--folder-ink);
`;

const Name = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Count = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

/** The word, not just the glyph: privacy decides what visitors can see. */
export const PrivatePill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background: ${({ theme }) => theme.colors.text.secondary};
  color: ${({ theme }) => theme.colors.background};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  line-height: 1.4;
`;

const MenuButton = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.muted};
  cursor: pointer;
  padding: 0 ${({ theme }) => theme.spacing.xs};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  line-height: 1;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

interface FolderTileProps {
  folder: Folder;
  onOpen: () => void;
  /** Owner controls. A visitor gets a tile that only navigates. */
  editable: boolean;
  /**
   * Reordering is a mode rather than a second meaning for the same drag.
   * While it is on, tiles sort among themselves; while it is off, dropping
   * onto one files into it. One gesture, one meaning, and which one is on
   * screen.
   */
  reordering: boolean;
  onMenu?: (folder: Folder) => void;
}

/**
 * One folder, as it appears in the browser.
 *
 * Three behaviours, only ever two at once: it navigates on click, it accepts
 * drops while filing, and it sorts while reordering.
 */
export const FolderTile: React.FC<FolderTileProps> = ({
  folder,
  onOpen,
  editable,
  reordering,
  onMenu,
}) => {
  const sortable = useSortable({
    id: `${DRAG_FOLDER_PREFIX}${folder.id}`,
    disabled: !editable || !reordering,
  });

  const droppable = useDroppable({
    id: `${DROP_PREFIX}${folder.id}`,
    disabled: !editable || reordering,
  });

  // Only one of the two is live at a time, so the ref they share is whichever
  // is not disabled.
  const setRef = (node: HTMLElement | null): void => {
    sortable.setNodeRef(node);
    droppable.setNodeRef(node);
  };

  return (
    <Tile
      ref={setRef}
      $over={droppable.isOver}
      $dragging={sortable.isDragging}
      $private={folder.isPrivate}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
      }}
      // Sortable's own attributes carry `role` and `tabIndex`, so they go on
      // before the tile's -- while reordering it is a drag handle, and the rest
      // of the time it is a button that opens a folder.
      {...(reordering ? sortable.attributes : {})}
      {...(reordering ? sortable.listeners : {})}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <Name>{folder.name}</Name>
      <Count>{countCharacters(folder.characterCount)}</Count>
      <TopRow style={{ order: -1 }}>
        <FolderIcon isPrivate={folder.isPrivate} size={22} />
        {folder.isPrivate && (
          <PrivatePill>
            <Lock size={11} aria-hidden />
            Private
          </PrivatePill>
        )}
      </TopRow>
      {editable && onMenu && !reordering && (
        <MenuButton
          type="button"
          aria-label={`Folder options for ${folder.name}`}
          onClick={(event) => {
            event.stopPropagation();
            onMenu(folder);
          }}
        >
          ⋯
        </MenuButton>
      )}
    </Tile>
  );
};

/**
 * A character card that can be picked up and dropped on a folder.
 *
 * A wrapper rather than a change to `CharacterCard`, which renders in the
 * community browse, the feed and a profile as well -- none of which have
 * anywhere to drop a character.
 */
export const DraggableCharacter: React.FC<{
  characterId: string;
  disabled: boolean;
  children: React.ReactNode;
}> = ({ characterId, disabled, children }) => {
  const { listeners, setNodeRef, isDragging } = useDraggable({
    id: `${DRAG_CHARACTER_PREFIX}${characterId}`,
    disabled,
  });

  // `attributes` is deliberately not spread. It carries `role="button"` and a
  // tab stop, and the child here is a card that is already a link -- announcing
  // it as a button and adding a second stop in front of it makes the page
  // worse for a keyboard than the drag makes it better. Filing without a mouse
  // goes through the checkboxes and the folder picker, which are reachable.
  return (
    <div
      ref={setNodeRef}
      style={{ opacity: isDragging ? 0.4 : 1, touchAction: "none" }}
      {...listeners}
    >
      {children}
    </div>
  );
};
