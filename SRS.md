
# Software Requirements Specification (SRS)

# Chatrapati Shivaji Maharaj Auditorium Ticket Booking & Management System

---

# 1. Introduction

## 1.1 Purpose

The purpose of this project is to develop a complete web-based Ticket Booking and Auditorium Management System for **Chatrapati Shivaji Maharaj Auditorium, Naval Station Karanja**.

The system shall enable:

* Online ticket booking
* Counter ticket booking
* Event and show management
* Real-time seat allocation
* QR ticket generation and verification
* Revenue tracking and reporting
* Administrative control and audit logging

The application shall be simple to operate, mobile-friendly, and suitable for day-to-day use by non-technical staff.

---

## 1.2 Project Scope

This is a **Single Auditorium Management System**.

The application manages only one auditorium and does not require support for multiple venues.

All data within the system belongs to the same auditorium, including:

* Events
* Shows
* Seats
* Bookings
* Payments
* Reports
* Tickets

Multi-auditorium functionality is outside the scope of this project.

---

## 1.3 Business Objectives

The system shall provide:

1. Online ticket sales
2. Manual counter ticket sales
3. Real-time seat availability
4. Secure payment processing
5. QR-based entry validation
6. Occupancy tracking
7. Revenue reporting
8. Promo code management
9. Audit trail of critical activities
10. Low-maintenance operation
11. code can work in any environment (use docker/container if applicable)

---

# 2. System Architecture

## 2.1 Architecture Overview

The application shall use a serverless architecture with Supabase as the primary backend platform.

No dedicated VPS, Render server, or custom backend server is required for Phase 1.

Architecture:

Github 

Frontend (Cloudflare Pages) → Supabase Edge Functions → Supabase Database (service_role)

Backend Services → Supabase Edge Functions (Deno)

Payment Gateway → Razorpay

Booking Emails → Resend

**Key Rule**: The browser NEVER talks directly to the database. All data operations go through Edge Functions using the service_role key (which is never exposed to the client). Only Supabase Auth calls (login, register, forgot password) are made directly from the browser.

---

## 2.2 Technology Stack

### Frontend

* HTML5
* CSS3
* JavaScript / TypeScript
* Responsive Design
* Cloudflare Pages Hosting

### Backend

Supabase shall provide:

* Authentication (direct from browser)
* Edge Functions (Deno) — all database operations
* PostgreSQL Database
* Storage
* Realtime Services
* Row Level Security (RLS) — backup layer only

### Project Structure

```
ticket-manager/
├── frontend/           # Cloudflare Pages (static HTML/CSS/JS)
│   ├── index.html
│   ├── events.html
│   ├── event-detail.html
│   ├── login.html
│   ├── register.html
│   ├── profile.html
│   ├── forgot-password.html
│   ├── css/
│   │   ├── styles.css
│   │   └── admin.css
│   ├── js/
│   │   ├── config.js         # Supabase URL, anon key, etc.
│   │   ├── api.js             # API layer — calls Edge Functions only
│   │   ├── auth.js            # Auth (direct Supabase Auth calls)
│   │   ├── events.js          # Events listing page logic
│   │   ├── booking.js         # Seat selection + payment flow
│   │   └── profile.js         # User profile + bookings
│   └── admin/
│       ├── index.html         # Dashboard
│       ├── events.html
│       ├── shows.html
│       ├── seats.html
│       ├── bookings.html
│       ├── counter.html
│       ├── promocodes.html
│       ├── reports.html
│       ├── verify.html
│       ├── audit.html
│       └── js/
│           ├── app.js
│           ├── events.js
│           ├── shows.js
│           ├── seats.js
│           ├── bookings.js
│           ├── counter.js
│           ├── promocodes.js
│           ├── reports.js
│           ├── verify.js
│           └── audit.js
├── backend/
│   └── functions/
│       ├── _shared/supabase.ts  # Shared helper
│       ├── get-events/index.ts
│       ├── get-shows/index.ts
│       ├── get-seat-map/index.ts
│       ├── get-bookings/index.ts
│       ├── get-ticket/index.ts
│       ├── lock-seats/index.ts
│       ├── release-seats/index.ts
│       ├── create-razorpay-order/index.ts
│       ├── verify-payment/index.ts
│       ├── cancel-booking/index.ts
│       └── admin-query/index.ts  # Single endpoint for all admin CRUD
├── database/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       └── 002_functions.sql
├── Dockerfile
├── docker-compose.yml
├── docker-entrypoint.sh
├── nginx.conf
├── cloudflare.toml
├── .gitignore
├── .env.example
├── package.json
├── SRS.md
├── project_status.md
├── DEPLOYMENT_GUIDE.md
└── README.md
```

