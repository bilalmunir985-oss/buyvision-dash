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

    // Try multiple payload/URL variants and fall back to HTML parsing if needed
    const variants = [
      {
        url: `${SEARCH_URL}?mpfev=4215`,
        body: {
          sort: 'productName',
          limit: 12,
          offset: 0,
          filters: {
            productLineName: ['Magic'],
            categoryName: ['Sealed Products']
          },
          query: enrichedQuery
        }
      },
      {
        // Try without mpfev
        url: `${SEARCH_URL}`,
        body: {
          sort: 'productName',
          limit: 12,
          offset: 0,
          filters: {
            productLineName: 'magic',
            categoryName: 'Sealed Products'
          },
          query: enrichedQuery
        }
      },
      {
        // Minimal filters
        url: `${SEARCH_URL}`,
        body: {
          sort: 'productName',
          limit: 12,
          offset: 0,
          query: enrichedQuery
        }
      }
    ];

    const parseResults = (data: any) => {
      let results = data?.results || [];
      if (data?.data?.results) results = data.data.results;
      return (results || [])
        .filter((r: any) => r && (r.productId || r.id))
        .map((r: any) => {
          const productId = r.productId ?? r.id;
          const productName = r.productName ?? r.name ?? r.title ?? '';
          return { productId: Number(productId), productName: String(productName) };
        })
        .filter((r: TCGSearchResult) => Number.isFinite(r.productId) && r.productName)
        .slice(0, 12);
    };

    let lastStatus = 0;
    let lastText = '';

    for (const v of variants) {
      console.log('Trying search variant:', v.url, JSON.stringify(v.body));
      try {
        const response = await fetch(v.url, {
          method: 'POST',
          headers: {
            ...baseHeaders,
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-store',
          },
          body: JSON.stringify(v.body),
        });
        console.log('Variant response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          const transformedResults = parseResults(data);
          console.log('Variant results count:', transformedResults.length);
          if (transformedResults.length > 0) {
            return new Response(
              JSON.stringify({ results: transformedResults }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
          }
          // Even if OK but empty, try next variant before giving up
          continue;
        } else {
          lastStatus = response.status;
          lastText = (await response.text()).slice(0, 500);
          console.error('TCGplayer API error (variant):', lastStatus, lastText);
        }
      } catch (e) {
        console.error('Variant request failed:', e);
      }
    }

    // Fallback: HTML search page parse to recover product IDs when JSON API fails
    try {
      const htmlUrl = `https://www.tcgplayer.com/search/magic/product?q=${encodeURIComponent(enrichedQuery)}`;
      console.log('Trying HTML fallback:', htmlUrl);
      const htmlRes = await fetch(htmlUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'User-Agent': baseHeaders['User-Agent'],
          'Referer': 'https://www.tcgplayer.com/',
          'Origin': 'https://www.tcgplayer.com',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      if (htmlRes.ok) {
        const html = await htmlRes.text();
        const resultsSet = new Map<number, string>();

        // Try to capture anchors linking to product pages and their text
        const anchorRegex = /<a[^>]+href="\/product\/(\d+)[^"]*"[^>]*>([^<]{3,200})<\/a>/gi;
        let m: RegExpExecArray | null;
        while ((m = anchorRegex.exec(html)) && resultsSet.size < 20) {
          const id = Number(m[1]);
          let name = m[2].replace(/\s+/g, ' ').trim();
          if (Number.isFinite(id) && name) {
            // Basic cleanup for stray characters
            name = name.replace(/&amp;/g, '&').replace(/&quot;/g, '"');
            if (!resultsSet.has(id)) resultsSet.set(id, name);
          }
        }

        // If names weren't captured, at least return IDs from product links
        if (resultsSet.size === 0) {
          const idOnlyRegex = /\/product\/(\d+)/g;
          let mm: RegExpExecArray | null;
          while ((mm = idOnlyRegex.exec(html)) && resultsSet.size < 20) {
            const id = Number(mm[1]);
            if (Number.isFinite(id) && !resultsSet.has(id)) resultsSet.set(id, `TCG Product #${id}`);
          }
        }

        const transformedResults = Array.from(resultsSet.entries())
          .map(([productId, productName]) => ({ productId, productName }))
          .slice(0, 12);

        console.log('HTML fallback results:', transformedResults.length);
        return new Response(
          JSON.stringify({ results: transformedResults, fallback: 'html' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      } else {
        console.error('HTML fallback non-OK:', htmlRes.status);
      }
    } catch (e) {
      console.error('HTML fallback failed:', e);
    }

    // If we reach here, everything failed – return empty with diagnostic info
    return new Response(
      JSON.stringify({ results: [], error: 'no_results', lastStatus, lastText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

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