const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TCGSearchResult {
  productId: number;
  productName: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log(`Searching TCGplayer for: ${query}`);

    // For now, return mock data as TCGplayer API requires authentication
    // In production, you would need to:
    // 1. Get TCGplayer API credentials
    // 2. Implement proper authentication flow
    // 3. Use their official API endpoints
    
    console.log("TCGplayer API currently unavailable - returning mock results");
    
    // Generate mock search results based on query
    const mockResults: TCGSearchResult[] = [
      {
        productId: 77983,
        productName: `${query} - Sealed Product`
      },
      {
        productId: 78000 + Math.floor(Math.random() * 1000),
        productName: `${query} Booster Box`
      },
      {
        productId: 78000 + Math.floor(Math.random() * 1000),
        productName: `${query} Bundle`
      }
    ].filter(result => 
      result.productName.toLowerCase().includes(query.toLowerCase().split(' ')[0])
    );

    console.log(`Found ${mockResults.length} results for query: ${query}`);

    return new Response(
      JSON.stringify({ results: mockResults }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('TCG search error:', error);
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