### Payment Gateway

* Razorpay

### Email Service

* Resend Free Plan

---

## 2.3 Design Principles

The system shall prioritize:

* Simplicity
* Reliability
* Security(sql inj)
* Mobile usability
* Fast performance
* Low maintenance

The system shall avoid unnecessary complexity and enterprise-level features not required for a single auditorium.

---

# 3. User Roles

## 3.1 Roles Overview

The system supports four user roles, enforced by a database CHECK constraint on the `profiles.role` column. All new users default to `user` on registration. Role changes can only be performed by an administrator via the **Users** management page (`/admin/users.html`) or direct SQL.

| Role      | Default on Signup | Description |
|-----------|:-----------------:|-------------|
| user      | ✅                 | Regular registered user — browses events and books tickets online |
| counter   | ❌                 | Staff member — creates bookings on behalf of walk-in customers (cash/UPI) |
| scanner   | ❌                 | Gate staff — verifies QR tickets at the auditorium entrance |
| admin     | ❌                 | Full system access — manages events, shows, seats, bookings, promo codes, reports, users, audit logs |

---

## 3.2 User (Registered User)

Users shall be able to:

* Register
* Login
* Browse events
* Select seats
* Purchase tickets (online via Razorpay)
* View booking history
* Download tickets

---

## 3.3 Counter Operator

Counter operators shall be able to:

* Create bookings on behalf of customers
* Allocate seats
* Record payment mode (CASH / UPI)
* Generate tickets
* Print tickets

Counter bookings shall be tracked separately from online bookings with `booking_source = 'ADMIN_COUNTER'`.

Access is enforced through the **counter booking admin page**; the Edge Function does not currently perform a separate `counter` role check (counter operators are managed via admin-listed profiles).

---

## 3.4 Scanner

Scanners shall be able to:

* Scan QR tickets
* Verify ticket validity
* View ticket details
* Mark tickets as used

Scanners shall **not** have access to any other admin functionality (events, shows, bookings, reports, users, etc.).

The admin sidebar hides all non-verify links for scanner-role users. API-level enforcement is handled by the `admin-query` Edge Function, which only permits the `tickets` resource for the `scanner` role.

Scanners use a dedicated mobile-friendly verification page at `/scanner/index.html`.

---

## 3.5 Administrator

Administrators shall be able to:

* Manage events (CRUD)
* Manage shows (CRUD)
* Manage seats (generate layout, view)
* Manage bookings (list, cancel)
* Manage promo codes (CRUD)
* View reports and analytics
* Verify tickets
* Manage users — list all users, change roles (user / counter / scanner / admin)
* Enable / disable maintenance mode
* View audit logs

Administrators **cannot demote themselves** — attempting to change their own role to a non-admin value is rejected by the Edge Function.

---

## 3.6 Role Permissions Matrix

| Feature                 | User | Counter | Scanner | Admin |
| ----------------------- | :--: | :-----: | :-----: | :---: |
| Browse events           | ✅   | ✅      | ✅      | ✅    |
| Book tickets (online)   | ✅   | ❌¹     | ❌      | ✅    |
| Counter booking         | ❌   | ✅      | ❌      | ✅    |
| View own bookings       | ✅   | ✅      | ✅      | ✅    |
| Cancel booking          | ❌   | ❌      | ❌      | ✅    |
| Manage events           | ❌   | ❌      | ❌      | ✅    |
| Manage shows            | ❌   | ❌      | ❌      | ✅    |
| Manage seats            | ❌   | ❌      | ❌      | ✅    |
| Manage promo codes      | ❌   | ❌      | ❌      | ✅    |
| View reports            | ❌   | ❌      | ❌      | ✅    |
| Verify tickets          | ❌   | ❌      | ✅      | ✅    |
| Manage users / roles    | ❌   | ❌      | ❌      | ✅    |
| View audit logs         | ❌   | ❌      | ❌      | ✅    |

