# 1. Moving-average cost and immutable restocks

Status: accepted (2026-10)

## Context

Restocks usually arrive at a different buy price than the stock still on the shelf. The shop owner needs a profit figure that is right on average, not a per-batch ledger.

## Decision

- Product cost is a moving weighted average: `new_cost = (stock × cost + qty × price) / (stock + qty)`. If stock is 0 or cost is null, the new cost is the purchase price. It is computed in one SQL `UPDATE` under the row lock, never read-modify-write in JS.
- Restock and purchase records are immutable: no edit, no delete.
- Corrections go through a stock adjustment (`EXPIRED`, `DAMAGED`, `LOST`, `CORRECTION`, notes required for the last two) or a cost correction (reason required, written to price history and the audit log).
- Every stock movement stores `unit_cost` at the time, so loss value can be computed later without guessing.
- Each sale item stores its own cost, so a cost correction only affects the future.

## Consequences

- Mistakes are visible in the audit trail instead of silently overwritten.
- Data entry errors cost an extra step (a correction) rather than an edit.
- FIFO costing is not available; profit per batch cannot be reported.
