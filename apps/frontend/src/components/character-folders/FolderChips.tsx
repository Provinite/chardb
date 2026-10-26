import React from "react";
import styled from "styled-components";
import { Folder as FolderGlyph } from "lucide-react";
import { Tooltip } from "../Tooltip";
import { FolderIcon } from "./FolderTile";
import { Folder } from "./folderTree";

/** Past this many, the chips would wrap down the card; one chip stands in. */
const MAX_CHIPS = 3;

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const Chip = styled.span<{ $private: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  padding: 2px ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  border: 1px solid
    ${({ theme, $private }) =>
      `${$private ? theme.colors.text.secondary : theme.colors.primary}4d`};
  background: ${({ theme, $private }) =>
    `${$private ? theme.colors.text.secondary : theme.colors.primary}17`};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  svg {
    flex-shrink: 0;
    color: ${({ theme, $private }) =>
      $private ? theme.colors.text.secondary : theme.colors.primary};
  }
`;

/**
 * The folders a character is filed in, on its card.
 *
 * Called with the folders other than the one being looked at -- that one is
 * the page's heading already. A character can be in several folders, and
 * these are what a Move leaves it in.
 */
export const FolderChips: React.FC<{ folders: readonly Folder[] }> = ({
  folders,
}) => {
  if (folders.length === 0) return null;

  return (
    <Row data-testid="folder-chips">
      {folders.length <= MAX_CHIPS ? (
        folders.map((folder) => (
          <Chip key={folder.id} $private={folder.isPrivate}>
            <FolderIcon isPrivate={folder.isPrivate} size={12} />
            {folder.name}
          </Chip>
        ))
      ) : (
        <Tooltip label={folders.map((folder) => folder.name).join(", ")}>
          <Chip $private={false}>
            <FolderGlyph size={12} aria-hidden />
            {folders.length} folders
          </Chip>
        </Tooltip>
      )}
    </Row>
  );
};
