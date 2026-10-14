-- CreateTable
CREATE TABLE "price_history" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "old_price" DECIMAL(12,2) NOT NULL,
    "new_price" DECIMAL(12,2) NOT NULL,
    "changed_by" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "price_history_product_id_idx" ON "price_history"("product_id");

-- CreateIndex
CREATE INDEX "price_history_created_at_idx" ON "price_history"("created_at");

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
