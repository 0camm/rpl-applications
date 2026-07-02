-- Simplify the application form down to Roblox username + Discord username.
-- Drops fullName, discordId, age, timezone and adds robloxUsername.

ALTER TABLE "Application" ADD COLUMN "robloxUsername" TEXT;

-- Backfill existing rows so the column can be made NOT NULL.
-- (Old applications have no Roblox username on file; use a placeholder.)
UPDATE "Application" SET "robloxUsername" = 'unknown' WHERE "robloxUsername" IS NULL;

ALTER TABLE "Application" ALTER COLUMN "robloxUsername" SET NOT NULL;

ALTER TABLE "Application" DROP COLUMN "fullName";
ALTER TABLE "Application" DROP COLUMN "discordId";
ALTER TABLE "Application" DROP COLUMN "age";
ALTER TABLE "Application" DROP COLUMN "timezone";