> ¹ Counter can make counter bookings through the admin panel for walk-in customers. Admin can book tickets online via the "Book Tickets" link in the sidebar, or make counter bookings at the counter.

---

# 4. Authentication & User Management

## 4.1 Authentication Platform

Authentication shall use Supabase Authentication.

Supported features:

* Email Registration
* Email Login
* Password Reset
* Email Verification
* Session Management

---

## 4.1.1 Role Assignment

Every new user is automatically assigned the `user` role upon registration via a database trigger (`handle_new_user`).

To change a user's role (to `counter`, `scanner`, or `admin`), an existing administrator must use the **Users** management page at `/admin/users.html`. This page lists all profiles and provides a role dropdown for each user.

Role changes are logged to the `audit_logs` table with action `USER_ROLE_CHANGED` and cannot be performed by non-admin users. An admin cannot demote themselves — the Edge Function rejects self-demotion attempts.

---

## 4.2 Required Registration Fields

Each user account shall contain:

| Field         | Required |
| ------------- | -------- |
| Full Name     | Yes      |
| Mobile Number | Yes      |
| Email Address | Yes      |
| Password      | Yes      |

No additional profile information is required.

---

## 4.3 User Registration

Users shall be able to:

* Create an account
* Verify email address
* Login after verification
* Access booking features

Guest booking is not supported.

---

## 4.4 Login

Users shall be able to:

* Login using email and password
* Remain logged in across sessions
* Logout securely

---

## 4.5 Password Recovery

Users shall be able to:

* Request password reset
* Receive reset email
* Create a new password

Password reset emails shall be handled through Supabase Authentication.

---

## 4.6 Mobile Verification

Mobile number is mandatory.

OTP verification is not required in Phase 1.

Email verification shall be considered sufficient.

---

# 5. Event Management Module

## 5.1 Event Definition

An Event represents the actual movie, performance, program, or activity.

Examples:

* Mission Impossible
* Annual Cultural Program
* Navy Day Function
* Musical Concert

---

## 5.2 Event Types

Supported event categories:

* Movie
* Cultural Program
* Stage Show
* Official Event
* Special Program

Additional categories may be added by administrators.

---

## 5.3 Event Information

Each event shall contain:

* Event Title
* Event Description
* Event Category
* Poster Image
* Banner Image
* Trailer URL (Optional)
* Status

---

## 5.4 Event Status

Available statuses:

* Draft
* Published
* Archived

Only Published events shall be visible to public users.

---

## 5.5 Event Administration

Administrators shall be able to:

* Create Events
* Edit Events
* Publish Events
* Archive Events

Events should not be permanently deleted unless explicitly required.


# 6. Show Management Module

## 6.1 Show Definition

A Show represents a scheduled screening or performance of an Event.

### Example

Event:
Mission Impossible

Shows:

* 10:00 AM Show
* 02:00 PM Show
* 06:00 PM Show

Multiple shows may exist for a single event.

---

## 6.2 Show Information

Each show shall contain:

| Field                      | Required |
| -------------------------- | -------- |
| Event Reference            | Yes      |
| Show Date                  | Yes      |
| Start Time                 | Yes      |
| Duration                   | Yes      |
| End Time (Auto Calculated) | Yes      |
| Status                     | Yes      |

---

## 6.3 Show Status

Available statuses:

* Upcoming
* Active
* Completed
* Cancelled

Only Upcoming and Active shows shall be available for booking.

---

## 6.4 Show Creation

Administrators shall be able to:

* Create shows
* Edit shows
* Activate shows
* Deactivate shows
* Cancel shows

---

## 6.5 Show Pricing

Ticket pricing shall be configured separately for each show.

Example:

| Category | Show A | Show B |
| -------- | ------ | ------ |
| Premium  | ₹300   | ₹350   |
| Gold     | ₹250   | ₹300   |
| Silver   | ₹200   | ₹250   |

