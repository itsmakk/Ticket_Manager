# Chhatrapati Shivaji Maharaj Auditorium — Ticket Booking & Management System

> Version 1.0.4 — A full-featured event ticket booking and management platform built on Supabase (Edge Functions + PostgreSQL) with a static frontend and Razorpay payment integration.

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Folder Structure](#folder-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Admin Panel](#admin-panel)
- [License](#license)

---

## Architecture

```
User Browser
     │
     ▼
┌─────────────────┐       ┌──────────────────────────────┐
│  Static Frontend │ ───►  │  Supabase Edge Functions     │
│  (HTML/CSS/JS)   │ ◄───  │  (Deno / TypeScript)         │
│  Nginx / Docker  │       │                              │
└─────────────────┘       └──────────┬───────────────────┘
                                     │
                                     ▼
                            ┌──────────────────┐
                            │  PostgreSQL DB   │
                            │  + PostgREST API │
                            └──────────────────┘

Payment Flow:  Frontend → Razorpay SDK → verify-payment Edge Function → DB
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Static HTML, CSS, JavaScript (Vanilla) |
| **Backend** | Supabase Edge Functions (Deno / TypeScript) |
| **Database** | PostgreSQL (via Supabase) + PostgREST |
| **Auth** | Supabase Auth (JWT, Row Level Security) |
| **Payments** | Razorpay (test mode) |
| **Emails** | Resend API |
| **Hosting** | Docker / Cloudflare Pages / Supabase |
| **CI/CD** | GitHub Actions |

---

## Folder Structure

```
Ticket_Manager_deepseek/
│
├── backend/
│   └── functions/                    # Edge Functions source
│       ├── _shared/                  # Shared utilities (CORS, auth, seat-layout, etc.)
│       │   ├── supabase.ts
│       │   ├── booking-cutoff.ts
│       │   ├── cancel-booking.ts
│       │   ├── email.ts
│       │   ├── maintenance.ts
│       │   ├── payment-reconciliation.ts
│       │   ├── resource-authorization.ts
│       │   ├── booking-authorization.ts
│       │   ├── seat-layout.ts
│       │   └── show-seats.ts
│       ├── admin-query/              # Unified admin CRUD endpoint
│       ├── get-events/               # Public event listing
│       ├── get-shows/                # Public show listing per event
│       ├── get-seat-map/             # Seat map for a show
│       ├── get-bookings/             # User bookings
│       ├── get-ticket/               # Single ticket lookup
│       ├── get-profile/              # User profile
│       ├── update-profile/           # Update profile
│       ├── lock-seats/               # Lock seats during booking
│       ├── release-seats/            # Release expired locks
│       ├── create-razorpay-order/    # Create payment order
│       ├── verify-payment/           # Verify Razorpay payment
│       └── cancel-booking/           # Cancel booking flow
│
├── database/
│   └── migrations/                   # PostgreSQL schema migrations (17 files)
│       ├── 001_initial_schema.sql
│       ├── 002_functions.sql
│       ├── 003_fix_rls_recursion.sql
│       ├── ...
│       └── 017_drop_row_number_from_show_seats.sql
│
├── frontend/
│   ├── index.html                    # Home page (hero carousel, now showing, upcoming)
│   ├── events.html                   # All events listing
│   ├── event-detail.html             # Single event with show selection
│   ├── booking.html                  # Seat selection + payment flow
│   ├── ticket.html                   # Ticket view
│   ├── login.html                    # Login
│   ├── register.html                 # Register
│   ├── forgot-password.html          # Password reset
│   ├── profile.html                  # User profile & booking history
│   ├── favicon.svg
│   │
│   ├── css/
│   │   └── style.css                 # Global styles (1325 lines)
│   │
│   ├── js/
│   │   ├── config.js                 # Supabase URL, anon key, Razorpay key
│   │   ├── api.js                    # API layer — all calls through Edge Functions
│   │   ├── auth.js                   # Auth (login/register/logout, role-based UI)
│   │   ├── events.js                 # Homepage + events page logic
│   │   ├── booking.js                # Seat selection + payment
│   │   ├── ticket.js                 # Ticket display
│   │   ├── profile.js                # Profile page
│   │   ├── dark-mode.js              # Dark mode toggle
│   │   └── qrcode.min.js             # QR code library
│   │
│   ├── images/
│   │   ├── Sail.jpg                  # Hero carousel slide 1
│   │   ├── ship.jpg                  # Hero carousel slide 2
│   │   └── Sea.jpg                   # Hero carousel slide 3
│   │
│   ├── admin/                        # Admin panel
│   │   ├── index.html                # Dashboard (stats, recent bookings)
│   │   ├── events.html               # Manage events (CRUD)
│   │   ├── shows.html                # Manage shows (CRUD, filter by event)
│   │   ├── seats.html                # Auditorium seat layout
│   │   ├── bookings.html             # All bookings (list, cancel)
│   │   ├── users.html                # User management
│   │   ├── promocodes.html           # Promo codes (CRUD)
│   │   ├── reports.html              # Revenue reports
│   │   ├── counter.html              # Counter booking (offline sales)
│   │   ├── audit.html                # Audit log
│   │   ├── verify.html               # Ticket verification
│   │   ├── maintenance.html          # Maintenance mode toggle
│   │   ├── css/
│   │   │   └── admin.css             # Admin-specific styles
│   │   └── js/
│   │       ├── app.js                # Dashboard
│   │       ├── events.js             # Events CRUD
│   │       ├── shows.js              # Shows CRUD
│   │       ├── seats.js              # Seat layout
│   │       ├── bookings.js           # Bookings list
│   │       ├── users.js              # User roles
│   │       ├── promocodes.js         # Promo codes
│   │       ├── reports.js            # Reports
│   │       ├── counter.js            # Counter booking
│   │       ├── audit.js              # Audit log
│   │       └── verify.js             # Ticket scanner
│   │
│   └── scanner/                      # PWA scanner app
│       ├── index.html
│       ├── manifest.json
│       ├── sw.js
│       └── icon.svg
│
├── supabase/                         # Supabase CLI mirror (mirrors backend/ + database/)
│   ├── config.toml                   # Supabase local config
│   ├── functions/                    # Mirrors backend/functions/
│   └── migrations/                   # Mirrors database/migrations/
│
├── .github/
│   └── workflows/
│       └── deploy-supabase.yml       # CI/CD: deploy edge functions
│
├── docker-compose.yml                # Docker Compose (Nginx + frontend)
├── Dockerfile                        # Nginx container
├── nginx.conf                        # Nginx config
├── docker-entrypoint.sh              # Container entrypoint
├── package.json                      # v1.0.4
├── DEPLOYMENT_GUIDE.md
├── DESIGN.md
├── SRS.md
├── project_status.md
└── README.md                         # You are here
```

---

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) + [Docker Compose](https://docs.docker.com/compose/install/)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for deploying edge functions)
- Node.js 18+ (optional, for `npx serve`)

### Run Locally (Docker)

```bash
# Build and start
docker compose up -d

# Open in browser
open http://localhost:8081
```

### Run Locally (Node)

```bash
# Serve static files
npx serve .
```

> **Note:** The local frontend calls production Supabase Edge Functions. To run functions locally, use `supabase start`.

### Environment Variables

Create a `.env` file (see `.env.example`):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_RAZORPAY_KEY_ID=your-razorpay-key
VITE_SITE_URL=http://localhost:8081
```

---

## Configuration

### Key Files

| File | Purpose |
|------|---------|
| `frontend/js/config.js` | Frontend env vars (Supabase URL, anon key, Razorpay key) |
| `supabase/config.toml` | Supabase CLI local config |
| `docker-compose.yml` | Docker service definitions |
| `.github/workflows/deploy-supabase.yml` | CI/CD pipeline |
| `backend/functions/_shared/supabase.ts` | Shared Supabase client, CORS, auth helpers |

### Supabase Secrets (set via `supabase secrets set`)

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RESEND_API_KEY
```

---

## Deployment

### Frontend (Cloudflare Pages / Docker)

```bash
# Docker deployment
docker compose up -d

# Or serve static files
npx serve frontend/
```

### Edge Functions (Supabase)

```bash
# Login and link
supabase login
supabase link --project-ref your-project-ref

# Deploy all functions
supabase functions deploy admin-query
supabase functions deploy get-events
# ... etc for each function

# Set secrets
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-key
supabase secrets set RAZORPAY_KEY_SECRET=your-secret
```

### Database Migrations

```bash
# Push migrations to remote
supabase db push

# Or link and push
supabase link --project-ref your-project-ref
supabase db push
```

---

## Admin Panel

Access: `https://your-domain/admin/index.html`

### Available Sections

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/admin/` | Stats, revenue, recent bookings |
| Events | `/admin/events.html` | Create, edit, delete events |
| Shows | `/admin/shows.html` | Schedule shows, set pricing |
| Seating | `/admin/seats.html` | Configure auditorium seat layout |
| Bookings | `/admin/bookings.html` | View/cancel all bookings |
| Promo Codes | `/admin/promocodes.html` | Discount codes |
| Reports | `/admin/reports.html` | Revenue breakdown by event |
| Counter Booking | `/admin/counter.html` | Offline ticket sales |
| Verify Tickets | `/admin/verify.html` | Scan & validate tickets |
| Audit Log | `/admin/audit.html` | All admin actions |
| Users | `/admin/users.html` | Manage user roles |
| Maintenance | `/admin/maintenance.html` | Toggle maintenance mode |

### Roles

- **admin** — full access
- **counter** — counter booking only
- **scanner** — ticket verification only

---

## Database Overview

### Key Tables

| Table | Purpose |
|-------|---------|
| `events` | Event metadata (title, description, poster, status) |
| `shows` | Show instances (date, time, pricing, status) |
| `auditorium_seats` | Seat definitions (row, number, category) |
| `show_seats` | Per-show seat status (available, locked, booked) |
| `bookings` | Booking records (user, show, amount, status) |
| `tickets` | Individual tickets per booking |
| `profiles` | User profiles with roles |
| `promo_codes` | Discount codes |
| `audit_logs` | Admin action audit trail |
| `maintenance_mode` | Global maintenance toggle |

### Row Level Security

- Public: read published events only
- Authenticated users: manage own bookings/profile
- Admins: full CRUD via service_role key in Edge Functions

---

## API Endpoints (Edge Functions)

| Function | Route | Purpose |
|----------|-------|---------|
| `admin-query` | `/functions/v1/admin-query` | All admin CRUD operations |
| `get-events` | `/functions/v1/get-events` | Published events with next show |
| `get-shows` | `/functions/v1/get-shows` | Shows for an event |
| `get-seat-map` | `/functions/v1/get-seat-map` | Seat layout + availability |
| `get-bookings` | `/functions/v1/get-bookings` | User bookings |
| `get-ticket` | `/functions/v1/get-ticket` | Single ticket details |
| `get-profile` | `/functions/v1/get-profile` | User profile |
| `update-profile` | `/functions/v1/update-profile` | Update profile |
| `lock-seats` | `/functions/v1/lock-seats` | Lock seats for booking |
| `release-seats` | `/functions/v1/release-seats` | Release locked seats |
| `create-razorpay-order` | `/functions/v1/create-razorpay-order` | Create payment order |
| `verify-payment` | `/functions/v1/verify-payment` | Verify payment + confirm booking |
| `cancel-booking` | `/functions/v1/cancel-booking` | Cancel booking + refund |

---

## License

MIT © Chhatrapati Shivaji Maharaj Auditorium, Naval Station Karanja

---

*Built with ❤️ by AartiTechServices*
