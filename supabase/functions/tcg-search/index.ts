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

    console.log('Searching for:', query);

    const SEARCH_URL = 'https://mp-search-api.tcgplayer.com/v1/search/request';

    const requestBody = {
      sort: 'productName',
      limit: 12,
      filters: {
        productLineName: 'magic',
        categoryName: 'Sealed Products'
      },
      query: query
    };

    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://www.tcgplayer.com',
        'Referer': 'https://www.tcgplayer.com/search/magic/product',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('TCGplayer API error:', response.status, errorText);
      throw new Error(`TCGplayer API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Raw response:', JSON.stringify(data, null, 2));

    const results = (data?.results || []) as TCGSearchResult[];
    
    console.log('Parsed results:', results.length, 'items');

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('TCG search error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: (error as Error).message,
        details: error instanceof Error ? error.stack : String(error)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});