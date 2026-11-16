# Money Strategy & Insights — approved product requirements (2026-11-15)

Status: planning specification on development branch only. No deployment, live database change, or production notification enabled.

## Agreed functionality
- Read existing authorized account financial records; preserve legacy and authenticated payloads, accounts, and permissions. Never count an installment both as a bill and as a separate outflow.
- Personal views (His/Her) and combined view; genuine cross-login household sharing is BLOCKED until server-enforced membership, permissions, and explicit invitations exist. Per-category privacy must be enforced server-side before shared account access.
- Track bills, pay-in-4, subscriptions, payment plans, recurring expenses, income, allocations, savings and wallets in a unified obligation timeline. Each obligation has scheduled, reserved, partially paid, paid, and overdue states; expected versus actual payment dates and reconciled transactions.
- Virtual practice wallet and monitored real-account balance, plus two personal wallets and a shared household wallet. Virtual allocations never claim to move real funds. Internal transfers must not be treated as income/expense. Unused allowance asks every cycle whether to roll over, save, reset allowance, or split; reset must not erase real money or transaction history.
- Recurrence: weekly chosen weekday, biweekly every other chosen weekday anchored to start date, monthly by date or ordinal weekday (e.g. second Friday), twice monthly, custom intervals. Default keep original scheduled day on weekends/holidays; optionally previous/next business day or occurrence override. Handle timezone, DST, missing fifth weekdays, month-end, holiday calendar and 53-week years deterministically.
- Smart paycheck allocation suggests amounts for upcoming obligations, installments, savings, spending, and cushion; adjustable priorities and reusable templates; only applies virtual allocations after manual approval. Expected paychecks are not confirmed funds.
- Shared-wallet contributions may be unequal, manual, income-proportional, or blended. Each person must separately approve their own amount. Any adjusted/declined split triggers new suggested split and reapproval of affected commitments. Never increase a person's contribution without their approval. Reject unaffordable plans or flag shortfalls.
- Financial calendar: paydays, bills, installments, wallets, savings, individual and authorized combined views, projected balances and safe-to-spend. Projection assumptions visible.
- Risk alerts default on, customizable per person/payment/channel/time/interval. Critical, warning, information; snooze until tomorrow, review, open payment; keep critical issues visible even when snoozed. Resolve on confirmed payment; do not expose private amounts through shared notifications.
- Daily check-in on first dashboard open each day by default; configurable every open, manual, off. Display upcoming, overdue, risk, wallet and safe-to-spend, with dismissal and manual reopen.
- Weekly review period Saturday–Friday by default, customizable start day; Saturday morning 9 AM Eastern notification preference and first-open review, independently toggleable. Week-over-week comparisons, budget versus actual, payment completion, wallet activity, savings, explain one-offs and avoid calling under-budget spending 'saved' unless actually retained/allocated.
- Monthly and yearly comparisons with interactive charts for category spending, income, cash flow, pay-in-4, debt, savings and trends. Custom time ranges and personal/combined filters. Missing data must be labeled rather than inferred as zero.
- Financial Health Score optional/off by default. Rules-based suggestions, evidence, assumptions, and manual approval. No automated transfers.

## Implementation phases and gates
P1: audit authorized payload and navigation; pure normalized read-only adapter; spending reports, obligations and pay-in-4 reconciliation, date/recurrence engine, safe-to-spend calculation, basic calendar, synthetic unit tests.
P2: virtual wallet ledger, individual/shared wallet UI, allocation suggestions, approvals, rebalancing; first implement secure household membership and RLS before cross-account shared actions. No automatic money movement.
P3: risk alerts, daily/weekly reviews, monthly/yearly charts, historical snapshots and forecasting; verify notification permission and background delivery.
P4: optional read-only banking connection with consent, duplicate reconciliation and disconnect controls; no provider chosen yet.

## Acceptance and safety
- All changes restricted to feature/money-strategy-phase1; no merge to main, no Cloudflare deploy, no live Supabase migrations.
- Never alter or expose existing records, authentication, account boundaries or private categories.
- Calculate safe-to-spend from confirmed funds minus unpaid committed obligations and reserved allocations, avoiding double subtraction of settled transactions and wallet transfers. Display any missing/incomplete data warnings.
- Test weekly/biweekly/monthly recurrence, holidays, due-date overrides, partial payments, duplicate installments, refunds, insufficient funds, both-person approval races, privacy enforcement, notification snooze and weekly/monthly/year boundaries.
- Review app's existing bill calendar and pay-in-4 tracker before implementing duplicate features.
