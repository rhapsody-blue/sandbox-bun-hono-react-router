export const CASBIN_MODEL = `
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act, scope, eft

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub) && (p.obj == "*" || r.obj.type == p.obj) && (p.act == "*" || r.act == p.act) && (p.scope == "any" || (p.scope == "owner" && r.obj.ownerId == r.sub))
`;

export const DEFAULT_POLICIES = [
  ['user', 'task', 'create', 'owner', 'allow'],
  ['user', 'task', 'list', 'owner', 'allow'],
  ['user', 'task', 'read', 'owner', 'allow'],
  ['user', 'task', 'update', 'owner', 'allow'],
  ['user', 'task', 'delete', 'owner', 'allow'],
  ['admin', 'task', '*', 'any', 'allow'],
] as const;
