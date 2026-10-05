-- Additive migration: retain category for older readers and writers.
ALTER TABLE "Theme" ADD COLUMN "categories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
UPDATE "Theme" SET "categories" = ARRAY["category"];
CREATE INDEX "Theme_categories_idx" ON "Theme" USING GIN ("categories");
