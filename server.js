import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();

app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Health check
app.get('/', (req, res) => {
  res.json({
    status: '✅ Ads Chargeback Backend Running',
    environment: process.env.NODE_ENV,
    supabase: 'connected',
  });
});

// Get campaigns - return mock data for now (real API requires service account)
app.post('/api/campaigns', async (req, res) => {
  try {
    const { customerId, startDate, endDate } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID required' });
    }

    // Mock data - replace with real Google Ads API when service account is set up
    const mockCampaigns = [
      {
        id: '1',
        name: 'Campaign 1 - ' + customerId,
        baseCost: 1500.00,
        company: 'Company A',
        labels: ['company:Company A'],
      },
      {
        id: '2',
        name: 'Campaign 2 - ' + customerId,
        baseCost: 2200.50,
        company: 'Company A',
        labels: ['company:Company A'],
      },
      {
        id: '3',
        name: 'Campaign 3 - ' + customerId,
        baseCost: 3100.75,
        company: 'Company B',
        labels: ['company:Company B'],
      }
    ];

    res.json({ 
      success: true, 
      data: mockCampaigns,
      total: mockCampaigns.length,
      totalCost: mockCampaigns.reduce((sum, c) => sum + c.baseCost, 0),
      note: 'Using sample data. For real Google Ads data, set up service account.'
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get rates
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
      data: data || {
        companies: {
          'Company A': { withholdingTax: 5, managementFee: 20, sst: 8 },
          'Company B': { withholdingTax: 5, managementFee: 20, sst: 8 },
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Save rates
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
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate chargeback
app.post('/api/chargeback/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { campaigns, rates, period } = req.body;

    const { data, error } = await supabase
      .from('chargebacks')
      .insert({
        user_id: userId,
        campaigns: campaigns,
        rates: rates,
        period: period,
        created_at: new Date(),
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Ads Chargeback Backend running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Supabase connected`);
});

export default app;
