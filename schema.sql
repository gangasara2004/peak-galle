-- ============================================================
-- PEAK Nuwara Eliya — Full Schema v2
-- Run in Supabase → SQL Editor → New Query
-- ============================================================

-- ── BOOKINGS ──
CREATE TABLE IF NOT EXISTS bookings (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_ref   TEXT        UNIQUE NOT NULL,
  name          TEXT        NOT NULL,
  email         TEXT        NOT NULL,
  phone         TEXT        NOT NULL,
  seats         INTEGER     NOT NULL DEFAULT 1,
  city          TEXT        NOT NULL,
  age_group     TEXT,
  ref_source    TEXT,
  notes         TEXT,
  status        TEXT        DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled')),
  payment_status TEXT       DEFAULT 'unpaid'  CHECK (payment_status IN ('unpaid','slip_uploaded','approved','rejected')),
  payment_slip_url TEXT,
  qr_sent       BOOLEAN     DEFAULT FALSE,
  qr_token      TEXT        UNIQUE,
  attended      BOOLEAN     DEFAULT FALSE,
  attended_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── BUSES ──
CREATE TABLE IF NOT EXISTS buses (
  id          UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT  NOT NULL DEFAULT 'Bus 1',
  rows        INT   NOT NULL DEFAULT 10,
  cols        INT   NOT NULL DEFAULT 4,
  total_seats INT   GENERATED ALWAYS AS (rows * cols) STORED,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO buses (name, rows, cols) VALUES ('Bus 1', 11, 4) ON CONFLICT DO NOTHING;

-- ── SEAT ASSIGNMENTS ──
CREATE TABLE IF NOT EXISTS seat_assignments (
  id          UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id  UUID  REFERENCES bookings(id) ON DELETE CASCADE,
  bus_id      UUID  REFERENCES buses(id) ON DELETE CASCADE,
  seat_number TEXT  NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bus_id, seat_number)
);

-- ── ADMIN ROLES ──
CREATE TABLE IF NOT EXISTS admin_roles (
  id        UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id   UUID  REFERENCES auth.users(id) ON DELETE CASCADE,
  email     TEXT  NOT NULL UNIQUE,
  role      TEXT  DEFAULT 'admin' CHECK (role IN ('super_admin','admin')),
  added_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── TRIP CONFIG ──
CREATE TABLE IF NOT EXISTS trip_config (
  key   TEXT PRIMARY KEY,
  value TEXT DEFAULT ''
);
INSERT INTO trip_config (key, value) VALUES
  ('trip_date',      ''),('ticket_price',''),('total_capacity','50'),
  ('bookings_open',  'true'),('show_price','false'),('trip_name','Nuwara Eliya Day Expedition'),
  ('org_name',       'PEAK Adventures'),('contact_email','gangasarajayawickrama@gmail.com'),
  ('contact_phone',  ''),('bank_name',''),('bank_account',''),('bank_branch','')
ON CONFLICT (key) DO NOTHING;

-- ── AUTO updated_at ──
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at=NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS bookings_updated_at ON bookings;
CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS ──
ALTER TABLE bookings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_roles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_config      ENABLE ROW LEVEL SECURITY;
ALTER TABLE buses            ENABLE ROW LEVEL SECURITY;
ALTER TABLE seat_assignments ENABLE ROW LEVEL SECURITY;

-- Drop old policies safely
DO $$ BEGIN
  DROP POLICY IF EXISTS "Public can insert bookings"  ON bookings;
  DROP POLICY IF EXISTS "Admins can read bookings"    ON bookings;
  DROP POLICY IF EXISTS "Admins can update bookings"  ON bookings;
  DROP POLICY IF EXISTS "Admins can delete bookings"  ON bookings;
  DROP POLICY IF EXISTS "Public can read own booking" ON bookings;
  DROP POLICY IF EXISTS "Admins can read roles"       ON admin_roles;
  DROP POLICY IF EXISTS "Admins can insert roles"     ON admin_roles;
  DROP POLICY IF EXISTS "Admins can delete roles"     ON admin_roles;
  DROP POLICY IF EXISTS "Public can read config"      ON trip_config;
  DROP POLICY IF EXISTS "Admins can update config"    ON trip_config;
  DROP POLICY IF EXISTS "Admins manage buses"         ON buses;
  DROP POLICY IF EXISTS "Public can read buses"       ON buses;
  DROP POLICY IF EXISTS "Admins manage seats"         ON seat_assignments;
  DROP POLICY IF EXISTS "Public can read own seat"    ON seat_assignments;
END $$;

-- Bookings
CREATE POLICY "Public can insert bookings"  ON bookings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public can read own booking" ON bookings FOR SELECT TO anon USING (true);
CREATE POLICY "Admins can read bookings"    ON bookings FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM admin_roles WHERE user_id=auth.uid()));
CREATE POLICY "Admins can update bookings"  ON bookings FOR UPDATE TO authenticated USING (EXISTS(SELECT 1 FROM admin_roles WHERE user_id=auth.uid()));
CREATE POLICY "Admins can delete bookings"  ON bookings FOR DELETE TO authenticated USING (EXISTS(SELECT 1 FROM admin_roles WHERE user_id=auth.uid()));

