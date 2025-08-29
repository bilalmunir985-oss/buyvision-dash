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

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  
  // Simple word-based similarity
  const words1 = new Set(s1.split(/\s+/));
  const words2 = new Set(s2.split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

async function findBestMatch(productName: string, setCode: string) {
  try {
    // Get MTG expansions
    const expansions = await callCardTraderAPI('/expansions?game_id=1');
    
    // Find expansion by set code
    const expansion = expansions.find((exp: any) => 
      exp.code?.toLowerCase() === setCode?.toLowerCase()
    );
    
    if (!expansion) {
      console.log(`No expansion found for set code: ${setCode}`);
      return null;
    }

    // Get blueprints for this expansion
    const blueprints = await callCardTraderAPI(`/blueprints/export?expansion_id=${expansion.id}`);
    
    let bestMatch = null;
    let bestScore = 0.6; // Minimum similarity threshold
    
    for (const blueprint of blueprints) {
      const similarity = calculateSimilarity(productName, blueprint.name);
      
      if (similarity > bestScore) {
        bestScore = similarity;
        bestMatch = {
          blueprintId: blueprint.id,
          blueprintName: blueprint.name,
          expansionId: blueprint.expansion_id,
          categoryId: blueprint.category_id,
          imageUrl: blueprint.image_url,
          similarity: similarity,
        };
      }
    }

    return bestMatch;
  } catch (error) {
    console.error('Error finding match:', error);
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
    const { limit = 10 } = body;

    console.log(`Starting automated CardTrader mapping for ${limit} products...`);

    // Get unmapped products
    const { data: products, error: productsError } = await supabaseClient
      .from('products')
      .select('id, name, set_code, type')
      .eq('cardtrader_is_verified', false)
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
        console.log(`Processing: ${product.name} (${product.set_code})`);
        
        const match = await findBestMatch(product.name, product.set_code);
        
        if (match) {
          console.log(`Found match: ${match.blueprintName} (ID: ${match.blueprintId}, similarity: ${match.similarity})`);
          
          // Create mapping entry
          const { data: mappingData, error: mappingError } = await supabaseClient
            .from('product_mappings')
            .insert({
              mtg_product_id: product.id,
              blueprint_id: match.blueprintId,
              blueprint_name: match.blueprintName,
              cardtrader_url: `https://www.cardtrader.com/cards/${match.blueprintId}`,
              verified: false, // Require manual verification
            })
            .select()
            .single();

          if (mappingError) {
            console.error(`Error creating mapping for ${product.name}:`, mappingError);
            errors++;
          } else {
            // Update product to reference the mapping
            const { error: updateError } = await supabaseClient
              .from('products')
              .update({
                cardtrader_mapping_id: mappingData.id,
                cardtrader_is_verified: false, // Still needs manual verification
              })
              .eq('id', product.id);

            if (updateError) {
              console.error(`Error updating product ${product.name}:`, updateError);
              errors++;
            } else {
              mapped++;
            }
          }
        } else {
          console.log(`No suitable match found for: ${product.name}`);
        }
        
        processed++;
        
        // Rate limiting
        await sleep(1000);
        
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