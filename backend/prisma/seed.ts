import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Hash bcrypt precalculado para el password: "Password123!"
// Hashed con 10 rounds
const DEFAULT_PASSWORD_HASH = '$2b$10$QJIjJ0yKaaT6D6s.LA4nxuuOTXW.jpLwW2cIJbKHXNQdfcVuPj4yq';

async function main() {
  console.log('🌱 Iniciando la siembra de la base de datos (seeding)...');

  // 1. Limpiar base de datos en orden inverso de dependencias
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.reminder.deleteMany({});
  await prisma.invitation.deleteMany({});
  await prisma.eventResourceReservation.deleteMany({});
  await prisma.eventParticipant.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.eventHistory.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.calendar.deleteMany({});
  await prisma.resource.deleteMany({});
  await prisma.resourceCategory.deleteMany({});
  await prisma.userPreferences.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.area.deleteMany({});
  await prisma.role.deleteMany({});

  console.log('🧹 Base de datos limpiada correctamente.');

  // 2. Crear Roles y definir Permisos en formato JSON
  const rolesData = [
    {
      name: 'SUPER_ADMIN',
      description: 'Super Administrador con acceso absoluto al sistema.',
      permissions: JSON.stringify({
        users: ['create', 'read', 'update', 'delete'],
        areas: ['create', 'read', 'update', 'delete'],
        calendars: ['create', 'read', 'update', 'delete'],
        events: ['create', 'read', 'update', 'delete', 'approve'],
        resources: ['create', 'read', 'update', 'delete', 'reserve', 'approve_reservation'],
        reports: ['read', 'export'],
        audit: ['read'],
        settings: ['read', 'update'],
      }),
    },
    {
      name: 'ADMIN',
      description: 'Administrador del sistema.',
      permissions: JSON.stringify({
        users: ['create', 'read', 'update', 'delete'],
        areas: ['create', 'read', 'update', 'delete'],
        calendars: ['create', 'read', 'update', 'delete'],
        events: ['create', 'read', 'update', 'delete', 'approve'],
        resources: ['create', 'read', 'update', 'delete', 'reserve', 'approve_reservation'],
        reports: ['read', 'export'],
        audit: [],
        settings: ['read', 'update'],
      }),
    },
    {
      name: 'DIRECTOR',
      description: 'Director Institucional.',
      permissions: JSON.stringify({
        users: ['read'],
        areas: ['read'],
        calendars: ['create', 'read', 'update', 'delete'],
        events: ['create', 'read', 'update', 'delete', 'approve'],
        resources: ['read', 'reserve', 'approve_reservation'],
        reports: ['read', 'export'],
        audit: [],
        settings: ['read'],
      }),
    },
    {
      name: 'JEFE_AREA',
      description: 'Jefe o Responsable de un Área Departamental.',
      permissions: JSON.stringify({
        users: ['read'],
        areas: ['read'],
        calendars: ['create', 'read', 'update', 'delete'],
        events: ['create', 'read', 'update', 'delete', 'approve'],
        resources: ['read', 'reserve', 'approve_reservation'],
        reports: ['read'],
        audit: [],
        settings: ['read'],
      }),
    },
    {
      name: 'COORDINADOR',
      description: 'Coordinador operativo de eventos.',
      permissions: JSON.stringify({
        users: [],
        areas: ['read'],
        calendars: ['create', 'read', 'update'],
        events: ['create', 'read', 'update', 'delete'],
        resources: ['read', 'reserve'],
        reports: ['read'],
        audit: [],
        settings: [],
      }),
    },
    {
      name: 'USUARIO',
      description: 'Usuario institucional estándar.',
      permissions: JSON.stringify({
        users: [],
        areas: ['read'],
        calendars: ['create', 'read'],
        events: ['create', 'read'], // Crear eventos requiere aprobación
        resources: ['read', 'reserve'], // Reservar requiere aprobación
        reports: [],
        audit: [],
        settings: [],
      }),
    },
    {
      name: 'SOLO_LECTURA',
      description: 'Acceso exclusivo de lectura para consultas externas.',
      permissions: JSON.stringify({
        users: [],
        areas: ['read'],
        calendars: ['read'],
        events: ['read'],
        resources: ['read'],
        reports: [],
        audit: [],
        settings: [],
      }),
    },
  ];

  const roles: Record<string, any> = {};
  for (const r of rolesData) {
    roles[r.name] = await prisma.role.create({ data: r });
  }
  console.log('✅ Roles creados.');

  // 3. Crear Áreas Específicas
  const subAreasData = [
    { name: 'Dirección de Campus', color: '#1E3A8A' }, // Azul Oscuro
    { name: 'DGA', color: '#10B981' }, // Verde
    { name: 'Servicios Universitarios', color: '#F59E0B' }, // Ámbar
    { name: 'Gestión del Desarrollo Humano', color: '#EC4899' }, // Rosado
    { name: 'Laboratorios de CCSS', color: '#84CC16' }, // Lima
    { name: 'Empleabilidad', color: '#3B82F6' }, // Azul
    { name: 'Laboratorios Especializados', color: '#8B5CF6' }, // Morado
    { name: 'Imagen Institucional', color: '#F43F5E' }, // Rojo
  ];

  const areas: Record<string, any> = {};
  for (const sa of subAreasData) {
    areas[sa.name] = await prisma.area.create({ data: sa });
  }
  console.log('✅ Áreas creadas.');

  // 4. Crear Usuarios iniciales
  const usersData = [
    {
      email: 'gsam@utp.edu.pe',
      name: 'Gabby Sam (Coord SSUU)',
      roleId: roles['JEFE_AREA'].id,
      areaId: areas['Servicios Universitarios'].id,
    },
    {
      email: 'rarboleda@utp.edu.pe',
      name: 'Rodolfo Arboleda (DC)',
      roleId: roles['DIRECTOR'].id,
      areaId: areas['Dirección de Campus'].id,
    },
    {
      email: 'cnunez@utp.edu.pe',
      name: 'Claudia Nuñez (DGA)',
      roleId: roles['DIRECTOR'].id,
      areaId: areas['DGA'].id,
    },
    {
      email: 'mrodriguez@utp.edu.pe',
      name: 'Morelia Rodriguez (GDH)',
      roleId: roles['JEFE_AREA'].id,
      areaId: areas['Gestión del Desarrollo Humano'].id,
    },
    {
      email: 'karista@utp.edu.pe',
      name: 'Katty Arista (Jefa de Lab CCSS)',
      roleId: roles['JEFE_AREA'].id,
      areaId: areas['Laboratorios de CCSS'].id,
    },
    {
      email: 'rsandoval@utp.edu.pe',
      name: 'Rosalinda Sandoval (Asistente DC)',
      roleId: roles['USUARIO'].id,
      areaId: areas['Dirección de Campus'].id,
    },
    {
      email: 'jpanduro@utp.edu.pe',
      name: 'Jeannina Panduro (Coord. Empleabilidad)',
      roleId: roles['JEFE_AREA'].id,
      areaId: areas['Empleabilidad'].id,
    },
    {
      email: 'lsotil@utp.edu.pe',
      name: 'Luz Sotil (Coord Lab Especializados)',
      roleId: roles['JEFE_AREA'].id,
      areaId: areas['Laboratorios Especializados'].id,
    },
    {
      email: 'cmorales@utp.edu.pe',
      name: 'Camila Morales (Asistente de Imagen)',
      roleId: roles['USUARIO'].id,
      areaId: areas['Imagen Institucional'].id,
    },
    {
      email: 'admin@utp.edu.pe',
      name: 'Administrador del Sistema',
      roleId: roles['SUPER_ADMIN'].id,
      areaId: areas['Dirección de Campus'].id,
    }
  ];

  for (const u of usersData) {
    const user = await prisma.user.create({
      data: {
        email: u.email,
        name: u.name,
        passwordHash: DEFAULT_PASSWORD_HASH,
        roleId: u.roleId,
        areaId: u.areaId,
        status: 'ACTIVE',
      },
    });

    // Crear preferencias por defecto
    await prisma.userPreferences.create({
      data: {
        userId: user.id,
        theme: 'light',
        language: 'es',
        calendarSettings: JSON.stringify({
          defaultView: 'month',
          weekends: true,
        }),
      },
    });

    // Crear calendario personal por defecto
    await prisma.calendar.create({
      data: {
        name: `Calendario de ${user.name}`,
        type: 'USER',
        ownerUserId: user.id,
        color: '#10B981',
      },
    });
  }
  console.log('✅ Usuarios creados con calendarios personales y preferencias.');

  // Crear calendarios de área
  for (const areaName of Object.keys(areas)) {
    const area = areas[areaName];
    await prisma.calendar.create({
      data: {
        name: `Calendario de ${area.name}`,
        type: 'AREA',
        ownerAreaId: area.id,
        color: area.color,
      },
    });
  }
  console.log('✅ Calendarios de área creados.');

  // Crear calendario institucional y global
  await prisma.calendar.create({
    data: {
      name: 'Calendario Institucional',
      type: 'INSTITUTIONAL',
      color: '#3B82F6',
    },
  });
  await prisma.calendar.create({
    data: {
      name: 'Feriados y Efemérides',
      type: 'GLOBAL',
      color: '#EF4444',
    },
  });
  console.log('✅ Calendarios Institucional y Global creados.');

  // 5. Crear Categorías de Recursos y Recursos
  const catSala = await prisma.resourceCategory.create({
    data: { name: 'Salas de Reuniones', type: 'ROOM', description: 'Salas y auditorios de la institución' },
  });
  const catVehiculo = await prisma.resourceCategory.create({
    data: { name: 'Vehículos', type: 'VEHICLE', description: 'Camionetas y vans institucionales' },
  });
  const catEquipo = await prisma.resourceCategory.create({
    data: { name: 'Equipos Tecnológicos', type: 'EQUIPMENT', description: 'Proyectores, laptops y sonido' },
  });

  const recursosData = [
    { name: 'Auditorio Principal UTP', categoryId: catSala.id, capacity: 150, status: 'AVAILABLE', areaId: areas['Dirección de Campus'].id },
    { name: 'Sala de Juntas B', categoryId: catSala.id, capacity: 15, status: 'AVAILABLE', areaId: areas['Dirección de Campus'].id },
    { name: 'Camioneta Toyota Hilux', categoryId: catVehiculo.id, capacity: 5, status: 'AVAILABLE', areaId: areas['Servicios Universitarios'].id },
    { name: 'Proyector Epson UltraHD', categoryId: catEquipo.id, status: 'AVAILABLE', areaId: areas['Laboratorios Especializados'].id },
  ];

  for (const r of recursosData) {
    await prisma.resource.create({
      data: {
        name: r.name,
        categoryId: r.categoryId,
        capacity: r.capacity,
        status: r.status,
        areaId: r.areaId,
        metadata: JSON.stringify({}),
      },
    });
  }
  console.log('✅ Recursos y categorías creados.');

  console.log('🌱 ¡Siembra de base de datos (seeding) completada con éxito!');
}

main()
  .catch((e) => {
    console.error('❌ Error en el proceso de seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
