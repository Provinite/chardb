import React, { useMemo, useState } from "react";
import styled from "styled-components";
import { Check, Layers } from "lucide-react";
import { Button, Modal } from "@chardb/ui";
import { flattenTree, Folder } from "./folderTree";
import { FolderGlyph as Glyph, FolderIcon, PrivateTag } from "./FolderTile";

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

const NewFolder = styled.div`
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const NewFolderLabel = styled.p`
  margin: 0 0 ${({ theme }) => theme.spacing.xs};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
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
  /**
   * Where a new folder may not go. Moving a folder into one made on the spot
   * inside itself would be a cycle.
   */
  disabledParentIds?: ReadonlySet<string>;
  onSubmit: (
    folderId: string | null,
    removing: boolean,
  ) => void | Promise<void>;
  /** Create a folder inside `parentId` (null for the top level). */
  onCreate: (name: string, parentId: string | null) => Promise<string | null>;
}

/** Mirrors the server's limit; a folder at this depth can have no children. */
const MAX_FOLDER_DEPTH = 5;

/** No parent chosen yet, as distinct from choosing the top level. */
const UNCHOSEN = undefined;

/**
 * Pick a folder, or name one that does not exist yet.
 *
 * The same box does both, because "move these into Retired" and "move these
 * into a folder I am about to call Retired" are the same intention, and making
 * somebody leave, create a folder, and come back to file into it is a worse
 * way to spend three clicks.
 *
 * A new folder's place is asked, never assumed. Defaulting to the open folder
 * put "Adopts" inside Fursonas for somebody moving characters out of
 * Fursonas; defaulting to the top level would be wrong for somebody else.
 * Choosing an existing folder and choosing where a new one goes are one
 * selection between them, so the single action button always means one thing.
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
  disabledParentIds,
  onSubmit,
  onCreate,
}) => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(initialFolderId);
  const [parent, setParent] = useState<string | null | undefined>(UNCHOSEN);
  const [removingChecked, setRemovingChecked] = useState(false);
  const [busy, setBusy] = useState(false);

  const removing = removeFrom !== null && removingChecked;
  const actionLabel = removing ? "Move" : confirmLabel;

  const reset = (): void => {
    setSearch("");
    setParent(UNCHOSEN);
    setRemovingChecked(false);
  };

  const tree = useMemo(() => flattenTree(folders), [folders]);
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return tree;
    return tree.filter(({ folder }) =>
      folder.name.toLowerCase().includes(term),
    );
  }, [tree, search]);

  const typed = search.trim();
  const exists = folders.some(
    (folder) => folder.name.toLowerCase() === typed.toLowerCase(),
  );
  const canCreate = typed.length > 0 && !exists;
  const creating = canCreate && parent !== UNCHOSEN;

  const chooseDestination = (folderId: string | null): void => {
    setSelected(folderId);
    setParent(UNCHOSEN);
  };

  const chooseParent = (folderId: string | null): void => {
    setParent(folderId);
    setSelected(null);
  };

  // Whether the list's own selection is something the button can act on.
  // A hidden row (filtered out by the search) does not count.
  const destinationChosen =
    selected === null
      ? allowRoot && !search
      : rows.some(({ folder }) => folder.id === selected);

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
    if (parent === UNCHOSEN) return;
    setBusy(true);
    try {
      const created = await onCreate(typed, parent);
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

        {/* Two lists share the modal while a new folder is being named; the
            matches give up height to the place picker, which needs it more. */}
        <List style={canCreate ? { maxHeight: "18vh" } : undefined}>
          {allowRoot && !search && (
            <Row
              type="button"
              $depth={0}
              aria-pressed={parent === UNCHOSEN && selected === null}
              onClick={() => chooseDestination(null)}
            >
              No folder
              {parent === UNCHOSEN && selected === null && (
                <Chosen size={16} aria-hidden />
              )}
            </Row>
          )}

          {rows.map(({ folder, depth }) => (
            <Row
              key={folder.id}
              type="button"
              $depth={search ? 0 : depth}
              aria-pressed={selected === folder.id}
              disabled={disabledIds?.has(folder.id)}
              onClick={() => chooseDestination(folder.id)}
            >
              <Glyph $private={folder.isPrivate}>
                <FolderIcon isPrivate={folder.isPrivate} />
              </Glyph>
              {folder.name}
              {folder.isPrivate && <PrivateTag />}
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

          {rows.length === 0 &&
            (canCreate ? (
              <Empty>No folder called &ldquo;{typed}&rdquo; yet.</Empty>
            ) : (
              <Empty>No folders yet. Type a name to make one.</Empty>
            ))}
        </List>

        {canCreate && (
          <NewFolder>
            <NewFolderLabel id="new-folder-parent">
              Make &ldquo;{typed}&rdquo; inside
            </NewFolderLabel>
            <List
              role="group"
              aria-labelledby="new-folder-parent"
              style={{ marginTop: 0, maxHeight: "26vh" }}
            >
              <Row
                type="button"
                $depth={0}
                aria-pressed={parent === null}
                onClick={() => chooseParent(null)}
              >
                <Glyph $private={false}>
                  <Layers size={16} aria-hidden />
                </Glyph>
                Top level
                {parent === null && <Chosen size={16} aria-hidden />}
              </Row>
              {tree.map(({ folder, depth }) => (
                <Row
                  key={folder.id}
                  type="button"
                  $depth={depth + 1}
                  aria-pressed={parent === folder.id}
                  disabled={
                    depth + 1 >= MAX_FOLDER_DEPTH ||
                    disabledParentIds?.has(folder.id)
                  }
                  onClick={() => chooseParent(folder.id)}
                >
                  <Glyph $private={folder.isPrivate}>
                    <FolderIcon isPrivate={folder.isPrivate} />
                  </Glyph>
                  {folder.name}
                  {folder.isPrivate && <PrivateTag />}
                  {parent === folder.id && <Chosen size={16} aria-hidden />}
                </Row>
              ))}
            </List>
          </NewFolder>
        )}

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
          <Button tone="ghost" onClick={close} disabled={busy}>
            Cancel
          </Button>
          {canCreate && !(selected !== null && destinationChosen) ? (
            <Button
              tone="primary"
              onClick={createThenSubmit}
              busy={busy}
              disabled={!creating}
            >
              Create &ldquo;{typed}&rdquo; and {actionLabel.toLowerCase()}
            </Button>
          ) : (
            <Button
              tone="primary"
              onClick={() => void submit(selected)}
              busy={busy}
              disabled={!destinationChosen}
            >
              {actionLabel}
            </Button>
          )}
        </Actions>
      </div>
    </Modal>
  );
};
