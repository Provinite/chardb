import React, { useCallback, useMemo, useState } from "react";
import styled from "styled-components";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@chardb/ui";
import {
  useCreateCharacterFolderMutation,
  useDeleteCharacterFolderMutation,
  useGetMyCharacterFoldersQuery,
  useGetUserCharacterFoldersQuery,
  useMoveCharacterFolderMutation,
  useMoveCharactersToFolderMutation,
  useUpdateCharacterFolderMutation,
  useUserCharactersQuery,
} from "../../generated/graphql";
import { useOffsetPaging } from "../../hooks/useOffsetPaging";
import { LoadingSpinner } from "../LoadingSpinner";
import { CharacterCard } from "../CharacterCard";
import { Pager } from "../pagination/Pager";
import { ConfirmDialog } from "../ConfirmDialog";
import { FolderPickerModal } from "./FolderPickerModal";
import { FolderInput, Globe, Lock, Pencil, Trash2 } from "lucide-react";
import {
  DraggableCharacter,
  DRAG_CHARACTER_PREFIX,
  DRAG_FOLDER_PREFIX,
  DROP_PREFIX,
  FolderIcon,
  FolderTile,
  PrivatePill,
  ROOT_DROP_ID,
} from "./FolderTile";
import { childrenOf, Folder, pathTo, subtreeIds } from "./folderTree";

const PAGE_SIZE = 24;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const Bar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const Crumbs = styled.nav`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xs};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Crumb = styled.button`
  border: none;
  background: transparent;
  padding: ${({ theme }) => theme.spacing.xs};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  cursor: pointer;
  color: ${({ theme }) => theme.colors.primary};
  font-size: inherit;

  &:hover {
    text-decoration: underline;
  }
`;

const Spacer = styled.span`
  margin-left: auto;
`;

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const SectionLabel = styled.h3`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const TileGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
`;

const SelectionBar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme }) => theme.colors.surface};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const CardShell = styled.div`
  position: relative;
`;

const Checkbox = styled.input`
  position: absolute;
  top: ${({ theme }) => theme.spacing.sm};
  left: ${({ theme }) => theme.spacing.sm};
  z-index: 2;
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: ${({ theme }) => theme.colors.primary};
`;

const Empty = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  margin: 0;
`;

const Centre = styled.div`
  display: flex;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.xxl};
`;

const NameForm = styled.form`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const NameField = styled.input`
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

type PickerMode =
  | { kind: "file-characters" }
  | { kind: "move-folder"; folder: Folder };

export interface CharacterFolderBrowserProps {
  /** Whose workspace. */
  ownerId: string;
  /** True when the viewer is that person. Visitors get navigation only. */
  editable: boolean;
  /**
   * Narrow the characters and the folder counts to one community. Folders
   * themselves span communities, so one holding nothing here still shows,
   * reporting zero, and can still be filed into.
   */
  communityId?: string;
}

/**
 * Characters as a file browser.
 *
 * You are always inside a folder: sub-folders at the top, the characters filed
 * here below. The root is the same view with `null` for a folder, and what it
 * holds is the characters in no folder at all -- so somebody who has never
 * made a folder sees their whole collection exactly as before, and characters
 * leave the root only as they get filed.
 *
 * Two drags, and only one of them live at a time. Normally, dropping a
 * character on a folder files it there and dropping a folder on a folder moves
 * it inside. Turning on Reorder swaps the folder tiles to sorting among
 * themselves. Both meanings on one gesture -- drop-on to reparent, drop-between
 * to reorder -- would be a few pixels apart and wrong half the time.
 */
