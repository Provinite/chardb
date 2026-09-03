import React from "react";
import styled from "styled-components";
import { ArrowRight, History } from "lucide-react";
import { useCharacterVariantChangesQuery } from "../../generated/graphql";

const Wrap = styled.section`
  margin-top: 2rem;
`;

const Head = styled.h3`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 0.75rem;
`;

const Row = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.65rem 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.primary};

  &:last-child {
    border-bottom: none;
  }
`;

const Move = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 600;
`;

const Meta = styled.span`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.8125rem;
`;

const Reason = styled.span`
  flex-basis: 100%;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.8125rem;
`;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

/**
 * Every time this character's rarity moved.
 *
 * Rendered only when there is history, which for almost every character is
 * never. A section reading "no rarity changes" on thousands of pages would be
 * noise standing in for information.
 *
 * Public, like the rarity it describes: a masterlist publishes rarity, so
 * "why is this a Rare" is a question anyone can reasonably ask, and the answer
 * being visible is the point of recording it.
 */
export const VariantHistory: React.FC<{ characterId: string }> = ({
  characterId,
}) => {
  const { data } = useCharacterVariantChangesQuery({
    variables: { characterId },
    skip: !characterId,
  });

  const changes = data?.characterVariantChanges ?? [];
  if (changes.length === 0) return null;

  return (
    <Wrap data-testid="variant-history">
      <Head>
        <History size={18} />
        Rarity history
      </Head>
      {changes.map((change) => (
        <Row key={change.id}>
          <Move>
            {change.fromVariant?.name ?? "No variant"}
            <ArrowRight size={14} />
            {change.toVariant?.name ?? "No variant"}
          </Move>
          <Meta>
            {formatDate(change.createdAt)}
            {change.changedBy
              ? ` · by ${change.changedBy.displayName || change.changedBy.username}`
              : ""}
          </Meta>
          {change.reason && <Reason>{change.reason}</Reason>}
        </Row>
      ))}
    </Wrap>
  );
};
