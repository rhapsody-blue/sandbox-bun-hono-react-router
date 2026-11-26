DELETE FROM "casbin_rule" duplicate
USING "casbin_rule" canonical
WHERE duplicate."id" > canonical."id"
  AND duplicate."ptype" = 'p'
  AND canonical."ptype" = 'p'
  AND duplicate."v0" IS NOT DISTINCT FROM canonical."v0"
  AND duplicate."v1" IS NOT DISTINCT FROM canonical."v1"
  AND duplicate."v2" IS NOT DISTINCT FROM canonical."v2"
  AND duplicate."v3" IS NOT DISTINCT FROM canonical."v3"
  AND duplicate."v4" IS NOT DISTINCT FROM canonical."v4"
  AND duplicate."v5" IS NOT DISTINCT FROM canonical."v5";
