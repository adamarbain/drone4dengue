/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "otpCode" TEXT,
ADD COLUMN     "otpExpiry" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
