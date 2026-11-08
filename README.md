# DompetKu

[English](README.md) · [Bahasa Indonesia](README.id.md)

A personal finance tracker built on Laravel 13, React 19, Inertia, PostgreSQL, and a double-entry ledger.

## Features

- Income, expenses, transfers, and custom transaction dates.
- **Edit transactions** — change amount, category, fund source, date, or flip income↔expense; journal lines are deleted and rewritten within a single DB transaction.
- **Formatted Rupiah input** — type `10000000` and see `10.000.000`; shorthand `10k` → 10,000; quick chips Rp10k–Rp100k.
- Dashboard for this month, last month, or the last three months.
- **Cash left vs consumable left** — savings deposits reduce cash balance but are not counted as consumption. Both views are shown side by side.
- **Recurring income vs bonus** — non-recurring transactions (bonus/THR) still enter the balance and cash flow, but never inflate the monthly budget baseline: monthly leftover, the 50/30/20 ratios, and category percentages are always computed from recurring salary. Bonuses are displayed separately on the Dashboard and Reports.
- **Interactive reports** — the Income/Expense/Net flow cards are clickable: breakdown per category (amount + percentage), and each category opens further into its transaction list. Date ranges use a custom calendar.
- Net worth, period balance, and current liquid balance.
- Custom fund sources and categories, isolated per user.
- **Categorized buckets** — every category is tagged Essentials / Lifestyle / Savings; this drives how the automatic advice judges spending.
- Savings goals, receivables, loans, and partial payments.
- **External savings deposits** — e.g. a spouse contributes; the fund source balance is untouched while the goal grows; per-goal movement history records who and from where.
- Receivables reduce the fund source when issued and restore it when repaid.
- **Reports with native SVG donut charts** — income allocation (categories + leftover = 100%); percentages are always relative to income, never to total expenses.
- **Automatic advice** based on the 50/30/20 rule (Warren & Tyagi, *All Your Worth*, 2005): savings ratio ≥20%, essentials ≤50%, lifestyle ≤30%, emergency fund of 3–6× monthly expenses. Essential categories are never advised to be cut.
- **Multi-sheet Excel export** including a flat `Analisis` sheet for AI parsing.
- Indonesian/English language and light/dark/system theme.
- Mobile-first layout with off-canvas sidebar, adaptive forms, and 44 px touch targets.
- Authentication, profile avatar, passkeys, and 2FA.
- Installable PWA with offline fallback and mobile-first navigation.

## Running locally

The recommended local database is PostgreSQL 17 to match production. PostgreSQL and Redis run via Docker, while PHP can be served by Laravel Herd.

```bash
docker compose -f compose.local.yml up -d
composer install
npm install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
npm run build
composer run dev
```

Copy the `DB_*` values from `.env.example` (matching `compose.local.yml`) into `.env`. The demo account created by the seeder and its credentials are listed in [`database/seeders/DatabaseSeeder.php`](database/seeders/DatabaseSeeder.php) — all of its data is fictional.

For a demo without Docker, set `DB_CONNECTION=sqlite`, clear the other `DB_*` variables, create `database/database.sqlite`, then run the migrations.

## Quality checks

```bash
php artisan test
npm run check
npm run types:check
npm run build
```

The UI should be verified at widths 320, 375, 768, 1024, and 1280 px, in both light and dark modes.

## Deploying to a VPS

```bash
cp .env.production.example .env.production
# Fill in APP_KEY, URL, PostgreSQL password, Redis password, and mail provider.
docker compose --env-file .env.production -f compose.production.yml build
docker compose --env-file .env.production -f compose.production.yml run --rm app php artisan migrate --force
docker compose --env-file .env.production -f compose.production.yml up -d
```

The `app` image already contains PHP/vendor/frontend build and the `web` image contains the public assets, so deploys do not depend on the host's `vendor`, `node_modules`, or `public/build`. Set up TLS on the reverse proxy and schedule PostgreSQL backups before going live.

Technical decision details are available in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## License

Released under the [MIT License](LICENSE).
