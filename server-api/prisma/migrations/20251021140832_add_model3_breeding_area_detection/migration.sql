-- AlterTable
ALTER TABLE "CompanyPrediction" ADD COLUMN     "combinedScore" DOUBLE PRECISION,
ADD COLUMN     "model3Score" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "BreedingAreaDetection" (
    "id" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "companyLocationId" TEXT,
    "breedingAreaScore" DOUBLE PRECISION NOT NULL,
    "detectedObjects" JSONB,
    "boundingBoxes" JSONB,
    "riskLevel" TEXT NOT NULL,
    "processingStatus" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BreedingAreaDetection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BreedingAreaDetection_imageId_idx" ON "BreedingAreaDetection"("imageId");

-- CreateIndex
CREATE INDEX "BreedingAreaDetection_companyId_idx" ON "BreedingAreaDetection"("companyId");

-- CreateIndex
CREATE INDEX "BreedingAreaDetection_companyLocationId_idx" ON "BreedingAreaDetection"("companyLocationId");

-- CreateIndex
CREATE INDEX "BreedingAreaDetection_processingStatus_idx" ON "BreedingAreaDetection"("processingStatus");

-- CreateIndex
CREATE INDEX "BreedingAreaDetection_riskLevel_idx" ON "BreedingAreaDetection"("riskLevel");

-- AddForeignKey
ALTER TABLE "BreedingAreaDetection" ADD CONSTRAINT "BreedingAreaDetection_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreedingAreaDetection" ADD CONSTRAINT "BreedingAreaDetection_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreedingAreaDetection" ADD CONSTRAINT "BreedingAreaDetection_companyLocationId_fkey" FOREIGN KEY ("companyLocationId") REFERENCES "CompanyLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
