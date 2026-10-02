// Usage:
//   node scripts/import-questions.js <file.json> [year]
//   node scripts/import-questions.js prisma/questions-1cp.json 1cp
//
// File format: same as prisma/questions.json (array of
// { question, optionA..optionD, correctAnswer }). The optional [year] argument
// ("1cp" | "2cp" | "1cs" | "2cs" | "3cs" | "all") is applied to every question
// that doesn't already carry its own "year" field.
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");

const VALID = ["1cp", "2cp", "1cs", "2cs", "3cs", "all"];
const prisma = new PrismaClient();

async function main() {
  const [file, yearArg] = process.argv.slice(2);
  if (!file) {
    console.error("Usage: node scripts/import-questions.js <file.json> [year]");
    process.exit(1);
  }
  if (yearArg && !VALID.includes(yearArg)) {
    console.error(`Invalid year "${yearArg}". Use one of: ${VALID.join(", ")}`);
    process.exit(1);
  }

  const questions = JSON.parse(fs.readFileSync(file, "utf-8")).map((q) => ({
    ...q,
    year: q.year || yearArg || "all",
  }));

  const bad = questions.find((q) => !VALID.includes(q.year) || !["A", "B", "C", "D"].includes(q.correctAnswer));
  if (bad) {
    console.error("Invalid question (bad year or correctAnswer):", bad);
    process.exit(1);
  }

  await prisma.question.createMany({ data: questions });
  const counts = {};
  for (const q of questions) counts[q.year] = (counts[q.year] || 0) + 1;
  console.log("==> Imported:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
