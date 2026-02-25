require('dotenv').config();
const pool = require('./pool');

const MIGRATION_SQL = `

-- ═══════════════════════════════════════════════
-- MASTER SOCIETIES (City → Locality → Society)
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS master_societies (
  id            SERIAL PRIMARY KEY,
  city          TEXT NOT NULL,
  locality      TEXT NOT NULL,
  society_name  TEXT NOT NULL,
  UNIQUE(city, locality, society_name)
);

CREATE INDEX IF NOT EXISTS idx_ms_city ON master_societies(city);
CREATE INDEX IF NOT EXISTS idx_ms_city_loc ON master_societies(city, locality);

-- ═══════════════════════════════════════════════
-- PROPERTIES (all form data, UID is the key)
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS properties (
  uid                             TEXT PRIMARY KEY,

  -- ── Visit Form: Page 1 (Property Info) ──
  source                          TEXT,
  demand_price                    INTEGER,
  owner_first_name                TEXT,
  owner_last_name                 TEXT,
  broker_first_name               TEXT,
  broker_last_name                TEXT,
  contact_no                      TEXT,
  city                            TEXT,
  locality                        TEXT,
  society_name                    TEXT,
  unit_no                         TEXT,
  floor                           INTEGER,
  configuration                   TEXT,
  area_sqft                       REAL,
  extra_area                      JSONB DEFAULT '[]',
  bathrooms                       INTEGER,
  balconies                       INTEGER,

  -- ── Visit Form: Page 2 (Amenities) ──
  gas_pipeline                    TEXT,
  possession_status               TEXT,
  club_facility                   TEXT,
  parking                         TEXT,
  sunlight                        INTEGER,
  furnishing                      TEXT,
  furnishing_details              JSONB DEFAULT '[]',
  total_lifts                     INTEGER,
  total_floors_tower              INTEGER,
  total_flats_floor               INTEGER,

  -- ── Visit Form: Page 3 (Facing & Views) ──
  exit_facing                     TEXT,
  master_bedroom_balcony_facing   TEXT,
  master_bedroom_balcony_view     TEXT,
  master_bedroom_compass_link     TEXT,
  second_bedroom_balcony_facing   TEXT,
  second_bedroom_balcony_view     TEXT,
  second_bedroom_compass_link     TEXT,
  third_bedroom_balcony_facing    TEXT,
  third_bedroom_balcony_view      TEXT,
  third_bedroom_compass_link      TEXT,
  kitchen_balcony_facing          TEXT,
  kitchen_balcony_view            TEXT,
  living_room_balcony1_facing     TEXT,
  living_room_balcony1_view       TEXT,
  living_room_balcony2_facing     TEXT,
  living_room_balcony2_view       TEXT,
  video_link                      TEXT,

  -- ── Token Form ──
  co_owner                        TEXT,
  registry_status                 TEXT,
  occupancy_status                TEXT,
  inclusions                      TEXT,
  guaranteed_sale_price           REAL,
  performance_guarantee           REAL,
  full_registry_willingness       TEXT,
  initial_period                  INTEGER,
  grace_period                    INTEGER,
  grace_period_alignment          TEXT,
  outstanding_loan                REAL,
  bank_name_loan                  TEXT,
  loan_account_number             TEXT,
  loan_pay_willingness            TEXT,
  papers_available                TEXT,
  documents_available             TEXT,
  bank_account_number             TEXT,
  bank_name                       TEXT,
  ifsc_code                       TEXT,
  token_paid                      REAL,
  token_transfer_date             DATE,
  neft_reference                  TEXT,
  token_remarks                   TEXT,

  -- ── Listing Form (future) ──
  listing_data                    JSONB,

  -- ── Timestamps ──
  visit_submitted_at              TIMESTAMPTZ,
  token_submitted_at              TIMESTAMPTZ,
  listing_submitted_at            TIMESTAMPTZ,
  created_at                      TIMESTAMPTZ DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prop_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_prop_society ON properties(society_name);
CREATE INDEX IF NOT EXISTS idx_prop_created ON properties(created_at DESC);

`;

async function migrate() {
  console.log('Running migrations...');
  try {
    await pool.query(MIGRATION_SQL);
    console.log('✓ Migrations complete');
  } catch (err) {
    console.error('Migration failed:', err.message);
    throw err;
  } finally {
    await pool.end();
  }
}

// Run directly if called as script
if (require.main === module) {
  migrate().catch(() => process.exit(1));
}

module.exports = { migrate, MIGRATION_SQL };
