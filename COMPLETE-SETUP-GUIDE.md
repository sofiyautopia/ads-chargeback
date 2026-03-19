# 🚀 Ads Chargeback - Full Setup Guide
## VS Code → Railway (Backend) → Supabase (Database) → Vercel (Frontend)

---

## 📋 Prerequisites
- VS Code installed
- Node.js 18+ installed
- Git installed
- Google account (for Google Ads API)
- Railway account (railway.app)
- Supabase account (supabase.com)
- Vercel account (vercel.com)

---

## ⚙️ STEP 1: Setup Google Ads API Credentials

### 1.1 Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project: "Ads Chargeback"
3. Enable APIs:
   - Google Ads API
   - OAuth 2.0 (for authentication)

### 1.2 Create OAuth Credentials
1. Go to Credentials → Create OAuth 2.0 Client ID
2. Type: Web application
3. Authorized redirect URIs:
   - `http://localhost:3000`
   - `https://your-vercel-domain.vercel.app`
   - `https://your-railway-domain.railway.app`
4. Download credentials as JSON
5. Save: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_DEVELOPER_TOKEN`

---

## 💾 STEP 2: Setup Supabase Database

### 2.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up / Log in
3. New project → Name it "ads-chargeback"
4. Save: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`

### 2.2 Create Database Schema
1. In Supabase → SQL Editor
2. Copy entire `supabase-migrations.sql` file
3. Paste into SQL Editor
4. Run all queries
5. Verify tables are created: profiles, rates, chargebacks, invoices

### 2.3 Enable Authentication
1. Supabase → Authentication → Providers
2. Enable: Google OAuth
3. Add Google OAuth credentials from Step 1.2
4. Set redirect URLs to your Vercel domain

---

## 🖥️ STEP 3: Setup Backend (VS Code + Node.js)

### 3.1 Clone/Create Repository
```bash
# In VS Code Terminal
mkdir ads-chargeback
cd ads-chargeback
git init
git remote add origin https://github.com/YOUR_USERNAME/ads-chargeback.git

# Create folders
mkdir backend frontend
```

### 3.2 Backend Setup
```bash
cd backend

# Copy these files:
# - server.js
# - package.json
# - railway.json
# - .env (see next step)

# Install dependencies
npm install

# Create .env file
touch .env
```

### 3.3 Configure .env (Backend)
```env
# Google Ads API
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_DEVELOPER_TOKEN=your_developer_token

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJxxxxx
SUPABASE_SERVICE_KEY=eyJxxxxx

# Server
PORT=5000
NODE_ENV=development
```

### 3.4 Test Locally
```bash
# Start backend
npm run dev

# Should see:
# ✅ Ads Chargeback Backend running on port 5000
# 🔗 Supabase connected

# Test: Go to http://localhost:5000
# Should return JSON status
```

---

## 🚀 STEP 4: Deploy Backend to Railway

### 4.1 Connect to Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize Railway project
cd backend
railway init

# Select: "Create new project"
```

### 4.2 Add Environment Variables
```bash
# In Railway dashboard → Variables
railway variables add GOOGLE_CLIENT_ID "your_value"
railway variables add GOOGLE_CLIENT_SECRET "your_value"
railway variables add GOOGLE_DEVELOPER_TOKEN "your_value"
railway variables add SUPABASE_URL "your_value"
railway variables add SUPABASE_ANON_KEY "your_value"
railway variables add SUPABASE_SERVICE_KEY "your_value"
railway variables add NODE_ENV "production"
```

### 4.3 Deploy
```bash
# Push to Railway
railway up

# Get your Railway URL
railway open

# You'll see: https://ads-chargeback-production.up.railway.app
# Save this URL
```

### 4.4 Verify Deployment
```bash
# Test: 
curl https://your-railway-url.railway.app
# Should return JSON status
```

---

## 🎨 STEP 5: Deploy Frontend to Vercel

### 5.1 Create Vercel Project
```bash
cd frontend

# Copy your HTML file here:
cp ../adscost_chargeback_engine.html .

# Create vercel.json
touch vercel.json
```

### 5.2 Configure vercel.json
```json
{
  "buildCommand": "echo 'Static site'",
  "outputDirectory": ".",
  "framework": "static"
}
```

### 5.3 Update Frontend Configuration
In `adscost_chargeback_engine.html`, update:
```javascript
// Change this line:
const API_BASE_URL = 'http://localhost:5000/api';

// To this (use your Railway URL):
const API_BASE_URL = 'https://your-railway-url.railway.app/api';
```

### 5.4 Deploy to Vercel
```bash
# Option A: Use Vercel CLI
npm install -g vercel
vercel

# Option B: Connect GitHub to Vercel
# 1. Push to GitHub: git push origin main
# 2. Go to vercel.com → Import project
# 3. Select your GitHub repo
# 4. Deploy

# Get Vercel URL: https://your-project.vercel.app
```

### 5.5 Add Vercel URL to Google OAuth
1. Go to Google Cloud Console
2. Authorized redirect URIs → Add: `https://your-vercel-url.vercel.app`

---

## 🔐 STEP 6: Update Authentication

