/*
  Warnings:

  - You are about to drop the column `companyId` on the `DengueData` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `Weather` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[date,location,companyLocationId]` on the table `Weather` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `companyLocationId` to the `DengueData` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyLocationId` to the `Weather` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "DengueData" DROP CONSTRAINT "DengueData_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Weather" DROP CONSTRAINT "Weather_companyId_fkey";

-- DropIndex
DROP INDEX "Weather_date_location_companyId_key";

-- AlterTable
ALTER TABLE "DengueData" DROP COLUMN "companyId",
ADD COLUMN     "companyLocationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Weather" DROP COLUMN "companyId",
ADD COLUMN     "companyLocationId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "CompanyLocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "CompanyLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyLocation_name_companyId_key" ON "CompanyLocation"("name", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Weather_date_location_companyLocationId_key" ON "Weather"("date", "location", "companyLocationId");

-- AddForeignKey
ALTER TABLE "CompanyLocation" ADD CONSTRAINT "CompanyLocation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Weather" ADD CONSTRAINT "Weather_companyLocationId_fkey" FOREIGN KEY ("companyLocationId") REFERENCES "CompanyLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DengueData" ADD CONSTRAINT "DengueData_companyLocationId_fkey" FOREIGN KEY ("companyLocationId") REFERENCES "CompanyLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
