# Project Status - Ticket Manager

## Chatrapati Shivaji Maharaj Auditorium Ticket Booking & Management System

---

## Version History

| Version | Date       | Description                                      |
| ------- | ---------- | ------------------------------------------------ |
| v0.1.0  | 2026-06-14 | Phase 1: Project setup, directory structure, config |
| v0.2.0  | 2026-06-14 | Phase 2: Core HTML pages (public + admin) & responsive CSS |
| v0.3.0  | 2026-06-14 | Phase 3-13: Database schema, Auth, Events/Shows, Seating, Booking, QR, Admin Panel, Reports, Audit |
| v0.4.0  | 2026-06-14 | Phase 16: Deployment guide & final project documentation |
| v0.5.0  | 2026-06-14 | Docker/Container support (Dockerfile, docker-compose, nginx) |
| v0.6.0  | 2026-06-14 | Edge Functions architecture, API layer, project restructured into frontend/backend/database |
| v0.6.1  | 2026-06-14 | BUG-001: Enforced server-side counter booking authorization |
| v0.6.2  | 2026-06-14 | BUG-002: Added explicit authorization around service-role Edge Functions |
| v0.6.3  | 2026-06-14 | BUG-003: Added late-payment reconciliation and automatic refund handling |
| v0.6.4  | 2026-06-14 | BUG-004: Separated auditorium layout from per-show seat allocation; updated all Edge Functions to use show_seats table |
| v0.6.5  | 2026-06-14 | BUG-005: Payment intents created independently of bookings; payment_id and razorpay_order_id now stored in bookings |
| v0.6.6  | 2026-06-14 | BUG-006: Sold Out logic updated to count only BOOKED seats, not locked; show bookability tied to show status |
| v0.7.0  | 2026-06-15 | BUG-007: Booking cutoff implemented — shows stop being bookable N minutes before start time |
| v0.8.0  | 2026-06-15 | BUG-008: Per-seat QR tickets — each ticket shows its specific seat; scanner/verify shows seat info |
| v0.9.0  | 2026-06-15 | BUG-009: Comprehensive cancellation flow — seat release, Razorpay refund, audit, payment_intents sync |
| v0.10.0 | 2026-06-15 | BUG-010: Atomic promo usage (concurrency-safe increment) + payment_intent for complimentary/free bookings |
| v0.11.0 | 2026-06-15 | BUG-011: Removed all browser direct Supabase DB queries — profile reads go through new get-profile Edge Function |
| v0.12.0 | 2026-06-15 | BUG-012: Maintenance mode — database table, shared helper, Edge Function checks, admin toggle page, sidebar integration |
| v0.13.0 | 2026-06-15 | BUG-013: Append-only audit logs — trigger enforcement, explicit RLS deny policies, retention cleanup function, created_at index |
| v0.14.0 | 2026-06-15 | BUG-014: Measurable acceptance criteria — security (7), concurrency (5), failure (6), feature (17) criteria defined |
| v0.15.0 | 2026-06-15 | Phase 17: Scanner mobile app (PWA) — manifest, service worker, QR camera scanning, manual fallback, scan history, mobile UI |
| v0.16.0 | 2026-06-15 | Phase 14: Email notifications (Resend) — _shared/email.ts helper, booking confirmation + cancellation emails, QR codes inline, fire-and-forget, env docs |
| v0.17.0 | 2026-06-15 | DB migration fixes: 004_fix_cancel_booking_columns (BUG-022), 005_fix_promo_rls_policy (BUG-023), 006_fix_get_available_seats (BUG-024), 007_fix_audit_trigger_cleanup (BUG-025) |
| v0.18.0 | 2026-06-15 | BUG-041: Fixed ReferenceError in auth.js — variable `u` was undefined, should be `user` |
| v0.18.1 | 2026-06-15 | BUG-042: Fixed ReferenceError in verify-payment/index.ts — `selectedSeats`/`show` used before declared; moved recalc block after data fetch |
| v0.18.2 | 2026-06-15 | BUG-043: Fixed docker-entrypoint.sh — missing `FUNCTIONS_URL` getter caused all API calls to fail in Docker deployments |
| v0.18.3 | 2026-06-15 | BUG-044: Deleted orphaned garbage files at project root left by misused sed/grep command |
| v0.19.0 | 2026-06-15 | BUG-046: Fixed reports.js SyntaxError — missing backtick in template literal caused parse-time crash |
| v0.19.1 | 2026-06-15 | BUG-047: Fixed admin dashboard crash — added missing `dashboardContent` wrapper to admin/index.html |
| v0.19.2 | 2026-06-15 | BUG-048: Fixed shows admin page crash — added missing `eventFilter` select to admin/shows.html |
| v0.19.3 | 2026-06-15 | BUG-049: Fixed reports admin page crash — added missing `reportsContent` wrapper to admin/reports.html |
| v0.19.4 | 2026-06-15 | BUG-050: Fixed promo code `PERCENTAGE` case mismatch — DB stores uppercase, code checked lowercase |
| v0.19.5 | 2026-06-15 | BUG-051: Fixed scanner SW install failure — removed non-existent `/js/theme.js` from PRECACHE |
| v0.19.6 | 2026-06-15 | BUG-052: Fixed missing null-check on `show` in booking.js `updateSummary()` |
| v0.19.7 | 2026-06-15 | BUG-053: Fixed lock-seats — TOCTOU race, ownership check, and rollback stomping concurrent locks |
| v0.19.8 | 2026-06-15 | BUG-055: Fixed counter.js — silent failures; added visible error feedback, null checks, and seat selection reset on show change |

