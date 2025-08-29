import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { productId, blueprintId, blueprintName } = await req.json();

    if (!productId || !blueprintId || !blueprintName) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: productId, blueprintId, blueprintName'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Setting CardTrader mapping: Product ${productId} -> Blueprint ${blueprintId} (${blueprintName})`);

    // Create or update the mapping
    const { data: mappingData, error: mappingError } = await supabaseClient
      .from('product_mappings')
      .upsert({
        mtg_product_id: productId,
        blueprint_id: blueprintId,
        blueprint_name: blueprintName,
        cardtrader_url: `https://www.cardtrader.com/cards/${blueprintId}`,
        verified: true, // Admin verification
      })
      .select()
      .single();

    if (mappingError) {
      throw mappingError;
    }

    // Update the product to reference this mapping and mark as verified
    const { error: productError } = await supabaseClient
      .from('products')
      .update({
        cardtrader_mapping_id: mappingData.id,
        cardtrader_is_verified: true,
      })
      .eq('id', productId);

    if (productError) {
      throw productError;
    }

    console.log(`Successfully set mapping for product ${productId}`);

    return new Response(JSON.stringify({
      status: 'success',
      mappingId: mappingData.id,
      message: 'CardTrader mapping set successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error setting CardTrader mapping:', error);
    return new Response(JSON.stringify({
      status: 'error',
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});