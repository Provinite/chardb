import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import { useCanonicalUsername } from "../useCanonicalUsername";

const Where = () => {
  const location = useLocation();
  return (
    <output data-testid="where">
      {location.pathname + location.search + location.hash}
    </output>
  );
};

/** Stands in for a profile page whose query came back with `stored`. */
const Page = ({ stored }: { stored: string | undefined }) => {
  const { username } = useParams<{ username: string }>();
  useCanonicalUsername(username, stored);
  return <Where />;
};

const visit = (url: string, stored: string | undefined) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/user/:username" element={<Page stored={stored} />} />
        <Route
          path="/user/:username/followers"
          element={<Page stored={stored} />}
        />
      </Routes>
    </MemoryRouter>,
  );

const where = () => screen.getByTestId("where").textContent;

describe("useCanonicalUsername", () => {
  it("rewrites the URL to the stored casing", () => {
    visit("/user/MIXEDCASE", "MixedCase");
    expect(where()).toBe("/user/MixedCase");
  });

  it("keeps the rest of the path, the query and the hash", () => {
    visit("/user/mixedcase/followers?page=2#top", "MixedCase");
    expect(where()).toBe("/user/MixedCase/followers?page=2#top");
  });

  it("leaves a URL that already matches alone", () => {
    visit("/user/MixedCase", "MixedCase");
    expect(where()).toBe("/user/MixedCase");
  });

  it("waits for the stored name before doing anything", () => {
    visit("/user/MIXEDCASE", undefined);
    expect(where()).toBe("/user/MIXEDCASE");
  });

  it("leaves a different name alone", () => {
    visit("/user/someoneelse", "MixedCase");
    expect(where()).toBe("/user/someoneelse");
  });
});