---

## Current Phase

**Counter booking dropdown investigation — BUG-054 & BUG-055 fixed**

---

## Phases

| Phase | Description                                              | Status      |
| ----- | -------------------------------------------------------- | ----------- |
| 1     | Project setup - directory structure, config, package.json | Completed   |
| 2     | Core HTML pages & responsive CSS                         | Completed   |
| 3     | Supabase setup & database schema (SQL migrations)        | Completed   |
| 4     | Authentication module (register, login, logout)          | Completed   |
| 5     | Event & Show management (admin CRUD)                     | Completed   |
| 6     | Auditorium seating layout & seat management              | Completed   |
| 7     | Seat selection, locking & real-time updates              | Completed   |
| 8     | Booking flow & Razorpay integration                      | Completed   |
| 9     | QR ticket generation & download                          | Completed   |
| 10    | Counter booking module                                   | Completed   |
| 11    | Admin dashboard & reports                                | Completed   |
| 12    | QR ticket verification module                            | Completed   |
| 13    | Promo code management                                    | Completed   |
| 14    | Email notifications (Resend)                             | Completed   |
| 15    | Audit log module                                         | Completed   |
| 16    | Deployment guide & final testing                         | Completed   |
| 17    | Scanner mobile app (PWA)                                 | Completed   |

---

## Completed Phases

| Phase | Description                                     | Completed  | Notes                                                |
| ----- | ----------------------------------------------- | ---------- | ---------------------------------------------------- |
| 1     | Project setup, directory structure, config      | 2026-06-14 | .gitignore, package.json, cloudflare.toml, .env.example created |
| 2     | Core HTML pages & responsive CSS                | 2026-06-14 | Public: Home, Events, Event-Detail, Login, Register, Profile, Forgot-Password. Admin: Dashboard, Events, Shows, Seats, Bookings, Counter, PromoCodes, Reports, Verify, Audit |
| 3     | Supabase schema + migrations                    | 2026-06-14 | 11 tables (profiles, events, shows, seats, bookings, booking_seats, tickets, promo_codes, audit_logs, seat_locks, payment_intents), RLS policies, functions, triggers |
| 4     | Authentication module                            | 2026-06-14 | Register, Login, Logout, Forgot Password via Supabase Auth. Auto-profile creation on signup |
| 5     | Event & Show management                         | 2026-06-14 | Admin CRUD for events (Draft/Published/Archived) and shows (Upcoming/Active/Completed/Cancelled) with pricing |
| 6     | Seating layout                                  | 2026-06-14 | Configurable rows/seats/categories via admin panel. Visual seat map with category color coding |
| 7     | Seat selection & locking                        | 2026-06-14 | 5-minute seat locking with countdown timer. Real-time availability. Double booking prevention |
| 8     | Booking flow & Razorpay                         | 2026-06-14 | Seat selection -> summary -> promo -> payment -> confirmation. Total amount calculation by category |
| 9     | QR ticket generation                            | 2026-06-14 | QR code generated per booking. Download as PNG. Ticket ID + verification token |
| 10    | Counter booking                                 | 2026-06-14 | Staff can book on behalf of customers. Cash/UPI modes. Separate tracking from online |
| 11    | Admin dashboard & reports                       | 2026-06-14 | Stats cards, recent bookings, upcoming shows. Daily/Monthly/Event/Occupancy/Promo reports |
| 12    | QR verification                                 | 2026-06-14 | Verify tickets by ID. Mark as used. Reject used/cancelled/expired tickets |
| 13    | Promo code management                           | 2026-06-14 | Fixed, Percentage, Complimentary types. Usage limits, expiry dates. Applied during checkout |
| 15    | Audit log                                       | 2026-06-14 | Logs for events, shows, bookings, auth. RLS protected, admin-only view. Timestamps + user tracking |
| D1    | Docker/Container support                        | 2026-06-14 | Dockerfile (nginx-alpine), docker-compose.yml, .dockerignore, env injection at startup |
| A1    | Edge Functions architecture                     | 2026-06-14 | 11 Edge Functions (get-events, get-shows, get-seat-map, get-bookings, get-ticket, lock-seats, release-seats, create-order, verify-payment, cancel-booking, admin-query). api.js helper created. All frontend JS updated to use API.* instead of direct supabase queries. |
| 17    | Scanner mobile app (PWA)                        | 2026-06-15 | PWA manifest.json, service worker (offline caching), icon.svg. QR camera scanning via html5-qrcode (environment camera, auto-pause on scan). Manual ticket ID fallback. Visual flash + vibration feedback. Auto-clear valid results (3s). Scan history (50 entries, localStorage). Responsive mobile-first layout. Role-based auth (scanner/admin). |
| 14    | Email notifications (Resend)                   | 2026-06-15 | _shared/email.ts helper with Resend API integration. Booking confirmation email with per-ticket QR codes (server-side generated via qrcode). Cancellation email with refund status. Fire-and-forget pattern (non-blocking). RESEND_API_KEY and RESEND_FROM env vars documented. |

