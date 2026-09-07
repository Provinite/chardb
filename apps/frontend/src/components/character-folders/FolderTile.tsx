import React from "react";
import styled, { css } from "styled-components";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Folder } from "./folderTree";

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

const Tile = styled.div<{ $over: boolean; $dragging: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme }) => theme.colors.background};
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;
  opacity: ${({ $dragging }) => ($dragging ? 0.4 : 1)};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }

  ${({ $over, theme }) =>
    $over &&
    css`
      border-color: ${theme.colors.primary};
      background: ${theme.colors.surface};
      box-shadow: 0 0 0 2px ${theme.colors.primary};
    `}
`;

const Name = styled.span`
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Count = styled.span`
  margin-left: auto;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
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
      <span aria-hidden>{folder.isPrivate ? "🔒" : "📁"}</span>
      <Name>{folder.name}</Name>
      <Count>{folder.characterCount}</Count>
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