Prices may vary between shows.

---

## 6.6 Show Availability

Users shall be able to view:

* Available seats
* Remaining seat count
* Sold-out status
* Ticket prices

in real time.

---

## 6.7 Sold Out Handling

A show shall automatically become Sold Out when:

Available Seats = 0

System shall:

* Display SOLD OUT badge
* Disable booking option
* Prevent seat selection

No waiting list shall be provided.

---

# 7. Auditorium & Seating Management

## 7.1 Auditorium Configuration

The system supports one auditorium only.

The seating layout shall be configured once by administrators and reused for all shows.

---

## 7.2 Seat Information

Each seat shall contain:

| Field       |
| ----------- |
| Seat Number |
| Row Number  |
| Category    |
| Status      |

Examples:

* A1
* A2
* B10
* C15

---

## 7.3 Seat Categories

Administrators shall be able to create seat categories.

Default categories:

* Premium
* Gold
* Silver

Categories may be modified in future.

---

## 7.4 Seat Status

Seats may exist in the following states:

### Available

Seat can be booked.

### Locked

Seat is temporarily reserved during booking.

### Booked

Seat is successfully purchased.

### Blocked

Seat is unavailable for sale.

Example:

* VIP Reservation
* Maintenance
* Operational Restriction

---

## 7.5 Seat Layout Display

Users shall see:

* Visual seat map
* Row labels
* Seat numbers
* Category information

Seat colors shall indicate availability status.

---

## 7.6 Real-Time Seat Updates

Seat availability shall update in real time using Supabase Realtime.

Changes must immediately reflect for all users.

---

## 7.7 Double Booking Prevention

The database shall enforce:

One Seat + One Show = One Booking Only

No seat may be sold twice for the same show.

Database constraints shall prevent duplicate seat allocation.

---

# 8. Seat Locking & Reservation Flow

## 8.1 Seat Selection

Users shall be able to:

* Select one or more seats
* View pricing instantly
* Proceed to payment

---

## 8.2 Seat Locking

When seats are selected:

* Seats become Locked
* Lock duration = 5 minutes
* Other users cannot select locked seats

---

## 8.3 Lock Timer

A visible countdown timer shall be displayed.

Example:

04:59
04:58
04:57

---

## 8.4 Successful Payment

If payment succeeds:

Locked Seat → Booked Seat

Booking confirmation shall be generated immediately.

---

## 8.5 Failed Payment

If payment fails:

Locked Seat → Available Seat

Release shall occur immediately.

---

## 8.6 Timeout Expiry

If user does not complete payment within 5 minutes:

Locked Seat → Available Seat

Automatic release shall occur.

---

## 8.7 Browser Closure

If user closes the browser:

* Lock remains valid until timeout
* Seats release automatically after 5 minutes

---

## 8.8 Lock Cleanup

The system shall automatically remove expired seat locks.

No seat may remain locked permanently.

---

# 9. Booking Management

## 9.1 Booking Creation

A booking shall be created only after successful payment verification.

Unpaid bookings shall not be confirmed.

---

## 9.2 Booking Information

Each booking shall contain:

| Field          |
| -------------- |
| Booking ID     |
| User ID        |
| Event          |
| Show           |
| Seats          |
| Amount         |
| Payment Status |
| Booking Source |
| Booking Date   |

---

## 9.3 Booking Source

Supported values:

* USER
* ADMIN_COUNTER

This allows separate reporting.

---

## 9.4 Booking Status

Available statuses:

* Confirmed
* Cancelled

No partially confirmed booking status is required.

---

## 9.5 Booking History

Users shall be able to:

* View previous bookings
* View ticket details
* Download tickets again

---

## 9.6 Search Booking

Administrators shall be able to search by:

* Booking ID
* User Name
* Mobile Number
* Event Name
* Show Date

---

## 9.7 Cancellation Policy

Users cannot cancel bookings.

Only administrators may cancel bookings for operational reasons.

---

## 9.8 Refund Policy

No refund functionality shall be provided.

Cancelled tickets become invalid automatically.

---

# 10. Counter Booking Module

## 10.1 Purpose

