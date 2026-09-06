import styled from "styled-components";
import { usePageMeta } from "../lib/pageMeta";

const Wrapper = styled.div`
  max-width: 640px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xxl}
    ${({ theme }) => theme.spacing.md};
  text-align: center;
`;

const Body = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.6;
`;

/**
 * Shown when the community behind this hostname could not be looked up.
 *
 * Deliberately not the same as an address that names no community, which
 * redirects to the apex without comment. The difference is who failed: there,
 * the server answered and said there is nothing here, so the address is wrong;
 * here the request did not complete, so the address may be perfectly good and
 * something else is broken. Telling somebody to check their URL when the API
 * is down sends them hunting for a mistake they did not make.
 *
 * Reload rather than a link away, because the thing to do is try again.
 */
export const CommunityUnreachable: React.FC = () => {
  usePageMeta({ title: "Something Went Wrong" });

  return (
    <Wrapper>
      <h1>Something went wrong</h1>
      <Body>
        This community could not be loaded. The address is probably fine -- the
        site could not be reached to look it up.
      </Body>
      <Body>
        <button type="button" onClick={() => window.location.reload()}>
          Try again
        </button>
      </Body>
    </Wrapper>
  );
};
