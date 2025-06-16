/*
  Warnings:

  - You are about to drop the column `data` on the `Weather` table. All the data in the column will be lost.
  - Added the required column `date` to the `Weather` table without a default value. This is not possible if the table is not empty.
  - Added the required column `humidity` to the `Weather` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rainfall` to the `Weather` table without a default value. This is not possible if the table is not empty.
  - Added the required column `temperature` to the `Weather` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Weather` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Weather" DROP COLUMN "data",
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "humidity" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "rainfall" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "temperature" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
