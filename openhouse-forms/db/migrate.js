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

  -- Visit: Page 1 - Property
  source TEXT, demand_price REAL, owner_broker_name TEXT, contact_no TEXT,
  city TEXT, locality TEXT, society_name TEXT, unit_no TEXT,
  floor INTEGER, configuration TEXT, area_sqft REAL,
  extra_area JSONB DEFAULT '[]', bathrooms INTEGER, balconies INTEGER,

  -- Visit: Page 2 - Amenities
  gas_pipeline TEXT, possession_status TEXT, tentative_handover_date DATE,
  club_facility TEXT, parking TEXT, sunlight INTEGER,
  furnishing TEXT, furnishing_details JSONB DEFAULT '[]',
  total_lifts INTEGER, total_floors_tower INTEGER, total_flats_floor INTEGER,

  -- Visit: Page 3 - Balcony Details
  balcony_details JSONB DEFAULT '[]',

  -- Visit: Page 4 - Facing & Media
  exit_facing TEXT,
  master_bedroom_balcony_facing TEXT, master_bedroom_balcony_view TEXT, master_bedroom_compass_link TEXT,
  second_bedroom_balcony_facing TEXT, second_bedroom_balcony_view TEXT, second_bedroom_compass_link TEXT,
  third_bedroom_balcony_facing TEXT, third_bedroom_balcony_view TEXT, third_bedroom_compass_link TEXT,
  kitchen_balcony_facing TEXT, kitchen_balcony_view TEXT,
  living_room_balcony1_facing TEXT, living_room_balcony1_view TEXT,
  living_room_balcony2_facing TEXT, living_room_balcony2_view TEXT,
  video_link TEXT, image_urls JSONB DEFAULT '[]',

  -- Token Request (no NEFT)
  co_owner TEXT, registry_status TEXT, occupancy_status TEXT, inclusions TEXT,
  guaranteed_sale_price REAL, performance_guarantee REAL,
  full_registry_willingness TEXT, initial_period INTEGER, grace_period INTEGER,
  rent_payable_period TEXT, rent_payable_grace_period TEXT,
  outstanding_loan REAL, bank_name_loan TEXT, loan_account_number TEXT,
  loan_pay_willingness TEXT, papers_available TEXT, documents_available TEXT,
  token_remarks TEXT, token_is_draft BOOLEAN DEFAULT FALSE,

  -- Final Token (NEFT)
  bank_account_number TEXT, bank_name TEXT, ifsc_code TEXT,
  token_paid REAL, token_transfer_date DATE, neft_reference TEXT,

  -- Timestamps
  visit_submitted_at TIMESTAMPTZ, token_submitted_at TIMESTAMPTZ,
  final_submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prop_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_prop_created ON properties(created_at DESC);
`;

const COMPAT_SQL = `
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='owner_broker_name') THEN ALTER TABLE properties ADD COLUMN owner_broker_name TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='rent_payable_period') THEN ALTER TABLE properties ADD COLUMN rent_payable_period TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='rent_payable_grace_period') THEN ALTER TABLE properties ADD COLUMN rent_payable_grace_period TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='tentative_handover_date') THEN ALTER TABLE properties ADD COLUMN tentative_handover_date DATE; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='balcony_details') THEN ALTER TABLE properties ADD COLUMN balcony_details JSONB DEFAULT '[]'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='image_urls') THEN ALTER TABLE properties ADD COLUMN image_urls JSONB DEFAULT '[]'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='token_is_draft') THEN ALTER TABLE properties ADD COLUMN token_is_draft BOOLEAN DEFAULT FALSE; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='final_submitted_at') THEN ALTER TABLE properties ADD COLUMN final_submitted_at TIMESTAMPTZ; END IF;
END $$;
`;

module.exports = { MIGRATION_SQL, COMPAT_SQL };
