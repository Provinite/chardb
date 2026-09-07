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
import { flattenTree, Folder } from "./folderTree";

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

const Chip = styled(HostAwareLink)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  text-decoration: none;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const Muted = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

const Row = styled.label<{ $depth: number }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm};
  padding-left: ${({ theme, $depth }) =>
    `calc(${theme.spacing.sm} + ${$depth} * ${theme.spacing.lg})`};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.primary};

  &:hover {
    background: ${({ theme }) => theme.colors.surface};
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
    <Section>
      <Heading>
        <h3>Folders</h3>
        {editable && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            {filed.length === 0 ? "Add to folder" : "Edit"}
          </Button>
        )}
      </Heading>

      {filed.length === 0 ? (
        <Muted>Not in any folder.</Muted>
      ) : (
        <Chips>
          {filed.map((folder) => (
            <Chip
              key={folder.id}
              to={
                ownerUsername
                  ? `/user/${ownerUsername}/characters?folder=${folder.id}`
                  : `/my/characters?folder=${folder.id}`
              }
            >
              <span aria-hidden>{folder.isPrivate ? "🔒" : "📁"}</span>
              {folder.name}
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
          <List>
            {flattenTree(all).map(({ folder, depth }) => (
              <Row key={folder.id} $depth={depth}>
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
                <span aria-hidden>{folder.isPrivate ? "🔒" : "📁"}</span>
                {folder.name}
              </Row>
            ))}
          </List>
        )}

        <Actions>
          <Button
            variant="ghost"
            onClick={() => setEditing(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => void save()}
            loading={busy}
            disabled={all.length === 0}
          >
            Save
          </Button>
        </Actions>
      </Modal>
    </Section>
  );
};
