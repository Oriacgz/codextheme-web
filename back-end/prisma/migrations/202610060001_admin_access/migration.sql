ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
UPDATE "User" SET "mustChangePassword" = true WHERE "email" LIKE 'starter-admin-%@codextheme.invalid';
CREATE TABLE "AdminAudit" ("id" TEXT NOT NULL, "actorId" TEXT NOT NULL, "targetId" TEXT, "action" TEXT NOT NULL, "reason" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AdminAudit_pkey" PRIMARY KEY ("id"));
CREATE INDEX "AdminAudit_createdAt_idx" ON "AdminAudit"("createdAt");
