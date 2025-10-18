-- CreateTable
CREATE TABLE "CompanyPrediction" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL,
    "model1Score" DOUBLE PRECISION,
    "model2Score" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictionLog" (
    "id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "userId" TEXT,
    "riskScore" DOUBLE PRECISION,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PredictionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyPrediction_companyId_idx" ON "CompanyPrediction"("companyId");

-- CreateIndex
CREATE INDEX "CompanyPrediction_createdAt_idx" ON "CompanyPrediction"("createdAt");

-- CreateIndex
CREATE INDEX "PredictionLog_requestedAt_idx" ON "PredictionLog"("requestedAt");

-- CreateIndex
CREATE INDEX "PredictionLog_userId_idx" ON "PredictionLog"("userId");

-- AddForeignKey
ALTER TABLE "CompanyPrediction" ADD CONSTRAINT "CompanyPrediction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
