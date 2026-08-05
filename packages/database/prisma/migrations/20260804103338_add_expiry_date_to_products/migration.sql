-- AlterTable
ALTER TABLE "products" ADD COLUMN     "expiry_alert_days" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "expiry_date" TIMESTAMP(3);
