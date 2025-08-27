import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId, tcgId } = await req.json();

    if (!productId || !tcgId) {
      return new Response(
        JSON.stringify({ error: 'productId and tcgId are required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`Setting TCG ID ${tcgId} for product ${productId}`);

    const { data, error } = await supabaseClient
      .from('products')
      .update({
        tcgplayer_product_id: tcgId,
        tcg_is_verified: true
      })
      .eq('id', productId)
      .select('id, name')
      .single();

    if (error) {
      console.error('Error updating product:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update product',
          details: error.message 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    console.log(`Successfully set TCG ID for product: ${data.name}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        product: data
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Admin set TCG ID error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});