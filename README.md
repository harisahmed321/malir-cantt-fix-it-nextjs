# Malir Cantt Fix It

A responsive service-management web application for discovering local providers, requesting bookings, and operating the platform through a role-based admin portal.

## Stack

- Next.js 16 App Router
- React 19 and TypeScript
- Tailwind CSS 4
- Supabase PostgreSQL, Auth, Storage, RLS, and future Realtime workflows
- Vercel deployment target

## Local setup

```bash
npm install
npm run dev
```

Create `.env.local` from `.env.example` and set `DATABASE_URL`. Keep database credentials server-side and never use `NEXT_PUBLIC_` for private values.

## Admin login

Open the admin portal at:

```text
http://localhost:3000/admin
```

The login page is:

```text
http://localhost:3000/admin/login
```

Create this administrator in Supabase Dashboard under **Authentication → Users → Add user**:

```text
Username/email: admin@malircanttfixit.com
Temporary password: MalirAdmin#2026K9vQ2
```

Enable **Auto Confirm User** when creating the account. The email must match `ADMIN_EMAIL` in `.env.local`:

```env
ADMIN_EMAIL="admin@malircanttfixit.com"
```

This credential is for local development only. Change the password immediately and never commit production credentials to this README or the repository.

## Database

Schema changes are versioned in `supabase/migrations/`. Apply them with the Supabase CLI or SQL editor:

```bash
supabase db push
```

The initial migration creates normalized tables for profiles, roles, permissions, customers, categories, providers, provider services and locations, documents, bookings, booking history, subscriptions, payments, feedback tokens, feedback, notifications, audit logs, and platform settings. It also enables RLS and seeds platform categories and RBAC defaults.

For the complete development marketplace data set, run `supabase/seed.sql` in the Supabase SQL Editor. It is repeatable and includes providers, multiple services per provider, locations, plans, subscriptions, verified payment history, bookings in multiple statuses, pending requests, feedback, documents, notifications, audit events, and demo settings. Mock customer names are stored on anonymous bookings until real Supabase Auth customer accounts are created.

## Current routes

- `/` customer-facing starting point
- `/admin` operations status portal
- `/admin/login` administrator sign-in
- `/admin/providers` provider approval workspace
- `/admin/customers` customer management
- `/admin/bookings` booking operations
- `/admin/services` service category management
- `/admin/subscriptions` subscription and payment management
- `/admin/feedback` feedback moderation
- `/admin/reports` analytics and exports
- `/api/health` server-side database endpoint reachability check

## Architecture decisions

- Public browsing does not require authentication.
- Booking requests may be anonymous, but authenticated customers can link bookings to their account.
- Provider visibility requires the `active` status.
- Payment amounts never imply payment received until a payment record is verified.
- Provider/customer authorization is enforced in Supabase RLS, not only in the UI.
- API route contracts are designed to be reusable by a future React Native client.
