# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Today: one owner (Andre) tracking personal and household money in Indonesia, in IDR. Planned: open sign-up so other individuals with the same need can use it, each with their own isolated data. Usage is split evenly between quick capture on a phone right after spending and periodic review (weekly/monthly) on desktop.

## Product Purpose

DompetKu ("my wallet") is a personal money ledger: record income, expenses, transfers between wallets/accounts, savings goals, money lent to others (kasbon) and money borrowed (pinjaman), then see where money went and how healthy the month is. Success: logging takes seconds, balances are always trustworthy, and the monthly picture is readable at a glance.

## Positioning

Double-entry ledger under a casual consumer surface: every movement posts balanced journal lines, so wallet, savings, receivable and loan balances are derived, never typed in. Salary (recurring) and bonus income are separated so the monthly budget is judged against regular income only. Insights follow the 50/30/20 rule and a 3–6 month emergency fund benchmark.

## Operating Context

- Phone: one-handed entry right after a purchase, often outdoors; installable as a PWA, served from a VPS over HTTPS. Data lives on the server, not the device.
- Desktop: reviewing monthly reports, category drilldowns, exporting to Excel.
- Wallet types: cash, bank, e-wallet, prepaid, other.

## Capabilities and Constraints

- Stack: Laravel 13, Inertia v3, React 19, Tailwind 4, PostgreSQL. Existing routes, ledger posting rules and calculations are the source of truth and must not change behavior; queries may be optimized only if numbers stay identical.
- Features: dashboard (period current/previous/3 months), transactions (income/expense CRUD, transfer, filters by month/range/type/category), fund sources, categories with bucket (essential/lifestyle/saving), savings goals with deposits/withdrawals (incl. external contributions), kasbon (receivables) with payments, loans payable with payments, reports with monthly trend and category drilldown, Excel export, auth with 2FA and passkeys, appearance (light/dark/system).
- Bilingual: Indonesian default, English translation via `t()`.
- Currency: IDR, stored as integer minor units (rupiah, no decimals).

## Brand Commitments

- Name: DompetKu.
- Voice: casual Jakarta Indonesian, "lo/gua" register (e.g. "uang lo"). Short, friendly, never preachy.
- No logo commitment; a new minimalist mark is welcome.

## Evidence on Hand

Real data only inside the app. The public welcome page may show illustrative numbers only when labeled as examples. No testimonials, user counts, or press exist; do not invent them.

## Product Principles

1. Capture first: recording a transaction is the fastest path from any screen.
2. Balances must be trustworthy; never show a number the ledger cannot explain.
3. One glance answers "am I okay this month?".
4. Same product on phone and desktop, each laid out for its hands.

## Accessibility & Inclusion

44px touch targets, visible focus, income/expense distinguished by sign and icon as well as color, reduced-motion respected, WCAG AA contrast in light and dark.
