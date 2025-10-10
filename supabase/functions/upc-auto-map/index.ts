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
  const searchQuery = setName ? `${productName} ${setName}` : productName;
  
  const sessionId = generateSessionId();
  const url = new URL(AUTOCOMPLETE_URL);
  url.searchParams.set('q', searchQuery);
  url.searchParams.set('session-id', sessionId);
  url.searchParams.set('product-line-affinity', 'All');
  url.searchParams.set('algorithm', 'product_line_affinity');

  console.log(`Searching for: ${productName} (Set: ${setName || 'N/A'})`);
  
  const response = await fetch(url.toString(), { 
    method: 'GET', 
    headers: tcgHeaders()
  });
  
  if (!response.ok) {
    console.error(`Search failed: ${response.status}`);
    return [];
  }
  
  const json = await response.json();
  
  if (!Array.isArray(json.products)) {
    return [];
  }
  
  return json.products
    .filter((item: any) => item['product-line-name'] === 'Magic: The Gathering' && item['product-id'] && item['product-name'])
    .map((item: any) => ({ 
      productId: item['product-id'], 
      productName: item['product-name']
    }));
}

interface MappedProduct {
  productId: string;
  productName: string;
  tcgId: number;
  tcgName: string;
  confidence: 'high' | 'medium' | 'low';
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing user authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'POST') {
      console.log(`Starting UPC auto-mapping for user: ${user.id}...`);

      // Get 20 unverified products for this user
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, set_code, type, upc')
        .eq('tcg_is_verified', false)
        .eq('upc_is_verified', false)
        .eq('active', true)
        .eq('user_id', user.id)
        .is('upc', null)
        .limit(20)
        .order('name');

      if (productsError) {
        throw productsError;
      }

      console.log(`Found ${products.length} products to process`);

      const mappedProducts: MappedProduct[] = [];
      let processed = 0;
      let mapped = 0;

      for (const product of products) {
        try {
          console.log(`Processing: ${product.name}`);
          
          const searchResults = await searchTCGProduct(product.name, product.set_code);
          
          if (searchResults.length > 0) {
            const bestMatch = searchResults[0];
            
            // Determine confidence based on name similarity
            const nameLower = product.name.toLowerCase();
            const matchLower = bestMatch.productName.toLowerCase();
            let confidence: 'high' | 'medium' | 'low' = 'low';
            
            if (nameLower === matchLower) {
              confidence = 'high';
            } else if (nameLower.includes(matchLower) || matchLower.includes(nameLower)) {
              confidence = 'medium';
            }
            
            console.log(`Found match: ${bestMatch.productName} (ID: ${bestMatch.productId}) - Confidence: ${confidence}`);
            
            mappedProducts.push({
              productId: product.id,
              productName: product.name,
              tcgId: bestMatch.productId,
              tcgName: bestMatch.productName,
              confidence
            });
            
            mapped++;
          } else {
            console.log(`No matches found for: ${product.name}`);
          }
          
          processed++;
          
          // Rate limiting - wait between requests
          await sleep(1500);
          
        } catch (error) {
          console.error(`Error processing product ${product.name}:`, error);
          processed++;
        }
      }

      console.log(`Auto-mapping complete: ${mapped} mapped, ${processed} processed`);

      return new Response(JSON.stringify({
        success: true,
        total: products.length,
        processed,
        mapped,
        mappedProducts
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('UPC auto-mapping error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
