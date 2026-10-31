import { Suspense, type ComponentType } from "react";
import { act, render, screen } from "../../__tests__/test-utils";
import { describe, expect, it } from "vitest";
import { lazyPage } from "../lazyPage";
import { RouteErrorBoundary } from "../RouteErrorBoundary";

type PageModule = Record<"Page", ComponentType<object>>;

describe("lazyPage", () => {
  it("renders the named export once it loads", async () => {
    const Page = lazyPage(
      (): Promise<PageModule> => Promise.resolve({ Page: () => <p>page</p> }),
      "Page",
    );
    render(
      <Suspense fallback={<p>loading</p>}>
        <Page />
      </Suspense>,
    );
    expect(await screen.findByText("page")).toBeInTheDocument();
  });

  // Vite resolves a failed import with nothing once `chunkReload` has taken
  // the error and is reloading the page. The page should wait for the reload,
  // not fail in the moment before it.
  it("keeps waiting when the import resolves with nothing", async () => {
    const Page = lazyPage(
      () => Promise.resolve(undefined as unknown as PageModule),
      "Page",
    );
    render(
      <RouteErrorBoundary resetKey="/" reload={() => {}}>
        <Suspense fallback={<p>loading</p>}>
          <Page />
        </Suspense>
      </RouteErrorBoundary>,
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    expect(screen.getByText("loading")).toBeInTheDocument();
  });
});
