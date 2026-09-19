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
    await prisma.question.createMany({ data: questions });
    console.log(`==> Seeded ${questions.length} questions.`);
  }

  const osintPath = path.join(__dirname, "osint-challenges.json");
  const osintChallenges = JSON.parse(fs.readFileSync(osintPath, "utf-8")).map((c) => ({
    ...c,
    answers: JSON.stringify(c.answers),
  }));

  const existingOsintCount = await prisma.osintChallenge.count();
  if (existingOsintCount > 0) {
    console.log(`==> OsintChallenge table already has ${existingOsintCount} rows, skipping seed.`);
  } else {
    await prisma.osintChallenge.createMany({ data: osintChallenges });
    console.log(`==> Seeded ${osintChallenges.length} OSINT challenges.`);
    console.log('    Remember to replace the placeholder "REPLACE ME" content before the event!');
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
