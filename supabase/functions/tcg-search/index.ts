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

    const tryFetch = async (body: any, useMpfev = true) => {
      const url = useMpfev ? `${SEARCH_URL}?mpfev=4215` : SEARCH_URL;
      const res = await fetch(url, {
        method: 'POST',
        headers: baseHeaders,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error('TCGplayer API non-OK', res.status, text);
        return [] as TCGSearchResult[];
      }
      const json = await res.json();
      const results = (json?.results ?? json?.data?.results ?? []) as any[];
      return results
        .filter(Boolean)
        .map((r) => ({ productId: Number(r.productId), productName: String(r.productName) }))
        .filter((r) => Number.isFinite(r.productId) && r.productName);
    };

    const bodyPreferred = {
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
    };

    const bodyAltCased = {
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
    };

    const bodyLowerKeys = {
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
    };

    let results: TCGSearchResult[] = [];

    // Try preferred then alternatives
    results = await tryFetch(bodyPreferred, true);
    if (!results.length) results = await tryFetch(bodyPreferred, false);
    if (!results.length) results = await tryFetch(bodyAltCased, true);
    if (!results.length) results = await tryFetch(bodyAltCased, false);
    if (!results.length) results = await tryFetch(bodyLowerKeys, true);
    if (!results.length) results = await tryFetch(bodyLowerKeys, false);

    // HTML fallback if still empty (extracts /product/{id} links and anchor text)
    if (!results.length) {
      try {
        const url = `https://www.tcgplayer.com/search/magic/product?q=${encodeURIComponent(enrichedQuery)}`;
        const htmlRes = await fetch(url, { headers: { ...baseHeaders, 'Content-Type': 'text/html' } });
        if (htmlRes.ok) {
          const html = await htmlRes.text();
          const matches = Array.from(html.matchAll(/href="\/product\/(\d+)[^"]*"[^>]*>(.*?)<\/a>/gi));
          const seen = new Set<number>();
          const parsed: TCGSearchResult[] = [];
          for (const m of matches) {
            const id = Number(m[1]);
            if (!Number.isFinite(id) || seen.has(id)) continue;
            const name = m[2].replace(/<[^>]*>/g, '').trim();
            if (name) {
              parsed.push({ productId: id, productName: name });
              seen.add(id);
            }
            if (parsed.length >= 12) break;
          }
          results = parsed;
        }
      } catch (e) {
        console.error('HTML fallback failed', e);
      }
    }

    // Score and dedupe results
    const tokens = new Set(enrichedQuery.toLowerCase().split(/\s+/).filter(Boolean));
    const score = (name: string) => {
      const nt = name.toLowerCase();
      let s = 0;
      tokens.forEach((t) => {
        if (nt.includes(t)) s += 1;
      });
      if (setCode && nt.includes(String(setCode).toLowerCase())) s += 2;
      const tk = enrichType(type);
      if (tk && nt.includes(tk.toLowerCase())) s += 2;
      return s;
    };

    const deduped = Array.from(
      new Map(results.map((r) => [r.productId, r])).values()
    )
      .map((r) => ({ ...r, _score: score(r.productName) }))
      .sort((a: any, b: any) => b._score - a._score)
      .slice(0, 12)
      .map(({ _score, ...r }) => r as TCGSearchResult);

    return new Response(
      JSON.stringify({ results: deduped }),
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