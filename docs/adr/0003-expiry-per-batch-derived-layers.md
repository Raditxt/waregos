# 3. Expiry per batch, layers derived at read time

Status: accepted (2026-10)

## Context

New stock often has a different expiry than stock already on the shelf, and some packaging shows only month and year.

## Decision

- Expiry is stored per purchase line (`purchase_items.expiry_date`). `YYYY-MM` is stored as the last day of that month.
- There is no batch table. Layers are computed when reading: current stock is allocated to purchase lines newest-first (the oldest goods are assumed sold first). Stock not covered by any line is reported as `untracked`, never guessed.
- Warnings are per layer (`expired`, `expiring_soon`), so one product can appear twice in the expiring list.
- `products.expiry_date` is only a fallback for legacy data.

## Consequences

- The sales path needs no batch logic and layers can never drift from stock.
- Layers are an estimate: if the cashier sells a newer item first, the allocation is off until stock is written off or recounted.
- Writing off expired stock removes the oldest layer, which keeps the most important case correct.
