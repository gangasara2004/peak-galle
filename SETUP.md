# PEAK Nuwara Eliya — Full Setup Guide v2

## Files in this package
- `index.html` — Public booking site
- `admin.html` — Admin dashboard
- `schema.sql` — Run this first in Supabase SQL Editor
- `supabase/functions/send-qr-email/index.ts` — Email edge function
- `SETUP.md` — This guide

---

## STEP 1 — Run the SQL Schema

1. Go to https://supabase.com/dashboard/project/ehzxoapgandezbhuvjrd/sql
2. Click **New Query**
3. Paste the entire contents of `schema.sql`
4. Click **Run**

---

## STEP 2 — Create Your Admin Account

1. Go to **Authentication → Users → Invite User**
2. Enter: `gangasarajayawickrama@gmail.com`
3. Accept the invite email and set your password
4. Then go back to **SQL Editor** and run:

```sql
INSERT INTO admin_roles (user_id, email, role)
SELECT id, email, 'super_admin'
FROM auth.users
WHERE email = 'gangasarajayawickrama@gmail.com';
```

---

## STEP 3 — Create Storage Bucket

1. Go to **Storage → New Bucket**
2. Name: `payment-slips`
3. Public: **OFF** (private)
4. Click Create
   *(The SQL schema also tries to create this automatically)*

---

## STEP 4 — Deploy the Email Edge Function

### Install Supabase CLI
```bash
npm install -g supabase
supabase login
supabase link --project-ref ehzxoapgandezbhuvjrd
```

### Deploy the function
```bash
supabase functions deploy send-qr-email
```

### Set up Resend (free — 3,000 emails/month)
1. Sign up at https://resend.com
2. Copy your API key
3. Run:
```bash
supabase secrets set RESEND_API_KEY=re_your_key_here
supabase secrets set SITE_URL=https://your-site.vercel.app
```

---

## STEP 5 — Host on Vercel via GitHub (Recommended)

### Why Vercel + GitHub?
- Every `git push` auto-deploys — no manual uploads
- Free SSL certificate automatically
- Clean URL like `peak-nuwaraeliya.vercel.app`
- You already use Vercel for PEAK '25 so it's familiar
- Instant rollbacks if something breaks

### How to deploy
1. Create a new GitHub repo (e.g. `peak-nuwaraeliya`)
2. Push your files:
```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/gangasara2004/peak-nuwaraeliya.git
git push -u origin main
```
3. Go to https://vercel.com → **Add New Project**
4. Import the GitHub repo
5. Framework: **Other** (static HTML — no build needed)
6. Click **Deploy**
7. Your site is live at `peak-nuwaraeliya.vercel.app`

### Update your edge function SITE_URL
```bash
supabase secrets set SITE_URL=https://peak-nuwaraeliya.vercel.app
```

---

## STEP 6 — Add Your Organization Logo

1. Replace the logo placeholder in both `index.html` and `admin.html`
2. Find the element with id `nav-logo-img` / `sb-logo-placeholder` / `login-logo`
3. Change from `<div class="logo-placeholder">` to:
```html
<img src="logo.png" alt="PEAK Logo" style="width:36px;height:36px;object-fit:contain">
```
4. Add your `logo.png` file to the project folder
5. Commit and push — Vercel auto-deploys

---

## STEP 7 — Add More Admins Later

**Option A — Via Admin Dashboard:**
1. Open `admin.html` → Admin Users page
2. Enter the new admin's email and select role
3. Click **ADD ADMIN**
4. Then go to Supabase → Authentication → **Invite User** with that email
5. They accept invite, set password, and can log in

**Option B — Via SQL (super admin):**
```sql
-- First invite via Supabase Auth, then:
INSERT INTO admin_roles (user_id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE email = 'newadmin@email.com';
```

---

## How the Full Flow Works

```
Visitor fills booking form
        ↓
Uploads payment slip (stored in Supabase Storage)
        ↓
Booking saved to database (status: pending, payment: slip_uploaded)
        ↓
Admin gets email notification + badge on dashboard
        ↓
Admin opens Payments page → views slip image → Approves or Rejects
        ↓
  [If Approved]                        [If Rejected]
Booking → confirmed                  Rejection email sent to booker
QR Code generated from qr_token      Booker re-uploads slip
QR email sent to booker
        ↓
Admin assigns seat on Bus Seat Map
        ↓
Seat assignment email sent to booker (with updated QR)
        ↓
On event day: Admin scans QR with built-in scanner
        ↓
Attendee's name + seat number shown → attendance marked
```

---

## Admin Dashboard — Feature Summary

| Page | What you can do |
|------|----------------|
| Dashboard | Live metrics, recent bookings, quick confirm/cancel |
| Payments | View payment slips, approve/reject, send QR emails |
| All Bookings | Full table with all fields, attendance status |
| Bus & Seats | Add/remove buses, configure rows/cols, assign seats visually |
| QR Scanner | Camera-based QR scan → marks attendance + shows seat |
| Analytics | Charts: status, seats, cities, age groups, payment, referrals |
| Admin Users | Add/remove admins, assign super_admin or admin role |
| Settings | Org name, logo, trip date/price/capacity, bank details, controls |

---

## Supabase Project
- Dashboard: https://supabase.com/dashboard/project/ehzxoapgandezbhuvjrd
- URL: `https://ehzxoapgandezbhuvjrd.supabase.co`
