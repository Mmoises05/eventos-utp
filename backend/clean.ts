import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.eventParticipant.deleteMany();
  await prisma.eventResourceReservation.deleteMany();
  await prisma.eventHistory.deleteMany();
  await prisma.event.deleteMany();
  console.log('All events deleted.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
