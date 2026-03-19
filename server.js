import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env manually
const envPath = path.join(__dirname, '.env');
const envFile = fs.readFileSync(envPath, 'utf-8');
const envLines = envFile.split('\n');

envLines.forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    process.env[key.trim()] = value.trim();
  }
});

import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ============================================
// SUPABASE CLIENT
// ============================================
console.log('Environment Variables Check:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Found' : '❌ Missing');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Found' : '❌ Missing');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ============================================
// HEALTH CHECK
// ============================================
app.get('/', (req, res) => {
  res.json({
    status: '✅ Ads Chargeback Backend Running',
    environment: process.env.NODE_ENV,
    supabase: 'connected',
  });
});

// ============================================
// ENDPOINT: Get Campaigns from Google Ads
// ============================================
app.post('/api/campaigns', async (req, res) => {
  try {
    const { customerId, startDate, endDate } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID required' });
    }

    // NOTE: For production, you would use Google Ads API here
    // For now, returning mock data structure
    // To integrate real Google Ads API:
    // 1. Install: npm install google-ads-node
    // 2. Use REST API approach with axios
    // 3. See documentation at: https://developers.google.com/google-ads/api/docs/start

    const mockCampaigns = [
      {
        id: '1',
        name: 'Summer Campaign 2026',
        baseCost: 1250.50,
        company: 'Company A',
        labels: ['company:Company A'],
      },
      {
        id: '2',
        name: 'Spring Promo',
        baseCost: 980.25,
        company: 'Company A',
        labels: ['company:Company A'],
      },
      {
        id: '3',
        name: 'Winter Sale',
        baseCost: 2150.75,
        company: 'Company B',
        labels: ['company:Company B'],
      },
    ];

    res.json({ success: true, data: mockCampaigns });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ENDPOINT: Get Rates from Supabase
// ============================================
app.get('/api/rates/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('rates')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    res.json({
      success: true,
      data: data || getDefaultRates(),
    });
  } catch (error) {
    console.error('Error fetching rates:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ENDPOINT: Save Rates to Supabase
// ============================================
app.post('/api/rates/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { companies } = req.body;

    const { data, error } = await supabase
      .from('rates')
      .upsert({
        user_id: userId,
        companies: companies,
        updated_at: new Date(),
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error saving rates:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ENDPOINT: Generate Chargeback
// ============================================
app.post('/api/chargeback/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { campaigns, rates, period } = req.body;

    const totals = calculateChargebackTotals(campaigns, rates);

    const { data, error } = await supabase
      .from('chargebacks')
      .insert({
        user_id: userId,
        campaigns: campaigns,
        rates: rates,
        totals: totals,
        period: period,
        created_at: new Date(),
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data: { ...totals, chargebackId: data.id } });
  } catch (error) {
    console.error('Error creating chargeback:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ENDPOINT: Get Chargeback History
// ============================================
app.get('/api/chargebacks/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('chargebacks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching chargebacks:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ENDPOINT: Generate Invoice PDF
// ============================================
app.post('/api/invoice', async (req, res) => {
  try {
    const { company, totals, period } = req.body;

    // TODO: Integrate pdfkit for PDF generation
    // For now, return invoice data
    res.json({
      success: true,
      invoice: {
        company,
        totals,
        period,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function getDefaultRates() {
  return {
    companies: {
      'Company A': { withholdingTax: 5, managementFee: 20, sst: 8 },
      'Company B': { withholdingTax: 5, managementFee: 20, sst: 8 },
    },
  };
}

function calculateChargebackTotals(campaigns, rates) {
  let totalBase = 0;
  let totalWithholdingTax = 0;
  let totalManagementFee = 0;
  let totalSST = 0;

  const companies = {};

  campaigns.forEach(campaign => {
    const company = campaign.company;
    const rate = rates.companies[company] || { withholdingTax: 5, managementFee: 20, sst: 8 };

    const withholdingTax = (campaign.baseCost * rate.withholdingTax) / 100;
    const managementFee = (campaign.baseCost * rate.managementFee) / 100;
    const sst = (campaign.baseCost * rate.sst) / 100;

    totalBase += campaign.baseCost;
    totalWithholdingTax += withholdingTax;
    totalManagementFee += managementFee;
    totalSST += sst;

    if (!companies[company]) {
      companies[company] = { base: 0, withholdingTax: 0, managementFee: 0, sst: 0 };
    }
    companies[company].base += campaign.baseCost;
    companies[company].withholdingTax += withholdingTax;
    companies[company].managementFee += managementFee;
    companies[company].sst += sst;
  });

  return {
    totalBase,
    totalWithholdingTax,
    totalManagementFee,
    totalSST,
    grandTotal: totalBase + totalWithholdingTax + totalManagementFee + totalSST,
    byCompany: companies,
  };
}

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Ads Chargeback Backend running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Supabase connected`);
});

export default app;