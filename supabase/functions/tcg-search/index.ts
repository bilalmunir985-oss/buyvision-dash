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
    const { query, setCode, type } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('Searching for:', query, 'Set:', setCode, 'Type:', type);

    const enrichType = (t?: string) => {
      if (!t) return '';
      const tl = String(t).toLowerCase();
      if (tl.includes('set')) return 'Set Booster';
      if (tl.includes('draft')) return 'Draft Booster';
      if (tl.includes('collector')) return 'Collector Booster';
      if (tl.includes('bundle')) return 'Bundle';
      if (tl.includes('box')) return 'Box';
      if (tl.includes('case')) return 'Case';
      if (tl.includes('pack')) return 'Pack';
      if (tl.includes('commander')) return 'Commander Deck';
      return '';
    };

    const enrichedQuery = [query, setCode, enrichType(type)].filter(Boolean).join(' ');

    const SEARCH_URL = 'https://mp-search-api.tcgplayer.com/v1/search/request';

    const baseHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Origin': 'https://www.tcgplayer.com',
      'Referer': 'https://www.tcgplayer.com/search/magic/product',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    // Try the most common working format first
    const requestBody = {
      sort: 'productName',
      limit: 12,
      offset: 0,
      filters: {
        productLineName: ['Magic'],
        categoryName: ['Sealed Products']
      },
      query: enrichedQuery
    };

    console.log('Request body:', JSON.stringify(requestBody));

    try {
      const response = await fetch(`${SEARCH_URL}?mpfev=4215`, {
        method: 'POST',
        headers: baseHeaders,
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Response data keys:', Object.keys(data));
        
        // Handle different response structures
        let results = data.results || [];
        if (data.data?.results) {
          results = data.data.results;
        }

        console.log('Found results:', results.length);
        
        // Transform results to match expected format
        const transformedResults = results
          .filter((r: any) => r && (r.productId || r.id))
          .map((r: any) => {
            const productId = r.productId || r.id;
            const productName = r.productName || r.name || r.title;
            console.log(`Result: ${productName} (ID: ${productId})`);
            return {
              productId: Number(productId),
              productName: String(productName)
            };
          })
          .filter((r: TCGSearchResult) => Number.isFinite(r.productId) && r.productName)
          .slice(0, 12);

        return new Response(
          JSON.stringify({ results: transformedResults }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      } else {
        console.error('TCGplayer API error:', response.status, await response.text());
      }
    } catch (e) {
      console.error('Request failed:', e);
    }

    // If we get here, return empty results
    return new Response(
      JSON.stringify({ results: [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('TCG search error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});