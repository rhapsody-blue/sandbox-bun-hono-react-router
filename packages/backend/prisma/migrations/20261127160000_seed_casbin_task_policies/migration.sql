INSERT INTO "casbin_rule" ("ptype", "v0", "v1", "v2", "v3", "v4")
VALUES
    ('p', 'user', 'task', 'create', 'owner', 'allow'),
    ('p', 'user', 'task', 'list', 'owner', 'allow'),
    ('p', 'user', 'task', 'read', 'owner', 'allow'),
    ('p', 'user', 'task', 'update', 'owner', 'allow'),
    ('p', 'user', 'task', 'delete', 'owner', 'allow'),
    ('p', 'admin', 'task', '*', 'any', 'allow');
