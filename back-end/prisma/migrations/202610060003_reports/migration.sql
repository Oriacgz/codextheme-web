CREATE TABLE "ThemeReport" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "themeId" TEXT NOT NULL, "reason" TEXT NOT NULL, "resolved" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ThemeReport_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "ThemeReport_userId_themeId_key" ON "ThemeReport"("userId","themeId");
CREATE INDEX "ThemeReport_resolved_createdAt_idx" ON "ThemeReport"("resolved","createdAt");
