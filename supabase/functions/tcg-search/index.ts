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

    // Light enrichment (keeps us on a single real JSON endpoint, no HTML fallback)
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
      'Accept': 'application/json, text/plain, */*',
      'Origin': 'https://www.tcgplayer.com',
      'Referer': 'https://www.tcgplayer.com/search/magic/product',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'X-Requested-With': 'XMLHttpRequest',
    } as const;

    // Real endpoint only – try known shapes that TCGplayer accepts. No HTML fallback.
    const bodies: any[] = [
      // 1) Wrapped, PascalCase filters keys and array values
      {
        searchRequestBody: {
          query: enrichedQuery,
          sort: 'productName',
          limit: 12,
          offset: 0,
          filters: {
            ProductLineName: ['Magic'],
            CategoryName: ['Sealed Products'],
          },
        },
      },
      // 2) Wrapped, alternative casing
      {
        searchRequestBody: {
          QueryString: enrichedQuery,
          Sort: 'productName',
          Size: 12,
          From: 0,
          Filters: {
            ProductLineName: ['Magic'],
            CategoryName: ['Sealed Products'],
          },
        },
      },
      // 3) Wrapped, lower-case filter keys
      {
        searchRequestBody: {
          query: enrichedQuery,
          sort: 'productName',
          limit: 12,
          offset: 0,
          filters: {
            productLineName: ['magic'],
            categoryName: ['Sealed Products'],
          },
        },
      },
      // 4) Unwrapped body (as sometimes seen in site requests)
      {
        query: enrichedQuery,
        sort: 'productName',
        limit: 12,
        offset: 0,
        filters: {
          productLineName: 'magic',
          categoryName: 'Sealed Products',
        },
      },
    ];

    const urls = [
      `${SEARCH_URL}?mpfev=4215`,
      SEARCH_URL,
    ];

    const tryFetch = async (body: any, url: string) => {
      console.log('Request URL:', url);
      console.log('Request body:', JSON.stringify(body));
      const res = await fetch(url, {
        method: 'POST',
        headers: baseHeaders,
        body: JSON.stringify(body),
      });
      console.log('Response status:', res.status);
      if (!res.ok) {
        const text = await res.text();
        console.error('TCGplayer API non-OK', res.status, text);
        return null as unknown as TCGSearchResult[];
      }
      const json = await res.json();
      const arr = (json?.results ?? json?.data?.results ?? []) as any[];
      return arr
        .filter(Boolean)
        .map((r) => ({ productId: Number(r.productId), productName: String(r.productName) }))
        .filter((r) => Number.isFinite(r.productId) && r.productName);
    };

    let results: TCGSearchResult[] = [];

    // Try all combinations of bodies and urls
    outer: for (const body of bodies) {
      for (const url of urls) {
        const r = await tryFetch(body, url);
        if (Array.isArray(r) && r.length) {
          results = r;
          break outer;
        }
      }
    }

    if (!results.length) {
      // Still no results, return an explicit error (real endpoint only; no fallback)
      return new Response(
        JSON.stringify({ error: 'No results from TCGplayer search API' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      );
    }

    return new Response(
      JSON.stringify({ results }),
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