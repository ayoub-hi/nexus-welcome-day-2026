import { prisma } from "@/lib/prisma";

export const GAME_STATUSES = ["not_started", "open", "ended"];

export async function getGameStatus() {
  const row = await prisma.gameState.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, status: "not_started" },
  });
  return row.status;
}

export async function setGameStatus(status) {
  if (!GAME_STATUSES.includes(status)) {
    throw new Error(`Invalid game status: ${status}`);
  }
  const row = await prisma.gameState.upsert({
    where: { id: 1 },
    update: { status },
    create: { id: 1, status },
  });
  return row.status;
}
