-- Add discordMessageId to Application so we can edit the webhook message on status change
ALTER TABLE "Application" ADD COLUMN "discordMessageId" TEXT;

-- Singleton table that tracks the pinned 30-day status report message ID
CREATE TABLE "DiscordStatusReport" (
    "id"        TEXT NOT NULL DEFAULT 'singleton',
    "messageId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DiscordStatusReport_pkey" PRIMARY KEY ("id")
);
