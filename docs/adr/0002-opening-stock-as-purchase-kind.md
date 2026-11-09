# 2. Opening stock as a purchase kind

Status: accepted (2026-10)

## Context

The shop already has goods on the shelf when the system starts. Recording them as purchases would count them as spending. Typing a stock number into the product form leaves no audit trail and no expiry.

## Decision

- `purchases.kind` is `PURCHASE` (real spending) or `OPENING` (opening stock).
- Opening stock is entered once, on cutover day, through the Purchases screen ("Saldo Awal"), with expiry per batch. It sets stock and cost like a purchase but is excluded from spending totals.
- Opening stock takes no supplier, supplier reference or purchase date.
- The product form no longer has a stock field; stock only changes through purchases, opening stock, sales and adjustments.

## Consequences

- Any future "money spent on stock" report must filter `kind = PURCHASE`.
- Goods sold before cutover must not be recorded later as opening stock, or stock will double.
