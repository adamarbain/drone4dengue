/*
  Warnings:

  - Added the required column `companyLocationId` to the `CompanyPrediction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CompanyPrediction" ADD COLUMN     "companyLocationId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "CompanyPrediction_companyLocationId_idx" ON "CompanyPrediction"("companyLocationId");

-- AddForeignKey
ALTER TABLE "CompanyPrediction" ADD CONSTRAINT "CompanyPrediction_companyLocationId_fkey" FOREIGN KEY ("companyLocationId") REFERENCES "CompanyLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
