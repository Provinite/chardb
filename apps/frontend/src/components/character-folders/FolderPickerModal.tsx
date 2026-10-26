import React, { useMemo, useState } from "react";
import styled from "styled-components";
import { Check } from "lucide-react";
import { Button, Modal } from "@chardb/ui";
import { flattenTree, Folder } from "./folderTree";
import { FolderIcon } from "./FolderTile";

const Field = styled.input`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 1px;
  }
`;

const List = styled.div`
  margin-top: ${({ theme }) => theme.spacing.md};
  max-height: 40vh;
  overflow-y: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const Row = styled.button<{ $depth: number }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  width: 100%;
  border: none;
  border-left: 3px solid transparent;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  text-align: left;
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  padding: ${({ theme }) => theme.spacing.sm};
  padding-left: ${({ theme, $depth }) =>
    `calc(${theme.spacing.sm} + ${$depth} * ${theme.spacing.lg})`};

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.surface};
  }

  &[aria-pressed="true"] {
    border-left-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.primary}24;
    font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  }

  &:disabled {
    color: ${({ theme }) => theme.colors.text.muted};
    cursor: not-allowed;
  }
`;

const Glyph = styled.span<{ $private: boolean }>`
  display: inline-flex;
  color: ${({ theme, $private }) =>
    $private ? theme.colors.text.secondary : theme.colors.primary};

  button:disabled & {
    color: inherit;
  }
`;

const Count = styled.span`
  margin-left: auto;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
`;

const Chosen = styled(Check)`
  margin-left: auto;
  color: ${({ theme }) => theme.colors.primary};
`;

const Empty = styled.p`
  padding: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  margin: 0;
`;

const Option = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  cursor: pointer;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

export interface FolderPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: readonly Folder[];
  title: string;
  confirmLabel: string;
  /**
   * Destinations to grey out. A folder cannot be moved into itself or into
   * anything it contains, and the caller is the one that knows which folder is
   * being moved.
   */
  disabledIds?: ReadonlySet<string>;
  /** Whether the root counts as a destination. */
  allowRoot?: boolean;
  /** Already-chosen folder, so re-opening the picker remembers. */
  initialFolderId?: string | null;
  /**
   * The folder the characters are being filed from, when there is one. Offers
   * to take them out of it as well, which turns the add into a move -- named,
   * because a character can be in other folders too and "move" alone does not
   * say which one it leaves.
   */
  removeFrom?: Folder | null;
  onSubmit: (
    folderId: string | null,
    removing: boolean,
  ) => void | Promise<void>;
  /** Create a folder at the root and return its id. */
  onCreate: (name: string) => Promise<string | null>;
}

/**
 * Pick a folder, or name one that does not exist yet.
 *
 * The same box does both, because "move these into Retired" and "move these
 * into a folder I am about to call Retired" are the same intention, and making
 * somebody leave, create a folder, and come back to file into it is a worse
 * way to spend three clicks.
 */
export const FolderPickerModal: React.FC<FolderPickerModalProps> = ({
  isOpen,
  onClose,
  folders,
  title,
  confirmLabel,
  disabledIds,
  allowRoot = false,
  initialFolderId = null,
  removeFrom = null,
  onSubmit,
  onCreate,
}) => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(initialFolderId);
  const [removingChecked, setRemovingChecked] = useState(false);
  const [busy, setBusy] = useState(false);

  const removing = removeFrom !== null && removingChecked;
  const actionLabel = removing ? "Move" : confirmLabel;

  const reset = (): void => {
    setSearch("");
    setRemovingChecked(false);
  };

  const rows = useMemo(() => {
    const all = flattenTree(folders);
    const term = search.trim().toLowerCase();
    if (!term) return all;
    return all.filter(({ folder }) => folder.name.toLowerCase().includes(term));
  }, [folders, search]);

  const typed = search.trim();
  const exists = folders.some(
    (folder) => folder.name.toLowerCase() === typed.toLowerCase(),
  );
  const canCreate = typed.length > 0 && !exists;

  const close = (): void => {
    reset();
    setSelected(initialFolderId);
    onClose();
  };

  const submit = async (folderId: string | null): Promise<void> => {
    setBusy(true);
    try {
      await onSubmit(folderId, removing);
      reset();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const createThenSubmit = async (): Promise<void> => {
    setBusy(true);
    try {
      const created = await onCreate(typed);
      if (created) {
        await onSubmit(created, removing);
        reset();
        onClose();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={close} title={title}>
      {/* The shared Modal carries no `role="dialog"`, so there is nothing to
          scope a query to from outside. Folder names appear both here and on
          the tiles behind, and a selector that cannot tell them apart matches
          two elements. */}
      <div data-testid="folder-picker">
        <Field
          autoFocus
          value={search}
          placeholder="Find a folder, or type a new name"
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Find a folder, or type a new name"
        />

        <List>
          {allowRoot && !search && (
            <Row
              type="button"
              $depth={0}
              aria-pressed={selected === null}
              onClick={() => setSelected(null)}
            >
              No folder
              {selected === null && <Chosen size={16} aria-hidden />}
            </Row>
          )}

          {rows.map(({ folder, depth }) => (
            <Row
              key={folder.id}
              type="button"
              $depth={search ? 0 : depth}
              aria-pressed={selected === folder.id}
              disabled={disabledIds?.has(folder.id)}
              onClick={() => setSelected(folder.id)}
            >
              <Glyph $private={folder.isPrivate}>
                <FolderIcon isPrivate={folder.isPrivate} />
              </Glyph>
              {folder.name}
              {selected === folder.id ? (
                <Chosen size={16} aria-hidden />
              ) : (
                <Count>
                  {folder.id === removeFrom?.id
                    ? "Current folder"
                    : folder.characterCount}
                </Count>
              )}
            </Row>
          ))}

          {rows.length === 0 && !canCreate && (
            <Empty>No folders yet. Type a name to make one.</Empty>
          )}
        </List>

        {removeFrom && (
          <Option>
            <input
              type="checkbox"
              checked={removingChecked}
              onChange={(event) => setRemovingChecked(event.target.checked)}
            />
            Also remove from &ldquo;{removeFrom.name}&rdquo;
          </Option>
        )}

        <Actions>
          <Button variant="ghost" onClick={close} disabled={busy}>
            Cancel
          </Button>
          {canCreate ? (
            <Button variant="primary" onClick={createThenSubmit} loading={busy}>
              Create &ldquo;{typed}&rdquo; and {actionLabel.toLowerCase()}
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => void submit(selected)}
              loading={busy}
              disabled={selected === null && !allowRoot}
            >
              {actionLabel}
            </Button>
          )}
        </Actions>
      </div>
    </Modal>
  );
};
