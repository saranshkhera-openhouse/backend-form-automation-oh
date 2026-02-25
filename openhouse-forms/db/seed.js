require('dotenv').config();
const pool = require('./pool');

// ═══════════════════════════════════════════════════════════
// MASTER DATA: City → Locality → Society
// Extracted from the uploaded Excel screenshot.
// To add more societies later, just add rows here and re-run:
//   node db/seed.js
// ═══════════════════════════════════════════════════════════

const SOCIETIES = [
  // ── GURGAON ──
  ["Gurgaon", "Sector 104", "Hero Homes"],
  ["Gurgaon", "Sector 102", "Shapoorji Pallonji Joyville Gurugram"],
  ["Gurgaon", "Sector 69", "Tulip Yellow"],
  ["Gurgaon", "Sector 65", "M3M Heights"],
  ["Gurgaon", "Sector 67A", "Ireo The Corridors"],
  ["Gurgaon", "Sector 59", "Conscient Elevate"],
  ["Gurgaon", "Sector 106", "Godrej Meridien"],
  ["Gurgaon", "Sector 108", "Sobha City"],
  ["Gurgaon", "Sector 89", "Smart World Gems"],
  ["Gurgaon", "Sector 102", "Adani M2K Oyster Grande"],
  ["Gurgaon", "Sector 66", "Emaar MGF The Palm Drive"],
  ["Gurgaon", "Sector 79", "Bestech Altura"],
  ["Gurgaon", "Sector 69", "Tulip Violet"],
  ["Gurgaon", "Sector 61", "Smart World Orchard"],
  ["Gurgaon", "Sector 104", "Puri Emerald Bay"],
  ["Gurgaon", "Sector 65", "M3M Golfestate"],
  ["Gurgaon", "Sector 81", "DLF The Ultima"],

  // ── NOIDA ──
  ["Noida", "Sector 43", "Godrej Woods"],
  ["Noida", "Sector 4", "Amrapali Golf Homes"],
  ["Noida", "Sector 137", "Paras Tierea"],
  ["Noida", "Sector 107", "Amrapali HeartBeat City"],
  ["Noida", "Sector Chi 5", "Purvanchal Royal City"],
  ["Noida", "Sector 16C", "Gaur City 2 14th Avenue"],
  ["Noida", "Sector 76", "Amrapali Silicon City"],
  ["Noida", "Sector 121", "ABA Cleo County"],
  ["Noida", "Sector 1 West", "ACE Divino"],
  ["Noida", "Sector 134", "Jaypee Greens Kosmos"],
  ["Noida", "Sector 16", "Panchsheel Greens 2"],
  ["Noida", "Sector 74", "Supertech Cape Town"],
  ["Noida", "Sector 110", "3C Lotus Panache"],
  ["Noida", "Sector 152", "Ace Starlit"],
  ["Noida", "Techzone 4 West", "Gaur Saundaryam"],
  ["Noida", "Sector 150", "ACE Parkway"],
  ["Noida", "Techzone 4 West", "Nirala Estate"],

  // ── GHAZIABAD ──
  ["Ghaziabad", "Siddharth Vihar", "Prateek Grand City"],
  ["Ghaziabad", "Ahinsa Khand 1", "ATS Advantage"],
  ["Ghaziabad", "Vaibhav Khand", "Saya Gold Avenue"],
  ["Ghaziabad", "Ahinsa Khand 2", "Niho Scottish Garden"],
  ["Ghaziabad", "NH 24 Highway", "Landcraft Golflinks"],
  ["Ghaziabad", "Ahinsa Khand 2", "Trine Towers"],
  ["Ghaziabad", "Raj Nagar Extension", "VVIP Addresses"],
  ["Ghaziabad", "Crossing Republik", "Panchsheel Wellington"],
  ["Ghaziabad", "NH 24 Highway", "Mahagun Puram"],
  ["Ghaziabad", "Sector 1 Vaishali", "Rishabh Cloud 9 Towers"],
  ["Ghaziabad", "Raj Nagar Extension", "KW Srishti"],
  ["Ghaziabad", "Crossing Republik", "Paramount Symphony"],
  ["Ghaziabad", "Ahinsa Khand 2", "Angel Jupiter"],
  ["Ghaziabad", "Raj Nagar Extension", "Eureka Diya Greencity"],
  ["Ghaziabad", "Crossing Republik", "Ajnara Gen 10"],
  ["Ghaziabad", "Raj Nagar Extension", "SVP Gulmohur Garden"],
  ["Ghaziabad", "NH 24 Highway", "Wave Dream Homes"],
];

async function seed() {
  console.log('Seeding society data...');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Clear existing data (safe re-run)
    await client.query('DELETE FROM master_societies');

    // Insert all rows
    const insertSQL = `
      INSERT INTO master_societies (city, locality, society_name)
      VALUES ($1, $2, $3)
      ON CONFLICT (city, locality, society_name) DO NOTHING
    `;

    for (const [city, locality, society] of SOCIETIES) {
      await client.query(insertSQL, [city, locality, society]);
    }

    await client.query('COMMIT');

    // Print summary
    const result = await client.query(`
      SELECT city, COUNT(*) as count 
      FROM master_societies 
      GROUP BY city ORDER BY city
    `);
    console.log('✓ Seeded society data:');
    result.rows.forEach(r => console.log(`  ${r.city}: ${r.count} societies`));
    console.log(`  Total: ${SOCIETIES.length} rows`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  seed().catch(() => process.exit(1));
}

module.exports = { seed, SOCIETIES };
