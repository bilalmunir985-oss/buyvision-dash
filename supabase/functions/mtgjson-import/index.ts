import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MTGJSONProduct {
  productId: string;
  name: string;
  setCode: string;
  category: string;
  releaseDate?: string;
  language?: string;
  contents?: Array<{
    name: string;
    count: number;
    rarity?: string;
  }>;
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting MTGJSON import...');
    
    // First, fetch the SetList to get all available sets
    const SET_LIST_URL = "https://mtgjson.com/api/v5/SetList.json";
    
    const setListResponse = await fetch(SET_LIST_URL);
    if (!setListResponse.ok) {
      throw new Error(`Failed to fetch SetList: ${setListResponse.statusText}`);
    }
    
    const setListData = await setListResponse.json();
    const sets = setListData.data;
    
    console.log(`Found ${sets.length} sets. Fetching sealed products...`);
    
    let processedSets = 0;
    let added = 0;
    let updated = 0;
    let errors = 0;
    let total = 0;
    
    // Process sets in batches to avoid timeouts
    const BATCH_SIZE = 10;
    for (let i = 0; i < sets.length; i += BATCH_SIZE) {
      const batch = sets.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async (set: any) => {
        try {
          const setUrl = `https://mtgjson.com/api/v5/${set.code}.json`;
          const setResponse = await fetch(setUrl);
          
          if (!setResponse.ok) {
            console.warn(`Failed to fetch set ${set.code}: ${setResponse.statusText}`);
            return [];
          }
          
          const setData = await setResponse.json();
          const setProducts = setData.data?.sealedProduct || [];
          
          // Add set metadata to each product
          return setProducts.map((product: any) => ({
            ...product,
            productId: product.uuid || `${set.code}-${product.name}`,
            setCode: set.code,
            setName: set.name
          }));
        } catch (error) {
          console.warn(`Error fetching set ${set.code}:`, error);
          return [];
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      const productsToProcess: any[] = batchResults.flat();

      // Upsert products for this batch immediately to avoid timeouts
      for (const product of productsToProcess) {
        try {
          const flatProduct = {
            mtgjson_uuid: product.productId,
            name: product.name,
            set_code: product.setCode,
            type: deriveType(product.category),
            release_date: product.releaseDate || null,
            language: product.language || 'English',
            raw_json: product,
            active: true,
          };

          // Check if product already exists
          const { data: existing, error: selectError } = await supabaseClient
            .from('products')
            .select('id')
            .eq('mtgjson_uuid', flatProduct.mtgjson_uuid)
            .maybeSingle();

          let productId: string;

          if (!existing) {
            // Insert new product
            const { data: insertData, error: insertError } = await supabaseClient
              .from('products')
              .insert(flatProduct)
              .select('id')
              .single();

            if (insertError) {
              console.error('Error inserting product:', insertError);
              errors++;
              continue;
            }

            productId = insertData.id;
            added++;
          } else {
            // Update existing product
            const { error: updateError } = await supabaseClient
              .from('products')
              .update(flatProduct)
              .eq('id', existing.id);

            if (updateError) {
              console.error('Error updating product:', updateError);
              errors++;
              continue;
            }

            productId = existing.id;
            updated++;
          }

          // Clear existing contents
          const { error: deleteError } = await supabaseClient
            .from('product_contents')
            .delete()
            .eq('product_id', productId);

          if (deleteError) {
            console.error('Error deleting existing contents:', deleteError);
          }

          // Insert new contents
          if (product.contents) {
            const contents: any[] = [];
            
            // Handle different content structures in MTGJSON
            if (product.contents.pack && Array.isArray(product.contents.pack)) {
              // New format: contents.pack array
              product.contents.pack.forEach((pack: any) => {
                contents.push({
                  product_id: productId,
                  contained_name: pack.set ? `${pack.set} Pack` : (pack.code || 'Unknown Pack'),
                  quantity: 1,
                  rarity: null,
                });
              });
            } else if (Array.isArray(product.contents)) {
              // Legacy format: contents array
              product.contents.forEach((content: any) => {
                contents.push({
                  product_id: productId,
                  contained_name: content.name,
                  quantity: content.count || 1,
                  rarity: content.rarity || null,
                });
              });
            }

            if (contents.length > 0) {
              const { error: contentsError } = await supabaseClient
                .from('product_contents')
                .insert(contents);

              if (contentsError) {
                console.error('Error inserting product contents:', contentsError);
              }
            }
          }

          total++;
        } catch (error) {
          console.error(`Error processing product ${product.productId}:`, error);
          errors++;
        }
      }
      
      processedSets += batch.length;
      console.log(`Processed ${processedSets}/${sets.length} sets; totals so far => added: ${added}, updated: ${updated}, errors: ${errors}`);
      
      // Add a small delay between batches
      if (i + BATCH_SIZE < sets.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Finished batches
    console.log(`Batch processing completed. Totals => added: ${added}, updated: ${updated}, errors: ${errors}`);

    console.log(`Import completed: ${added} added, ${updated} updated, ${errors} errors (processed ${total} products)`);

    return new Response(
      JSON.stringify({
        status: 'success',
        added,
        updated,
        errors,
        total,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('MTGJSON import error:', error);
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