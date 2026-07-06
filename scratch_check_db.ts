import { prisma } from "./src/lib/db";

async function main() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
      }
    });
    console.log("USERS:", JSON.stringify(users, null, 2));
  } catch (error) {
    console.error("DB QUERY ERROR:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
