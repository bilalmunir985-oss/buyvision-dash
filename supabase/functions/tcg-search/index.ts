const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TCGSearchResult {
  productId: number;
  productName: string;
}

// Sleep utility for rate limiting
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

    // Retry function with exponential backoff
    const fetchWithRetry = async (url: string, options: RequestInit, maxRetries = 3): Promise<Response> => {
      for (let i = 0; i < maxRetries; i++) {
        try {
          if (i > 0) {
            const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
            console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms delay`);
            await sleep(delay);
          }

          const response = await fetch(url, options);
          
          // If we get a 500, retry. Otherwise return the response (even if it's another error)
          if (response.status !== 500) {
            return response;
          }
          
          if (i === maxRetries - 1) {
            return response; // Last attempt, return whatever we got
          }
          
          console.log(`Got 500 error, retrying... (${i + 1}/${maxRetries})`);
        } catch (error) {
          console.error(`Attempt ${i + 1} failed:`, error);
          if (i === maxRetries - 1) {
            throw error;
          }
        }
      }
      throw new Error('All retry attempts failed');
    };

    // Try the most successful format first based on the logs
    const requestBody = {
      searchRequestBody: {
        query: query.trim(),
        sort: 'productName',
        limit: 12,
        offset: 0,
        filters: {
          ProductLineName: ['Magic'],
          CategoryName: ['Sealed Products'],
        },
      },
    };

    const SEARCH_URL = 'https://mp-search-api.tcgplayer.com/v1/search/request';
    
    console.log('Request body:', JSON.stringify(requestBody));

    const response = await fetchWithRetry(SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': 'https://www.tcgplayer.com',
        'Referer': 'https://www.tcgplayer.com/search/magic/product',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Final response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('TCGplayer API error:', response.status, errorText);
      
      // Return empty results instead of error for better UX
      return new Response(
        JSON.stringify({ 
          results: [],
          error: `TCGplayer API returned ${response.status}`,
          message: 'Unable to fetch results from TCGplayer. Please try again later.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const data = await response.json();
    console.log('Response data keys:', Object.keys(data));
    
    const results = (data?.results || data?.data?.results || []) as TCGSearchResult[];
    
    console.log('Found results:', results.length);
    results.forEach((r, i) => console.log(`${i + 1}:`, r.productName, `(ID: ${r.productId})`));

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('TCG search error:', error);
    return new Response(
      JSON.stringify({ 
        results: [],
        error: 'Internal server error', 
        message: 'Search temporarily unavailable. Please try again later.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});