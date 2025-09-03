import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AUTOCOMPLETE_URL = 'https://data.tcgplayer.com/autocomplete';

function tcgHeaders() {
  return {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };
}

function generateSessionId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function searchTCGProduct(productName: string, setName?: string) {
  // Build search query - include set name if provided for better matching
  const searchQuery = setName ? `${productName} ${setName}` : productName;
  
  const sessionId = generateSessionId();
  const url = new URL(AUTOCOMPLETE_URL);
  url.searchParams.set('q', searchQuery);
  url.searchParams.set('session-id', sessionId);
  url.searchParams.set('product-line-affinity', 'All');
  url.searchParams.set('algorithm', 'product_line_affinity');

  console.log(`Searching for: ${productName} (Set: ${setName || 'N/A'})`);
  console.log('URL:', url.toString());
  
  const response = await fetch(url.toString(), { 
    method: 'GET', 
    headers: tcgHeaders()
  });
  
  console.log('Response status:', response.status);
  
  if (!response.ok) {
    console.error(`Search failed: ${response.status} - ${await response.text()}`);
    return [];
  }
  
  const json = await response.json();
  console.log('Response keys:', Object.keys(json));
  console.log('Results found:', json.results?.length || 0);
  
  if (!Array.isArray(json.results)) {
    console.log('No results array found in response');
    return [];
  }
  
  return json.results.map((item: any) => ({ 
    productId: item.productId, 
    productName: item.productName
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