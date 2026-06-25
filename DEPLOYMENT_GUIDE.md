# Deployment Guide

## Chatrapati Shivaji Maharaj Auditorium - Ticket Booking System

This guide walks you through deploying the application step by step.

---

## Architecture

```
Browser → Edge Functions (Supabase) → Database
Frontend (HTML/CSS/JS) → GitHub Pages (or Docker)
Auth (login/register) → Supabase Auth (direct from browser)
Payments → Razorpay (via Edge Functions)
Emails → Resend (optional — Phase 14)
```

---

## Quick Start with Docker (Local Development)

Run the app locally without any setup:

```bash
# 1. Create .env file with your keys
cp .env.example .env
# Edit .env → add your Supabase, Razorpay and Resend keys
# (Quick option: cp .env.original .env — already has all working keys)

# 2. Start with Docker
docker compose up -d

# 3. Open http://localhost:8081
```

This serves the full app at `http://localhost:8081`. Changes to HTML/CSS/JS files take effect immediately (rebuild not needed for static files).

To stop:
```bash
docker compose down
```

---

## Prerequisites (Production)

1. **GitHub account** - to host your code & deploy frontend via GitHub Pages
2. **Supabase account** (free) - for database, auth & Edge Functions
3. **Razorpay account** (free) - for payments
4. **Resend account** (free, optional) - for emails (Phase 14)

---

## Step 1: GitHub Setup

1. Create a new repository on GitHub
2. Push your code:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/itsmakk/Ticket_Manager.git
git push -u origin main
```

---

## Step 2: Supabase Setup

### 2.1 Create Supabase Project

1. Go to https://supabase.com and sign up/login
2. Click **New Project**
3. Fill in:
   - **Name:** `ticket-manager-auditorium`
   - **Database Password:** Create a strong password (save it!)
   - **Region:** Choose closest to your users (e.g., Mumbai if in India)
4. Click **Create new project** (wait ~2 minutes for provisioning)

### 2.2 Get API Keys

1. In your Supabase project, go to **Project Settings → API**
2. Copy these values (you'll need them later):
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public key** (starts with `eyJ...`)

### 2.3 Run Database Migrations

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Open the file `database/migrations/001_initial_schema.sql`
4. Copy ALL the content and paste into the SQL Editor
5. Click **Run** (or Ctrl+Enter)
6. Wait for "Success. No rows returned" message
7. Repeat steps 2-6 for `database/migrations/002_functions.sql`

> **Note:** Both migrations are fully idempotent — you can run them multiple times with no errors or side effects. They use `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS`, and `CREATE OR REPLACE FUNCTION` throughout.

### 2.4 Configure Authentication

1. Go to **Authentication → Settings**
2. Under **Email Auth**, make sure email/password is enabled
3. Under **Site URL**, enter your deployed GitHub Pages URL (or `http://localhost:8081` for Docker testing)
4. Under **Redirect URLs**, add:
   - `https://itsmakk.github.io/Ticket_Manager/**`
   - `http://localhost:8081/**`

### 2.5 Create Admin User

The migration already includes a trigger that automatically creates a profile when a user signs up. To make someone an admin:

Full Name Milind Khandare
Mobile Number 9876543210
Email kmi9@pm.me
Password 000000

**Option A — Via Supabase Dashboard:**
1. Go to **Authentication → Users**
2. Click **Add User** → fill in:
   - **Email:** `kmi9@pm.me`
   - **Password:** Create a strong password
3. Click **Create user** (the trigger auto-creates their profile with `role = 'user'`)
4. Go to **SQL Editor** and run:
```sql
UPDATE profiles SET role = 'admin'
WHERE email = 'kmi9@pm.me';
```

**Option B — User signs up from the app:**
1. Visit the app and register as a normal user
2. Then promote them via SQL Editor:
```sql
UPDATE profiles SET role = 'admin'
WHERE email = 'their@email.com';
```

> **Note:** The trigger (`handle_new_user()`) in `001_initial_schema.sql` auto-creates a profile on signup, so you never need to `INSERT INTO profiles` manually. Just `UPDATE` the role.

### 2.6 Disable Email Verification (for testing)

1. Go to **Authentication → Settings**
2. Under **Email Auth**, turn off **Confirm email** (for testing only)
3. In production, keep it ON

---

## Step 3: Razorpay Setup

### 3.1 Create Razorpay Account

1. Go to https://razorpay.com and sign up
2. Complete KYC verification (may take 1-2 days)

### 3.2 Get API Keys (Test Mode)

Razorpay provides **test mode** by default when you first sign up.

1. Go to **Settings → API Keys**
2. Click **Generate Key**
3. Copy the **Key ID** and **Key Secret**
   - Test keys look like: `rzp_test_xxxxxxxxxxxx`
   - Live keys look like: `rzp_live_xxxxxxxxxxxx`

### 3.3 Where to Put Each Key (Security Rules)

Razorpay uses **two keys**, and they go in **different places**:

| Key | Purpose | Goes Where | Security |
|-----|---------|------------|----------|
| **Key ID** (`rzp_test_...` or `rzp_live_...`) | Initializes Razorpay checkout in browser | **`frontend/js/config.js`** — exposed to browser (required by JS SDK) | Safe to expose — used only to start checkout |
| **Key Secret** | Signs payment verification server-side | **Supabase Edge Function secrets** — NEVER in frontend | **Never commit or expose** — if leaked, anyone can refund/verify payments |

#### Frontend: `frontend/js/config.js`

```javascript
const CONFIG = {
  // ...
  RAZORPAY_KEY_ID: 'rzp_test_xxxxxxxxxxxx',  // ← change this
  // ...
}
```

> The Key ID is visible in the browser — this is **required** by the Razorpay JS SDK to open the checkout. It is not a secret.

#### Backend: Supabase Edge Function Secrets (CLI)

```bash
supabase secrets set RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
supabase secrets set RAZORPAY_KEY_SECRET=<your-key-secret>
```

> The Key Secret is stored as a Supabase secret and injected into Edge Functions at runtime. It is **never** sent to the browser.

### 3.4 Switching from Test to Live Mode

When you're ready to accept real payments:

1. Complete Razorpay KYC (dashboard will guide you)
2. Go to **Settings → API Keys** → **Switch to Live Mode**
3. Generate live keys (start with `rzp_live_...`)
4. Update **both** places:
   - `frontend/js/config.js` → change `RAZORPAY_KEY_ID` to the live key
   - Supabase secrets → update both `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`
5. Git commit and redeploy

> ⚠️ Never commit the live Key Secret to git. Only the Key ID goes in `config.js`.

### 3.5 Test Mode Behavior

- **Test card:** `4111 1111 1111 1111` (any future expiry, any CVV)
- **Test UPI:** The checkout shows `random@razorpay` or `success@razorpay` as the UPI ID — this is **normal** in test mode
- **Test OTP:** Use `1234` or `1111`
- **Test payments** never involve real money
- In **live mode**, your actual UPI VPA (configured in Razorpay dashboard) will appear instead

### 3.6 Security Checklist

- [ ] `RAZORPAY_KEY_SECRET` is only in `supabase secrets set` — **never** in any `.js`, `.ts`, `.html`, or `.env` file committed to git
- [ ] `RAZORPAY_KEY_ID` in `config.js` is the **only** key visible in frontend code
- [ ] `.env` files are listed in `.gitignore` (check with `git status`)
- [ ] No `.env` or key files are committed (`git add` only what you intend)
- [ ] Corrupted git history? Use `git rm --cached .env && echo ".env" >> .gitignore` then `git commit -m "remove .env from git"`

---

## Step 4: GitHub Pages Deployment

### 4.1 Push Code to GitHub

```bash
git push -u origin main
```

### 4.2 Enable GitHub Pages

1. Go to your repo → **Settings** → **Pages**
2. Under **Branch**: select `main`, folder = **`/frontend`**
3. Click **Save**

### 4.3 Wait for Deploy

After ~1-2 minutes, your site is live at:  
`https://itsmakk.github.io/Ticket_Manager/`

### 4.4 Set Site URL in Supabase Auth

1. Go to Supabase Dashboard → **Authentication** → **Settings**
2. Under **Site URL**, enter your GitHub Pages URL
3. Under **Redirect URLs**, add: `https://itsmakk.github.io/Ticket_Manager/**`

### 4.5 Custom Domain (Optional)

1. Go to your repo → **Settings** → **Pages**
2. Under **Custom domain**, enter your domain
3. Create a DNS `CNAME` record pointing to `itsmakk.github.io`

---

## Step 5: Deploy Supabase Edge Functions

The app uses Edge Functions (Deno) for ALL database operations. Deploy them after Supabase is set up.

### 5.1 Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Linux
curl -fsSL https://github.com/supabase/cli/releases/download/v2/supabase_linux_amd64.deb -o supabase.deb
sudo dpkg -i supabase.deb

# Windows (PowerShell)
scoop bucket add supabase https://github.com/supabase/supabase.git
scoop install supabase
```

### 5.2 Link Project & Deploy

```bash
supabase login
supabase link --project-ref <your-supabase-project-ref>

# Deploy all functions
supabase functions deploy get-events
supabase functions deploy get-shows
supabase functions deploy get-seat-map
supabase functions deploy get-bookings
supabase functions deploy get-ticket
supabase functions deploy lock-seats
supabase functions deploy release-seats
supabase functions deploy create-razorpay-order
supabase functions deploy verify-payment
supabase functions deploy cancel-booking
supabase functions deploy admin-query
```

### 5.3 Set Function Secrets

```bash
supabase secrets set SUPABASE_URL=<your-supabase-url>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
supabase secrets set RAZORPAY_KEY_ID=<razorpay-key-id>
supabase secrets set RAZORPAY_KEY_SECRET=<razorpay-key-secret>
supabase secrets set RESEND_API_KEY=<resend-key>  # optional, for Phase 14
```

> **Important:** The `service_role` key is used inside Edge Functions only — it is NEVER exposed to the browser.
>
> **Security:** The `cloudflare.toml` file has hardcoded keys. Since we're using GitHub Pages now, remove it: `git rm cloudflare.toml && git commit -m "remove cloudflare.toml with secrets"`

---

## Step 6: Setting Up Admin Panel

1. Visit your deployed site
2. Go to `/admin/index.html`
3. Log in with the admin credentials you created
4. First steps in admin panel:
   - **Seating** → Generate seat layout
   - **Events** → Create and publish an event
   - **Shows** → Create shows with pricing

---

## Step 7: Initial Configuration

### 7.1 Generate Seating Layout

1. Go to **Admin → Seating**
2. Enter rows (e.g., `A,B,C,D,E,F,G,H,I,J`)
3. Set seats per row (e.g., `15`)
4. Set row categories (e.g., `premium,premium,gold,gold,gold,silver,silver,silver,silver,silver`)
5. Click **Generate Layout**

### 7.2 Create Test Event

1. Go to **Admin → Events**
2. Click **+ New Event**
3. Fill in details and set status to **Published**

### 7.3 Create Test Show

1. Go to **Admin → Shows**
2. Click **+ New Show**
3. Select event, set date/time, set prices
4. Status: **Upcoming** or **Active**

---

## Step 8: Testing the Flow

1. Visit your site as a regular user
2. Register a new account
3. Browse events → Select a show
4. Select seats → Apply promo (optional)
5. Proceed to payment → Complete test payment
6. Check **My Bookings** → View/Download QR ticket
7. Login to admin → Verify the ticket

---

## Step 9: Email Setup (Optional - Resend)

Skip this step if you don't need booking confirmation emails.

### 9.1 Create Resend Account

1. Go to https://resend.com
2. Sign up and verify your domain
3. Get your API key

### 9.2 Set Edge Function Secret

Run via Supabase CLI (not a frontend env var):
```bash
supabase secrets set RESEND_API_KEY=re_...
```

### 9.3 Email Integration (Phase 14 - Complete)

Booking confirmation and cancellation emails are now integrated:

- **verify-payment** sends confirmation email with per-ticket QR codes embedded as data URLs
- **cancel-booking** sends cancellation notice with refund status
- Emails are fire-and-forget (non-blocking); failures are logged but never affect booking/cancellation success
- QR codes generated server-side using `qrcode` library, matching the same format as frontend (`{"ticket_id":"...","token":"..."}`)

**Optional: Custom From Address**
```bash
supabase secrets set RESEND_FROM="CSM Auditorium <noreply@yourdomain.com>"
```
If not set, defaults to the Resend sandbox address `onboarding@resend.dev`.

---

## Production Checklist

Before going live:

- [ ] Change Supabase to require email verification
- [ ] Switch Razorpay from test to live mode
- [ ] Set up custom domain (optional)
- [ ] Deploy Supabase Edge Functions via CLI (`supabase functions deploy`)
- [ ] Test the full booking flow
- [ ] Create backup of database
- [ ] Train staff on admin panel usage
- [ ] Set up monitoring (Supabase has basic monitoring)

---

## Costs (Approximate)

| Service | Free Tier | Paid Tier |
|---------|-----------|-----------|
| GitHub Pages | Unlimited requests, 1GB storage, 100GB bandwidth/month | Free |
| Supabase | 500MB DB, 50K users | $25/month for 8GB DB |
| Razorpay | 2% per transaction | Custom for high volume |
| Resend | 100 emails/day | $10/month for 50K emails |

Total estimated monthly cost: **$0 (free tier)** for low-volume usage.

---

## Troubleshooting

### "Failed to fetch" errors
- Check Supabase URL and anon key are correct
- Make sure RLS policies are applied (run migrations)
- Check browser console for CORS errors

### Login not working
- Verify Supabase Auth is configured for email/password
- Check if email verification is required
- Look at Supabase Auth logs

### Seats not showing up
- Generate seating layout in admin panel first
- Check that seats were created in Supabase

### QR code not displaying
- Check internet connection (QR library loaded via CDN)
- Check browser console for errors

### Payment not working
- Verify Razorpay Key ID is correct
- Check that Razorpay script is loading
- Use test mode first

---

## Need Help?

- Supabase Documentation: https://supabase.com/docs
- GitHub Pages Docs: https://docs.github.com/pages
- Razorpay Docs: https://razorpay.com/docs
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Project Issues: Report on GitHub repository
