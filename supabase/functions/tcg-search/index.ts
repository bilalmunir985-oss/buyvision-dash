// deno-lint-ignore-file no-explicit-any
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
};

const SEARCH_URL = 'https://mp-search-api.tcgplayer.com/v1/search/request';

function tcgHeaders() {
  return {
    'content-type': 'application/json',
    'origin': 'https://www.tcgplayer.com',
    'referer': 'https://www.tcgplayer.com/',
    'user-agent': 'Mozilla/5.0',
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'en-US,en;q=0.9',
  };
}

async function tryVariant(body: any) {
  try {
    const response = await fetch(SEARCH_URL, {
      method: 'POST',
      headers: tcgHeaders(),
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      console.log(`Variant failed with status: ${response.status}`);
      return null;
    }
    
    const text = await response.text();
    const json = JSON.parse(text);
    return Array.isArray(json?.results) ? json.results : [];
  } catch (error) {
    console.error('Variant request failed:', error);
    return null;
  }
}

async function searchTCG(query: string, setName?: string) {
  console.log(`Searching TCGplayer for: ${query} (Set: ${setName || 'N/A'})`);

  // Variant A (flat filters) - per your documentation  
  const variantA = {
    sort: "productName",
    limit: 12,
    filters: {
      productLineName: "magic",
      productTypeName: "Sealed Products",
      ...(setName ? { setName } : {}),
    },
    query,
  };

  // Variant B (ES-style filters + search) - per your documentation
  const variantB = {
    from: 0,
    size: 12,
    sort: "productName",
    filters: [
      { type: "term", name: "productLineName", values: ["magic"] },
      { type: "term", name: "productTypeName", values: ["Sealed Products"] },
      ...(setName ? [{ type: "term", name: "setName", values: [setName] }] : []),
    ],
    search: { kind: "string", query },
    context: { shippingCountry: "US" },
  };

  console.log('Trying Variant A:', JSON.stringify(variantA, null, 2));

  // Try A → B → fallback (HTML scrape)
  const resultA = await tryVariant(variantA);
  if (resultA && resultA.length > 0) {
    console.log(`Variant A success: ${resultA.length} results`);
    return resultA.map((item: any) => ({
      productId: item.productId,
      productName: item.productName
    })).filter((r: any) => r.productId && r.productName);
  }

  console.log('Trying Variant B:', JSON.stringify(variantB, null, 2));
  const resultB = await tryVariant(variantB);
  if (resultB && resultB.length > 0) {
    console.log(`Variant B success: ${resultB.length} results`);
    return resultB.map((item: any) => ({
      productId: item.productId,
      productName: item.productName
    })).filter((r: any) => r.productId && r.productName);
  }

  console.log('Trying HTML fallback for:', query);
  // Tiny HTML fallback: extract /product/{id} from search page
  const url = `https://www.tcgplayer.com/search/magic/product?productLineName=magic&productTypeName=Sealed%20Products&q=${encodeURIComponent(query)}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'Mozilla/5.0',
        'referer': 'https://www.tcgplayer.com/',
        'accept': 'text/html',
      },
    });

    if (!response.ok) {
      console.log('HTML fallback failed:', response.status);
      return [];
    }

    const html = await response.text();
    const productRegex = /\/product\/(\d+)[^"'<>]*/g;
    const ids = [...html.matchAll(productRegex)].map((m) => m[1]);
    const unique = [...new Set(ids)].slice(0, 10).map((id) => ({
      productId: Number(id),
      productName: `TCG #${id}`,
    }));

    console.log('HTML fallback results:', unique.length);
    return unique;
  } catch (error) {
    console.error('HTML fallback error:', error);
    return [];
  }
}

async function tryHtml(query: string) {
  console.log('Trying HTML fallback for:', query);
  
  const url = 'https://www.tcgplayer.com/search/magic/product?productLineName=magic&categoryName=Sealed%20Products&q=' + encodeURIComponent(query);
  
  const r = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.5',
      'accept-encoding': 'gzip, deflate, br',
      'dnt': '1',
      'connection': 'keep-alive',
      'upgrade-insecure-requests': '1'
    }
  });
  
  if (!r.ok) {
    console.log('HTML fetch failed:', r.status);
    return [];
  }
  
  const html = await r.text();
  
  // Extract product links and names from HTML
  const productRegex = /href="\/product\/(\d+)[^"]*"[^>]*>([^<]+)/g;
  const results: Array<{productId: number, productName: string}> = [];
  let match;
  
  while ((match = productRegex.exec(html)) !== null && results.length < 10) {
    const productId = parseInt(match[1]);
    const productName = match[2].trim();
    
    // Filter for sealed products
    if (productName.toLowerCase().includes('booster') || 
        productName.toLowerCase().includes('bundle') || 
        productName.toLowerCase().includes('box') ||
        productName.toLowerCase().includes('deck') ||
        productName.toLowerCase().includes('case')) {
      results.push({
        productId,
        productName
      });
    }
  }
  
  console.log('HTML results found:', results.length);
  return results;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: cors });

  let body: any = {};
  try { body = await req.json(); } catch {}
  const query = (body?.query ?? '').toString().trim();
  if (!query) return new Response(JSON.stringify({ error: 'missing_query' }), { status: 400, headers: cors });

  const setName = body?.setName || body?.set_code;
  
  console.log('Searching for:', query, setName ? `(Set: ${setName})` : '');

  // Use the new TCGplayer catalog search
  const results = await searchTCG(query, setName);
  
  if (results.length > 0) {
    console.log(`Success with ${results.length} results`);
    return new Response(JSON.stringify({ results }), { headers: cors });
  }

  // Try HTML fallback only if catalog search completely fails
  const htmlItems = await tryHtml(query);
  if (htmlItems.length > 0) {
    console.log(`HTML fallback success with ${htmlItems.length} results`);
    return new Response(JSON.stringify({ results: htmlItems }), { headers: cors });
  }

  console.log('No results found from any method');
  return new Response(JSON.stringify({ 
    results: [],
    message: 'No matching products found' 
  }), { headers: cors });
});