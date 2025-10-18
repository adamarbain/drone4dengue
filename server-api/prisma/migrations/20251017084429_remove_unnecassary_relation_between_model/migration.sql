/*
  Warnings:

  - You are about to drop the column `companyId` on the `Alert` table. All the data in the column will be lost.
  - You are about to drop the column `companyLocationId` on the `DengueData` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `Recommendation` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Alert" DROP CONSTRAINT "Alert_companyId_fkey";

-- DropForeignKey
ALTER TABLE "DengueData" DROP CONSTRAINT "DengueData_companyLocationId_fkey";

-- DropForeignKey
ALTER TABLE "Recommendation" DROP CONSTRAINT "Recommendation_companyId_fkey";

-- AlterTable
ALTER TABLE "Alert" DROP COLUMN "companyId";

-- AlterTable
ALTER TABLE "DengueData" DROP COLUMN "companyLocationId";

-- AlterTable
ALTER TABLE "Recommendation" DROP COLUMN "companyId";
