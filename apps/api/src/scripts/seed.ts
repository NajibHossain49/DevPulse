import { PrismaService } from "../prisma/prisma.service";

async function seed() {
  const prisma = new PrismaService();

  try {
    console.log("Seed script for DevPulse");
    console.log("Instructions:");
    console.log("1. Login via web app to create a user");
    console.log("2. Create a team via POST /teams");
    console.log("3. Create a project via POST /projects");
    console.log("4. Trigger sync via POST /github/sync");
    console.log("5. Run AI analysis via POST /ai/batch-analyze");
  } finally {
    await prisma.$disconnect();
  }
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
