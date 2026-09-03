import { prisma } from "../src/lib/prisma";

async function main() {
  const inst = await prisma.institute.findFirst({ select: { name: true, settings: true } });
  console.log("Institute:", inst?.name);
  console.log("Settings:", JSON.stringify(inst?.settings, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);