export const CharacterFolderBrowser: React.FC<CharacterFolderBrowserProps> = ({
  ownerId,
  editable,
  communityId,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const folderId = searchParams.get("folder");

  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [reordering, setReordering] = useState(false);
  const [picker, setPicker] = useState<PickerMode | null>(null);
  const [deleting, setDeleting] = useState<Folder | null>(null);
  // Null while the New folder button is showing; a string once it has been
  // pressed and the field is open.
  const [newName, setNewName] = useState<string | null>(null);

  // The owner reads their own workspace, including the private folders; a
  // visitor reads the public shape of it. Two queries rather than one with a
  // parameter, because only one of them is ever the right cache entry.
  const mine = useGetMyCharacterFoldersQuery({
    variables: { communityId },
    skip: !editable,
  });
  const theirs = useGetUserCharacterFoldersQuery({
    variables: { userId: ownerId, communityId },
    skip: editable,
  });

  const folders: Folder[] = useMemo(
    () =>
      editable
        ? (mine.data?.myCharacterFolders ?? [])
        : (theirs.data?.userCharacterFolders ?? []),
    [editable, mine.data, theirs.data],
  );

  const refetchFolders = useCallback(async () => {
    await (editable ? mine.refetch() : theirs.refetch());
  }, [editable, mine, theirs]);

  const {
    data: characterData,
    loading: charactersLoading,
    fetchMore,
    refetch: refetchCharacters,
  } = useUserCharactersQuery({
    variables: {
      userId: ownerId,
      filters: {
        limit: PAGE_SIZE,
        offset: 0,
        communityId,
        // At the root a visitor sees nothing rather than everything unfiled:
        // `unfiled` is answered for yourself only, so for them the root is
        // where the top-level folders are and nothing else.
        ...(folderId ? { folderId } : editable ? { unfiled: true } : {}),
      },
    },
    // The counts and the grid have to agree after a drag, and the drag changes
    // both.
    notifyOnNetworkStatusChange: true,
  });

  const characters = characterData?.userCharacters?.characters ?? [];
  const total = characterData?.userCharacters?.total ?? 0;

  const { loadMore, loadingMore } = useOffsetPaging({
    pageSize: PAGE_SIZE,
    loaded: characters.length,
    hasMore: characterData?.userCharacters?.hasMore ?? false,
    load: ({ limit, offset }) =>
      fetchMore({
        variables: {
          filters: {
            limit,
            offset,
            communityId,
            ...(folderId ? { folderId } : editable ? { unfiled: true } : {}),
          },
        },
        // Append rather than replace, or Load More removes the characters it
        // was meant to add to.
        updateQuery: (previous, { fetchMoreResult }) =>
          fetchMoreResult
            ? {
                userCharacters: {
                  ...fetchMoreResult.userCharacters,
                  characters: [
                    ...previous.userCharacters.characters,
                    ...fetchMoreResult.userCharacters.characters,
                  ],
                },
              }
            : previous,
      }),
  });

  const [createFolder] = useCreateCharacterFolderMutation();
  const [updateFolder] = useUpdateCharacterFolderMutation();
  const [moveFolder] = useMoveCharacterFolderMutation();
  const [deleteFolder] = useDeleteCharacterFolderMutation();
  const [moveCharacters] = useMoveCharactersToFolderMutation();

  const sensors = useSensors(
    // A tile is a link as well as a handle, so a drag has to start further
    // than a click ever travels or opening a folder would become impossible.
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const here = useMemo(() => pathTo(folders, folderId), [folders, folderId]);
  const openFolder = here[here.length - 1] ?? null;
  const subfolders = useMemo(
    () => childrenOf(folders, folderId),
    [folders, folderId],
  );

  const navigate = (next: string | null): void => {
    setSelected(new Set());
    setSearchParams(next ? { folder: next } : {}, { replace: false });
  };

  const refreshAll = useCallback(async () => {
    await Promise.all([refetchFolders(), refetchCharacters()]);
  }, [refetchFolders, refetchCharacters]);

  const runMove = useCallback(
    async (
      characterIds: string[],
      toFolderId: string | null,
      takeOut: boolean,
    ): Promise<void> => {
      try {
        await moveCharacters({
          variables: {
            input: {
              characterIds,
              toFolderId,
              fromFolderId: takeOut ? folderId : null,
            },
          },
        });
        setSelected(new Set());
        await refreshAll();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not file that",
        );
      }
    },
    [moveCharacters, folderId, refreshAll],
  );

  const handleDragEnd = async (event: DragEndEvent): Promise<void> => {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    if (!overId || activeId === overId) return;

    if (reordering && activeId.startsWith(DRAG_FOLDER_PREFIX)) {
      const ids = subfolders.map((folder) => folder.id);
      const from = ids.indexOf(activeId.slice(DRAG_FOLDER_PREFIX.length));
      const to = ids.indexOf(overId.slice(DRAG_FOLDER_PREFIX.length));
      if (from === -1 || to === -1) return;

      const reordered = arrayMove(ids, from, to);
      try {
        await moveFolder({
          variables: {
            input: { id: ids[from], index: reordered.indexOf(ids[from]) },
          },
        });
        await refetchFolders();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not reorder that",
        );
      }
      return;
    }

    if (!overId.startsWith(DROP_PREFIX)) return;
    const target =
      overId === ROOT_DROP_ID ? null : overId.slice(DROP_PREFIX.length);

    if (activeId.startsWith(DRAG_CHARACTER_PREFIX)) {
      const dragged = activeId.slice(DRAG_CHARACTER_PREFIX.length);
      // Dragging one of several selected cards takes the whole selection --
      // otherwise ticking four and dragging one of them would silently file
      // only the one under the cursor.
      const ids = selected.has(dragged) ? [...selected] : [dragged];
      await runMove(ids, target, true);
      return;
    }

    if (activeId.startsWith(DRAG_FOLDER_PREFIX)) {
      const dragged = activeId.slice(DRAG_FOLDER_PREFIX.length);
      if (target && subtreeIds(folders, dragged).has(target)) return;
      try {
        await moveFolder({
          variables: { input: { id: dragged, parentId: target } },
        });
        await refreshAll();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not move that folder",
        );
      }
    }
  };

  /**
   * Make a folder here -- inside whichever folder is open, not always at the
   * root. Somebody who has navigated into Commissions and pressed New folder
   * means one inside Commissions.
   */
  const createHere = async (name: string): Promise<string | null> => {
    try {
      const result = await createFolder({
        variables: { input: { name, parentId: folderId } },
      });
      await refetchFolders();
      return result.data?.createCharacterFolder.id ?? null;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create that folder",
      );
      return null;
    }
  };

  const submitNewFolder = async (): Promise<void> => {
    const name = (newName ?? "").trim();
    if (name.length === 0) {
      setNewName(null);
      return;
    }
    const created = await createHere(name);
    if (created) setNewName(null);
  };

  const toggle = (characterId: string): void => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(characterId)) {
        next.delete(characterId);
      } else {
        next.add(characterId);
      }
      return next;
    });
  };

  const foldersLoading = editable ? mine.loading : theirs.loading;
  if (foldersLoading && folders.length === 0 && charactersLoading) {
    return (
      <Centre>
        <LoadingSpinner />
      </Centre>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={(event) => void handleDragEnd(event)}
    >
      <Container>
        {openFolder && (
          <div>
            {/* The way back up. Only inside a folder: at the root it would be
                a single crumb naming the page you are already on. */}
            <Crumbs aria-label="Folder path">
              <Crumb type="button" onClick={() => navigate(null)}>
                Characters
              </Crumb>
              {here.slice(0, -1).map((folder) => (
                <React.Fragment key={folder.id}>
                  <span aria-hidden>›</span>
                  <Crumb type="button" onClick={() => navigate(folder.id)}>
                    {folder.name}
                  </Crumb>
                </React.Fragment>
              ))}
            </Crumbs>
            <FolderHeader
              folder={openFolder}
              editable={editable}
              onRename={async (name) => {
                try {
                  await updateFolder({
                    variables: { input: { id: openFolder.id, name } },
                  });
                  await refetchFolders();
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "Could not rename that",
                  );
                }
              }}
              onTogglePrivate={async () => {
                try {
                  await updateFolder({
                    variables: {
                      input: {
                        id: openFolder.id,
                        isPrivate: !openFolder.isPrivate,
                      },
                    },
                  });
                  await refetchFolders();
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "Could not change that",
                  );
                }
              }}
              onMove={() =>
                setPicker({ kind: "move-folder", folder: openFolder })
              }
              onDelete={() => setDeleting(openFolder)}
            />
          </div>
        )}

        {(editable || subfolders.length > 0) && (
          <Section>
            <Bar>
              <SectionLabel>Folders</SectionLabel>
              {editable && (
                <>
                  <Spacer />
                  {subfolders.length > 1 && (
                    <Button
                      variant={reordering ? "primary" : "ghost"}
                      size="sm"
                      onClick={() => setReordering((on) => !on)}
                    >
                      {reordering ? "Done reordering" : "Reorder folders"}
                    </Button>
                  )}
                  {newName === null ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNewName("")}
                    >
                      New folder
                    </Button>
                  ) : (
                    <NameForm
                      onSubmit={(event) => {
                        event.preventDefault();
                        void submitNewFolder();
                      }}
                    >
                      <NameField
                        autoFocus
                        value={newName}
                        aria-label="New folder name"
                        placeholder="Folder name"
                        onChange={(event) => setNewName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") setNewName(null);
                        }}
                      />
                      <Button variant="primary" size="sm" type="submit">
                        Create
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setNewName(null)}
                      >
                        Cancel
                      </Button>
                    </NameForm>
                  )}
                </>
              )}
            </Bar>
            {subfolders.length > 0 ? (
              <SortableContext
                items={subfolders.map(
                  (folder) => `${DRAG_FOLDER_PREFIX}${folder.id}`,
                )}
                strategy={rectSortingStrategy}
              >
                <TileGrid>
                  {subfolders.map((folder) => (
                    <FolderTile
                      key={folder.id}
                      folder={folder}
                      editable={editable}
                      reordering={reordering}
                      onOpen={() => navigate(folder.id)}
                    />
                  ))}
                </TileGrid>
              </SortableContext>
            ) : (
              <Empty>
                {openFolder
                  ? "No folders inside this one."
                  : "Make a folder to start sorting your characters."}
              </Empty>
            )}
          </Section>
        )}

        <Section>
          <Bar>
            <SectionLabel>
              {openFolder
                ? "Characters"
                : editable
                  ? "Not in a folder"
                  : "All characters"}
            </SectionLabel>
          </Bar>
          {editable && selected.size > 0 && (
            <SelectionBar>
              <span>{selected.size} selected</span>
              <Spacer />
              {/* One way in. A character can be in several folders, so "move"
                only ever means "add, and take out of the open one" -- and
                that second half is a choice made in the picker, where it can
                name the folder, rather than a second button that can't. */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPicker({ kind: "file-characters" })}
              >
                Add to folder&hellip;
              </Button>
              {openFolder && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void runMove([...selected], null, true)}
                >
                  Remove from &ldquo;{openFolder.name}&rdquo;
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelected(new Set())}
              >
                Clear
              </Button>
            </SelectionBar>
          )}
          {characters.length === 0 ? (
            <Empty>
              {folderId
                ? "Nothing filed here yet."
                : editable
                  ? "Everything you own is filed away."
                  : "No characters to show."}
            </Empty>
          ) : (
            <Pager
              showing={characters.length}
              total={total}
              hasMore={characterData?.userCharacters?.hasMore ?? false}
              loadingMore={loadingMore}
              onLoadMore={loadMore}
              noun="characters"
            >
              <CardGrid>
                {characters.map((character) => (
                  <CardShell key={character.id}>
                    {editable && (
                      <Checkbox
                        type="checkbox"
                        aria-label={`Select ${character.name}`}
                        checked={selected.has(character.id)}
                        onChange={() => toggle(character.id)}
                      />
                    )}
                    <DraggableCharacter
                      characterId={character.id}
                      disabled={!editable || reordering}
                    >
                      <CharacterCard
                        character={character}
                        showOwner={false}
                        showEditButton={editable}
                      />
                    </DraggableCharacter>
                  </CardShell>
                ))}
              </CardGrid>
            </Pager>
          )}
        </Section>
      </Container>

      <FolderPickerModal
        isOpen={picker !== null}
        onClose={() => setPicker(null)}
        folders={folders}
        title={
          picker?.kind === "move-folder"
            ? `Move "${picker.folder.name}"`
            : "Add to folder"
        }
        confirmLabel={picker?.kind === "move-folder" ? "Move" : "Add"}
        // Characters at the root are already in no folder, and inside a
        // folder taking them out is the remove-from option instead.
        allowRoot={picker?.kind === "move-folder"}
        removeFrom={picker?.kind === "file-characters" ? openFolder : null}
        disabledIds={
          picker?.kind === "move-folder"
            ? subtreeIds(folders, picker.folder.id)
            : openFolder
              ? new Set([openFolder.id])
              : undefined
        }
        onCreate={createHere}
        onSubmit={async (destination, removing) => {
          if (picker?.kind === "move-folder") {
            await moveFolder({
              variables: {
                input: { id: picker.folder.id, parentId: destination },
              },
            });
            await refreshAll();
            return;
          }
          await runMove([...selected], destination, removing);
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        title={`Delete "${deleting?.name ?? ""}"?`}
        confirmLabel="Delete folder"
        destructive
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          void (async () => {
            if (!deleting) return;
            try {
              await deleteFolder({ variables: { id: deleting.id } });
              if (folderId === deleting.id) navigate(deleting.parentId);
              await refreshAll();
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Could not delete that folder",
              );
            } finally {
              setDeleting(null);
            }
          })();
        }}
      >
        The characters in it are not deleted. Any folders inside it are deleted
        with it.
      </ConfirmDialog>
    </DndContext>
  );
};

