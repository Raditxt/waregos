-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "credit_limit" DECIMAL(12,2) NOT NULL DEFAULT 100000,
    "total_debt" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debt_transactions" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "transaction_id" TEXT,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "debt_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customers_name_idx" ON "customers"("name");

-- CreateIndex
CREATE INDEX "debt_transactions_customer_id_idx" ON "debt_transactions"("customer_id");

-- CreateIndex
CREATE INDEX "debt_transactions_created_at_idx" ON "debt_transactions"("created_at");

-- AddForeignKey
ALTER TABLE "debt_transactions" ADD CONSTRAINT "debt_transactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_transactions" ADD CONSTRAINT "debt_transactions_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_transactions" ADD CONSTRAINT "debt_transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
