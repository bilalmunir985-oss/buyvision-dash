import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TCGListing interface removed - now using product details endpoint

interface PriceData {
  lowest_total_price: number | null;
  lowest_item_price: number | null;
  market_price: number | null;
  median_price: number | null;
  num_listings: number;
  total_quantity_listed: number;
  product_url: string;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchProductPricing(tcgplayerId: number): Promise<PriceData | null> {
  try {
    // Use the TCGplayer product details endpoint that returns market price directly
    const detailsUrl = `https://mp-search-api.tcgplayer.com/v2/product/${tcgplayerId}/details?mpfev=4251`;
    
    console.log(`Fetching pricing for TCGplayer ID: ${tcgplayerId}`);
    
    const response = await fetch(detailsUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Origin': 'https://www.tcgplayer.com',
        'Referer': `https://www.tcgplayer.com/product/${tcgplayerId}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });

    console.log(`Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to fetch product details for ${tcgplayerId}: ${response.status} ${response.statusText}`);
      console.error(`Error response: ${errorText}`);
      return null;
    }

    const data = await response.json();
    console.log(`API Response for product ${tcgplayerId}:`, {
      marketPrice: data.marketPrice,
      lowestPrice: data.lowestPrice,
      medianPrice: data.medianPrice,
      listings: data.listings,
      sellers: data.sellers,
      productName: data.productName,
      setCode: data.setCode
    });

    // Extract comprehensive pricing data from the response
    const marketPrice = data.marketPrice;
    const lowestPrice = data.lowestPrice;
    const medianPrice = data.medianPrice;
    const listings = data.listings;
    const sellers = data.sellers;
    const lowestPriceWithShipping = data.lowestPriceWithShipping;
    
    if (!marketPrice || typeof marketPrice !== 'number' || marketPrice <= 0) {
      console.log(`No valid market price found for product ${tcgplayerId}`);
      return {
        lowest_total_price: null,
        lowest_item_price: null,
        market_price: null,
        median_price: null,
        num_listings: 0,
        total_quantity_listed: 0,
        product_url: `https://www.tcgplayer.com/product/${tcgplayerId}`
      };
    }

    // Return comprehensive pricing data
    const result = {
      lowest_total_price: lowestPriceWithShipping || lowestPrice || marketPrice,
      lowest_item_price: lowestPrice || marketPrice,
      market_price: marketPrice,
      median_price: medianPrice,
      num_listings: listings || 0,
      total_quantity_listed: listings || 0, // Using listings as quantity indicator
      product_url: `https://www.tcgplayer.com/product/${tcgplayerId}`
    };

    console.log(`Pricing data for product ${tcgplayerId}:`, result);
    return result;
  } catch (error) {
    console.error(`Error fetching pricing for product ${tcgplayerId}:`, error);
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
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user context
    const supabaseClient = createClient(
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

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing user authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting price fetch job for user: ${user.id}...`);

    // Get all verified products with TCGplayer IDs for the current user
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
      .eq('user_id', user.id)
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
    const collectedPriceData: any[] = [];

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
            user_id: user.id,
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
          
        // Store comprehensive pricing data for UI display
        collectedPriceData.push({
          productId: product.id,
          productName: product.name,
          setCode: '', // Note: set_code not available in this select, add if needed
          type: product.type,
          tcgplayerId: product.tcgplayer_product_id,
          // Pricing metrics
          lowestTotalPrice: priceData.lowest_total_price,
          lowestItemPrice: priceData.lowest_item_price,
          marketPrice: priceData.market_price,
          medianPrice: priceData.median_price,
          numListings: priceData.num_listings,
          totalQuantityListed: priceData.total_quantity_listed,
          productUrl: priceData.product_url,
          // Cost analysis
          targetProductCost: target_product_cost,
          maxProductCost: max_product_cost,
          // Calculated metrics
          profitMargin: priceData.lowest_total_price && target_product_cost 
            ? ((priceData.lowest_total_price - target_product_cost) / target_product_cost * 100)
            : null,
          savingsVsMax: priceData.lowest_total_price && max_product_cost
            ? (max_product_cost - priceData.lowest_total_price)
            : null,
          withinTarget: priceData.lowest_total_price && target_product_cost
            ? priceData.lowest_total_price <= target_product_cost
            : null
        });
        }

        // Rate limiting - sleep between requests (reduced since new endpoint is more reliable)
        await sleep(1000);
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
        summary: {
          totalProducts: products.length,
          processedSuccessfully: processed,
          errors: errors,
          successRate: products.length > 0 ? (processed / products.length * 100).toFixed(1) + '%' : '0%'
        },
        priceData: collectedPriceData,
        timestamp: new Date().toISOString()
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
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});