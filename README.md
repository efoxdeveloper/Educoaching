# Vidyalaya — Coaching Institute Admin Dashboard

A full-stack admin dashboard for coaching institutes, built with Next.js 14 (App Router), PostgreSQL (via Prisma), Tailwind CSS, and NextAuth authentication.

## Stack

- **Next.js 14** (App Router, Server Components)
- **PostgreSQL** via **Prisma ORM**
- **Tailwind CSS** with a custom "Scholar Blue / Marigold" design system
- **NextAuth v5** (credentials-based auth, JWT sessions)
- **Recharts** for the dashboard charts
- **Lucide React** for icons

## Modules implemented

1. **Dashboard** — Total students, active batches, today's attendance %, pending fees, today's collection, collection trend chart, attendance trend chart, recent payments, recent registrations.
2. **Student Management** — Searchable/filterable student table (name, mobile, course, batch, fee status, admission date, status), Add Student drawer.
3. **Batch Management** — Batch cards with course, faculty, timing, live occupancy ring, Add Batch drawer.
4. **Attendance** — Batch + date picker, present/absent/late toggles per student, live attendance % ring, saves to database.
5. **Fee / Collection** — Fee table with status badges (Paid / Partial / Pending / Overdue), Record Payment drawer that updates the student's paid amount and creates a payment record.

## 1. Install dependencies

```bash
npm install
```

## 2. Configure your database

The `.env` file is already populated with the connection string you provided:

```
DATABASE_URL="postgresql://demo_user:YourStrongPassword123!@164.52.203.52:5432/demo?schema=public"
```

If you'd rather use the second database (`demo2`) or your own Postgres instance, just edit `.env`.

**Security note:** the `.env` file contains a live database password. Don't commit it to a public repo — `.gitignore` already excludes it, but double-check before pushing. Consider rotating this password since it was shared in plain text.

## 3. Push the schema to your database

Creates all tables (`User`, `Course`, `Faculty`, `Batch`, `Student`, `Attendance`, `Payment`):

```bash
npm run db:push
```

## 4. Seed demo data

Creates a login user, 5 courses, 5 faculty, 10 batches, 60 students, payment history, and 14 days of attendance records:

```bash
npm run db:seed
```

## 5. Run the app

```bash
npm run dev
```

Visit **http://localhost:3000** — you'll be redirected to `/login`.

### Demo login

```
Email:    owner@vidyalaya.test
Password: password123
```

## Project structure

```
src/
  app/
    login/                    → Login page
    dashboard/                → Module 1
    students/                 → Module 2
    batches/                  → Module 3
    attendance/                → Module 4
    fees/                      → Module 5
    api/
      auth/[...nextauth]/      → NextAuth handler
      students/                 → Student CRUD (GET/POST)
      batches/                  → Batch CRUD (GET/POST)
      attendance/                → Attendance GET / bulk upsert
      payments/                  → Record payment (POST)
  components/
    layout/                    → Sidebar, Topbar, Shell
    ui/                        → Card, Badge, ProgressRing, Drawer, Field
    dashboard/, students/, batches/, attendance/, fees/
  lib/
    auth.ts                    → NextAuth config
    prisma.ts                  → Prisma client singleton
    dashboard-data.ts           → Dashboard aggregation queries
    fee.ts                      → Fee status computation
    utils.ts                    → Formatting helpers
prisma/
  schema.prisma                → Database schema
  seed.ts                       → Demo data seeder
```

## Design notes

- Palette: **Scholar Blue** (`#1E3A5F`) as the primary/sidebar color, **Marigold** (`#E8A33D`) as the accent for collection-related UI.
- Typography: **Sora** for headings/display, **Inter** for body and tabular data.
- Signature element: a reusable **progress ring** used for attendance %, batch occupancy, and fee-collection health — since percentages are what an institute owner checks daily.

## A note on this build

Prisma's engine binaries couldn't be downloaded in the sandbox this was built in (restricted network), so `npx prisma generate` and a full production build haven't been run against your live database yet. Everything follows standard, well-tested Next.js 14 / Prisma / NextAuth v5 patterns, but run through steps 1–5 above locally and let me know if anything errors — happy to fix it live.

## Payment gateway (Razorpay)

Both **Record Payment** and **Renew** drawers now have a "Pay Online via Razorpay" button alongside the manual cash/UPI entry.

### Setup

1. Sign up free at https://dashboard.razorpay.com/signup
2. Go to **Settings → API Keys** and generate a **Test Mode** key pair
3. Paste them into `.env`:
   ```
   RAZORPAY_KEY_ID="rzp_test_xxxxxxxxxxxx"
   RAZORPAY_KEY_SECRET="xxxxxxxxxxxxxxxxxxxx"
   NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_test_xxxxxxxxxxxx"
   ```
4. Restart `npm run dev`.

### Testing payments

Razorpay's test mode never charges real money. Use:
- **Card:** `4111 1111 1111 1111`, any future expiry, any CVV
- **UPI:** `success@razorpay` (always succeeds) or `failure@razorpay` (always fails)

### How it works

1. Frontend calls `/api/payments/create-order` → creates a Razorpay order server-side.
2. Razorpay's checkout modal opens (loaded via their `checkout.js` script).
3. On success, the frontend calls `/api/payments/verify`, which recomputes the HMAC-SHA256 signature using your `RAZORPAY_KEY_SECRET` and compares it to what Razorpay sent — this confirms the payment wasn't spoofed client-side.
4. Once verified, it records a `Payment` (fee) or `Renewal` (subscription) row exactly like the manual flow, so both paths stay consistent.

Without valid keys configured, "Pay Online" will show a clear error rather than failing silently — the manual recording option keeps working either way.

## Next steps you may want

- Edit/delete actions on students, batches, and payments (currently create + list only, per the original scope).
- Role-based permissions (the schema already has `OWNER` / `ADMIN` / `STAFF` roles, but routes don't yet check role).
- CSV export for fee reports and attendance.
- Deploy to Vercel — add `DATABASE_URL`, `AUTH_SECRET` (generate with `openssl rand -base64 32`), and `NEXTAUTH_URL` as environment variables.
