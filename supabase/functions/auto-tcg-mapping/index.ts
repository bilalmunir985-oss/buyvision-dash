import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CATALOG_URL = 'https://www.tcgplayer.com/api/catalog/categories/1/search';

function tcgHeaders() {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Origin': 'https://www.tcgplayer.com',
    'Referer': 'https://www.tcgplayer.com/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };
}

async function searchTCGProduct(productName: string, setName?: string) {
  const filters: Array<{ name: string; values: string[] }> = [];
  
  if (productName && productName.trim()) {
    filters.push({
      name: "productName",
      values: [productName.trim()]
    });
  }

  if (setName && setName.trim()) {
    filters.push({
      name: "setName", 
      values: [setName.trim()]
    });
  }

  const payload = {
    sort: "name",
    limit: 5,
    offset: 0,
    filters,
    context: {
      shippingCountry: "US",
      language: "en"
    }
  };

  console.log(`Searching for: ${productName} (Set: ${setName || 'N/A'})`);
  
  const response = await fetch(CATALOG_URL, { 
    method: 'POST', 
    headers: tcgHeaders(), 
    body: JSON.stringify(payload) 
  });
  
  if (!response.ok) {
    console.error(`Search failed: ${response.status}`);
    return [];
  }
  
  const json = await response.json();
  
  if (json.fallback || !Array.isArray(json.results)) {
    console.log('API returned fallback or no results');
    return [];
  }
  
  return json.results.map((item: any) => ({ 
    productId: item.productId, 
    productName: item.name || item.cleanName
  })).filter((r: any) => r.productId && r.productName);
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
    const { limit = 10 } = body;

    console.log(`Starting automated TCG mapping for ${limit} products...`);

    // Get unverified products
    const { data: products, error: productsError } = await supabaseClient
      .from('products')
      .select('id, name, set_code, type')
      .eq('tcg_is_verified', false)
      .eq('active', true)
      .limit(limit)
      .order('name');

    if (productsError) {
      throw productsError;
    }

    console.log(`Found ${products.length} products to process`);

    let processed = 0;
    let mapped = 0;
    let errors = 0;

    for (const product of products) {
      try {
        console.log(`Processing: ${product.name}`);
        
        const searchResults = await searchTCGProduct(product.name, product.set_code);
        
        if (searchResults.length > 0) {
          // Take the first result as best match
          const bestMatch = searchResults[0];
          
          console.log(`Found match: ${bestMatch.productName} (ID: ${bestMatch.productId})`);
          
          // Update product with TCG ID
          const { error: updateError } = await supabaseClient
            .from('products')
            .update({
              tcgplayer_product_id: bestMatch.productId,
              tcg_is_verified: true
            })
            .eq('id', product.id);

          if (updateError) {
            console.error(`Error updating product ${product.name}:`, updateError);
            errors++;
          } else {
            mapped++;
          }
        } else {
          console.log(`No matches found for: ${product.name}`);
        }
        
        processed++;
        
        // Rate limiting - wait between requests
        await sleep(1500);
        
      } catch (error) {
        console.error(`Error processing product ${product.name}:`, error);
        errors++;
        processed++;
      }
    }

    console.log(`Automation complete: ${mapped} mapped, ${processed} processed, ${errors} errors`);

    return new Response(JSON.stringify({
      status: 'success',
      total: products.length,
      processed,
      mapped,
      errors
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Auto mapping error:', error);
    return new Response(JSON.stringify({
      status: 'error',
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});