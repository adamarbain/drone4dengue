/*
  Warnings:

  - Added the required column `companyId` to the `Image` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Image" ADD COLUMN     "companyId" TEXT NOT NULL,
ADD COLUMN     "companyLocationId" TEXT;

-- CreateIndex
CREATE INDEX "Image_companyId_idx" ON "Image"("companyId");

-- CreateIndex
CREATE INDEX "Image_companyLocationId_idx" ON "Image"("companyLocationId");

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_companyLocationId_fkey" FOREIGN KEY ("companyLocationId") REFERENCES "CompanyLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