Authorized staff shall be able to create bookings on behalf of customers at the booking counter.

---

## 10.2 Counter Booking Features

Staff shall be able to:

* Select show
* Select seats
* Enter customer details
* Record payment mode
* Generate tickets instantly

---

## 10.3 Customer Information

Counter bookings may record:

* Customer Name
* Mobile Number

Email is optional.

---

## 10.4 Payment Modes

Supported payment modes:

* CASH
* UPI

Counter bookings do not require Razorpay processing.

---

## 10.5 Ticket Generation

Tickets shall be generated immediately after booking confirmation.

Staff may:

* Print ticket
* Download ticket
* Share ticket

---

## 10.6 Reporting

Counter bookings shall be tracked separately from online bookings for reporting purposes.

---

## 10.7 Audit Tracking

The system shall record:

* Staff member
* Booking date
* Seats allocated
* Payment mode

for every counter booking.

# 11. Payment Management Module

## 11.1 Payment Gateway

The system shall use:

**Razorpay**

as the primary online payment gateway.

---

## 11.2 Supported Payment Methods

Users shall be able to pay using:

### Preferred Methods

* UPI Intent
* UPI QR Code
* UPI Collect Request

### Additional Methods

* Google Pay
* PhonePe
* Paytm
* BHIM UPI
* Debit Card
* Credit Card
* Net Banking

UPI shall be the primary recommended payment method.

---

## 11.3 Payment Flow

Booking flow:

1. User selects seats.
2. Seats are locked.
3. User proceeds to payment.
4. Razorpay payment page opens.
5. User completes payment.
6. Payment verification occurs.
7. Booking is confirmed.
8. Ticket is generated.
9. Confirmation email is sent.

---

## 11.4 Payment Status

Available payment statuses:

* PENDING
* PAID
* FAILED

Only PAID transactions shall create confirmed bookings.

---

## 11.5 Payment Verification

The system shall:

* Verify Razorpay payment response
* Validate payment signature
* Prevent fake confirmations
* Prevent duplicate processing

Booking confirmation shall occur only after successful verification.

---

## 11.6 Failed Payments

If payment fails:

* Booking shall not be confirmed.
* Locked seats shall be released.
* User may retry booking.

---

## 11.7 Duplicate Payment Protection

The system shall prevent:

* Duplicate transaction processing
* Duplicate booking creation
* Duplicate seat allocation

A payment shall never generate multiple bookings.

---

## 11.8 Payment Records

Each transaction shall store:

| Field             |
| ----------------- |
| Payment ID        |
| Razorpay Order ID |
| Booking ID        |
| Amount            |
| Payment Method    |
| Payment Status    |
| Transaction Date  |

---

## 11.9 Counter Payments

Counter bookings may use:

* CASH
* UPI

Counter bookings may bypass Razorpay entirely.

---

# 12. Promo Code Management Module

## 12.1 Purpose

The system shall support promotional discounts through promo codes.

---

## 12.2 Promo Code Types

Supported types:

### Fixed Discount

Example:

SAVE50

Discount = ₹50

---

### Percentage Discount

Example:

SAVE10

Discount = 10%

---

### Complimentary Ticket

Example:

FREEPASS

Discount = 100%

---

## 12.3 Promo Code Information

Each promo code shall contain:

| Field          |
| -------------- |
| Promo Code     |
| Description    |
| Discount Type  |
| Discount Value |
| Start Date     |
| Expiry Date    |
| Usage Limit    |
| Status         |

---

## 12.4 Usage Restrictions

Administrators shall be able to define:

* Total usage limit
* Per-user limit
* Expiry date
* Applicable events

---

## 12.5 Promo Code Validation

The system shall validate:

* Expiry date
* Usage limit
* Status
* Eligibility

Invalid codes shall be rejected.

---

## 12.6 Promo Code Tracking

The system shall record:

* User
* Booking
* Promo Code
* Discount Amount
* Date

for audit and reporting.

---

# 13. QR Ticket & Entry Verification Module

## 13.1 QR Ticket Generation

Every successful booking shall generate a unique QR code.

Each booking receives one ticket QR.

---

## 13.2 QR Code Data

QR Code shall contain:

