# ViroCalc — Vercel + Next.js Business Manager

Single project, deploys to Vercel for free. No separate backend server needed.

---

## 🚀 Setup in 5 Minutes

### Step 1 — Add MongoDB URL
Open `.env.local` and replace:
```
MONGODB_URL=your_mongodb_atlas_connection_string_here
JWT_SECRET=virocalc_secret_2026
```
Get MongoDB URL from: **Atlas → Cluster → Connect → Drivers → copy connection string**
Replace `<password>` with your actual DB password.

### Step 2 — Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000

### Step 3 — Login
- **Username:** `asjid`
- **Password:** `viro2024`

---

## ✏️ Change Username / Password
Open `app/api/auth/route.js` lines 5–6:
```js
const USERNAME = 'asjid'
const PASSWORD = 'viro2024'
```
Change and save — done. No database or hashing needed.

---

## 🌐 Deploy to Vercel (Free)

### Option A — GitHub (Recommended)
1. Push this folder to a **private** GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project → Import repo
3. Add Environment Variables in Vercel dashboard:
   - `MONGODB_URL` = your Atlas connection string
   - `JWT_SECRET`  = any random string (e.g. `virocalc2026xsecret`)
4. Click **Deploy** → done ✅

### Option B — Vercel CLI
```bash
npm i -g vercel
vercel
# Follow prompts, then add env vars in Vercel dashboard
```

---

## 📁 Structure
```
virocalc/
├── app/
│   ├── api/              ← All backend API routes (runs on Vercel serverless)
│   │   ├── auth/         ← POST /api/auth (login)
│   │   ├── stocks/       ← CRUD stocks
│   │   ├── products/     ← CRUD products + quick stock
│   │   ├── costs/        ← CRUD costs
│   │   ├── daily/        ← CRUD daily records + summary
│   │   └── marketing/    ← CRUD campaigns
│   ├── dashboard/        ← Dashboard page
│   ├── stocks/           ← Stocks list + detail
│   ├── calculator/       ← Price calculator
│   ├── daily/            ← Daily records
│   ├── marketing/        ← Ad campaigns
│   ├── search/           ← Product search
│   └── login/            ← Login page
├── components/
│   ├── AppShell.jsx      ← Sidebar + bottom nav
│   ├── AuthGuard.jsx     ← Redirects to login if no token
│   └── Toast.jsx         ← Notifications
├── lib/
│   ├── db.js             ← MongoDB connection (cached)
│   ├── auth.js           ← JWT sign/verify
│   ├── apiClient.js      ← Frontend fetch wrapper
│   └── format.js         ← fmt(), fmtDate(), csvDownload()
├── models/
│   └── index.js          ← All Mongoose models
├── .env.local            ← Add MONGODB_URL here (never commit this)
└── credentials.js        ← Reference file (actual credentials in auth/route.js)
```

---

## ⚠️ Important Notes

- **Never commit `.env.local`** to GitHub — it contains your DB password
- MongoDB Atlas free tier (M0) is enough — 512MB storage, no expiry
- Vercel free tier handles this perfectly — serverless functions + static pages
- JWT sessions last 30 days — users stay logged in automatically

---

## Features
✅ Login (hardcoded, JWT 30-day session)  
✅ Dashboard with P&L chart  
✅ Stocks — purchase batches with products + costs  
✅ Per-product price calculator with live formula display  
✅ Event buffer (-10%/-15% off for Eid/sale)  
✅ Quick stock update popup (sold/add without opening product)  
✅ Daily records — sales + COD returns + other expenses  
✅ Marketing campaigns — ROAS, CPO, per-platform  
✅ Search across all stocks by code or name  
✅ CSV export on every screen  
✅ Dark mode toggle  
✅ Mobile-first (bottom nav on mobile, sidebar on desktop)  
✅ Low stock alerts (qty < 5)  
