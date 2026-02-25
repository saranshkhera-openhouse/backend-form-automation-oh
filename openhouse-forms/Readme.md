# Openhouse Forms

Multi-form property management system for Openhouse. Ground staff fills visit forms on-site, sales reps fill token forms in office — all linked by UID.

## Stack

- **Backend:** Node.js + Express
- **Database:** PostgreSQL (Neon — free tier)
- **Hosting:** Render (free tier)
- **PDF:** PDFKit (server-side generation)
- **Frontend:** Vanilla HTML/CSS/JS (no build step)

## URLs

| Page        | Path     | Who uses it               |
|------------|----------|---------------------------|
| Visit Form | `/visit` | Ground staff (mobile)     |
| Token Form | `/token` | Sales rep (desktop)       |
| Admin      | `/admin` | Manager (overview)        |

---

## 🚀 Deployment Guide (Step by Step)

### Step 1: Set up Neon Database (free)

1. Go to [neon.tech](https://neon.tech) → Sign up (free, no credit card)
2. Click **"New Project"** → Name it `openhouse`
3. Copy the **Connection String** — looks like:
   ```
   postgresql://user:password@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Keep this — you'll need it in Step 3

### Step 2: Push to GitHub

1. Create a new repo on GitHub (e.g. `openhouse-forms`)
2. In your terminal:
   ```bash
   cd openhouse-forms
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/openhouse-forms.git
   git push -u origin main
   ```

### Step 3: Deploy on Render (free)

1. Go to [render.com](https://render.com) → Sign up
2. Click **"New +" → "Web Service"**
3. Connect your GitHub repo
4. Configure:
   - **Name:** `openhouse-forms`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Add **Environment Variable:**
   - Key: `DATABASE_URL`
   - Value: *(paste Neon connection string from Step 1)*
6. Click **"Deploy"**

### Step 4: Seed Society Data

After first deploy, open the Render **Shell** (or run locally):

```bash
npm run seed
```

This loads all city/locality/society data into the database.

### Done! 🎉

Your app is live at: `https://openhouse-forms.onrender.com`

- Visit form: `https://openhouse-forms.onrender.com/visit`
- Token form: `https://openhouse-forms.onrender.com/token`
- Admin: `https://openhouse-forms.onrender.com/admin`

---

## Local Development

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/openhouse-forms.git
cd openhouse-forms

# 2. Install
npm install

# 3. Configure
cp .env.example .env
# Edit .env → paste your Neon DATABASE_URL

# 4. Run migrations + seed
npm run seed

# 5. Start
npm start
# → Open http://localhost:3000/visit
```

---

## Adding More Societies

Edit `db/seed.js` → add rows to the `SOCIETIES` array → run `npm run seed`.

Example:
```js
["Greater Noida", "Sector Alpha", "ATS Pristine"],
["Greater Noida", "Sector Zeta", "Gaur Yamuna City"],
```

---

## File Structure

```
openhouse-forms/
├── server.js              # Express server (auto-migrates on start)
├── package.json
├── .env.example           # Template for environment variables
├── .gitignore
├── db/
│   ├── pool.js            # PostgreSQL connection pool
│   ├── migrate.js         # Table creation (runs on startup)
│   └── seed.js            # Society data seed script
├── routes/
│   ├── config.js          # Dropdown data API (cities, localities, societies)
│   ├── visit.js           # Visit form API
│   └── token.js           # Token form API + PDF
├── utils/
│   └── pdf-generator.js   # PDFKit token agreement generator
└── public/
    ├── css/styles.css     # Shared styles
    ├── js/shared.js       # Shared utilities + cascading dropdown logic
    ├── visit.html         # Form 1: Visit (3-page stepper)
    ├── token.html         # Form 2: Token (UID prefill + PDF)
    └── admin.html         # Admin dashboard
```

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/config` | GET | Static dropdown options |
| `/api/config/cities` | GET | All cities from DB |
| `/api/config/localities?city=X` | GET | Localities for a city |
| `/api/config/societies?city=X&locality=Y` | GET | Societies for city+locality |
| `/api/visit/generate-uid` | GET | Generate new UID |
| `/api/visit/submit` | POST | Submit visit form |
| `/api/visit/uids` | GET | List all UIDs |
| `/api/visit/property/:uid` | GET | Full property data |
| `/api/token/prefill/:uid` | GET | Pre-fill data for token |
| `/api/token/submit` | POST | Submit token form |
| `/api/token/pdf/:uid` | GET | Download token PDF |
| `/api/properties` | GET | Admin: all properties |
