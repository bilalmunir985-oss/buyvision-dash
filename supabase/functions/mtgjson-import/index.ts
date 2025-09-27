import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function fetchWithTimeout(url: string, opts: RequestInit = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

/**
 * Derives our internal 'type' field from MTGJSON category string
 */
function deriveType(category?: string): string {
  if (!category) return "other";
  const c = category.toLowerCase();
  if (c.includes("box")) return "box";
  if (c.includes("case")) return "case";
  if (c.includes("pack")) return "pack";
  if (c.includes("bundle")) return "bundle";
  if (c.includes("commander")) return "commander_deck";
  return "other";
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

    // Create auth client to validate user
    const authClient = createClient(
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
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create supabase client with service role key for database operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Fetch all products from MTGJSON SetList API
    const response = await fetchWithTimeout('https://mtgjson.com/api/v5/SetList.json', {}, 30000);
    
    if (!response.ok) {
      throw new Error(`MTGJSON API failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract all sealed products from the API response
    const allProducts: any[] = [];
    
    if (data.data && Array.isArray(data.data)) {
      data.data.forEach((set: any) => {
        if (set.sealedProduct && Array.isArray(set.sealedProduct)) {
          set.sealedProduct.forEach((product: any) => {
            allProducts.push({
              productId: product.uuid,
              name: product.name,
              setCode: set.code,
              setName: set.name,
              category: product.category || 'sealed_product',
              releaseDate: product.releaseDate || set.releaseDate,
              language: set.languages?.[0] || 'English',
              contents: product.contents || [],
              uuid: product.uuid,
              subtype: product.subtype,
              identifiers: product.identifiers,
              purchaseUrls: product.purchaseUrls
            });
          });
        }
      });
    }
    
    if (allProducts.length === 0) {
      throw new Error('No sealed products found in MTGJSON API response');
    }

    let added = 0;
    let updated = 0;
    let errors = 0;

    // Process products in much smaller batches to avoid CPU limits
    const BATCH_SIZE = 10; // Reduced from 50 to 10
    const MAX_PRODUCTS = 100; // Limit total products per function call
    
    // Only process first 100 products to avoid CPU timeout
    const productsToProcess = allProducts.slice(0, MAX_PRODUCTS);
    
    for (let i = 0; i < productsToProcess.length; i += BATCH_SIZE) {
      const batch = productsToProcess.slice(i, i + BATCH_SIZE);
      
      // Process batch sequentially to avoid overwhelming the database
      for (const product of batch) {
        try {
          // Validate required fields
          if (!product.productId || !product.name || !product.setCode) {
            errors++;
            continue;
          }

          // Ensure all required fields are present and valid
          const flatProduct = {
            id: product.productId, // Use productId as primary key
            mtgjson_uuid: product.productId,
            name: (product.name || 'Unknown Product').substring(0, 255),
            set_code: (product.setCode || 'UNK').substring(0, 10),
            type: deriveType(product.category) || 'other',
            release_date: product.releaseDate || null,
            language: product.language || 'English',
            raw_json: product || {},
            active: true,
            user_id: user.id,
            // Ensure all NOT NULL fields have values
            tcgplayer_product_id: null,
            tcg_is_verified: false,
            upc: null,
            upc_is_verified: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // Check if product already exists
          const { data: existing } = await supabaseClient
            .from('products')
            .select('id')
            .eq('id', product.productId)
            .eq('user_id', user.id)
            .single();

          if (existing) {
            // Update existing product
            const { error: updateError } = await supabaseClient
              .from('products')
              .update({
                name: flatProduct.name,
                set_code: flatProduct.set_code,
                type: flatProduct.type,
                release_date: flatProduct.release_date,
                language: flatProduct.language,
                raw_json: flatProduct.raw_json,
                updated_at: flatProduct.updated_at
              })
              .eq('id', product.productId)
              .eq('user_id', user.id);

            if (updateError) {
              console.error('Error updating product:', updateError);
              errors++;
            } else {
              updated++;
            }
          } else {
            // Insert new product
            const { error: insertError } = await supabaseClient
              .from('products')
              .insert(flatProduct);

            if (insertError) {
              console.error('Error inserting product:', insertError);
              errors++;
            } else {
              added++;
            }
          }
        } catch (error) {
          console.error('Error processing product:', error);
          errors++;
        }
      }
      
      // Small delay between batches to reduce CPU pressure
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const summary = {
      status: 'success',
      total: allProducts.length,
      processed: productsToProcess.length,
      added,
      updated,
      errors,
      message: `Successfully processed ${productsToProcess.length} of ${allProducts.length} products from MTGJSON API. ${added} added, ${updated} updated, ${errors} errors. Run again to process more products.`
    };

    return new Response(
      JSON.stringify(summary),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Import error:', error);
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