import { isValidElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { createRoutesFromChildren, matchRoutes } from "react-router-dom";
import { communityRoutes } from "../CommunityRoutes";
import { ApexRedirect } from "../ApexRedirect";
import {
  DeviantArtCallbackPage,
  DiscordCallbackPage,
  PatreonCallbackPage,
  ToyhouseCallbackPage,
} from "../pages";

/** The innermost element a community host renders for `path`. */
const elementAt = (path: string): ReactNode => {
  const matches = matchRoutes(createRoutesFromChildren(communityRoutes), path);
  return matches?.[matches.length - 1]?.route.element;
};

describe("community host routes", () => {
  // The API sends a linking flow back to the host that started it. Bouncing
  // that callback to the apex strands the viewer outside their community.
  it.each([
    ["/auth/deviantart/callback", DeviantArtCallbackPage],
    ["/auth/discord/callback", DiscordCallbackPage],
    ["/auth/toyhouse/callback", ToyhouseCallbackPage],
    ["/auth/patreon/callback", PatreonCallbackPage],
  ])("serves %s locally", (path, page) => {
    const element = elementAt(`${path}?success=true`);

    expect(isValidElement(element) && element.type).toBe(page);
  });

  it("still sends other /auth paths to the apex", () => {
    const element = elementAt("/auth/something-else");

    expect(isValidElement(element) && element.type).toBe(ApexRedirect);
  });
});
