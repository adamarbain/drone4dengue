-- AlterTable
ALTER TABLE "Drone" ADD COLUMN     "companyLocationId" TEXT;

-- CreateIndex
CREATE INDEX "Drone_companyLocationId_idx" ON "Drone"("companyLocationId");

-- AddForeignKey
ALTER TABLE "Drone" ADD CONSTRAINT "Drone_companyLocationId_fkey" FOREIGN KEY ("companyLocationId") REFERENCES "CompanyLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