* Ticket ID
* Booking ID
* Verification Token

Sensitive data shall not be exposed.

---

## 13.3 Ticket Validation

Authorized staff (users with `scanner` or `admin` role) shall be able to:

* Scan QR code
* Verify ticket
* View ticket details
* Mark ticket as used

Scanner-role users access a dedicated mobile-optimized verification page (`/scanner/index.html`) that contains no other admin functionality. Admin-role users can also verify tickets through the admin panel at `/admin/verify.html`.

---

## 13.4 Validation Process

System shall verify:

* Ticket exists
* Booking exists
* Ticket is valid
* Ticket is not cancelled
* Ticket is not already used

---

## 13.5 Ticket Status

Available statuses:

* Valid
* Used
* Cancelled
* Expired

---

## 13.6 Duplicate Entry Prevention

After successful entry:

Valid → Used

The same ticket cannot be used again.

---

## 13.7 Invalid Ticket Handling

System shall reject:

* Fake QR codes
* Deleted tickets
* Cancelled tickets
* Already-used tickets
* Expired tickets

---

## 13.8 Ticket Verification Interface

Staff shall have a simple interface to:

* Scan QR
* Verify ticket
* View result instantly

The interface shall be mobile-friendly.

### 13.9 Show-Day Ticket Validation

At the auditorium entrance, authorized staff shall scan the ticket QR code using the Ticket Verification interface.

The system shall verify:

* Ticket exists
* Booking exists
* Ticket status is Valid
* Show is active/current
* Ticket has not been used previously

If validation succeeds:

* Entry is allowed
* Ticket status changes from **Valid** to **Used**

If validation fails:

* Entry is denied
* Appropriate error message shall be displayed (Invalid, Cancelled, Expired, or Already Used)

This process shall prevent duplicate entry and unauthorized access.


---

# 14. Email Notification Module

## 14.1 Email Service Provider

The system shall use:

**Resend**

Free Plan for booking-related emails.

---

## 14.2 Authentication Emails

Authentication emails shall be handled by:

**Supabase**

including:

* Email Verification
* Password Reset

Resend shall not be used for authentication emails.

---

## 14.3 Booking Emails

The system shall send:

* Booking Confirmation
* Ticket Delivery
* Booking Cancellation

---

## 14.4 Email Contents

Booking confirmation emails shall include:

* Event Name
* Show Time
* Booking ID
* Seat Numbers
* Ticket Download Link

---

## 14.5 Email Delivery Failure

Failure to send email shall not affect:

* Booking confirmation
* Payment completion
* Ticket generation

Users may always access tickets through their account.

---

## 14.6 SMS & WhatsApp

Not included in Phase 1.

The system shall not require:

* SMS Gateway
* WhatsApp Business API

---

# 15. Ticket Generation & Download Module

## 15.1 Ticket Format

Every confirmed booking shall generate a ticket image.

Preferred format:

PNG

Optional future support:

PDF

---

## 15.2 Ticket Contents

Each ticket shall contain:

* Auditorium Name
* Event Name
* Show Date
* Show Time
* Seat Numbers
* Booking ID
* QR Code

---

## 15.3 Ticket Storage

Generated tickets shall be stored in:

**Supabase Storage**

for future access.

---

## 15.4 Ticket Access

Users shall be able to:

* View ticket
* Download ticket
* Re-download ticket
* Print ticket

from booking history.

---

## 15.5 Ticket Availability

Tickets shall remain available unless:

* Booking is cancelled
* Administrative deletion is performed

---

## 15.6 Ticket Security

Ticket URLs shall not be publicly accessible without authorization.

Access controls shall be enforced through Supabase security policies.

# 16. Administration Dashboard

## 16.1 Purpose

The Administration Dashboard shall provide a centralized interface for managing all auditorium operations.

Only authorized administrators shall have access.

---

## 16.2 Dashboard Overview

The dashboard shall display:

* Today's Bookings
* Today's Revenue
* Upcoming Shows
* Occupancy Percentage
* Recent Bookings
* Recent Administrative Activities

Data shall update automatically where practical.

---

## 16.3 Dashboard Statistics

The dashboard shall provide:

