-- 1. Owners
CREATE TABLE IF NOT EXISTS owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL UNIQUE,
  business_name text,
  city text,
  created_at timestamp DEFAULT now()
);

ALTER TABLE owners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own profile" ON owners
  FOR SELECT USING (auth.uid() = id);

-- 2. Trucks
CREATE TABLE IF NOT EXISTS trucks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  truck_number text NOT NULL,
  epass_number text,
  epass_expiry_date date,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now()
);

ALTER TABLE trucks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own trucks" ON trucks
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert own trucks" ON trucks
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update own trucks" ON trucks
  FOR UPDATE USING (auth.uid() = owner_id);

-- 3. Trips
CREATE TABLE IF NOT EXISTS trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_id uuid NOT NULL REFERENCES trucks(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  driver_name text,
  source_location text,
  destination text,
  material text DEFAULT 'sand',
  trip_start_time timestamp DEFAULT now(),
  trip_end_time timestamp,
  amount numeric,
  payment_status text DEFAULT 'pending',
  status text DEFAULT 'active',
  created_at timestamp DEFAULT now()
);

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own trips" ON trips
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert own trips" ON trips
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update own trips" ON trips
  FOR UPDATE USING (auth.uid() = owner_id);

-- 4. Payments
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  amount numeric,
  paid_at timestamp DEFAULT now(),
  notes text
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own payments" ON payments
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert own payments" ON payments
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- 5. E-Pass Reminders
CREATE TABLE IF NOT EXISTS epass_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_id uuid NOT NULL REFERENCES trucks(id) ON DELETE CASCADE,
  sent_at timestamp DEFAULT now(),
  message_sent text NOT NULL
);

ALTER TABLE epass_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own reminders" ON epass_reminders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM trucks WHERE trucks.id = epass_reminders.truck_id AND trucks.owner_id = auth.uid())
  );

CREATE POLICY "Owners can insert own reminders" ON epass_reminders
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM trucks WHERE trucks.id = epass_reminders.truck_id AND trucks.owner_id = auth.uid())
  );
