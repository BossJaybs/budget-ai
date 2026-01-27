import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create permissions
  const permissions = [
    { name: 'manage_users', description: 'Can manage user accounts' },
    { name: 'view_all_transactions', description: 'Can view all users transactions' },
    { name: 'manage_permissions', description: 'Can manage permissions and roles' },
    { name: 'view_admin_dashboard', description: 'Can access admin dashboard' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }

  // Assign all permissions to ADMIN role
  const adminPermissions = await prisma.permission.findMany();
  for (const perm of adminPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        role_permissionId: {
          role: 'ADMIN',
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        role: 'ADMIN',
        permissionId: perm.id,
      },
    });
  }

  console.log('Permissions seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });