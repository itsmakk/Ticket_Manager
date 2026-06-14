# Deployment Guide

## Chatrapati Shivaji Maharaj Auditorium - Ticket Booking System

This guide walks you through deploying the application step by step.

---

## Architecture

```
Frontend (HTML/CSS/JS) → Cloudflare Pages (or Docker)
Backend (Auth/DB/Storage) → Supabase
Payments → Razorpay
Emails → Resend (optional)
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

# 3. Open http://localhost:8080
```

This serves the full app at `http://localhost:8080`. Changes to HTML/CSS/JS files take effect immediately (rebuild not needed for static files).

To stop:
```bash
docker compose down
```

---

## Prerequisites (Production)

1. **GitHub account** - to host your code
2. **Cloudflare account** (free) - for hosting
3. **Supabase account** (free) - for database & auth
4. **Razorpay account** (free) - for payments
5. **Resend account** (free, optional) - for emails

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
3. Under **Site URL**, enter your deployed site URL (or `http://localhost:8080` for Docker testing)
4. Under **Redirect URLs**, add:
   - `https://csma.pages.dev/**`
   - `http://localhost:8080/**`

### 2.5 Create Admin User

The migration already includes a trigger that automatically creates a profile when a user signs up. To make someone an admin:

**Option A — Via Supabase Dashboard:**
1. Go to **Authentication → Users**
2. Click **Add User** → fill in:
   - **Email:** `admin@auditorium.com`
   - **Password:** Create a strong password
3. Click **Create user** (the trigger auto-creates their profile with `role = 'user'`)
4. Go to **SQL Editor** and run:
```sql
UPDATE profiles SET role = 'admin'
WHERE email = 'admin@auditorium.com';
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

### 3.2 Get API Keys

1. Go to **Settings → API Keys**
2. Click **Generate Key**
3. Copy the **Key ID** and **Key Secret**

### 3.3 Test Mode

- Razorpay provides test mode by default
- Test card: `4111 1111 1111 1111` (any future expiry, any CVV)
- Test UPI: `success@razorpay` (for UPI payments)

---

## Step 4: Cloudflare Pages Deployment

### 4.1 Connect to GitHub

1. Go to https://dash.cloudflare.com
2. Go to **Pages**
3. Click **Create a project** → **Connect to Git**
4. Authorize with GitHub and select your repository

### 4.2 Configure Build

In the build settings:

- **Project name:** `ticket-manager-auditorium` (or your choice)
- **Framework preset:** None
- **Build command:** (leave empty - this is a static site)
- **Build output directory:** `.` (the root directory)
- **Root directory:** (leave empty)

### 4.3 Set Environment Variables

Under **Environment variables (advanced)**, add:

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `VITE_RAZORPAY_KEY_ID` | Your Razorpay Key ID |
| `VITE_RESEND_API_KEY` | Your Resend API key (optional) |
| `VITE_SITE_URL` | Your Cloudflare Pages URL (e.g., `https://csma.pages.dev`) |

### 4.4 (Alternative) Deploy via cloudflare.toml

The project includes a `cloudflare.toml` file. To use it instead of the dashboard UI:

1. Edit `cloudflare.toml` and fill in your environment variables (Supabase URL, anon key, Razorpay key, Resend key, site URL)
2. Install Wrangler CLI: `npm install -g wrangler`
3. Run: `wrangler pages deploy . --branch production`

### 4.5 Deploy

Click **Save and Deploy**. Wait ~2 minutes for the first deployment.

### 4.6 Custom Domain (Optional)

1. Go to your Pages project → **Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain (e.g., `tickets.auditorium.com`)
4. Follow Cloudflare's DNS instructions

---

## Step 5: Setting Up Admin Panel

1. Visit your deployed site
2. Go to `/admin/index.html`
3. Log in with the admin credentials you created
4. First steps in admin panel:
   - **Seating** → Generate seat layout
   - **Events** → Create and publish an event
   - **Shows** → Create shows with pricing

---

## Step 6: Initial Configuration

### 6.1 Generate Seating Layout

1. Go to **Admin → Seating**
2. Enter rows (e.g., `A,B,C,D,E,F,G,H,I,J`)
3. Set seats per row (e.g., `15`)
4. Set row categories (e.g., `premium,premium,gold,gold,gold,silver,silver,silver,silver,silver`)
5. Click **Generate Layout**

### 6.2 Create Test Event

1. Go to **Admin → Events**
2. Click **+ New Event**
3. Fill in details and set status to **Published**

### 6.3 Create Test Show

1. Go to **Admin → Shows**
2. Click **+ New Show**
3. Select event, set date/time, set prices
4. Status: **Upcoming** or **Active**

---

## Step 7: Testing the Flow

1. Visit your site as a regular user
2. Register a new account
3. Browse events → Select a show
4. Select seats → Apply promo (optional)
5. Proceed to payment → Complete test payment
6. Check **My Bookings** → View/Download QR ticket
7. Login to admin → Verify the ticket

---

## Step 8: Email Setup (Optional - Resend)

Skip this step if you don't need booking confirmation emails.

### 8.1 Create Resend Account

1. Go to https://resend.com
2. Sign up and verify your domain
3. Get your API key

### 8.2 Add Environment Variable

Add `VITE_RESEND_API_KEY` to your Cloudflare Pages environment variables.

### 8.3 Email is Currently Planned for Phase 14

The booking confirmation email sending via Resend requires a server-side function (Cloudflare Functions or Supabase Edge Functions). This feature is planned for Phase 14.

---

## Production Checklist

Before going live:

- [ ] Change Supabase to require email verification
- [ ] Switch Razorpay from test to live mode
- [ ] Add proper SSL (Cloudflare handles this automatically)
- [ ] Set up custom domain
- [ ] Test the full booking flow
- [ ] Create backup of database
- [ ] Train staff on admin panel usage
- [ ] Set up monitoring (Supabase has basic monitoring)

---

## Costs (Approximate)

| Service | Free Tier | Paid Tier |
|---------|-----------|-----------|
| Cloudflare Pages | Unlimited requests | ~$5/month for more builds |
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
- Cloudflare Pages Docs: https://developers.cloudflare.com/pages
- Razorpay Docs: https://razorpay.com/docs
- Project Issues: Report on GitHub repository
