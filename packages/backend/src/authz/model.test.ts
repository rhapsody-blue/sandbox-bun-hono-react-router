import { describe, expect, it } from 'bun:test';
import { newEnforcer, newModelFromString, StringAdapter } from 'casbin';
import { CASBIN_MODEL, DEFAULT_POLICIES } from './model';

const policyText = [
  ...DEFAULT_POLICIES.map((policy) => `p, ${policy.join(', ')}`),
  'g, user-1, user',
  'g, admin-1, admin',
].join('\n');

async function createEnforcer() {
  return newEnforcer(
    newModelFromString(CASBIN_MODEL),
    new StringAdapter(policyText),
  );
}

describe('Casbin task policy model', () => {
  it('allows a user to create and manage owned tasks', async () => {
    const enforcer = await createEnforcer();
    const task = { type: 'task', ownerId: 'user-1' };

    expect(await enforcer.enforce('user-1', task, 'create')).toBe(true);
    expect(await enforcer.enforce('user-1', task, 'read')).toBe(true);
    expect(await enforcer.enforce('user-1', task, 'update')).toBe(true);
    expect(await enforcer.enforce('user-1', task, 'delete')).toBe(true);
  });

  it('denies access to another user task', async () => {
    const enforcer = await createEnforcer();

    expect(
      await enforcer.enforce(
        'user-1',
        { type: 'task', ownerId: 'user-2' },
        'read',
      ),
    ).toBe(false);
  });

  it('limits user task lists to their own resources', async () => {
    const enforcer = await createEnforcer();

    expect(
      await enforcer.enforce(
        'user-1',
        { type: 'task', ownerId: 'user-1' },
        'list',
      ),
    ).toBe(true);
    expect(await enforcer.enforce('user-1', { type: 'task' }, 'list')).toBe(
      false,
    );
  });

  it('allows admins to access tasks they do not own', async () => {
    const enforcer = await createEnforcer();

    expect(
      await enforcer.enforce(
        'admin-1',
        { type: 'task', ownerId: 'user-2' },
        'delete',
      ),
    ).toBe(true);
    expect(await enforcer.enforce('admin-1', { type: 'task' }, 'list')).toBe(
      true,
    );
  });
});
