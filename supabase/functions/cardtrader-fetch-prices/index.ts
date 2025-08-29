import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CARDTRADER_BASE_URL = 'https://api.cardtrader.com/api/v2';

async function callCardTraderAPI(endpoint: string, method = 'GET') {
  const jwt = Deno.env.get('CARDTRADER_JWT');
  if (!jwt) {
    throw new Error('CardTrader JWT token not found');
  }

  const response = await fetch(`${CARDTRADER_BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error(`CardTrader API error: ${response.status} ${response.statusText}`);
    throw new Error(`CardTrader API error: ${response.status}`);
  }

  return response.json();
}

async function fetchMarketplaceMetrics(blueprintId: number) {
  try {
    const products = await callCardTraderAPI(`/marketplace/products?blueprint_id=${blueprintId}`);
    
    if (!products || products.length === 0) {
      return null;
    }

    // Calculate metrics from marketplace products
    let lowestPrice = Number.MAX_SAFE_INTEGER;
    let totalQuantity = 0;
    const numListings = products.length;
    let currency = 'EUR'; // Default CardTrader currency

    for (const product of products) {
      if (product.price && product.price.cents) {
        const priceInCurrency = product.price.cents / 100; // Convert cents to currency units
        currency = product.price.currency || 'EUR';
        
        if (priceInCurrency < lowestPrice) {
          lowestPrice = priceInCurrency;
        }
      }
      
      if (product.quantity) {
        totalQuantity += product.quantity;
      }
    }

    return {
      lowest_price: lowestPrice === Number.MAX_SAFE_INTEGER ? null : lowestPrice,
      currency,
      num_listings: numListings,
      total_quantity: totalQuantity,
    };
  } catch (error) {
    console.error(`Error fetching marketplace for blueprint ${blueprintId}:`, error);
    return null;
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { limit = 50 } = body;

    console.log(`Starting CardTrader price fetch for up to ${limit} verified products...`);

    // Get verified product mappings
    const { data: mappings, error: mappingsError } = await supabaseClient
      .from('product_mappings')
      .select(`
        id,
        blueprint_id,
        blueprint_name,
        verified,
        products!inner(id, name, cardtrader_is_verified)
      `)
      .eq('verified', true)
      .limit(limit)
      .order('created_at', { ascending: false });

    if (mappingsError) {
      throw mappingsError;
    }

    console.log(`Found ${mappings.length} verified mappings to process`);

    let processed = 0;
    let updated = 0;
    let errors = 0;

    for (const mapping of mappings) {
      try {
        console.log(`Fetching prices for: ${mapping.blueprint_name} (Blueprint ID: ${mapping.blueprint_id})`);
        
        const metrics = await fetchMarketplaceMetrics(mapping.blueprint_id);
        
        if (metrics) {
          // Upsert daily metrics
          const { error: upsertError } = await supabaseClient
            .from('cardtrader_daily_metrics')
            .upsert({
              mapping_id: mapping.id,
              date: new Date().toISOString().split('T')[0], // Today's date
              lowest_price: metrics.lowest_price,
              currency: metrics.currency,
              num_listings: metrics.num_listings,
              total_quantity: metrics.total_quantity,
            });

          if (upsertError) {
            console.error(`Error upserting metrics for ${mapping.blueprint_name}:`, upsertError);
            errors++;
          } else {
            updated++;
            console.log(`Updated metrics for ${mapping.blueprint_name}: ${metrics.lowest_price} ${metrics.currency}`);
          }
        } else {
          console.log(`No marketplace data found for ${mapping.blueprint_name}`);
        }
        
        processed++;
        
        // Rate limiting to be respectful to CardTrader API
        await sleep(1500);
        
      } catch (error) {
        console.error(`Error processing mapping ${mapping.blueprint_name}:`, error);
        errors++;
        processed++;
      }
    }

    console.log(`Price fetch complete: ${updated} updated, ${processed} processed, ${errors} errors`);

    return new Response(JSON.stringify({
      status: 'success',
      total: mappings.length,
      processed,
      updated,
      errors
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Price fetch error:', error);
    return new Response(JSON.stringify({
      status: 'error',
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});