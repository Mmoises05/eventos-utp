import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      area: true,
      role: true,
    }
  });

  // CSV Header (Using semicolon for Excel compatibility in Spanish locales)
  let csvContent = "Nombre;Correo;Area;Rol;Estado\n";

  for (const u of users) {
    csvContent += `"${u.name}";"${u.email}";"${u.area.name}";"${u.role.name}";"${u.status}"\n`;
  }

  const outputPath = path.join(__dirname, '..', '..', 'Usuarios_UTP_Calendar.csv');
  fs.writeFileSync(outputPath, csvContent, 'utf8');

  console.log(`Archivo CSV generado exitosamente en: ${outputPath}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
