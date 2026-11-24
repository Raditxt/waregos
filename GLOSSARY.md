# Glossary

Domain terms used in Waregos. The UI and API messages use the Indonesian term; code uses the identifier in brackets. Use these words in tickets, ADRs and code reviews, and avoid the synonyms listed.

## People and access

**Admin** (`ADMIN`). The shop owner role. Sees everything, including cost and profit.

**Kasir / Cashier** (`CASHIER`). Runs the POS. Never sees cost data: buy price, unit cost, per-product profit. Whether cashiers may see daily profit is an open decision.

## Catalog

**Produk / Product.** A sellable item with a sell price, a minimum stock (`minStock`) and an expiry alert window (`expiryAlertDays`). Stock is not edited on the product; see *Stock movement*.

**Kategori / Category**, **Satuan / Unit** (`pcs`, `btl`, `bks`, ...). Catalog lookups. Box/pcs packaging is post-v1.

## Buying and stock

**Pembelian / Purchase** (`Purchase`, `kind = PURCHASE`). Goods bought from a supplier. Counts as spending. Immutable: never edited or deleted. Avoid "restock record edit".

**Saldo Awal / Opening stock** (`kind = OPENING`). Goods already on the shelf when the system starts, entered once on cutover day through the Purchases screen. Sets stock and cost like a purchase but is **not** spending (ADR 0002).

**Harga pokok / Unit cost** (`buyPrice`, `unitCost`). The moving weighted average cost of a product, recomputed on every purchase (ADR 0001). Each sale item keeps the cost at the time of sale.

**Koreksi stok / Stock adjustment** (`StockAdjustmentReason`: `EXPIRED`, `DAMAGED`, `LOST`, `CORRECTION`). The only way to fix stock outside purchases and sales. Notes are required for `LOST` and `CORRECTION`. "Write-off" means an adjustment with `EXPIRED` or `DAMAGED`.

**Koreksi biaya / Cost correction.** Changes a product's unit cost with a required reason; written to price history and the audit log. Affects future sales only.

**Stock movement** (`StockMovement`: `PURCHASE_IN`, `SALE_OUT`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`, `RETURN_IN`). One row per stock change, with stock before and after.

**Batch / Layer.** Stock attributed to one purchase line, with that line's expiry date. There is no batch table: layers are derived at read time, newest-first (ADR 0003). Stock not covered by any line is **untracked**.

## Alerts

**Stok menipis / Low stock.** Stock at or below `minStock`.

**Mendekati kedaluwarsa / Near expiry** (`expiring_soon`), **Kedaluwarsa / Expired** (`expired`). Per layer, using the product's `expiryAlertDays` (default 7). One product can appear more than once.

**Dead stock.** Active product with stock that has not sold for 30 days or more: `warning` from 30 days, `critical` from 60 days, `never_sold` if it never sold.

## Selling

**Transaksi / Transaction.** One POS sale with an invoice number. Payment method `CASH`, `TRANSFER`, `QRIS` (confirmed by hand) or `DEBT`. Cancelling keeps the record (`CANCELLED`) and returns the stock.

**Hutang / Customer debt** (`DebtTransaction`). An append-only ledger per customer, keyed by the normalized, case-insensitive name. Entry types: `DEBT` (+), `PAYMENT` (−), `CANCEL` (−, reversing entry). The balance is their signed sum. Avoid "edit debt".

**Closing harian / Daily closing.** End-of-day summary per payment method, used to match physical cash against the system. Days follow shop time (WITA, UTC+8).

## Operations

**Cutover.** The switch from Railway + Supabase to the VPS, and the day opening stock is entered.

**Uji paralel / Parallel run.** System and paper notebook side by side for 1–2 weeks after cutover. v1 is done when it passes.

**Restore drill.** Restoring a real backup on the laptop to prove backups work. A gate for cutover (ADR 0007).
