import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEFAULT_PASSWORD_HASH = '$2b$10$QJIjJ0yKaaT6D6s.LA4nxuuOTXW.jpLwW2cIJbKHXNQdfcVuPj4yq'; // "Password123!"

async function main() {
  const role = await prisma.role.findFirst({ where: { name: 'JEFE_AREA' } });
  if (!role) throw new Error("No role found");

  // Verificar si el área ya existe para no duplicarla
  let area = await prisma.area.findFirst({ where: { name: 'Coordinadoras de Operaciones' }});
  if (!area) {
    area = await prisma.area.create({
      data: {
        name: 'Coordinadoras de Operaciones',
        color: '#06B6D4' // Cyan
      }
    });
  }

  // User 1
  const user1Exists = await prisma.user.findUnique({ where: { email: 'tdiaz@utp.edu.pe' }});
  if (!user1Exists) {
    await prisma.user.create({
      data: {
        name: 'Teresa Díaz',
        email: 'tdiaz@utp.edu.pe',
        passwordHash: DEFAULT_PASSWORD_HASH,
        status: 'ACTIVE',
        roleId: role.id,
        areaId: area.id,
      }
    });
  }

  // User 2
  const user2Exists = await prisma.user.findUnique({ where: { email: 'ldasilva@utp.edu.pe' }});
  if (!user2Exists) {
    await prisma.user.create({
      data: {
        name: 'Lilian Da Silva',
        email: 'ldasilva@utp.edu.pe',
        passwordHash: DEFAULT_PASSWORD_HASH,
        status: 'ACTIVE',
        roleId: role.id,
        areaId: area.id,
      }
    });
  }

  console.log("¡Teresa Díaz y Lilian Da Silva creadas exitosamente!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
