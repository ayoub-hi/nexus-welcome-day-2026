-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Question" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "question" TEXT NOT NULL,
    "optionA" TEXT NOT NULL,
    "optionB" TEXT NOT NULL,
    "optionC" TEXT NOT NULL,
    "optionD" TEXT NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "year" TEXT NOT NULL DEFAULT 'all'
);
INSERT INTO "new_Question" ("active", "correctAnswer", "id", "optionA", "optionB", "optionC", "optionD", "question") SELECT "active", "correctAnswer", "id", "optionA", "optionB", "optionC", "optionD", "question" FROM "Question";
DROP TABLE "Question";
ALTER TABLE "new_Question" RENAME TO "Question";
CREATE INDEX "Question_year_idx" ON "Question"("year");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
