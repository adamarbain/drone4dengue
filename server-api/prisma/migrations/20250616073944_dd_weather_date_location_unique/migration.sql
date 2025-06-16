/*
  Warnings:

  - A unique constraint covering the columns `[date,location]` on the table `Weather` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Weather_date_location_key" ON "Weather"("date", "location");
