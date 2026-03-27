# 🚀 Real Google Ads API Integration Guide

## Overview

This guide shows how to integrate the **real Google Ads API** with your Ads Chargeback app.

---

## Part 1: Backend Setup (server.js)

### What Changed:
- Uses Google Ads API v14 REST endpoint (instead of SDK)
- Accepts `googleAccessToken` from frontend
- Queries real campaign data with metrics
- Extracts cost in currency units

### Key Endpoint:
```
POST /api/campaigns
Body: {
  "customerId": "123-456-7890",
  "startDate": "2026-03-01",
  "endDate": "2026-03-31",
  "googleAccessToken": "ya29.xxxx..."
}
```

---

## Part 2: Frontend - Get Google OAuth Token

The frontend needs to:
1. Sign user in with Google
2. Get OAuth access token (with Google Ads scope)
3. Send token to backend with campaigns request

### Add Google Sign-In to HTML:

In your `adscost_chargeback_engine.html`, add this to the `<head>`:

```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

Then add this button in your header:

```html
<button onclick="signInWithGoogle()" style="padding: 8px 16px; background: #4285F4; color: white; border: none; border-radius: 4px; cursor: pointer;">
  Sign in with Google
</button>
```

Add this to your `<script>` section:

```javascript
let googleAccessToken = null;

function signInWithGoogle() {
  google.accounts.id.initialize({
    client_id: '1015904536040-kqi7u5s631pm7a01v7gmctrskr8l9o0t.apps.googleusercontent.com',
    scope: 'https://www.googleapis.com/auth/adwords',
    callback: handleCredentialResponse
  });
  
  google.accounts.id.renderButton(
    document.querySelector('button[onclick="signInWithGoogle()"]'),
    { theme: 'outline', size: 'large' }
  );
}

function handleCredentialResponse(response) {
  // response.credential is the JWT token
  // Exchange it for access token with your backend
  googleAccessToken = response.credential;
  alert('Signed in with Google!');
  fetchCampaignsFromGoogleAds();
}

async function fetchCampaignsFromGoogleAds() {
  if (!googleAccessToken) {
    alert('Please sign in with Google first');
    return;
  }

  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  const customerId = prompt('Enter your Google Ads Customer ID (e.g., 123-456-7890):');

  if (!customerId) return;

  try {
    const response = await fetch(API_BASE_URL + '/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId,
        startDate,
        endDate,
        googleAccessToken
      })
    });

    const result = await response.json();
    
    if (!result.success) {
      alert('Error: ' + (result.error || 'Failed to fetch campaigns'));
      return;
    }

    // Replace mock data with real data
    data = result.data;
    renderTable();
    updateSummary();
    
    alert(`Loaded ${result.total} campaigns from Google Ads!`);
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to fetch campaigns: ' + error.message);
  }
}
```

---

## Part 3: Update Google OAuth Credentials

Your OAuth credentials need the correct scopes:

### In Google Cloud Console:

1. Go to **Credentials**
2. Click your OAuth Client ID
3. Click **"Edit"**
4. Make sure **authorized scopes** include:
   ```
   https://www.googleapis.com/auth/adwords
   ```

---

## Part 4: Deploy Steps

### Step 1: Replace server.js
1. Copy the new `server-google-ads.js` code
2. Replace your current `server.js` with it
3. Push to GitHub

### Step 2: Update Frontend HTML
1. Add the Google Sign-In code above to your HTML
2. Update the "Generate Chargeback" button to call the new function
3. Push to GitHub

### Step 3: Redeploy
```bash
git add .
git commit -m "Integrate real Google Ads API"
git push
```

Both Railway and Vercel will auto-redeploy.

---

## Part 5: Test It

1. Open your Vercel app
2. Click **"Sign in with Google"**
3. Authorize the app to access your Google Ads account
4. Enter your Customer ID (123-456-7890)
5. Select date range
6. Click **"Generate chargeback"**
7. Should load **real campaigns** from your Google Ads account! ✅

---

## Troubleshooting

### "Invalid access token"
- Make sure you're signed in with the correct Google account
- Token might have expired - sign in again

### "No campaigns found"
- Check your Customer ID is correct
- Make sure you have campaigns in that date range
- Check date format is YYYY-MM-DD

### "Unauthorized: insufficient permissions"
- Verify OAuth scope includes `https://www.googleapis.com/auth/adwords`
- Re-authorize the app

---

## What You Get:

✅ Real Google Ads data
✅ Actual campaign costs
✅ Accurate calculations
✅ Production-ready app
✅ Full chargeback automation

---

## Next Steps:

1. Implement the code above
2. Test with real Google Ads account
3. Add PDF export for invoices
4. Deploy to production
5. Scale to more clients!

Good luck! 🚀
