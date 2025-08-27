const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TCGSearchResult {
  productId: number;
  productName: string;
}

async function tryTCGSearch(query: string): Promise<TCGSearchResult[]> {
  // Try different search endpoints and methods
  const searchStrategies = [
    // Strategy 1: Current API endpoint
    {
      url: "https://mp-search-api.tcgplayer.com/v1/search/request",
      body: {
        sort: "productName",
        limit: 10,
        filters: {
          productLineName: "magic",
          categoryName: "Sealed Products"
        },
        query
      }
    },
    // Strategy 2: Alternative payload format
    {
      url: "https://mp-search-api.tcgplayer.com/v1/search/request",
      body: {
        algorithm: "",
        from: 0,
        size: 10,
        filters: {
          term: {
            productLineName: "magic"
          },
          range: {},
          match: {
            categoryName: "Sealed Products"
          }
        },
        listingSearch: {
          context: {
            cart: {}
          }
        },
        context: {
          cart: {},
          shippingCountry: "US"
        },
        sort: {},
        q: query
      }
    }
  ];

  for (const strategy of searchStrategies) {
    try {
      console.log(`Trying search strategy with URL: ${strategy.url}`);
      
      const response = await fetch(strategy.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'Origin': 'https://www.tcgplayer.com',
          'Referer': 'https://www.tcgplayer.com/search/magic/product',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-site',
        },
        body: JSON.stringify(strategy.body)
      });

      console.log(`Strategy response status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log('Response data keys:', Object.keys(data));
        
        // Try different result paths
        const results = data.results || data.products || data.data || [];
        if (results.length > 0) {
          console.log(`Found ${results.length} results`);
          return results.map((item: any) => ({
            productId: item.productId || item.id,
            productName: item.productName || item.name || item.title
          }));
        }
      }
    } catch (error) {
      console.log(`Strategy failed:`, error.message);
      continue;
    }
  }

  // Strategy 3: Try HTML scraping as last resort
  try {
    console.log('Trying HTML scraping fallback');
    const searchUrl = `https://www.tcgplayer.com/search/magic/product?q=${encodeURIComponent(query)}&page=1&view=grid`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    });

    if (response.ok) {
      const html = await response.text();
      
      // Extract product links and names from HTML
      const productRegex = /href="\/product\/(\d+)[^"]*"[^>]*>([^<]+)/g;
      const results: TCGSearchResult[] = [];
      let match;
      
      while ((match = productRegex.exec(html)) !== null && results.length < 10) {
        const productId = parseInt(match[1]);
        const productName = match[2].trim();
        
        // Filter for sealed products
        if (productName.toLowerCase().includes('booster') || 
            productName.toLowerCase().includes('bundle') || 
            productName.toLowerCase().includes('box') ||
            productName.toLowerCase().includes('deck')) {
          results.push({
            productId,
            productName
          });
        }
      }
      
      if (results.length > 0) {
        console.log(`HTML scraping found ${results.length} results`);
        return results;
      }
    }
  } catch (error) {
    console.log('HTML scraping failed:', error.message);
  }

  return [];
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

    const results = await tryTCGSearch(query);

    if (results.length === 0) {
      console.log('No results found from any strategy');
      return new Response(
        JSON.stringify({ 
          results: [],
          message: 'No matching products found. Try a different search term or check the product name.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log(`Returning ${results.length} real results`);
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
        error: 'Search temporarily unavailable',
        message: 'Please try again in a moment'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 503,
      }
    );
  }
});