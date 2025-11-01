-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "advancedSettings" JSONB,
ADD COLUMN     "alertFrequency" TEXT NOT NULL DEFAULT 'immediate',
ADD COLUMN     "alertThreshold" TEXT NOT NULL DEFAULT 'medium',
ADD COLUMN     "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "predictionModelParameters" JSONB,
ADD COLUMN     "smsNotifications" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "syncMode" TEXT NOT NULL DEFAULT 'automatic';