### 6.1 Add Google Sign-In to Frontend
```html
<!-- In adscost_chargeback_engine.html, add to <head> -->
<script src="https://accounts.google.com/gsi/client" async defer></script>

<!-- Add button in header -->
<div id="g_id_onload"
     data-client_id="YOUR_GOOGLE_CLIENT_ID"
     data-callback="handleLogin"
     data-auto_prompt="false"></div>
<div class="g_id_signin" data-type="standard"></div>

<script>
function handleLogin(response) {
  // Send token to backend
  localStorage.setItem('googleToken', response.credential);
  localStorage.setItem('userId', response.user_id);
  
  // Load campaigns
  fetchCampaignsFromGoogleAds();
}
</script>
```

### 6.2 Update All API Calls
```javascript
const userId = localStorage.getItem('userId');
const googleToken = localStorage.getItem('googleToken');

// Example:
fetch(`${API_BASE_URL}/campaigns`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerId: 'YOUR_GOOGLE_ADS_CUSTOMER_ID',
    startDate: '2026-03-01',
    endDate: '2026-03-31',
    googleToken: googleToken
  })
});
```

---

## ✅ STEP 7: Testing End-to-End

```
1. Open Vercel URL in browser
2. Click "Login with Google"
3. Authorize your Google Ads account
4. Select date range
5. Click "Generate chargeback"
6. Should fetch real campaigns from Google Ads
7. Edit rates
8. Click "Save rates" → saves to Supabase
9. Generate invoice → creates PDF
10. Check Railway logs: railway logs
```

---

## 📊 Deployment Checklist

- [ ] Google Cloud Project created & credentials saved
- [ ] Supabase project created & database schema migrated
- [ ] Backend running locally (npm run dev)
- [ ] Backend deployed to Railway ✅
- [ ] Environment variables set in Railway
- [ ] Frontend updated with Railway URL
- [ ] Frontend deployed to Vercel ✅
- [ ] Google OAuth configured for Vercel domain
- [ ] Google Sign-In integrated in frontend
- [ ] End-to-end testing complete
- [ ] All API calls working
- [ ] Database queries verified in Supabase dashboard

---

## 🔗 Useful Links

| Service | Link | Purpose |
|---------|------|---------|
| VS Code | https://code.visualstudio.com | Code editor |
| Railway | https://railway.app | Backend hosting |
| Supabase | https://supabase.com | Database + Auth |
| Vercel | https://vercel.com | Frontend hosting |
| Google Cloud | https://console.cloud.google.com | OAuth credentials |

---

## 🐛 Troubleshooting

### "CORS error" 
→ Update CORS in server.js with Vercel domain

### "Supabase connection failed"
→ Check SUPABASE_URL and SUPABASE_ANON_KEY in .env

### "Google Ads API returns empty"
→ Verify Customer ID and OAuth token are correct

### "Frontend can't reach backend"
→ Update API_BASE_URL to match Railway domain

### "Database tables don't exist"
→ Run supabase-migrations.sql again in SQL Editor

---

## 🎯 Production Checklist

Before going live:

- [ ] All sensitive keys in environment variables (never in code)
- [ ] Frontend & backend CORS configured properly
- [ ] SSL/HTTPS enabled (automatic on Vercel & Railway)
- [ ] Database backups enabled in Supabase
- [ ] Error logging setup (optional: Sentry.io)
- [ ] Performance monitoring (optional: New Relic)
- [ ] Rate limiting on API endpoints
- [ ] Input validation on all endpoints

---

## 📝 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         USER BROWSER                         │
│                    (Vercel - Frontend)                       │
│              https://your-project.vercel.app                 │
└─────────────────────────────────────────────────────────────┘
                              ↑↓
                    (HTTPS/REST API)
                              ↑↓
┌─────────────────────────────────────────────────────────────┐
│                   RAILWAY BACKEND                            │
│             https://your-railway-domain.up                   │
│              (Node.js + Express Server)                      │
└─────────────────────────────────────────────────────────────┘
                              ↑↓
                    (Supabase SDK)
                              ↑↓
┌─────────────────────────────────────────────────────────────┐
│                   SUPABASE DATABASE                          │
│          (PostgreSQL + Auth + Real-time)                     │
│         profiles, rates, chargebacks, invoices               │
└─────────────────────────────────────────────────────────────┘
                              ↑↓
                   (REST API via Google)
                              ↑↓
┌─────────────────────────────────────────────────────────────┐
│                    GOOGLE ADS API                            │
│           (Campaign data, costs, labels)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎓 Next Steps

1. **Email Notifications** - Add Sendgrid for invoice emails
2. **Scheduled Sync** - Railway Cron jobs to auto-fetch from Google Ads daily
3. **Advanced Analytics** - Dashboard with charts and trends
4. **Mobile App** - React Native version for iOS/Android
5. **Accounting Integration** - QuickBooks or Xero API

---

## 💬 Support

- Railway Docs: https://docs.railway.app
- Supabase Docs: https://supabase.com/docs
- Vercel Docs: https://vercel.com/docs
- Google Ads API: https://developers.google.com/google-ads/api

Good luck! 🚀
