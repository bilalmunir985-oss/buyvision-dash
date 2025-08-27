// deno-lint-ignore-file no-explicit-any
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
};

const CATALOG_URL = 'https://www.tcgplayer.com/api/catalog/categories/1/search';

function headers() {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Origin': 'https://www.tcgplayer.com',
    'Referer': 'https://www.tcgplayer.com/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };
}

async function searchTCG(query: string, setName?: string) {
  const filters: Array<{ name: string; values: string[] }> = [];
  
  // Always add product name filter
  if (query && query.trim()) {
    filters.push({
      name: "productName",
      values: [query.trim()]
    });
  }

  // Add set filter if provided
  if (setName && setName.trim()) {
    filters.push({
      name: "setName", 
      values: [setName.trim()]
    });
  }

  const payload = {
    sort: "name",
    limit: 24,
    offset: 0,
    filters,
    context: {
      shippingCountry: "US",
      language: "en"
    }
  };

  console.log('Searching TCGplayer for:', query, setName ? `(Set: ${setName})` : '');
  console.log('Payload:', JSON.stringify(payload, null, 2));
  
  const response = await fetch(CATALOG_URL, { 
    method: 'POST', 
    headers: headers(), 
    body: JSON.stringify(payload) 
  });
  
  console.log('Response status:', response.status);
  
  if (!response.ok) {
    console.log('TCG search failed:', response.status, await response.text());
    return [];
  }
  
  let json: any;
  try { 
    json = await response.json(); 
  } catch (e) { 
    console.log('Failed to parse JSON response:', e); 
    return []; 
  }
  
  console.log('Response data keys:', Object.keys(json));
  console.log('Total results:', json.totalResults);
  console.log('Fallback:', json.fallback);
  
  const results = Array.isArray(json?.results) ? json.results : [];
  console.log('Found', results.length, 'results');
  
  const mappedResults = results.map((item: any) => ({ 
    productId: item.productId, 
    productName: item.name || item.cleanName
  })).filter(r => r.productId && r.productName);
  
  console.log('Returning', mappedResults.length, 'real results');
  return mappedResults;
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