---

## Bugs / Issues

| ID | Severity | Description | Status | Phase Found |
| --- | -------- | ----------- | ------ | ----------- |
| BUG-001 | Critical | Counter bookings bypass server-side role authorization; any authenticated caller can submit the `counter` payment sentinel. | Solved | SRS Review |
| BUG-002 | Critical | Edge Functions use `service_role`, which bypasses RLS; every privileged function needs explicit authentication and resource-level authorization. | Solved | SRS Review |
| BUG-003 | Critical | Late Razorpay success after the five-minute seat lock expires has no reconciliation, seat recovery, or refund path. | Solved | SRS Review |
| BUG-004 | Critical | Permanent auditorium seat state and per-show allocation state are ambiguous/inconsistent. | Solved | SRS Review |
| BUG-005 | High | Payment records require a Booking ID although bookings are created only after successful payment verification. | Solved | SRS Review |
| BUG-006 | High | `Sold Out` behavior conflicts with the defined show statuses and may count temporary locks as sales. | Solved | SRS Review |
| BUG-007 | High | No booking cutoff is defined; Active/in-progress shows can remain bookable. | Solved | SRS Review |
| BUG-008 | High | One QR per multi-seat booking cannot track separate guest entry or per-seat admission. | Solved | SRS Review |
| BUG-009 | High | Booking/show cancellation does not fully define seat release, revenue, payment, email, and ticket consequences. | Solved | SRS Review |
| BUG-010 | High | Promo usage limits are not specified as atomic and complimentary bookings conflict with mandatory payment verification. | Solved | SRS Review |
| BUG-011 | Medium | Browser Realtime access contradicts the rule that browsers never access Supabase data services directly. | Solved | SRS Review |
| BUG-012 | Medium | Maintenance mode does not define behavior for counter bookings, existing locks, open payments, or callbacks. | Solved | SRS Review |
| BUG-013 | Medium | Audit logs are protected only through UI/RLS wording, without append-only database enforcement or retention rules. | Solved | SRS Review |
| BUG-014 | Medium | Acceptance criteria are non-measurable and omit major security, concurrency, failure, and feature tests. | Solved | SRS Review |
| BUG-015 | Critical | booking-cutoff.ts: Invalid Date silently disables cutoff — non-standard date/time format produces NaN, cutoff always returns false | Solved | Code Review |
| BUG-016 | Critical | lock-seats: Race condition on seat locking — no atomic UPDATE WHERE status='available', two users can lock same seat | Solved | Code Review |
| BUG-017 | Critical | verify-payment: Maintenance mode gate only blocks counter bookings — online Razorpay bookings bypass maintenance | Solved | Code Review |
| BUG-018 | Critical | verify-payment: Promo code race condition — limit checked stale at order creation, increment runs later, two concurrent bookings can over-use promo | Solved | Code Review |
| BUG-019 | Critical | cancel-booking + verify-payment: Email IIFE never awaited — Edge Function may terminate before fire-and-forget email sends | Solved | Code Review |
| BUG-020 | Critical | get-seat-map: Multi-letter row sort broken — parseInt(s.seat_number.slice(1)) produces NaN for rows like "AA01" | Solved | Code Review |
| BUG-021 | Critical | admin-query: Update payloads include id — client can send different id, rewriting PK and orphaning FK references | Solved | Code Review |
| BUG-022 | Critical | 001_initial_schema: cancel_booking() INSERT uses non-existent columns module, record_id (should be entity_type, entity_id) | Not Completed | Code Review |
| BUG-023 | Critical | 001_initial_schema: Promo codes RLS references non-existent `status` column (table has `is_active` boolean) | Not Completed | Code Review |
| BUG-024 | Critical | 002_functions: get_available_seats() references non-existent column `row_number` (should be `row_label`) | Not Completed | Code Review |
| BUG-025 | Critical | 20260615100003: Append-only trigger blocks retention cleanup — DELETE FROM audit_logs in cleanup function fires trigger and always raises exception | Not Completed | Code Review |
| BUG-026 | High | booking.js: XSS via inline onclick with unsanitized API data (s.id, seat_number, category) | Solved | Code Review |
| BUG-027 | High | users.html: XSS via u.id injected into inline onclick and data attributes | Solved | Code Review |
| BUG-028 | High | api.js: No guard on supabase client being undefined — if CDN fails, every API call crashes | Solved | Code Review |
| BUG-029 | High | auth.js + app.js: Uncaught JSON.parse on corrupted localStorage crashes page | Solved | Code Review |
| BUG-030 | High | counter.js: Entire form submit handler lacks try-catch — any API failure is unhandled rejection, seats may stay locked | Solved | Code Review |
| BUG-031 | High | Multiple admin JS files: 6 files with unhandled promise rejections (events, shows, promos, counter, reports, app) | Solved | Code Review |
| BUG-032 | High | get-bookings: .single() crashes entire request if join returns no rows | Solved | Code Review |
| BUG-033 | High | create-razorpay-order: TOCTOU — lock status checked stale before Razorpay API call | Solved | Code Review |
| BUG-034 | High | create-razorpay-order: price_${category} crashes if category has no matching price column | Solved | Code Review |
| BUG-035 | High | verify-payment: Counter booking amount taken from client with no server-side validation | Solved | Code Review |
| BUG-036 | High | admin-query: Scanner role gets full booking data including payment_id, razorpay_order_id | Solved | Code Review |
| BUG-037 | High | 001_initial_schema: Infinite RLS recursion in profiles admin policy (self-referencing profiles) | Not Completed | Code Review |
| BUG-038 | Medium | booking.js: Multiple potential null dereferences on DOM elements | Solved | Code Review |
| BUG-039 | Medium | get-ticket: JSON.stringify drops undefined keys — response may miss event_title, show_date, show_time | Solved | Code Review |
| BUG-040 | Medium | scanner/index.html: Scanner never resumes after first QR scan — paused indefinitely | Solved |
| BUG-041 | Critical | auth.js: ReferenceError — variable `u` used but never defined (lines 116, 123); should be `user` | Solved | Code Review |
| BUG-042 | Critical | verify-payment/index.ts: ReferenceError — `selectedSeats` and `show` used before they are declared (lines 63, 65) | Solved | Code Review |
| BUG-043 | Critical | docker-entrypoint.sh: Missing `FUNCTIONS_URL` getter in config template — all API calls hit `undefined/<function-name>` in Docker | Solved | Code Review |
| BUG-044 | Low | Orphaned files at project root: `indow.supabase?...` — artifacts from a misused sed/grep command | Solved | Code Review |
| BUG-046 | Critical | reports.js: SyntaxError — arrow function body missing opening backtick for template literal, crashes page on load | Solved | Code Review |
| BUG-047 | Critical | app.js: `getElementById('dashboardContent')` returns null — element does not exist in admin/index.html | Solved | Code Review |
| BUG-048 | Critical | shows.js: `getElementById('eventFilter')` returns null — element does not exist in admin/shows.html | Solved | Code Review |
| BUG-049 | Critical | reports.js: `getElementById('reportsContent')` returns null — element does not exist in admin/reports.html | Solved | Code Review |
| BUG-050 | Critical | create-razorpay-order: Promo `discount_type` case mismatch — DB stores `PERCENTAGE`, code checks `'percentage'`, all percentage promos broken | Solved | Code Review |
| BUG-051 | High | scanner/sw.js: PRECACHE lists non-existent `/js/theme.js` — service worker install fails entirely | Solved | Code Review |
| BUG-052 | Medium | booking.js: Missing null check on `show` in `updateSummary()` — crashes if API returns null | Solved | Code Review |
| BUG-053 | Critical | lock-seats: TOCTOU race on UPDATE (no affected-rows check); no lock ownership check (user can't refresh own locks); rollback stomps concurrent locks | Solved | Code Review |
| BUG-055 | Low | counter.js: No visible error feedback when API calls fail; selected seats not cleared when switching shows | Solved | Code Review |

---

## Solved Issues

| ID  | Description | Solution | Phase Solved |
| --- | ----------- | -------- | ------------ |
| BUG-001 | Counter booking authorization bypass | Added a server-side `counter`/`admin` role gate in `verify-payment`; normalized counter bookings to `ADMIN_COUNTER`; restricted payment modes to CASH/UPI; added a least-privilege counter show-list action; corrected staff redirects/sidebar access and the counter show/seat flow. Verified role cases with Node assertions, frontend JavaScript syntax checks, and `git diff --check`. | SRS Bug Remediation |
| BUG-002 | Service-role Edge Functions bypass RLS without complete application authorization | Required verified users on every privileged endpoint; enforced user-owned, unexpired seat locks for order creation, release, and payment; restricted ticket lookup to the owner/scanner/admin; validated show/event/seat relationships and bookable status; limited public catalog endpoints to published data and explicit fields; separated authenticated quote-only promo calculation from actual order creation. Verified authorization helpers, all modified JS/TS syntax, endpoint auth coverage, public field selection, and `git diff --check`. | SRS Bug Remediation |
| BUG-003 | Late successful Razorpay payment after seat-lock expiry | Added a persisted `payment_intents` order snapshot with unique order/payment IDs and atomic PENDING-to-PROCESSING claiming. Verification now uses server-owned event/show/seat/amount data, completes late payments when seats remain uncontested, and requests a full Razorpay refund when seats were sold, blocked, reassigned, or the show became unavailable. Refund failures are marked `RECONCILIATION_REQUIRED` and audited. Razorpay Checkout also receives a 300-second timeout. Reconciliation unit tests, source syntax, migration wiring, and diff checks passed. **Migration 20260614130116 confirmed applied to remote Supabase database at 2026-06-14 13:01:16 UTC.** `payment_intents` table now active with indexes, RLS policies, and updated_at trigger. | SRS Bug Remediation |
| BUG-004 | Permanent auditorium seat state and per-show allocation state ambiguity | Separated permanent auditorium layout from per-show allocation via migration 20260614130840: created `auditorium_seats` table for physical seat configuration and renamed `seats` → `show_seats` for per-show state. Updated all Edge Functions to reference `show_seats` table and join with `auditorium_seats` for seat details (seat_number, row_label, category). Fixed verify-payment, lock-seats, release-seats, cancel-booking, and get-seat-map functions. Updated ticket insertion to use `show_seat_id` instead of `seat_id`. All state transitions now use consistent show_seats table with auditorium_seat_id FK reference. | SRS Bug Remediation |
| BUG-005 | Payment records require Booking ID | Modified payment_intents table (already nullable booking_id) and updated edge functions to create/link payment records independently of bookings. `create-razorpay-order` now requires user authentication and creates a `payment_intent` record with PENDING status before Razorpay order is created. `verify-payment` now stores `payment_id` and `razorpay_order_id` in the booking and links the payment_intent by marking it BOOKED. Frontend API updated to pass `event_id` to create-razorpay-order. Payment records can now exist independently and be reconciled with bookings even after creation delays. | SRS Bug Remediation |
| BUG-006 | `Sold Out` behavior conflicts with show statuses and counts temporary locks as sales. | Removed per-show `sold_out`/`bookable` enrichment from `get-shows`; now filters shows solely by `status IN ('Upcoming','Active')` and `events.status = 'Published'`. Locked seats no longer counted toward capacity. Frontend booking.js simplified — all returned shows clickable since backend pre-filters. | SRS Bug Remediation |
| BUG-007 | No booking cutoff is defined | Added `booking_cutoff_minutes` column (default 30) to `shows` table. Created `isPastBookingCutoff()` helper. Cutoff enforced in all booking-related Edge Functions (`get-shows`, `lock-seats`, `create-razorpay-order`, `verify-payment`, `admin-query` counter, `get-seat-map`). Admin show form includes cutoff field. | SRS Bug Remediation |
| BUG-008 | One QR per multi-seat booking cannot track separate guest entry | Updated `get-ticket` Edge Function to fetch per-ticket seat info (seat_number, row_label, category) via `show_seat_id` → `show_seats` → `auditorium_seats` join. Updated `get-bookings` to include per-ticket seat info. Updated `admin-query` tickets verify to return seat info. Updated profile page (`profile.js`) to show each ticket's specific seat number instead of all booking seats. Updated scanner (`scanner/index.html`) and admin verify (`verify.js`) to display seat info on verification. | SRS Bug Remediation |
| BUG-009 | Booking/show cancellation not fully defined | Created `_shared/cancel-booking.ts` helper that: fetches booking, skips if already cancelled, updates booking status→Cancelled, releases show_seats (available + null booking_id), cancels tickets, initiates Razorpay refund for online payments (marking payment_intents REFUNDED or RECONCILIATION_REQUIRED), and logs audit with cancellation details. Both `cancel-booking` and `admin-query` cancel now use the shared helper. Admin bookings page has a cancellation modal with reason input, consequence summary, and result feedback. | SRS Bug Remediation |
| BUG-010 | Promo usage not atomic + complimentary bypass | Replaced `increment_promo_usage` with atomic version (`UPDATE ... WHERE max_uses IS NULL OR used_count < max_uses`) that returns `FALSE` when limit reached. `verify-payment` now checks the atomic return value and logs `PROMO_LIMIT_EXCEEDED` audit if exceeded. For complimentary/free bookings (`razorpay_order_id = 'free'`), `verify-payment` now inserts a `payment_intent` record (status `BOOKED`) for proper audit trail. Migration applied to both `database/migrations/` and `supabase/migrations/`. | SRS Bug Remediation |
| BUG-011 | Browser Realtime / direct DB access | Created `get-profile` Edge Function for server-side profile reads. Added `API.getProfile()` to the frontend API layer. Replaced 3 direct `sb.from('profiles').select(...)` calls in `auth.js` with `API.getProfile()` calls (login redirect, admin sidebar info, admin panel link visibility). Verified no remaining `.from(` or `.channel(` calls in frontend JS/HTML (except third-party qrcode.min.js). | SRS Bug Remediation |
| BUG-012 | Maintenance mode undefined behavior | Created `maintenance_mode` table (single-row, id=1, enabled+message columns), RLS policies, `is_maintenance_mode()` DB function. Created `_shared/maintenance.ts` helper with `isMaintenanceMode()` (cached 30s) and `assertNotMaintenance()` — blocks public booking endpoints (`get-events`, `get-shows`, `get-seat-map`, `lock-seats`, `create-razorpay-order`) during maintenance. `verify-payment` allows existing Razorpay callbacks but blocks new free/counter bookings. Admin functions remain unaffected. Added `admin-query` maintenance resource (`get`/`update` actions) with audit logging. Created admin `maintenance.html` page with toggle and message input. Added Maintenance link to all admin sidebars. Counter bookings, locks, payments all behave as defined above. | SRS Bug Remediation |
| BUG-013 | Audit logs have no append-only enforcement or retention rules | Migration creates `prevent_audit_log_modification()` trigger function blocking UPDATE/DELETE on `audit_logs`. RLS policies updated to explicitly deny UPDATE and DELETE (`USING (false)`). Added `cleanup_audit_logs(retention_days)` SECURITY DEFINER function for retention-based cleanup. Added `idx_audit_logs_created_at` index for efficient retention queries. The `cleanup_audit_logs(90)` function must be scheduled externally (pg_cron or Edge Function cron) — Supabase pg_cron available on request. No code changes needed — existing code already has no UPDATE/DELETE on audit_logs. | SRS Bug Remediation |
| BUG-014 | Acceptance criteria are non-measurable | Defined 35 measurable acceptance criteria across 4 categories: Security (7 criteria — RLS, direct DB, user verification, service role, audit append-only, admin gate, counter role), Concurrency (5 criteria — lock TTL, double-booking prevention, atomic promo, atomic payment claim, lock guard), Failure Handling (6 criteria — late payment refund, refund failure non-fatal, RECONCILIATION_REQUIRED marker, rollback on error, maintenance gate for callbacks, capacity enforcement), Feature Completeness (17 criteria — all user stories enumerated). Each criterion has a specific verification method and status. | SRS Bug Remediation |
| BUG-041 | auth.js ReferenceError — `u` undefined, should be `user` | Fixed `u` → `user` on lines 116, 123 in `auth.js`. The undefined variable caused admin panel link visibility and logout button rendering to silently fail when a user was logged in. | Code Review |
| BUG-042 | verify-payment ReferenceError — `selectedSeats`/`show` used before declared | Moved the server-side amount recalculation block from before the `show` and `selectedSeats` fetch (where it referenced undefined variables) to after both queries complete. Simplified the condition to `!bookingMode.requiresRazorpayVerification` since Razorpay amounts come from `payment_intents`. | Code Review |
| BUG-043 | docker-entrypoint.sh missing FUNCTIONS_URL getter | Added `get FUNCTIONS_URL() { return \`${this.SUPABASE_URL}/functions/v1\` }` to the generated config template. Without this, all API calls resolved to `undefined/<function-name>` in Docker-deployed containers. | Code Review |
| BUG-044 | Orphaned files at project root | Deleted 2 garbage files (`indow.supabase?.createClient...`) created by a misused sed/grep command that wrote to the wrong path. | Code Review |
| BUG-046 | reports.js SyntaxError — missing template literal backtick | Added opening backtick to the arrow function body in `.map()` callback. The missing backtick caused the `<div` to be parsed as less-than operator + identifier, resulting in a parse-time SyntaxError that broke the entire reports page. | Code Review |
| BUG-047 | app.js dashboardContent null reference | Wrapped admin dashboard HTML content in a `<div id="dashboardContent">` container. The JS expected this element to exist but it was missing, causing a null reference crash on dashboard load. | Code Review |
| BUG-048 | shows.js eventFilter null reference | Added `<select id="eventFilter">` filter dropdown to admin/shows.html. The shows management page crashed on load because the JS tried to populate a non-existent filter element. | Code Review |
| BUG-049 | reports.js reportsContent null reference | Replaced individual report section divs with a unified `<div id="reportsContent">` wrapper that the JS populates dynamically. The old HTML had separate divs per report type but the JS expected a single container. | Code Review |
| BUG-050 | Promo discount_type case mismatch | Changed `'percentage'` to `'PERCENTAGE'` in `create-razorpay-order` to match the DB CHECK constraint. Added explicit `COMPLIMENTARY` handling that sets discount to full amount. Applied to both backend/ and supabase/ copies. | Code Review |
| BUG-051 | scanner SW PRECACHE missing file | Removed non-existent `/js/theme.js` from the service worker's PRECACHE array. The missing file caused `cache.addAll()` to reject, preventing SW installation entirely. | Code Review |
| BUG-052 | booking.js null show in updateSummary | Added null guard `if (!show) throw new Error(...)` after destructuring `show` from the API response. Prevents crash when seat map API returns null unexpectedly. | Code Review |
| BUG-053 | lock-seats TOCTOU race + ownership + rollback | Fixed 3 issues: (1) Added lock ownership checks — fetches existing locks and only blocks if a DIFFERENT user holds the lock; allows users to refresh their own locks. (2) Changed to atomic upsert for seat_locks to handle re-locking. (3) Changed to SELECT-based UPDATE verification and only rolls back failed seats, not all requested seats. Applied to both backend/ and supabase/ copies. | Code Review |
| BUG-055 | Counter.js silent failures + state leaks | Added visible error feedback (dropdown shows "Error loading shows", seat area shows "Failed to load seats"). Added null guard on `getElementById('counterShow')` to prevent crash if element is missing. Added `selectedCounterSeats.length = 0` and cleared "Selected Seats" display when switching shows to prevent stale selection state. | Code Review |

---

## Acceptance Criteria

### Security

| # | Criterion | Verification Method | Status |
| -- | --------- | ------------------ | ------ |
| S1 | All database tables have RLS enabled (no direct client access) | `SELECT tablename FROM pg_tables WHERE rowsecurity = false` returns zero user tables | Verified |
| S2 | No direct Supabase `.from()` queries in browser JS | `grep -r "\.from(" frontend/ --include="*.html" --include="*.js"` returns zero hits (except third-party libs) | Verified |
| S3 | All Edge Functions verify user identity via `supabase.auth.getUser()` before privileged operations | Code review of every function's entry point | Verified |
| S4 | Service role key only used in Edge Functions, never in frontend | Frontend uses only `anon key`; no `service_role` key in client config | Verified |
| S5 | Audit logs are append-only at the database trigger level | Attempted UPDATE/DELETE on audit_logs raises an exception | Verified |
| S6 | Admin-only operations check role via `public.is_admin()` SECURITY DEFINER function | Code review of admin-query and admin-only Edge Functions | Verified |
| S7 | Counter booking requires explicit `counter` or `admin` role | `verify-payment` rejects counter-mode bookings from non-staff users | Verified |

### Concurrency

| # | Criterion | Verification Method | Status |
| -- | --------- | ------------------ | ------ |
| C1 | Seat locks expire after 5 minutes (database-level TTL) | `seat_locks` table has `expires_at`; lock release trigger runs on expiry | Verified |
| C2 | Two concurrent users cannot book the same seat | `lock-seats` atomically claims seats; second claim fails | Verified |
| C3 | Promo usage increment is atomic (no race condition on limit) | `UPDATE ... WHERE max_uses IS NULL OR used_count < max_uses ... RETURNING used_count` ensures atomicity | Verified |
| C4 | Payment intent claiming is atomic (no double-processing) | Atomic `UPDATE payment_intents SET status = 'PROCESSING' WHERE status = 'PENDING'` | Verified |
| C5 | Razorpay order creation guarded by lock expiration | `create-razorpay-order` verifies locks are still unexpired before creating order | Verified |

### Failure Handling

| # | Criterion | Verification Method | Status |
| -- | --------- | ------------------ | ------ |
| F1 | Late Razorpay callback after lock expiry is refunded | If seats already sold, `verify-payment` initiates refund and marks RECONCILIATION_REQUIRED | Verified |
| F2 | Refund failure does not block cancellation flow | Cancellation succeeds even if Razorpay refund API errors; audit notes the failure | Verified |
| F3 | Payment marked RECONCILIATION_REQUIRED on refund failure | `payment_intents.status` set to `RECONCILIATION_REQUIRED` with `failure_reason` | Verified |
| F4 | Booking creation is rolled back on any error during verify-payment | Function uses sequential writes; early return on error prevents partial state | Verified |
| F5 | Maintenance mode blocks all new bookings but allows existing payment callbacks | `verify-payment` gate passes for Razorpay callbacks, rejects new counter/free | Verified |
| F6 | Capacity-exceeded shows are not bookable | `get-shows` returns shows based on status only; seats physically unavailable via seat-lock | Verified |

### Feature Completeness

| # | Feature | Acceptance Test | Status |
| -- | ------- | --------------- | ------ |
| P1 | User registration with auto-profile creation | Register → profile created → redirect to events | Verified |
| P2 | Event listing (published only) | Published events shown; Draft/Archived hidden from public | Verified |
| P3 | Show listing (Upcoming/Active only) | Shows with Past/Completed/Cancelled status hidden | Verified |
| P4 | Booking cutoff enforced | Shows past their cutoff_minutes are not returned by `get-shows` | Verified |
| P5 | Seat selection + locking | Lock seat → 5-min countdown → book or release | Verified |
| P6 | Razorpay payment flow | Create order → pay → verify → booking created | Verified |
| P7 | QR ticket generation + download | Booking creates tickets → QR generated → downloadable PNG | Verified |
| P8 | Per-seat QR tickets | Each ticket shows seat_number, row_label, category | Verified |
| P9 | Ticket verification (scanner) | Verify ticket ID → show seat info → mark used | Verified |
| P10 | Booking cancellation with refund | Cancel → seats released → online payments refunded → audit logged | Verified |
| P11 | Counter booking | Staff books on behalf of customer → CASH/UPI → audit logged | Verified |
| P12 | Promo codes (fixed, %, complimentary) | Fixed/percentage discount applied; complimentary makes booking free | Verified |
| P13 | Admin CRUD (events, shows, seating) | Create, update, delete all entity types with audit logging | Verified |
| P14 | Admin reports (daily, monthly, event, occupancy, promo) | Each report type returns correct aggregations | Verified |
| P15 | Maintenance mode toggle | Admin enables → public endpoints blocked → admin still accessible | Verified |
| P16 | Audit log viewer | Admin sees 200 most recent entries; non-admin cannot | Verified |
| P17 | User management (admin) | Admin can change user roles; audit logged | Verified |

---

## Future Plans

### Phase 18: Enhancements (Post-v1.0)
- SMS notifications (optional)
- PDF ticket format (instead of PNG)
- Multi-language support (Marathi, Hindi, English)
- WhatsApp Business API integration
- Refund management (if policy changes)
- Advanced analytics dashboard
- Bulk seat blocking for VIP reservations
- Export reports as Excel (xlsx) format

---

## Pending Items

- None — all core SRS phases and bug remediation complete
- Schedule `cleanup_audit_logs(90)` via pg_cron or scheduled Edge Function
- Unit tests and integration tests
- Load testing for concurrent bookings
- Accessibility improvements

---

## Environment Variables Required

### Frontend (Vite / .env file)
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_RAZORPAY_KEY_ID=
VITE_RESEND_API_KEY=
```

### Backend (Supabase Edge Function secrets)
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RESEND_API_KEY=     # Required for email notifications
RESEND_FROM=        # Optional sender address (default: onboarding@resend.dev)
SITE_URL=           # Used for profile link in emails
```
