require('dotenv').config();
const pool = require('./pool');

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS master_societies (
  id SERIAL PRIMARY KEY,
  city TEXT NOT NULL, locality TEXT NOT NULL, society_name TEXT NOT NULL,
  UNIQUE(city, locality, society_name)
);
CREATE INDEX IF NOT EXISTS idx_ms_city ON master_societies(city);

CREATE TABLE IF NOT EXISTS master_areas (
  id SERIAL PRIMARY KEY,
  society_name TEXT NOT NULL,
  area_sqft REAL NOT NULL,
  UNIQUE(society_name, area_sqft)
);
CREATE INDEX IF NOT EXISTS idx_ma_soc ON master_areas(society_name);

CREATE TABLE IF NOT EXISTS properties (
  uid TEXT PRIMARY KEY,

  -- Form 1: Visit Schedule
  schedule_date DATE, schedule_time TEXT, lead_id TEXT, field_exec TEXT,
  source TEXT, demand_price REAL, first_name TEXT, last_name TEXT, owner_broker_name TEXT, contact_no TEXT,
  city TEXT, locality TEXT, society_name TEXT, unit_no TEXT, tower_no TEXT,
  floor INTEGER, configuration TEXT, area_sqft REAL,
  assigned_by TEXT,
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
  token_requested_by TEXT,
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
  deal_bank_name TEXT, deal_bank_account_number TEXT, deal_ifsc_code TEXT,
  deal_transfer_date DATE, deal_neft_reference TEXT,
  token_deal_submitted_at TIMESTAMPTZ,

  -- Form 5: Final
  remaining_amount REAL,
  bank_account_number TEXT, bank_name TEXT, ifsc_code TEXT,
  token_transfer_date DATE, neft_reference TEXT,
  final_submitted_at TIMESTAMPTZ,

  -- Form 6: Listing
  listing_asking_price REAL, listing_availability TEXT,
  listing_highlights TEXT, listing_description TEXT,
  society_age_years REAL, total_units INTEGER,
  maintenance_charges REAL, society_move_in_charges REAL,
  electricity_charges REAL, water_supply TEXT, dg_charges REAL,
  alpha_beta TEXT, beta_pct REAL, loan_status TEXT, seller_location TEXT,
  current_occupancy_pct REAL, circle_rate REAL, parking_number TEXT,
  listing_submitted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prop_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_prop_created ON properties(created_at DESC);

CREATE TABLE IF NOT EXISTS cp_inventory (
  id SERIAL PRIMARY KEY,
  cp_code TEXT, cp_name TEXT NOT NULL, cp_contact TEXT NOT NULL,
  city TEXT NOT NULL, locality TEXT NOT NULL, society_name TEXT NOT NULL,
  configuration TEXT, floor TEXT, unit_no TEXT,
  size_sqft TEXT, price_expectation TEXT,
  flat_status TEXT, exit_facing TEXT, additional_comments TEXT,
  bulk_inventory_urls JSONB DEFAULT '[]',
  submitted_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cpi_created ON cp_inventory(created_at DESC);

CREATE TABLE IF NOT EXISTS cp_master (
  id SERIAL PRIMARY KEY,
  cp_code TEXT UNIQUE NOT NULL,
  cp_name TEXT NOT NULL,
  cp_phone TEXT,
  cp_firm TEXT,
  cp_email TEXT,
  cp_aadhaar_front_url TEXT,
  cp_aadhaar_back_url TEXT,
  cp_pan_card_url TEXT,
  cp_cancelled_cheque_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cpm_code ON cp_master(cp_code);
CREATE INDEX IF NOT EXISTS idx_cpm_phone ON cp_master(cp_phone);
`;

const COMPAT_SQL = `
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='assigned_by') THEN ALTER TABLE properties ADD COLUMN assigned_by TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='token_requested_by') THEN ALTER TABLE properties ADD COLUMN token_requested_by TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='deal_bank_name') THEN ALTER TABLE properties ADD COLUMN deal_bank_name TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='deal_bank_account_number') THEN ALTER TABLE properties ADD COLUMN deal_bank_account_number TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='deal_ifsc_code') THEN ALTER TABLE properties ADD COLUMN deal_ifsc_code TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='deal_transfer_date') THEN ALTER TABLE properties ADD COLUMN deal_transfer_date DATE; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='deal_neft_reference') THEN ALTER TABLE properties ADD COLUMN deal_neft_reference TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='society_age_years') THEN ALTER TABLE properties ADD COLUMN society_age_years REAL; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='total_units') THEN ALTER TABLE properties ADD COLUMN total_units INTEGER; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='maintenance_charges') THEN ALTER TABLE properties ADD COLUMN maintenance_charges REAL; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='society_move_in_charges') THEN ALTER TABLE properties ADD COLUMN society_move_in_charges REAL; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='electricity_charges') THEN ALTER TABLE properties ADD COLUMN electricity_charges REAL; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='water_supply') THEN ALTER TABLE properties ADD COLUMN water_supply TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='dg_charges') THEN ALTER TABLE properties ADD COLUMN dg_charges REAL; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='alpha_beta') THEN ALTER TABLE properties ADD COLUMN alpha_beta TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='beta_pct') THEN ALTER TABLE properties ADD COLUMN beta_pct REAL; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='loan_status') THEN ALTER TABLE properties ADD COLUMN loan_status TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='seller_location') THEN ALTER TABLE properties ADD COLUMN seller_location TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='current_occupancy_pct') THEN ALTER TABLE properties ADD COLUMN current_occupancy_pct REAL; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='circle_rate') THEN ALTER TABLE properties ADD COLUMN circle_rate REAL; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='parking_number') THEN ALTER TABLE properties ADD COLUMN parking_number TEXT; END IF;
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
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='google_access_token') THEN ALTER TABLE users ADD COLUMN google_access_token TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='google_refresh_token') THEN ALTER TABLE users ADD COLUMN google_refresh_token TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='is_dead') THEN ALTER TABLE properties ADD COLUMN is_dead BOOLEAN DEFAULT FALSE; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='visit_remarks') THEN ALTER TABLE properties ADD COLUMN visit_remarks TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='has_loan') THEN ALTER TABLE properties ADD COLUMN has_loan TEXT DEFAULT 'No'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='token_remarks_printed') THEN ALTER TABLE properties ADD COLUMN token_remarks_printed TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='owner_email') THEN ALTER TABLE properties ADD COLUMN owner_email TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='co_owner_email') THEN ALTER TABLE properties ADD COLUMN co_owner_email TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='co_owner_number') THEN ALTER TABLE properties ADD COLUMN co_owner_number TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='cp_name') THEN ALTER TABLE properties ADD COLUMN cp_name TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='cp_phone') THEN ALTER TABLE properties ADD COLUMN cp_phone TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='cp_firm') THEN ALTER TABLE properties ADD COLUMN cp_firm TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='cp_email') THEN ALTER TABLE properties ADD COLUMN cp_email TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='deal_type') THEN ALTER TABLE properties ADD COLUMN deal_type TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='oh_acquired_model') THEN ALTER TABLE properties ADD COLUMN oh_acquired_model TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='agreed_brokerage') THEN ALTER TABLE properties ADD COLUMN agreed_brokerage TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='deal_value') THEN ALTER TABLE properties ADD COLUMN deal_value TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='total_brokerage_amount') THEN ALTER TABLE properties ADD COLUMN total_brokerage_amount TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='to_be_released_now') THEN ALTER TABLE properties ADD COLUMN to_be_released_now TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='pan_front_url') THEN ALTER TABLE properties ADD COLUMN pan_front_url TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='pan_back_url') THEN ALTER TABLE properties ADD COLUMN pan_back_url TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='aadhaar_front_url') THEN ALTER TABLE properties ADD COLUMN aadhaar_front_url TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='aadhaar_back_url') THEN ALTER TABLE properties ADD COLUMN aadhaar_back_url TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='cp_cancelled_cheque_url') THEN ALTER TABLE properties ADD COLUMN cp_cancelled_cheque_url TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='ama_signed_photo_url') THEN ALTER TABLE properties ADD COLUMN ama_signed_photo_url TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='cp_pan_card_url') THEN ALTER TABLE properties ADD COLUMN cp_pan_card_url TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='cp_aadhaar_front_url') THEN ALTER TABLE properties ADD COLUMN cp_aadhaar_front_url TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='cp_aadhaar_back_url') THEN ALTER TABLE properties ADD COLUMN cp_aadhaar_back_url TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='cp_ama_signed_url') THEN ALTER TABLE properties ADD COLUMN cp_ama_signed_url TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='loan_applicant_name') THEN ALTER TABLE properties ADD COLUMN loan_applicant_name TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='loan_co_applicant_name') THEN ALTER TABLE properties ADD COLUMN loan_co_applicant_name TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='cp_bill_submitted_at') THEN ALTER TABLE properties ADD COLUMN cp_bill_submitted_at TIMESTAMPTZ; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_manager') THEN ALTER TABLE users ADD COLUMN is_manager BOOLEAN DEFAULT FALSE; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='managed_team') THEN ALTER TABLE users ADD COLUMN managed_team JSONB DEFAULT '[]'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='third_owner_email') THEN ALTER TABLE properties ADD COLUMN third_owner_email TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='broker_email') THEN ALTER TABLE properties ADD COLUMN broker_email TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='ama_sanction_url') THEN ALTER TABLE properties ADD COLUMN ama_sanction_url TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='ama_soa_url') THEN ALTER TABLE properties ADD COLUMN ama_soa_url TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='ama_lod_url') THEN ALTER TABLE properties ADD COLUMN ama_lod_url TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='ama_pg_non_forfeitable') THEN ALTER TABLE properties ADD COLUMN ama_pg_non_forfeitable TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='ama_beta_max_pct') THEN ALTER TABLE properties ADD COLUMN ama_beta_max_pct REAL; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='ama_beta_min_pct') THEN ALTER TABLE properties ADD COLUMN ama_beta_min_pct REAL; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='ama_maint_alignment') THEN ALTER TABLE properties ADD COLUMN ama_maint_alignment TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='ama_elec_alignment') THEN ALTER TABLE properties ADD COLUMN ama_elec_alignment TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='ama_special_terms') THEN ALTER TABLE properties ADD COLUMN ama_special_terms TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='ama_prop_docs') THEN ALTER TABLE properties ADD COLUMN ama_prop_docs JSONB DEFAULT '{}'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='ama_submitted_at') THEN ALTER TABLE properties ADD COLUMN ama_submitted_at TIMESTAMPTZ; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='super_area') THEN ALTER TABLE properties ADD COLUMN super_area REAL; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='carpet_area') THEN ALTER TABLE properties ADD COLUMN carpet_area REAL; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='incentive_visit') THEN ALTER TABLE properties ADD COLUMN incentive_visit TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='incentive_owner_meeting') THEN ALTER TABLE properties ADD COLUMN incentive_owner_meeting TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='total_cp_amount') THEN ALTER TABLE properties ADD COLUMN total_cp_amount TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='ama_date') THEN ALTER TABLE properties ADD COLUMN ama_date DATE; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='owner_pan_url') THEN ALTER TABLE properties ADD COLUMN owner_pan_url TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='owner_aadhaar_front_url') THEN ALTER TABLE properties ADD COLUMN owner_aadhaar_front_url TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='owner_aadhaar_back_url') THEN ALTER TABLE properties ADD COLUMN owner_aadhaar_back_url TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='owner_property_doc_url') THEN ALTER TABLE properties ADD COLUMN owner_property_doc_url TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='cp_code') THEN ALTER TABLE properties ADD COLUMN cp_code TEXT; END IF;
END $$;
`;

module.exports = { MIGRATION_SQL, COMPAT_SQL };