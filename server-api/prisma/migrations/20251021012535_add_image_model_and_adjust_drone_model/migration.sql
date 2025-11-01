/*
  Warnings:

  - A unique constraint covering the columns `[droneId]` on the table `Drone` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `droneId` to the `Drone` table without a default value. This is not possible if the table is not empty.
  - Added the required column `model` to the `Drone` table without a default value. This is not possible if the table is not empty.
  - Added the required column `operationalArea` to the `Drone` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Drone` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileSize` to the `Image` table without a default value. This is not possible if the table is not empty.
  - Added the required column `filename` to the `Image` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mimeType` to the `Image` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Image` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Drone" ADD COLUMN     "droneId" TEXT NOT NULL,
ADD COLUMN     "model" TEXT NOT NULL,
ADD COLUMN     "operationalArea" TEXT NOT NULL,
ADD COLUMN     "registrationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'Operational',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Image" ADD COLUMN     "description" TEXT,
ADD COLUMN     "fileSize" INTEGER NOT NULL,
ADD COLUMN     "filename" TEXT NOT NULL,
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "isProcessed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mimeType" TEXT NOT NULL,
ADD COLUMN     "sourceType" TEXT NOT NULL DEFAULT 'upload',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "width" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Drone_droneId_key" ON "Drone"("droneId");

-- CreateIndex
CREATE INDEX "Drone_companyId_idx" ON "Drone"("companyId");

-- CreateIndex
CREATE INDEX "Drone_status_idx" ON "Drone"("status");

-- CreateIndex
CREATE INDEX "Drone_droneId_idx" ON "Drone"("droneId");

-- CreateIndex
CREATE INDEX "Image_droneId_idx" ON "Image"("droneId");

-- CreateIndex
CREATE INDEX "Image_isProcessed_idx" ON "Image"("isProcessed");

-- CreateIndex
CREATE INDEX "Image_sourceType_idx" ON "Image"("sourceType");