| Metric               |
| -------------------- |
| Total Events         |
| Total Shows          |
| Total Bookings       |
| Total Revenue        |
| Online Bookings      |
| Counter Bookings     |
| Occupancy Percentage |
| Promo Code Usage     |

---

## 16.4 Quick Actions

Administrators shall be able to quickly access:

* Create Event
* Create Show
* View Bookings
* Verify Ticket
* Generate Reports
* Manage Promo Codes

---

## 16.5 Maintenance Mode

Administrators shall be able to enable or disable Maintenance Mode.

When enabled:

* New bookings shall be blocked.
* Public users shall see a maintenance message.
* Existing administrator access shall remain available.

---

# 17. Reports & Analytics Module

## 17.1 Purpose

The system shall provide operational and financial reports.

Reports shall assist management in monitoring performance and occupancy.

---

## 17.2 Daily Revenue Report

The report shall display:

* Date
* Number of Bookings
* Total Revenue
* Online Revenue
* Counter Revenue

---

## 17.3 Monthly Revenue Report

The report shall display:

* Month
* Total Revenue
* Total Bookings
* Average Revenue per Show

---

## 17.4 Event-wise Revenue Report

The report shall display:

* Event Name
* Number of Shows
* Tickets Sold
* Revenue Generated

---

## 17.5 Show-wise Performance Report

The report shall display:

* Show Name
* Show Date
* Capacity
* Tickets Sold
* Occupancy Percentage
* Revenue

---

## 17.6 Occupancy Report

The report shall display:

* Available Seats
* Booked Seats
* Occupancy Percentage

for each show.

---

## 17.7 Promo Code Report

The report shall display:

* Promo Code
* Number of Uses
* Discount Amount Given
* Revenue Impact

---

## 17.8 Booking Source Report

The report shall separate:

### Online Bookings

Bookings created by registered users.

### Counter Bookings

Bookings created by staff.

---

## 17.9 Ticket Verification Report

The report shall display:

* Tickets Scanned
* Valid Entries
* Invalid Attempts
* Duplicate Scan Attempts

---

## 17.10 Report Export

Reports shall support export formats:

* Excel (.xlsx)
* CSV

PDF export may be added later.

---

# 18. Audit Log Module

## 18.1 Purpose

The system shall maintain a complete audit trail of critical activities.

Audit logs shall not be editable by normal users.

---

## 18.2 Logged Activities

The system shall log:

### Event Activities

* Event Created
* Event Updated
* Event Archived

### Show Activities

* Show Created
* Show Updated
* Show Cancelled

### Booking Activities

* Booking Created
* Booking Cancelled

### Promo Code Activities

* Promo Created
* Promo Updated
* Promo Disabled

### User Activities

* User Registration
* User Login
* Password Reset

### Ticket Activities

* Ticket Verified
* Ticket Marked Used

---

## 18.3 Audit Log Information

Each log entry shall contain:

| Field                 |
| --------------------- |
| Log ID                |
| User ID               |
| Action                |
| Module                |
| Record ID             |
| Timestamp             |
| IP Address (Optional) |

---

## 18.4 Audit Log Protection

Audit records:

* Shall not be modified.
* Shall not be deleted through the user interface.
* Shall be available only to administrators.

---

# 19. Security Requirements

## 19.1 Authentication Security

The system shall use:

**Supabase Authentication**

for user authentication and session management.

Passwords shall never be stored directly in application tables.

---

## 19.2 Authorization

Access shall be restricted based on user role. The four roles are `user`, `counter`, `scanner`, and `admin`.

Examples:

| Feature        | User | Counter | Scanner | Admin |
| -------------- | :--: | :-----: | :-----: | :---: |
| Book Ticket    | Yes  | Yes¹    | No      | Yes   |
| Verify Ticket  | No   | No      | Yes     | Yes   |
| Create Event   | No   | No      | No      | Yes   |
| Cancel Booking | No   | No      | No      | Yes   |
| View Reports   | No   | No      | No      | Yes   |
| Manage Users   | No   | No      | No      | Yes   |

> ¹ Counter can create counter bookings for walk-in customers through the admin panel. Admin can book online via the "Book Tickets" sidebar link or make counter bookings.

