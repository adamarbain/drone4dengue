-- DropForeignKey
ALTER TABLE "CompanyPrediction" DROP CONSTRAINT "CompanyPrediction_companyLocationId_fkey";

-- AlterTable
ALTER TABLE "CompanyPrediction" ALTER COLUMN "companyLocationId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "CompanyPrediction" ADD CONSTRAINT "CompanyPrediction_companyLocationId_fkey" FOREIGN KEY ("companyLocationId") REFERENCES "CompanyLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
