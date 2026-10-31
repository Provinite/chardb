import { Route } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { lazyPage } from "../lazyPage";
import { preloadMatchedPage } from "../preloadRoute";

/** A lazy page whose loader the test can watch. */
const watchedPage = () => {
  const load = vi.fn(() => Promise.resolve({ Page: () => <p>page</p> }));
  return { Page: lazyPage(load, "Page"), load };
};

const Guard = ({ children }: { children: React.ReactNode }) => <>{children}</>;

describe("preloadMatchedPage", () => {
  it("starts loading the page the path matches, and no other", () => {
    const home = watchedPage();
    const other = watchedPage();
    preloadMatchedPage(
      <>
        <Route path="/" element={<home.Page />} />
        <Route path="/other" element={<other.Page />} />
      </>,
      "/",
    );
    expect(home.load).toHaveBeenCalledTimes(1);
    expect(other.load).not.toHaveBeenCalled();
  });

  it("finds a page inside a route guard", () => {
    const mine = watchedPage();
    preloadMatchedPage(
      <Route
        path="/my/:thing"
        element={
          <Guard>
            <mine.Page />
          </Guard>
        }
      />,
      "/my/characters",
    );
    expect(mine.load).toHaveBeenCalledTimes(1);
  });

  it("does nothing for a path no route matches", () => {
    const home = watchedPage();
    preloadMatchedPage(<Route path="/" element={<home.Page />} />, "/nowhere");
    expect(home.load).not.toHaveBeenCalled();
  });

  it("swallows a failed load, which the page's own render will retry", async () => {
    const load = vi.fn(() => Promise.reject(new Error("offline")));
    const Page = lazyPage(load, "Page");
    preloadMatchedPage(<Route path="/" element={<Page />} />, "/");
    await Promise.resolve();
    expect(load).toHaveBeenCalledTimes(1);
  });
});

describe("the real route tables", () => {
  it("map the apex home to HomePage and a community character to CharacterPage", async () => {
    const pages = await import("../pages");
    const { apexRoutes } = await import("../ApexRoutes");
    const { communityRoutes } = await import("../CommunityRoutes");
    const home = vi.spyOn(pages.HomePage, "preload").mockResolvedValue({});
    const character = vi
      .spyOn(pages.CharacterPage, "preload")
      .mockResolvedValue({});

    preloadMatchedPage(apexRoutes, "/");
    preloadMatchedPage(communityRoutes, "/character/abc");

    expect(home).toHaveBeenCalledTimes(1);
    expect(character).toHaveBeenCalledTimes(1);
  });

  // A character with no species lives at the apex, behind the guard that
  // forwards the rest to their community.
  it("map an apex character to CharacterPage through its host guard", async () => {
    const pages = await import("../pages");
    const { apexRoutes } = await import("../ApexRoutes");
    const character = vi
      .spyOn(pages.CharacterPage, "preload")
      .mockResolvedValue({});

    preloadMatchedPage(apexRoutes, "/character/abc");

    expect(character).toHaveBeenCalledTimes(1);
  });
});
