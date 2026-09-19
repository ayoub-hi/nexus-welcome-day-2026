// Usage:
//   node scripts/set-admin.js someone@example.com          -> grants admin
//   node scripts/set-admin.js someone@example.com --revoke -> revokes admin
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const revoke = process.argv.includes("--revoke");

  if (!email) {
    console.error("Usage: node scripts/set-admin.js <email> [--revoke]");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) {
    console.error(`No user found with email ${email}. They need to sign up first.`);
    process.exit(1);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { isAdmin: !revoke },
  });

  console.log(`${updated.email} is now ${updated.isAdmin ? "an admin" : "NOT an admin"}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
