import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TCGListing {
  price: number;
  shipping: number;
  quantity: number;
}

interface PriceData {
  lowest_total_price: number | null;
  lowest_item_price: number | null;
  num_listings: number;
  total_quantity_listed: number;
  product_url: string;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchProductPricing(tcgplayerId: number): Promise<PriceData | null> {
  try {
    // Use the public listings endpoint with mpfev parameter (TCGPlayer frontend version flag)
    const listingsUrl = `https://mp-search-api.tcgplayer.com/v1/product/${tcgplayerId}/listings?mpfev=4215`;
    
    console.log(`Fetching pricing for TCGplayer ID: ${tcgplayerId}`);
    
    const response = await fetch(listingsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://www.tcgplayer.com',
        'Referer': `https://www.tcgplayer.com/product/${tcgplayerId}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site',
      },
      body: JSON.stringify({
        filters: {
          productLineName: "magic",
          minQuantity: 1
        },
        limit: 100,
        offset: 0,
        sort: "price"
      })
    });

    console.log(`Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to fetch listings for product ${tcgplayerId}: ${response.status} ${response.statusText}`);
      console.error(`Error response: ${errorText}`);
      return null;
    }

    const data = await response.json();
    console.log(`API Response structure for product ${tcgplayerId}:`, {
      hasResults: !!data.results,
      resultsLength: data.results?.length || 0,
      keys: Object.keys(data),
      sampleResult: data.results?.[0] ? {
        hasPrice: typeof data.results[0].price !== 'undefined',
        hasQuantity: typeof data.results[0].quantity !== 'undefined',
        hasShipping: typeof data.results[0].shipping !== 'undefined'
      } : null
    });

    const listings: TCGListing[] = data.results || [];

    if (listings.length === 0) {
      console.log(`No listings found for product ${tcgplayerId}`);
      return {
        lowest_total_price: null,
        lowest_item_price: null,
        num_listings: 0,
        total_quantity_listed: 0,
        product_url: `https://www.tcgplayer.com/product/${tcgplayerId}`
      };
    }

    console.log(`Found ${listings.length} listings for product ${tcgplayerId}`);

    // Validate and clean listing data
    const validListings = listings.filter(l => 
      typeof l.price === 'number' && 
      l.price > 0 && 
      typeof l.quantity === 'number' && 
      l.quantity > 0
    );

    if (validListings.length === 0) {
      console.log(`No valid listings found for product ${tcgplayerId}`);
      return {
        lowest_total_price: null,
        lowest_item_price: null,
        num_listings: listings.length,
        total_quantity_listed: 0,
        product_url: `https://www.tcgplayer.com/product/${tcgplayerId}`
      };
    }

    // Calculate lowest total price (item + shipping)
    const lowestTotalPrice = Math.min(...validListings.map(l => l.price + (l.shipping || 0)));

    // Calculate lowest item price for listings with 10+ quantity
    const highQuantityListings = validListings.filter(l => l.quantity >= 10);
    const lowestItemPrice = highQuantityListings.length > 0 
      ? Math.min(...highQuantityListings.map(l => l.price))
      : (validListings.length > 0 ? Math.min(...validListings.map(l => l.price)) : null);

    const totalQuantity = validListings.reduce((sum, l) => sum + l.quantity, 0);

    const result = {
      lowest_total_price: lowestTotalPrice,
      lowest_item_price: lowestItemPrice,
      num_listings: validListings.length,
      total_quantity_listed: totalQuantity,
      product_url: `https://www.tcgplayer.com/product/${tcgplayerId}`
    };

    console.log(`Pricing data for product ${tcgplayerId}:`, result);
    return result;
  } catch (error) {
    console.error(`Error fetching pricing for product ${tcgplayerId}:`, error);
    console.error(`Error details:`, error.message, error.stack);
    return null;
  }
}

function calculateTargetCosts(
  lowestItemPrice: number | null,
  productType: string,
  contents: any[]
): { target_product_cost: number | null; max_product_cost: number | null } {
  if (!lowestItemPrice) {
    return { target_product_cost: null, max_product_cost: null };
  }

  // For individual packs or non-pack products
  if (productType === 'pack' || !contents.some(c => c.contained_name.toLowerCase().includes('pack'))) {
    return {
      target_product_cost: lowestItemPrice * 0.60,
      max_product_cost: lowestItemPrice * 0.80
    };
  }

  // For products containing packs (boxes, cases, bundles)
  // This is a simplified calculation - in a real implementation you'd look up the pack's actual costs
  const totalPacks = contents
    .filter(c => c.contained_name.toLowerCase().includes('pack'))
    .reduce((sum, c) => sum + (c.quantity || 0), 0);

  if (totalPacks > 0) {
    const estimatedPackCost = lowestItemPrice * 0.60; // Simplified calculation
    return {
      target_product_cost: estimatedPackCost * totalPacks,
      max_product_cost: (lowestItemPrice * 0.80) * totalPacks
    };
  }

  // Fallback to individual product calculation
  return {
    target_product_cost: lowestItemPrice * 0.60,
    max_product_cost: lowestItemPrice * 0.80
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting price fetch job...');

    // Get all verified products with TCGplayer IDs
    const { data: products, error: productsError } = await supabaseClient
      .from('products')
      .select(`
        id,
        name,
        type,
        tcgplayer_product_id,
        product_contents (
          contained_name,
          quantity
        )
      `)
      .eq('tcg_is_verified', true)
      .eq('active', true)
      .not('tcgplayer_product_id', 'is', null);

    if (productsError) {
      console.error('Error fetching products:', productsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch products' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    console.log(`Processing ${products.length} products...`);

    let processed = 0;
    let errors = 0;
    const today = new Date().toISOString().split('T')[0];

    for (const product of products) {
      try {
        console.log(`Processing product: ${product.name}`);

        const priceData = await fetchProductPricing(product.tcgplayer_product_id);
        
        if (!priceData) {
          errors++;
          continue;
        }

        // Calculate target and max costs
        const { target_product_cost, max_product_cost } = calculateTargetCosts(
          priceData.lowest_item_price,
          product.type,
          product.product_contents || []
        );

        // Upsert daily metrics
        const { error: upsertError } = await supabaseClient
          .from('daily_metrics')
          .upsert({
            product_id: product.id,
            as_of_date: today,
            product_url: priceData.product_url,
            lowest_total_price: priceData.lowest_total_price,
            lowest_item_price: priceData.lowest_item_price,
            num_listings: priceData.num_listings,
            total_quantity_listed: priceData.total_quantity_listed,
            target_product_cost,
            max_product_cost
          }, {
            onConflict: 'product_id,as_of_date'
          });

        if (upsertError) {
          console.error(`Error upserting metrics for ${product.name}:`, upsertError);
          errors++;
        } else {
          processed++;
        }

        // Rate limiting - sleep between requests
        await sleep(2000);
      } catch (error) {
        console.error(`Error processing product ${product.name}:`, error);
        errors++;
      }
    }

    console.log(`Price fetch completed: ${processed} processed, ${errors} errors`);

    return new Response(
      JSON.stringify({
        status: 'success',
        processed,
        errors,
        total: products.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Price fetch error:', error);
    return new Response(
      JSON.stringify({
        status: 'error',
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});