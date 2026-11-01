import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import toast from "react-hot-toast";
import { Button, Modal } from "@chardb/ui";
import {
  useGetCharacterFoldersQuery,
  useGetMyCharacterFoldersQuery,
  useSetCharacterFoldersMutation,
} from "../../generated/graphql";
import { HostAwareLink } from "../HostAwareLink";
import { apexUrl } from "../../lib/communityHost";
import { flattenTree, Folder } from "./folderTree";
import { FolderGlyph, FolderIcon, PrivateTag } from "./FolderTile";

const Section = styled.section`
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const Heading = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.sm};

  h3 {
    margin: 0;
    font-size: ${({ theme }) => theme.typography.fontSize.md};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
`;

/**
 * A folder as a link, tinted the way its tile is in the browser: purple when
 * public, slate and hatched when private.
 */
const Chip = styled(HostAwareLink)<{ $private: boolean }>`
  --chip-ink: ${({ theme, $private }) =>
    $private ? theme.colors.text.secondary : theme.colors.primary};
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.md}`};
  border: 1px solid
    ${({ theme, $private }) =>
      `${$private ? theme.colors.text.secondary : theme.colors.primary}4d`};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background: ${({ theme, $private }) =>
    $private
      ? `repeating-linear-gradient(-45deg, transparent 0 6px, ${theme.colors.text.secondary}12 6px 7px), ${theme.colors.text.secondary}0f`
      : `${theme.colors.primary}17`};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  text-decoration: none;

  &:hover,
  &:focus-visible {
    border-color: var(--chip-ink);
    outline: none;
  }

  &:focus-visible {
    box-shadow: 0 0 0 2px var(--chip-ink);
  }
`;

const Muted = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

/** Styled to match the folder picker's rows, ticked rows standing out. */
const Row = styled.label<{ $depth: number; $checked: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm};
  padding-left: ${({ theme, $depth }) =>
    `calc(${theme.spacing.sm} + ${$depth} * ${theme.spacing.lg})`};
  border-left: 3px solid
    ${({ theme, $checked }) =>
      $checked ? theme.colors.primary : "transparent"};
  background: ${({ theme, $checked }) =>
    $checked ? `${theme.colors.primary}24` : "transparent"};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme, $checked }) =>
    $checked
      ? theme.typography.fontWeight.semibold
      : theme.typography.fontWeight.normal};
  color: ${({ theme }) => theme.colors.text.primary};

  &:hover {
    background: ${({ theme, $checked }) =>
      $checked ? `${theme.colors.primary}2e` : theme.colors.surface};
  }

  input {
    accent-color: ${({ theme }) => theme.colors.primary};
  }
`;

const List = styled.div`
  max-height: 45vh;
  overflow-y: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

interface CharacterFoldersSectionProps {
  characterId: string;
  /** Whose folders these are, for the links a visitor follows. */
  ownerUsername?: string | null;
  /** True when the viewer owns the character. */
  editable: boolean;
}

/**
 * Where this character's owner filed it.
 *
 * A visitor sees only the public folders, and each one links to that member's
 * characters filtered to it -- the folders are how a profile is browsed, so a
 * chip that did not go anywhere would be describing a structure the reader
 * cannot then use.
 */
export const CharacterFoldersSection: React.FC<
  CharacterFoldersSectionProps
> = ({ characterId, ownerUsername, editable }) => {
  const { data, refetch } = useGetCharacterFoldersQuery({
    variables: { characterId },
  });

  const mine = useGetMyCharacterFoldersQuery({ skip: !editable });
  const [setFolders] = useSetCharacterFoldersMutation();

  const [editing, setEditing] = useState(false);
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const filed: Folder[] = useMemo(() => data?.characterFolders ?? [], [data]);
  const all: Folder[] = mine.data?.myCharacterFolders ?? [];

  useEffect(() => {
    setChosen(new Set(filed.map((folder) => folder.id)));
  }, [filed]);

  if (filed.length === 0 && !editable) return null;

  const save = async (): Promise<void> => {
    setBusy(true);
    try {
      await setFolders({
        variables: { input: { characterId, folderIds: [...chosen] } },
      });
      await refetch();
      setEditing(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save that",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section data-testid="character-folders">
      <Heading>
        <h3>Folders</h3>
        {editable && (
          <Button tone="ghost" size="sm" onClick={() => setEditing(true)}>
            {filed.length === 0 ? "Add to folder" : "Edit"}
          </Button>
        )}
      </Heading>

      {filed.length === 0 ? (
        <Muted>Not in any folder.</Muted>
      ) : (
        <Chips>
          {filed.map((folder) => (
            // Absolute, via `apexUrl`. A character page is served from its
            // community's host and a member's characters live at the apex, so
            // a relative href here would look for `/user/...` on the community
            // and find nothing.
            <Chip
              key={folder.id}
              $private={folder.isPrivate}
              to={apexUrl(
                ownerUsername
                  ? `/user/${ownerUsername}/characters?folder=${folder.id}`
                  : `/my/characters?folder=${folder.id}`,
              )}
            >
              <FolderGlyph $private={folder.isPrivate}>
                <FolderIcon isPrivate={folder.isPrivate} />
              </FolderGlyph>
              {folder.name}
              {folder.isPrivate && <PrivateTag />}
            </Chip>
          ))}
        </Chips>
      )}

      <Modal
        isOpen={editing}
        onClose={() => setEditing(false)}
        title="Folders for this character"
      >
        {all.length === 0 ? (
          <Muted>
            You have no folders yet. Make one from My Characters, then come
            back.
          </Muted>
        ) : (
          <List data-testid="character-folders-editor">
            {flattenTree(all).map(({ folder, depth }) => (
              <Row
                key={folder.id}
                $depth={depth}
                $checked={chosen.has(folder.id)}
              >
                <input
                  type="checkbox"
                  checked={chosen.has(folder.id)}
                  onChange={() =>
                    setChosen((current) => {
                      const next = new Set(current);
                      if (next.has(folder.id)) {
                        next.delete(folder.id);
                      } else {
                        next.add(folder.id);
                      }
                      return next;
                    })
                  }
                />
                <FolderGlyph $private={folder.isPrivate}>
                  <FolderIcon isPrivate={folder.isPrivate} />
                </FolderGlyph>
                {folder.name}
                {folder.isPrivate && <PrivateTag />}
              </Row>
            ))}
          </List>
        )}

        <Actions>
          <Button
            tone="ghost"
            onClick={() => setEditing(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            tone="primary"
            onClick={() => void save()}
            busy={busy}
            disabled={all.length === 0}
          >
            Save
          </Button>
        </Actions>
      </Modal>
    </Section>
  );
};
