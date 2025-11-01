-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "boardOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Job_userId_status_boardOrder_idx" ON "Job"("userId", "status", "boardOrder");
