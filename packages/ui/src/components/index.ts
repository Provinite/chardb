export * from "./Avatar";
export * from "./Button";
export * from "./TagInput";
export * from "./UserTypeahead";
export * from "./SearchSelect";
export * from "./ErrorMessage";
export * from "./Modal";
export type { DialogRootProps, DialogTitleProps } from "./Dialog";
export {
  Highlight,
  type HighlightProps,
  type CommandPaletteRootProps,
  type CommandPaletteInputProps,
  type CommandPaletteListProps,
  type CommandPaletteGroupProps,
  type CommandPaletteItemProps,
} from "./CommandPalette";
export * from "./Input";
export * from "./Card";
export * from "./Typography";
export * from "./RadioGroup";
export * from "./Alert";
export * from "./Menu";
export * from "./TopProgressBar";

import { DialogRoot, DialogTitle } from "./Dialog";
import {
  CommandPaletteEmpty,
  CommandPaletteFooter,
  CommandPaletteGroup,
  CommandPaletteKbd,
  CommandPaletteInput,
  CommandPaletteItem,
  CommandPaletteItemDescription,
  CommandPaletteItemIcon,
  CommandPaletteItemLabel,
  CommandPaletteItemText,
  CommandPaletteList,
  CommandPaletteRoot,
} from "./CommandPalette";

import { PopoverPanel, PopoverRoot, PopoverTrigger } from "./Popover";
export type { PopoverRootProps } from "./Popover";

/** A panel that opens beside a button; see `PopoverRoot`. */
export const Popover = {
  Root: PopoverRoot,
  Trigger: PopoverTrigger,
  Panel: PopoverPanel,
};

/** A modal dialog on the modal layer; see `DialogRoot`. */
export const Dialog = {
  Root: DialogRoot,
  Title: DialogTitle,
};

/** A search box over a list of results, in a dialog; see `CommandPaletteRoot`. */
export const CommandPalette = {
  Root: CommandPaletteRoot,
  Input: CommandPaletteInput,
  List: CommandPaletteList,
  Group: CommandPaletteGroup,
  Item: CommandPaletteItem,
  ItemIcon: CommandPaletteItemIcon,
  ItemText: CommandPaletteItemText,
  ItemLabel: CommandPaletteItemLabel,
  ItemDescription: CommandPaletteItemDescription,
  Empty: CommandPaletteEmpty,
  Footer: CommandPaletteFooter,
  Kbd: CommandPaletteKbd,
};
