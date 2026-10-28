import { Prisma } from "@chardb/database";
import { CandyBoardGoneError, orBoardGone } from "./candy-board.errors";

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError("failed", {
    code,
    clientVersion: "test",
  });

describe("orBoardGone", () => {
  it("passes on what the write gives back", async () => {
    await expect(orBoardGone("board-1", Promise.resolve(3))).resolves.toBe(3);
  });

  it("says the board was deleted when it went between the check and the write", async () => {
    const write = orBoardGone("board-1", Promise.reject(prismaError("P2025")));
    await expect(write).rejects.toBeInstanceOf(CandyBoardGoneError);
    await expect(write).rejects.toMatchObject({
      boardId: "board-1",
      message: "This candy board was deleted, so the change could not be saved",
    });
  });

  it("leaves any other failure as it was", async () => {
    const other = prismaError("P2002");
    await expect(orBoardGone("board-1", Promise.reject(other))).rejects.toBe(
      other,
    );
  });
});
