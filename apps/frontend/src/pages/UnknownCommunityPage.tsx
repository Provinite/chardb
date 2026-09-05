import styled from "styled-components";
import { apexUrl, ROOT_DOMAIN } from "../lib/communityHost";

const Wrapper = styled.div`
  max-width: 640px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xxl}
    ${({ theme }) => theme.spacing.md};
  text-align: center;
`;

const Host = styled.code`
  color: ${({ theme }) => theme.colors.text.primary};
  word-break: break-all;
`;

const Body = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.6;
`;

/**
 * Shown when the hostname names no community.
 *
 * The wildcard DNS record answers for every label, so any subdomain of the
 * site reaches the app -- a typo, a community that has since been deleted, a
 * link someone guessed at. That is a page to render, not an error: the app
 * loaded fine, there is simply nothing here.
 */
export const UnknownCommunityPage: React.FC<{ slug: string }> = ({ slug }) => (
  <Wrapper>
    <h1>No community here</h1>
    <Body>
      Nothing is served from{" "}
      <Host>
        {slug}.{ROOT_DOMAIN}
      </Host>
      . The address may be misspelled, or the community may have been removed.
    </Body>
    <Body>
      <a href={apexUrl("/")}>Go to {ROOT_DOMAIN}</a>
    </Body>
  </Wrapper>
);
