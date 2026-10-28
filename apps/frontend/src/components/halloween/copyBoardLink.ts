import { toast } from "react-hot-toast";

/** A candy board's link, to share; anyone with it can look at the board. */
export const boardLink = (boardId: string) =>
  `${window.location.origin}/halloween/board/${boardId}`;

/** Copies a board's link, and says whether it worked. */
export async function copyBoardLink(boardId: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(boardLink(boardId));
    toast.success("Link copied");
  } catch {
    toast.error("Could not copy the link");
  }
}
