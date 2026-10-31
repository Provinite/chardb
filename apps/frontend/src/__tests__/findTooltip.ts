import { waitFor } from "@testing-library/react";

/**
 * The tooltip on screen, once it shows. Tooltips are seen, not heard: hidden
 * from screen readers and without a role, so they are found by their marker.
 * Kept apart from `test-utils`, which mocks modules as it loads.
 */
export const findTooltip = () =>
  waitFor(() => {
    const tip = document.querySelector<HTMLElement>("[data-tooltip]");
    if (!tip) throw new Error("No tooltip is showing");
    return tip;
  });
