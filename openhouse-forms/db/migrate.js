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
  source TEXT, demand_price REAL, first_name TEXT, last_name TEXT, owner_broker_name TEXT, contact_no TEXT,
  city TEXT, locality TEXT, society_name TEXT, unit_no TEXT, tower_no TEXT,
  floor INTEGER, configuration TEXT, area_sqft REAL,
  schedule_submitted_at TIMESTAMPTZ,

  -- Form 2: Visit (Audit)
  extra_area JSONB DEFAULT '[]', bathrooms INTEGER, balconies INTEGER,
  gas_pipeline TEXT, possession_status TEXT, tentative_handover_date DATE,
  club_facility TEXT, parking TEXT, sunlight INTEGER,
  furnishing TEXT, furnishing_details JSONB DEFAULT '[]',
  total_lifts INTEGER, total_floors_tower INTEGER, total_flats_floor INTEGER,
  exit_facing TEXT, exit_compass_image TEXT,
  balcony_details JSONB DEFAULT '[]',
  video_link TEXT, additional_images JSONB DEFAULT '[]',
  visit_submitted_at TIMESTAMPTZ,

  -- Form 3: Token Request
  token_amount_requested REAL,
  cheque_image_url TEXT, cheque_bank_name TEXT, cheque_account_number TEXT, cheque_ifsc TEXT,
  co_owner TEXT, registry_status TEXT, occupancy_status TEXT, key_handover_date DATE,
  guaranteed_sale_price REAL, performance_guarantee REAL,
  initial_period INTEGER, rent_payable_initial_period TEXT,
  grace_period INTEGER, rent_payable_grace_period TEXT,
  outstanding_loan REAL, bank_name_loan TEXT, loan_account_number TEXT, loan_pay_willingness TEXT,
  inclusions TEXT, papers_available TEXT, documents_available JSONB DEFAULT '[]',
  token_remarks TEXT, token_is_draft BOOLEAN DEFAULT FALSE,
  token_submitted_at TIMESTAMPTZ,

  -- Form 4: Deal Terms (for Owner)
  deal_token_amount REAL,
  token_deal_submitted_at TIMESTAMPTZ,

  -- Form 5: Final
  remaining_amount REAL,
  bank_account_number TEXT, bank_name TEXT, ifsc_code TEXT,
  token_transfer_date DATE, neft_reference TEXT,
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
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='tower_no') THEN ALTER TABLE properties ADD COLUMN tower_no TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='first_name') THEN ALTER TABLE properties ADD COLUMN first_name TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='last_name') THEN ALTER TABLE properties ADD COLUMN last_name TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='exit_compass_image') THEN ALTER TABLE properties ADD COLUMN exit_compass_image TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='cheque_bank_name') THEN ALTER TABLE properties ADD COLUMN cheque_bank_name TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='cheque_account_number') THEN ALTER TABLE properties ADD COLUMN cheque_account_number TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='cheque_ifsc') THEN ALTER TABLE properties ADD COLUMN cheque_ifsc TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='key_handover_date') THEN ALTER TABLE properties ADD COLUMN key_handover_date DATE; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='deal_token_amount') THEN ALTER TABLE properties ADD COLUMN deal_token_amount REAL; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='remaining_amount') THEN ALTER TABLE properties ADD COLUMN remaining_amount REAL; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='schedule_submitted_at') THEN ALTER TABLE properties ADD COLUMN schedule_submitted_at TIMESTAMPTZ; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='token_amount_requested') THEN ALTER TABLE properties ADD COLUMN token_amount_requested REAL; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='token_deal_submitted_at') THEN ALTER TABLE properties ADD COLUMN token_deal_submitted_at TIMESTAMPTZ; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='token_is_draft') THEN ALTER TABLE properties ADD COLUMN token_is_draft BOOLEAN DEFAULT FALSE; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='final_submitted_at') THEN ALTER TABLE properties ADD COLUMN final_submitted_at TIMESTAMPTZ; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='balcony_details') THEN ALTER TABLE properties ADD COLUMN balcony_details JSONB DEFAULT '[]'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='owner_broker_name') THEN ALTER TABLE properties ADD COLUMN owner_broker_name TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='listing_asking_price') THEN ALTER TABLE properties ADD COLUMN listing_asking_price REAL; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='listing_availability') THEN ALTER TABLE properties ADD COLUMN listing_availability TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='listing_highlights') THEN ALTER TABLE properties ADD COLUMN listing_highlights TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='listing_description') THEN ALTER TABLE properties ADD COLUMN listing_description TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='listing_submitted_at') THEN ALTER TABLE properties ADD COLUMN listing_submitted_at TIMESTAMPTZ; END IF;
END $$;
`;

module.exports = { MIGRATION_SQL, COMPAT_SQL };
