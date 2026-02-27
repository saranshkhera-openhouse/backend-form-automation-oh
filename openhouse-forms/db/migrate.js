require('dotenv').config();
const pool = require('./pool');

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS master_societies (
  id SERIAL PRIMARY KEY,
  city TEXT NOT NULL, locality TEXT NOT NULL, society_name TEXT NOT NULL,
  UNIQUE(city, locality, society_name)
);
CREATE INDEX IF NOT EXISTS idx_ms_city ON master_societies(city);

CREATE TABLE IF NOT EXISTS properties (
  uid TEXT PRIMARY KEY,

  -- Form 1: Visit Schedule
  schedule_date DATE, schedule_time TEXT, lead_id TEXT, field_exec TEXT,
  source TEXT, demand_price REAL, owner_broker_name TEXT, contact_no TEXT,
  city TEXT, locality TEXT, society_name TEXT, unit_no TEXT,
  floor INTEGER, configuration TEXT, area_sqft REAL,
  schedule_submitted_at TIMESTAMPTZ,

  -- Form 2: Visit
  extra_area JSONB DEFAULT '[]', bathrooms INTEGER, balconies INTEGER,
  gas_pipeline TEXT, possession_status TEXT, tentative_handover_date DATE,
  club_facility TEXT, parking TEXT, sunlight INTEGER,
  furnishing TEXT, furnishing_details JSONB DEFAULT '[]',
  total_lifts INTEGER, total_floors_tower INTEGER, total_flats_floor INTEGER,
  balcony_details JSONB DEFAULT '[]',
  exit_facing TEXT,
  master_bedroom_balcony_facing TEXT, master_bedroom_balcony_view TEXT, master_bedroom_compass_image TEXT,
  second_bedroom_balcony_facing TEXT, second_bedroom_balcony_view TEXT, second_bedroom_compass_image TEXT,
  third_bedroom_balcony_facing TEXT, third_bedroom_balcony_view TEXT, third_bedroom_compass_image TEXT,
  kitchen_balcony_facing TEXT, kitchen_balcony_view TEXT,
  living_room_balcony1_facing TEXT, living_room_balcony1_view TEXT,
  living_room_balcony2_facing TEXT, living_room_balcony2_view TEXT,
  video_link TEXT, additional_images JSONB DEFAULT '[]',
  visit_submitted_at TIMESTAMPTZ,

  -- Form 3: Token Request
  token_amount_requested REAL,
  co_owner TEXT, registry_status TEXT, occupancy_status TEXT, inclusions TEXT,
  initial_period INTEGER, grace_period INTEGER,
  rent_payable_initial_period TEXT, rent_payable_grace_period TEXT,
  outstanding_loan REAL, bank_name_loan TEXT, loan_account_number TEXT,
  loan_pay_willingness TEXT, papers_available TEXT, documents_available JSONB DEFAULT '[]',
  token_remarks TEXT, token_is_draft BOOLEAN DEFAULT FALSE,
  token_submitted_at TIMESTAMPTZ,

  -- Form 4: Token & Deal Terms (+ NEFT)
  token_amount_paid REAL, cheque_image_url TEXT,
  bank_account_number TEXT, bank_name TEXT, ifsc_code TEXT,
  token_transfer_date DATE, neft_reference TEXT,
  token_deal_submitted_at TIMESTAMPTZ,

  -- Form 5: Final Token (clone of 4, edits later)
  final_submitted_at TIMESTAMPTZ,

  -- Form 6: Listing
  listing_asking_price REAL, listing_availability TEXT,
  listing_highlights TEXT, listing_description TEXT,
  listing_submitted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prop_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_prop_created ON properties(created_at DESC);
`;

const COMPAT_SQL = `
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='schedule_date') THEN ALTER TABLE properties ADD COLUMN schedule_date DATE; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='schedule_time') THEN ALTER TABLE properties ADD COLUMN schedule_time TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='lead_id') THEN ALTER TABLE properties ADD COLUMN lead_id TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='field_exec') THEN ALTER TABLE properties ADD COLUMN field_exec TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='schedule_submitted_at') THEN ALTER TABLE properties ADD COLUMN schedule_submitted_at TIMESTAMPTZ; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='token_amount_requested') THEN ALTER TABLE properties ADD COLUMN token_amount_requested REAL; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='token_amount_paid') THEN ALTER TABLE properties ADD COLUMN token_amount_paid REAL; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='cheque_image_url') THEN ALTER TABLE properties ADD COLUMN cheque_image_url TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='token_deal_submitted_at') THEN ALTER TABLE properties ADD COLUMN token_deal_submitted_at TIMESTAMPTZ; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='master_bedroom_compass_image') THEN ALTER TABLE properties ADD COLUMN master_bedroom_compass_image TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='second_bedroom_compass_image') THEN ALTER TABLE properties ADD COLUMN second_bedroom_compass_image TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='third_bedroom_compass_image') THEN ALTER TABLE properties ADD COLUMN third_bedroom_compass_image TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='additional_images') THEN ALTER TABLE properties ADD COLUMN additional_images JSONB DEFAULT '[]'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='rent_payable_initial_period') THEN ALTER TABLE properties ADD COLUMN rent_payable_initial_period TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='listing_asking_price') THEN ALTER TABLE properties ADD COLUMN listing_asking_price REAL; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='listing_availability') THEN ALTER TABLE properties ADD COLUMN listing_availability TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='listing_highlights') THEN ALTER TABLE properties ADD COLUMN listing_highlights TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='listing_description') THEN ALTER TABLE properties ADD COLUMN listing_description TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='listing_submitted_at') THEN ALTER TABLE properties ADD COLUMN listing_submitted_at TIMESTAMPTZ; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='token_is_draft') THEN ALTER TABLE properties ADD COLUMN token_is_draft BOOLEAN DEFAULT FALSE; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='final_submitted_at') THEN ALTER TABLE properties ADD COLUMN final_submitted_at TIMESTAMPTZ; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='balcony_details') THEN ALTER TABLE properties ADD COLUMN balcony_details JSONB DEFAULT '[]'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='tentative_handover_date') THEN ALTER TABLE properties ADD COLUMN tentative_handover_date DATE; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='owner_broker_name') THEN ALTER TABLE properties ADD COLUMN owner_broker_name TEXT; END IF;
END $$;
`;

module.exports = { MIGRATION_SQL, COMPAT_SQL };
