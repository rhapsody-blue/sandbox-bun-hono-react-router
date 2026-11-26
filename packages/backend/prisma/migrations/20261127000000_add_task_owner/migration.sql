ALTER TABLE "tasks" ADD COLUMN "ownerId" TEXT;

UPDATE "tasks"
SET "ownerId" = 'legacy-unassigned'
WHERE "ownerId" IS NULL;

ALTER TABLE "tasks" ALTER COLUMN "ownerId" SET NOT NULL;
