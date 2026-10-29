import React, { useState } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { useDebouncedValue } from "@mantine/hooks";
import { Button } from "@chardb/ui";
import { usePageMeta } from "../lib/pageMeta";
import { ProviderIcon } from "../components/ProviderIcon";
import { useCommunityId } from "../contexts/CommunityHostContext";
import {
  ExternalAccountProvider,
  useGetExternalMembersQuery,
} from "../generated/graphql";
import {
  PROVIDER_NAME,
  pendingHolderPath,
  pendingLabel,
} from "../lib/pendingOwner";

/**
 * External members: people something waits on here without an account --
 * items or characters granted to a Discord or DeviantArt account (#445).
 *
 * A lookup first: staff come here for one person, so nothing is listed until
 * they search. Browsing everyone is the fallback, a page at a time. Either
 * way it is a list of people, not of their claims; opening one shows those.
 */

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

/** The accounts something can wait on. */
const PROVIDERS = [
  ExternalAccountProvider.Discord,
  ExternalAccountProvider.Deviantart,
];

const Container = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 0.5rem 0;
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 0 0 1.5rem 0;
`;

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 1.25rem;
`;

const SearchWrap = styled.div`
  position: relative;
  flex: 1;
  min-width: 220px;

  svg {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: ${({ theme }) => theme.colors.text.muted};
    pointer-events: none;
  }
`;

const control = `
  font: inherit;
  font-size: 0.875rem;
  padding: 0.5rem 0.75rem;
`;

const SearchInput = styled.input`
  ${control}
  width: 100%;
  padding-left: 2.25rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Select = styled.select`
  ${control}
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const List = styled.div<{ $stale: boolean }>`
  opacity: ${({ $stale }) => ($stale ? 0.6 : 1)};
  transition: opacity 120ms ease;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  overflow: hidden;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:last-child {
    border-bottom: 0;
  }

  a {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
    font-weight: 500;
  }
`;

const Counts = styled.span`
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.muted};
  white-space: nowrap;
`;

const Pager = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const Note = styled.p`
  padding: 2rem 1rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

export const CommunityExternalMembersPage: React.FC = () => {
  usePageMeta({ title: "External Members" });
  const communityId = useCommunityId();

  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(
    search.trim(),
    SEARCH_DEBOUNCE_MS,
  );
  const [provider, setProvider] = useState<ExternalAccountProvider | "">("");
  const [browsing, setBrowsing] = useState(false);

  // A new search or account kind starts from the first page. Derived rather
  // than reset, so the query never sees the old filter at the new offset.
  const filterKey = `${debouncedSearch}|${provider}`;
  const [pages, setPages] = useState({ key: filterKey, offset: 0 });
  const offset = pages.key === filterKey ? pages.offset : 0;

  const asked = Boolean(debouncedSearch) || browsing;
  const { data, previousData, loading, error } = useGetExternalMembersQuery({
    variables: {
      communityId: communityId ?? "",
      search: debouncedSearch || undefined,
      provider: provider || undefined,
      limit: PAGE_SIZE,
      offset,
    },
    skip: !communityId || !asked,
  });
  const page = (data ?? previousData)?.externalMembers;
  const stale = loading || search.trim() !== debouncedSearch;

  return (
    <Container>
      <Title>External Members</Title>
      <Subtitle>
        People something waits on here who have no account yet. Find someone by
        their Discord or DeviantArt name, or by their account ID.
      </Subtitle>

      <Toolbar>
        <SearchWrap>
          <Search size={15} />
          <SearchInput
            type="search"
            aria-label="Search external members"
            placeholder="Name, username or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </SearchWrap>
        <Select
          aria-label="Account"
          value={provider}
          onChange={(e) =>
            setProvider(e.target.value as ExternalAccountProvider | "")
          }
        >
          <option value="">Any account</option>
          {PROVIDERS.map((p) => (
            <option key={p} value={p}>
              {PROVIDER_NAME[p]}
            </option>
          ))}
        </Select>
        {!browsing && (
          <Button variant="outline" onClick={() => setBrowsing(true)}>
            Browse all
          </Button>
        )}
      </Toolbar>

      {!asked ? (
        <Note>Search for someone, or browse everyone.</Note>
      ) : error ? (
        <Note role="alert">
          External members could not be loaded. {error.message}
        </Note>
      ) : !page || page.members.length === 0 ? (
        <Note>{!page || stale ? "Searching…" : "No one matches that."}</Note>
      ) : (
        <>
          <List $stale={stale} aria-busy={stale}>
            {page.members.map((m) => {
              const path = pendingHolderPath(m.holder);
              const label = (
                <>
                  <ProviderIcon provider={m.holder.provider} size={18} />
                  {pendingLabel(m.holder)}
                </>
              );
              return (
                <Row key={m.holder.id} data-testid="external-member">
                  {path ? <Link to={path}>{label}</Link> : <span>{label}</span>}
                  <Counts>
                    {[
                      m.itemCount > 0 && plural(m.itemCount, "item"),
                      m.characterCount > 0 &&
                        plural(m.characterCount, "character"),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Counts>
                </Row>
              );
            })}
          </List>
          {(offset > 0 || page.hasMore) && (
            <Pager>
              <Button
                variant="secondary"
                disabled={offset === 0 || stale}
                onClick={() =>
                  setPages({
                    key: filterKey,
                    offset: Math.max(0, offset - PAGE_SIZE),
                  })
                }
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                disabled={!page.hasMore || stale}
                onClick={() =>
                  setPages({ key: filterKey, offset: offset + PAGE_SIZE })
                }
              >
                Next
              </Button>
            </Pager>
          )}
        </>
      )}
    </Container>
  );
};
