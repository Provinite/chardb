import type { LucideIcon } from "lucide-react";

interface SpotlightItemBase {
  id: string;
  /** The page's icon in the sidebar, where it has one. */
  icon: LucideIcon;
  label: string;
  description?: string;
  /** Also matched by the filter, for words people use that the label lacks. */
  keywords?: string[];
}

/** A page. A path on this host, or an absolute URL on another. */
export interface SpotlightLinkItem extends SpotlightItemBase {
  to: string;
}

/** Something done in place, such as narrowing the search. Keeps it open. */
export interface SpotlightActionItem extends SpotlightItemBase {
  onSelect: () => void;
}

export type SpotlightItem = SpotlightLinkItem | SpotlightActionItem;

export interface SpotlightGroup {
  group: string;
  actions: SpotlightItem[];
}

export const isLink = (item: SpotlightItem): item is SpotlightLinkItem =>
  "to" in item;