-- Admin roles
CREATE POLICY "Admins can read roles"   ON admin_roles FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM admin_roles WHERE user_id=auth.uid()));
CREATE POLICY "Admins can insert roles" ON admin_roles FOR INSERT TO authenticated WITH CHECK (EXISTS(SELECT 1 FROM admin_roles WHERE user_id=auth.uid()));
CREATE POLICY "Admins can delete roles" ON admin_roles FOR DELETE TO authenticated USING (EXISTS(SELECT 1 FROM admin_roles WHERE user_id=auth.uid()));
CREATE POLICY "Admins can update roles" ON admin_roles FOR UPDATE TO authenticated USING (EXISTS(SELECT 1 FROM admin_roles WHERE user_id=auth.uid()));

-- Trip config
CREATE POLICY "Public can read config"   ON trip_config FOR SELECT TO anon USING (true);
CREATE POLICY "Admins can update config" ON trip_config FOR ALL TO authenticated USING (EXISTS(SELECT 1 FROM admin_roles WHERE user_id=auth.uid()));

-- Buses
CREATE POLICY "Public can read buses" ON buses FOR SELECT TO anon USING (true);
CREATE POLICY "Admins manage buses"   ON buses FOR ALL TO authenticated USING (EXISTS(SELECT 1 FROM admin_roles WHERE user_id=auth.uid()));

-- Seat assignments
CREATE POLICY "Public can read own seat" ON seat_assignments FOR SELECT TO anon USING (true);
CREATE POLICY "Admins manage seats"      ON seat_assignments FOR ALL TO authenticated USING (EXISTS(SELECT 1 FROM admin_roles WHERE user_id=auth.uid()));

-- ── STORAGE BUCKET for payment slips ──
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-slips', 'payment-slips', false) ON CONFLICT DO NOTHING;
CREATE POLICY "Anyone can upload slip" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id='payment-slips');
CREATE POLICY "Admins can read slips"  ON storage.objects FOR SELECT TO authenticated USING (bucket_id='payment-slips' AND EXISTS(SELECT 1 FROM admin_roles WHERE user_id=auth.uid()));
CREATE POLICY "Admins can delete slips" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='payment-slips' AND EXISTS(SELECT 1 FROM admin_roles WHERE user_id=auth.uid()));

-- ── REALTIME ──
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE seat_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE buses;

-- ============================================================
-- After running this, go to:
-- Authentication → Users → Invite User → gangasarajayawickrama@gmail.com
-- Then run:
-- INSERT INTO admin_roles (user_id, email, role)
-- SELECT id, email, 'super_admin' FROM auth.users WHERE email = 'gangasarajayawickrama@gmail.com';
-- ============================================================
