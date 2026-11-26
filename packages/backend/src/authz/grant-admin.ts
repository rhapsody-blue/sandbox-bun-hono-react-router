import { prisma } from '../lib/prisma';
import { grantAdminRole } from './authorization';

const subject = process.env.CASBIN_SUBJECT?.trim();

if (!subject) {
  throw new Error('CASBIN_SUBJECT must be set to a Keycloak subject ID');
}

try {
  const granted = await grantAdminRole(subject);
  console.info(
    granted
      ? 'Admin role granted to the configured subject'
      : 'Subject already has the admin role',
  );
} finally {
  await prisma.$disconnect();
}
