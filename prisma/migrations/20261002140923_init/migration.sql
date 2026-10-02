/*
  Warnings:

  - You are about to drop the `OsintChallenge` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OsintRedemption` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OsintSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OsintSolve` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "OsintChallenge";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "OsintRedemption";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "OsintSession";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "OsintSolve";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "BonusCode" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 20,
    "label" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CodeRedemption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "bonusCodeId" INTEGER NOT NULL,
    "redeemedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CodeRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CodeRedemption_bonusCodeId_fkey" FOREIGN KEY ("bonusCodeId") REFERENCES "BonusCode" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "BonusCode_code_key" ON "BonusCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CodeRedemption_userId_bonusCodeId_key" ON "CodeRedemption"("userId", "bonusCodeId");
