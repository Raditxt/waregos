/*
  Warnings:

  - You are about to drop the column `customer_id` on the `debt_transactions` table. All the data in the column will be lost.
  - You are about to drop the `customers` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `customer_name` to the `debt_transactions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "debt_transactions" DROP CONSTRAINT "debt_transactions_customer_id_fkey";

-- DropIndex
DROP INDEX "debt_transactions_customer_id_idx";

-- AlterTable
ALTER TABLE "debt_transactions" DROP COLUMN "customer_id",
ADD COLUMN     "customer_name" TEXT NOT NULL,
ADD COLUMN     "items" JSONB;

-- DropTable
DROP TABLE "customers";

-- CreateIndex
CREATE INDEX "debt_transactions_customer_name_idx" ON "debt_transactions"("customer_name");
