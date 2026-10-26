-- CreateEnum
CREATE TYPE "PurchaseKind" AS ENUM ('PURCHASE', 'OPENING');

-- CreateEnum
CREATE TYPE "StockAdjustmentReason" AS ENUM ('EXPIRED', 'DAMAGED', 'LOST', 'CORRECTION');

-- AlterTable
ALTER TABLE "purchase_items" ADD COLUMN     "expiry_date" DATE;

-- AlterTable
ALTER TABLE "purchases" ADD COLUMN     "kind" "PurchaseKind" NOT NULL DEFAULT 'PURCHASE',
ADD COLUMN     "supplier_ref" TEXT;

-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN     "reason" "StockAdjustmentReason",
ADD COLUMN     "unit_cost" DECIMAL(12,2);
