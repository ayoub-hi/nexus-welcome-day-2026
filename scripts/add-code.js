// Usage:
//   node scripts/add-code.js <points> [label]
//   node scripts/add-code.js 20 "Instagram story challenge"
//
// Generates a random, non-guessable code and prints it - give that exact
// string out on whichever platform the challenge lives on.
const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

const prisma = new PrismaClient();

// Excludes visually ambiguous characters (0/O, 1/I/L) since these get typed
// in by hand off a phone screen.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateCode(prefix = "NX") {
  const bytes = crypto.randomBytes(8);
  let suffix = "";
  for (const b of bytes) {
    suffix += ALPHABET[b % ALPHABET.length];
  }
  return `${prefix}-${suffix}`;
}

async function main() {
  const points = Number(process.argv[2]);
  const label = process.argv[3] || null;

  if (!Number.isInteger(points) || points <= 0) {
    console.error("Usage: node scripts/add-code.js <points> [label]");
    process.exit(1);
  }

  const code = generateCode();

  await prisma.bonusCode.create({
    data: { code, points, label },
  });

  console.log(`==> Created code: ${code}  (${points} pts${label ? `, "${label}"` : ""})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
