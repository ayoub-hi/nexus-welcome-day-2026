const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function main() {
  const questionsPath = path.join(__dirname, "questions.json");
  const questions = JSON.parse(fs.readFileSync(questionsPath, "utf-8"));

  const existingCount = await prisma.question.count();
  if (existingCount > 0) {
    console.log(`==> Question table already has ${existingCount} rows, skipping seed.`);
    console.log("    (delete rows or the dev.db file first if you want to reseed)");
  } else {
    await prisma.question.createMany({
      data: questions.map((q) => ({ ...q, year: q.year || "all" })),
    });
    console.log(`==> Seeded ${questions.length} questions.`);
  }

  const bonusCodesPath = path.join(__dirname, "bonus-codes.json");
  const bonusCodes = JSON.parse(fs.readFileSync(bonusCodesPath, "utf-8"));

  const existingCodesCount = await prisma.bonusCode.count();
  if (existingCodesCount > 0) {
    console.log(`==> BonusCode table already has ${existingCodesCount} rows, skipping seed.`);
  } else {
    await prisma.bonusCode.createMany({ data: bonusCodes });
    console.log(`==> Seeded ${bonusCodes.length} bonus codes.`);
    console.log('    Remember to replace the placeholder "REPLACE ME" labels, or add your own via npm run code:add.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
