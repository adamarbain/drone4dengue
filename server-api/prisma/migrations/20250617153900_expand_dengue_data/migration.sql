/*
  Warnings:

  - You are about to drop the column `cases` on the `DengueData` table. All the data in the column will be lost.
  - Added the required column `activeCases` to the `DengueData` table without a default value. This is not possible if the table is not empty.
  - Added the required column `coverageArea` to the `DengueData` table without a default value. This is not possible if the table is not empty.
  - Added the required column `source` to the `DengueData` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `DengueData` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalCases` to the `DengueData` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `DengueData` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DengueData" DROP COLUMN "cases",
ADD COLUMN     "activeCases" INTEGER NOT NULL,
ADD COLUMN     "coverageArea" TEXT NOT NULL,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "source" TEXT NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL,
ADD COLUMN     "totalCases" INTEGER NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
