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

    const SEARCH_URL = "https://mp-search-api.tcgplayer.com/v1/search/request";

    const searchBody = {
      sort: "productName",
      limit: 6,
      filters: {
        productLineName: "magic",
        categoryName: "Sealed Products"
      },
      query
    };

    const response = await fetch(SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchBody)
    });

    if (!response.ok) {
      console.error(`TCGplayer API error: ${response.status} ${response.statusText}`);
      return new Response(
        JSON.stringify({ 
          error: 'TCGplayer API request failed',
          status: response.status 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: response.status,
        }
      );
    }

    const data = await response.json();
    const results: TCGSearchResult[] = data.results || [];

    console.log(`Found ${results.length} results for query: ${query}`);

    return new Response(
      JSON.stringify({ results }),
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