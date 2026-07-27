ALTER TABLE "User" ADD COLUMN "supabaseUserId" TEXT;

ALTER TABLE "FindingEvidence" ADD COLUMN "storageProvider" TEXT;
ALTER TABLE "FindingEvidence" ADD COLUMN "storageBucket" TEXT;
ALTER TABLE "FindingEvidence" ADD COLUMN "storagePath" TEXT;
ALTER TABLE "FindingEvidence" ADD COLUMN "storageContentType" TEXT;
ALTER TABLE "FindingEvidence" ADD COLUMN "storageSizeBytes" INTEGER;

CREATE UNIQUE INDEX "User_supabaseUserId_key" ON "User"("supabaseUserId");
CREATE INDEX "FindingEvidence_storageBucket_storagePath_idx" ON "FindingEvidence"("storageBucket", "storagePath");
