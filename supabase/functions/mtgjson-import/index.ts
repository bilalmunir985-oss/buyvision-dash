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

    console.log(`Total products found: ${allProducts.length}`);
    
    // Prepare all products for bulk operations
    const productsToInsert: any[] = [];
    const productsToUpdate: any[] = [];
    let processed = 0;
    let errors = 0;

    // Get existing products for this user to check for duplicates
    const { data: existingProducts } = await supabaseClient
      .from('products')
      .select('mtgjson_uuid')
      .eq('user_id', user.id);

    const existingUUIDs = new Set(existingProducts?.map(p => p.mtgjson_uuid) || []);
    
    // Process all products and prepare for bulk operations
    for (const product of allProducts) {
      try {
        // Validate required fields
        if (!product.productId || !product.name || !product.setCode) {
          errors++;
          continue;
        }

        // Ensure all required fields are present and valid
        const flatProduct = {
          id: crypto.randomUUID(), // Generate new UUID for primary key
          mtgjson_uuid: product.productId,
          name: (product.name || 'Unknown Product').substring(0, 255),
          set_code: (product.setCode || 'UNK').substring(0, 10),
          type: deriveType(product.category) || 'other',
          release_date: product.releaseDate || null,
          language: product.language || 'English',
          raw_json: product || {},
          active: true,
          user_id: user.id,
          tcgplayer_product_id: null,
          tcg_is_verified: false,
          upc: null,
          upc_is_verified: false
        };

        // Check if this product already exists for this user
        if (existingUUIDs.has(product.productId)) {
          // Skip duplicates
          continue;
        } else {
          // Add to insert batch
          productsToInsert.push(flatProduct);
        }
        
        processed++;
      } catch (error) {
        console.error('Error processing product:', error);
        errors++;
      }
    }

    let added = 0;
    let updated = 0;

    // Bulk insert new products in batches
    if (productsToInsert.length > 0) {
      console.log(`Inserting ${productsToInsert.length} new products...`);
      
      const BATCH_SIZE = 100; // Process in batches of 100
      for (let i = 0; i < productsToInsert.length; i += BATCH_SIZE) {
        const batch = productsToInsert.slice(i, i + BATCH_SIZE);
        
        const { error: insertError, data } = await supabaseClient
          .from('products')
          .insert(batch)
          .select('id');

        if (insertError) {
          console.error('Batch insert error:', insertError);
          errors += batch.length;
        } else {
          added += batch.length;
          console.log(`Successfully inserted batch ${Math.floor(i / BATCH_SIZE) + 1}, total added: ${added}`);
        }
      }
    }

    const summary = {
      status: 'success',
      total: allProducts.length,
      processed: processed,
      added,
      updated,
      errors,
      message: `Successfully processed all ${processed} products from MTGJSON API. ${added} added, ${updated} updated, ${errors} errors. No duplicates were inserted.`
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
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});