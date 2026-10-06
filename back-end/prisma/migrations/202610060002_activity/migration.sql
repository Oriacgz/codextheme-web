CREATE TABLE "ActivityDaily" ("day" TEXT NOT NULL, "themeId" TEXT NOT NULL, "kind" TEXT NOT NULL, "count" INTEGER NOT NULL DEFAULT 0, CONSTRAINT "ActivityDaily_pkey" PRIMARY KEY ("day","themeId","kind"));
CREATE INDEX "ActivityDaily_day_idx" ON "ActivityDaily"("day");
CREATE TABLE "ActivitySeen" ("key" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ActivitySeen_pkey" PRIMARY KEY ("key"));
CREATE INDEX "ActivitySeen_expiresAt_idx" ON "ActivitySeen"("expiresAt");