---

## 19.3 Row Level Security (RLS)

All sensitive tables shall implement Supabase Row Level Security.

Examples:

* Users can access only their bookings.
* Users can access only their tickets.
* Administrators can access all records.

---

## 19.4 Database Security

The system shall:

* Prevent unauthorized data access
* Prevent direct database manipulation from frontend
* Use secure API access methods

---

## 19.5 SQL Injection Protection

The application shall use:

* Parameterized queries
* Supabase client libraries
* Secure database access practices

to prevent SQL Injection attacks.

---

## 19.6 Environment Variables

Sensitive credentials shall never be hardcoded.

Examples:

* Razorpay Keys
* Resend API Key
* Supabase Service Keys

shall be stored securely.

---

## 19.7 Payment Security

The system shall:

* Verify Razorpay signatures
* Validate payment responses
* Prevent payment tampering

---

## 19.8 Abuse Protection

The system shall prevent:

* Excessive booking attempts
* Automated abuse
* Repeated rapid requests

without impacting legitimate users.

---

## 19.9 Data Privacy

The system shall protect:

* User information
* Booking history
* Payment records

in accordance with applicable privacy requirements.

---

# 20. Reliability, Backup & Recovery

## 20.1 Transaction Integrity

Critical operations shall use database transactions.

Examples:

* Seat Allocation
* Booking Confirmation
* Payment Processing

---

## 20.2 Double Booking Prevention

The system shall enforce database-level constraints ensuring:

One Seat + One Show = One Confirmed Booking

under all conditions.

---

## 20.3 Failure Recovery

If an operation fails:

* Changes shall be rolled back.
* Data corruption shall be prevented.
* Seats shall be released where applicable.

---

## 20.4 Realtime Reliability

Seat availability updates shall be synchronized using Supabase Realtime.

Users shall always see current availability.

---

## 20.5 Backup Strategy

The system shall use:

**Supabase Managed Backups**

for database protection.

No separate backup server is required.

---

## 20.6 Manual Data Export

Administrators shall be able to export:

* Revenue Reports
* Booking Reports
* Occupancy Reports

for record-keeping purposes.

---

## 20.7 Restore Procedures

Administrative documentation shall include procedures for:

* Database restoration
* Data export recovery
* Incident handling

---

## 20.8 System Availability

The application shall be designed for high availability using:

* **Cloudflare Pages**
* **Supabase**
* **Razorpay**

managed infrastructure services.

---

## 20.9 Logging & Monitoring

The system shall maintain logs for:

* Booking failures
* Payment failures
* Authentication failures
* Ticket verification failures

to assist in troubleshooting and operational monitoring.


# 21. Non-Functional Requirements

The application shall:

* Be mobile responsive.
* Load quickly on normal internet connections.
* Support modern browsers.
* Prevent double booking.
* Maintain data integrity.
* Provide a simple and user-friendly interface.
* Be easy to maintain and update.
* Use supaabse default authentication and authorization.
* Operate reliably using Cloudflare and Supabase infrastructure.

---

# 22. Acceptance Criteria

The system shall be considered complete when:

* Users can register and login.
* Events and shows can be managed.
* Real-time seat booking works correctly.
* Seat locking prevents duplicate bookings.
* Razorpay payments work successfully.
* QR tickets are generated automatically.
* QR ticket verification works correctly.
* Production deployment is operational.

---

# 23. Final Deliverables

The completed solution shall include:

* Public Ticket Booking Website
* User Account System
* Event & Show Management
* Real-Time Seat Booking
* Counter Booking Module
* Razorpay Payment Integration
* QR Ticket Generation
* QR Ticket Verification
* Promo Code Management
* Reporting Dashboard
* Audit Logging
* Production Deployment

---

# 24. Technology Deployment

| Component      | Platform            |
| -------------- | ------------------- |
| Frontend       | Cloudflare Pages    |
| Authentication | Supabase Auth       |
| Database       | Supabase PostgreSQL |
| Storage        | Supabase Storage    |
| Realtime       | Supabase Realtime   |
| Email          | Resend (Free Plan)  |
| Payments       | Razorpay            |

---
