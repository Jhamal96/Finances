# Money Strategy & Insights — Phase 1 (development only)

Status: technical preparation. No production deployment or database migration.

## Verified architecture
- Repository: Jhamal96/Finances; default branch main.
- Cloudflare Worker: finances; static assets served from public/ per wrangler.toml.
- Supabase project: vxpufrahrnwmtgltjstd.
- Authenticated account data: public.household_user_data(user_id uuid, payload jsonb, updated_at timestamptz).
- Profiles: public.finance_profiles(user_id uuid, username text, created_at timestamptz).
- Legacy public.household_data(id text, payload jsonb, updated_at timestamptz) exists. **Do not treat this legacy row as the authenticated household source or migrate it automatically.**
- README explicitly states accounts have independent data; shared multi-account household access is not implemented yet.
- Current app is primarily a static HTML/JS application with Supabase JS CDN and installable PWA assets.

## Guardrails
1. Do not change existing user IDs, account login, RLS, records, or legacy data.
2. Do not expose a user's records to another account. 'His/Her/Combined' are display categories within the currently authorized dataset, not multi-account authorization.
3. No production deploy, no migrations against the live Supabase project, and no merges into main.
4. Preserve existing public/index.html, index.html, manifest, service worker, and download/install flows.
5. Read-only computations must not write to household_user_data; do not mutate payload references.
6. No automatic financial action, bank sync, notifications, or AI service calls in Phase 1.

## Phase 1 implementation sequence
1. Inspect full current public/index.html for state initialization, authentication, category and month structures, and navigation. Compare root index.html with public/index.html to avoid divergence.
2. Implement a pure, tested financial-data adapter that accepts only authorized loaded account payload and emits normalized income, expense, allocations, due dates, and category summaries. Handle missing values, negative/refund amounts, recurring charges, and payment-plan double counting.
3. Add an opt-in Money Strategy view with personal His/Her/Combined filters, spending by category, date range, budget variance, and safe-to-spend estimate; show data completeness/assumptions.
4. Implement privacy preferences in UI as **local display preferences only** until a server-side membership and category-authorization model exists. Never imply local filtering is security. Do not implement cross-account sharing.
5. Add deterministic, read-only recommendation previews; all recommendations remain drafts requiring manual approval. No existing budget or payment changes.
6. Write automated tests with synthetic fixtures for reconciliation, privacy behavior, empty datasets, date boundaries, and pay-in-4 obligations.
7. Run static checks, browser smoke tests, and login/refresh/PWA regression tests in an isolated test environment before requesting production release approval.

## Unresolved before coding
- Confirm actual shape of authenticated payload using safe key/type-only inspection (never disclose transaction values).
- Audit RLS policy expressions on household_user_data and finance_profiles; do not change them without a separate reviewed migration.
- Confirm Cloudflare route/custom domain and whether build triggers deploy from non-main branches.
- Determine how to represent genuine separate personal accounts in future household membership; current data is per-user.
- Confirm whether budget categories are per-person or shared, and how income is represented.

## Acceptance criteria
- Existing account records and totals remain unchanged.
- Only authorized account payload is analyzed; no cross-account access.
- Strategy page shows correct category/month totals from synthetic tests.
- No automatic writes or notifications.
- No deployment to production.