const HeaderRow = styled.div<{ $private: boolean }>`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.sm};
  color: ${({ theme, $private }) =>
    $private ? theme.colors.text.secondary : theme.colors.primary};
`;

const Title = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.xxl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.xs};
  margin-left: auto;
`;

/**
 * The folder you are standing in: its name as the heading, whether visitors
 * can see it, and what you can do to it.
 *
 * The actions sit beside the name rather than on each tile -- a tile is a
 * navigation target, and hanging rename, privacy, move and delete off every
 * one of them puts four destructive-ish actions on a surface whose main job
 * is to be clicked -- and not below the grid, where a full folder pushed
 * them a long scroll from the thing they act on.
 */
const FolderHeader: React.FC<{
  folder: Folder;
  editable: boolean;
  onRename: (name: string) => Promise<void>;
  onTogglePrivate: () => Promise<void>;
  onMove: () => void;
  onDelete: () => void;
}> = ({ folder, editable, onRename, onTogglePrivate, onMove, onDelete }) => {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <HeaderRow data-testid="folder-header" $private={folder.isPrivate}>
      <FolderIcon isPrivate={folder.isPrivate} size={30} />
      {draft === null ? (
        <Title>{folder.name}</Title>
      ) : (
        <NameForm
          onSubmit={(event) => {
            event.preventDefault();
            void onRename(draft).then(() => setDraft(null));
          }}
        >
          <NameField
            autoFocus
            value={draft}
            aria-label="Folder name"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setDraft(null);
            }}
          />
          <Button variant="primary" size="sm" type="submit">
            Save
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>
            Cancel
          </Button>
        </NameForm>
      )}
      {folder.isPrivate && (
        <PrivatePill>
          <Lock size={12} aria-hidden />
          Private
        </PrivatePill>
      )}

      {editable && draft === null && (
        <Actions>
          <Button
            variant="ghost"
            size="sm"
            icon={<Pencil size={14} aria-hidden />}
            onClick={() => setDraft(folder.name)}
          >
            Rename
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={
              folder.isPrivate ? (
                <Globe size={14} aria-hidden />
              ) : (
                <Lock size={14} aria-hidden />
              )
            }
            onClick={() => void onTogglePrivate()}
          >
            {folder.isPrivate ? "Make public" : "Make private"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<FolderInput size={14} aria-hidden />}
            onClick={onMove}
          >
            Move
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Trash2 size={14} aria-hidden />}
            onClick={onDelete}
          >
            Delete
          </Button>
        </Actions>
      )}
    </HeaderRow>
  );
};
