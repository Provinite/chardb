import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { declarationsOf } from "../__tests__/emittedCss";
import { render } from "../__tests__/render";
import { vars } from "../theme/contract.css";
import { Cluster } from "./Cluster";

describe("Cluster", () => {
  it("is a row that wraps, centred on the cross axis", () => {
    const cluster = render(<Cluster gap="sm" />).firstElementChild!;
    expect(declarationsOf(cluster)).toMatchObject({
      display: "flex",
      "flex-direction": "row",
      "flex-wrap": "wrap",
      "align-items": "center",
      gap: vars.space.sm,
    });
  });

  it("takes alignment and justification", () => {
    const cluster = render(
      <Cluster align="flex-start" justify="space-between" />,
    ).firstElementChild!;
    expect(declarationsOf(cluster)).toMatchObject({
      "align-items": "flex-start",
      "justify-content": "space-between",
    });
  });

  it("renders the element named by `as`, forwarding ref and className", () => {
    const ref = createRef<HTMLElement>();
    const cluster = render(
      <Cluster as="nav" ref={ref} className="extra" />,
    ).firstElementChild!;
    expect(cluster.tagName).toBe("NAV");
    expect(ref.current).toBe(cluster);
    expect(cluster.classList).toContain("extra");
  });
});
