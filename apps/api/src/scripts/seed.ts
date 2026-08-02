import "dotenv/config";
import { PrismaClient } from "@devpulse/database";

const prisma = new PrismaClient();

async function seed() {
  console.log("Seeding default subscriptions...");

  const teams = await prisma.team.findMany({
    where: { subscription: null },
  });

  for (const team of teams) {
    await prisma.subscription.create({
      data: {
        teamId: team.id,
        plan: "free",
        status: "active",
      },
    });
    console.log(`Created free subscription for team: ${team.name}`);
  }

  console.log(`Seed complete! (${teams.length} team(s) updated)`);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
