import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { declarationsOf } from "../__tests__/emittedCss";
import { render } from "../__tests__/render";
import { mq } from "../css/media";
import { vars } from "../theme/contract.css";
import { Stack } from "./Stack";

describe("Stack", () => {
  it("is a column with the gap it is given", () => {
    const stack = render(<Stack gap="lg" />).firstElementChild!;
    expect(stack.tagName).toBe("DIV");
    expect(declarationsOf(stack)).toMatchObject({
      display: "flex",
      "flex-direction": "column",
      gap: vars.space.lg,
    });
  });

  it("takes a gap per breakpoint", () => {
    const stack = render(
      <Stack gap={{ base: "sm", md: "xl" }} />,
    ).firstElementChild!;
    expect(declarationsOf(stack).gap).toBe(vars.space.sm);
    expect(declarationsOf(stack, [`@media ${mq("md")}`]).gap).toBe(
      vars.space.xl,
    );
  });

  it("renders the element named by `as`, forwarding ref, className and props", () => {
    const ref = createRef<HTMLElement>();
    const stack = render(
      <Stack as="ul" ref={ref} className="extra" data-testid="list" />,
    ).firstElementChild!;
    expect(stack.tagName).toBe("UL");
    expect(ref.current).toBe(stack);
    expect(stack.classList).toContain("extra");
    expect(stack.getAttribute("data-testid")).toBe("list");
  });

  it("takes the attributes of the element named by `as`", () => {
    const form = render(<Stack as="form" noValidate />).firstElementChild!;
    expect(form.hasAttribute("novalidate")).toBe(true);
    const list = render(<Stack as="ol" start={3} />).firstElementChild!;
    expect(list.getAttribute("start")).toBe("3");
  });

  it("rejects another element's attributes", () => {
    // @ts-expect-error noValidate belongs to forms, and this Stack is a div.
    render(<Stack noValidate />);
    // @ts-expect-error start belongs to ordered lists.
    render(<Stack as="ul" start={3} />);
  });
});
