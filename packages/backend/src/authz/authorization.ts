import { type Enforcer, newEnforcer, newModelFromString } from 'casbin';
import { PrismaAdapter } from 'casbin-prisma-adapter';
import { prisma } from '../lib/prisma';
import { CASBIN_MODEL } from './model';

export type AuthorizationResource = {
  type: 'task';
  ownerId?: string;
};

export type AuthorizationAction =
  | 'create'
  | 'list'
  | 'read'
  | 'update'
  | 'delete';

let enforcerPromise: Promise<Enforcer> | undefined;

async function initializeEnforcer() {
  const adapter = await PrismaAdapter.newAdapter(prisma);
  const enforcer = await newEnforcer(newModelFromString(CASBIN_MODEL), adapter);
  return enforcer;
}

function getEnforcer() {
  if (!enforcerPromise) {
    enforcerPromise = initializeEnforcer().catch((error: unknown) => {
      enforcerPromise = undefined;
      throw error;
    });
  }

  return enforcerPromise;
}

async function ensureUserRole(enforcer: Enforcer, subject: string) {
  const roles = await enforcer.getRolesForUser(subject);
  if (roles.length === 0) {
    await enforcer.addGroupingPolicy(subject, 'user');
  }
}

export async function canAccess(
  subject: string,
  resource: AuthorizationResource,
  action: AuthorizationAction,
) {
  const enforcer = await getEnforcer();
  await ensureUserRole(enforcer, subject);
  return enforcer.enforce(subject, resource, action);
}

export async function grantAdminRole(subject: string) {
  const enforcer = await getEnforcer();
  if (await enforcer.hasGroupingPolicy(subject, 'admin')) {
    return false;
  }

  await enforcer.addGroupingPolicy(subject, 'admin');
  return true;
}
