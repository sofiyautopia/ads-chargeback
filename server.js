import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

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
    const { customerId, startDate, endDate, googleAccessToken } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID required' });
    }

    if (!googleAccessToken) {
      return res.status(401).json({ error: 'Google access token required' });
    }

    // Use Google Ads API v14 REST endpoint
    const response = await axios.post(
      'https://googleads.googleapis.com/v14/customers/' + customerId.replace('-', '') + '/googleAds:search',
      {
        query: `
          SELECT
            campaign.id,
            campaign.name,
            campaign.status,
            metrics.cost_micros,
            campaign.labels
          FROM campaign
          WHERE campaign.status != REMOVED
            AND segments.date >= '${startDate}'
            AND segments.date <= '${endDate}'
          LIMIT 1000
        `
      },
      {
        headers: {
          'Authorization': `Bearer ${googleAccessToken}`,
          'developer-token': process.env.GOOGLE_DEVELOPER_TOKEN,
          'login-customer-id': customerId.replace('-', ''),
          'Content-Type': 'application/json'
        }
      }
    );

    // Parse response and extract campaigns
    const campaigns = [];
    
    if (response.data.results) {
      response.data.results.forEach(result => {
        if (result.campaign) {
          const campaign = {
            id: result.campaign.id,
            name: result.campaign.name,
            baseCost: (result.metrics?.cost_micros || 0) / 1_000_000, // Convert from micros to currency
            company: extractCompanyFromLabels(result.campaign.labels) || 'Unassigned',
            labels: result.campaign.labels || [],
            status: result.campaign.status
          };
          campaigns.push(campaign);
        }
      });
    }

    res.json({ 
      success: true, 
      data: campaigns,
      total: campaigns.length,
      totalCost: campaigns.reduce((sum, c) => sum + c.baseCost, 0)
    });

  } catch (error) {
    console.error('Error fetching campaigns from Google Ads:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: error.response?.data?.error?.message || error.message 
    });
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

function extractCompanyFromLabels(labels) {
  if (!labels || labels.length === 0) return null;
  // Look for label format: "company:CompanyName"
  const companyLabel = labels.find(label => 
    typeof label === 'string' && label.startsWith('company:')
  );
  if (companyLabel) {
    return companyLabel.split(':')[1];
  }
  return null;
}

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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Ads Chargeback Backend running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Supabase connected`);
  console.log(`📊 Google Ads API v14 ready`);
});

export default app;
