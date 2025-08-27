// deno-lint-ignore-file no-explicit-any
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
};

const JSON_URL = 'https://mp-search-api.tcgplayer.com/v1/search/request';

function headers() {
  return {
    'content-type': 'application/json',
    'origin': 'https://www.tcgplayer.com',
    'referer': 'https://www.tcgplayer.com/',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'en-US,en;q=0.9',
    'accept-encoding': 'gzip, deflate, br',
    'dnt': '1',
    'connection': 'keep-alive',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site'
  };
}

async function tryJson(payload: any) {
  console.log('Trying payload:', JSON.stringify(payload));
  
  const r = await fetch(JSON_URL, { 
    method: 'POST', 
    headers: headers(), 
    body: JSON.stringify(payload) 
  });
  
  const text = await r.text();
  console.log('Response status:', r.status);
  
  if (!r.ok) {
    console.log('TCG JSON search fail', r.status, text.slice(0, 500));
    return [];
  }
  
  let json: any;
  try { 
    json = JSON.parse(text); 
  } catch (e) { 
    console.log('non-JSON body:', text.slice(0, 200)); 
    return []; 
  }
  
  const results = Array.isArray(json?.results) ? json.results : [];
  console.log('Found results:', results.length);
  
  return results.map((it: any) => ({ 
    productId: it.productId, 
    productName: it.productName || it.name 
  })).filter(r => r.productId && r.productName);
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
  console.log('HTML length received:', html.length);
  
  // Multiple regex patterns to try different HTML structures
  const patterns = [
    // Pattern 1: Standard product links
    /href="\/product\/(\d+)[^"]*"[^>]*>([^<]+)/g,
    // Pattern 2: Data attributes
    /data-productid="(\d+)"[^>]*>[^<]*<[^>]*>([^<]+)/g,
    // Pattern 3: Product cards with IDs
    /<a[^>]+href="[^"]*\/product\/(\d+)[^"]*"[^>]*>[^<]*<[^>]*class="[^"]*product[^"]*"[^>]*>([^<]+)/g,
    // Pattern 4: Alternative structure
    /<div[^>]+data-productid="(\d+)"[^>]*>[\s\S]*?<[^>]*>([^<]*(?:booster|bundle|box|deck|case)[^<]*)<\/[^>]*>/gi
  ];
  
  const results: Array<{productId: number, productName: string}> = [];
  
  for (const pattern of patterns) {
    console.log('Trying pattern:', pattern.source);
    let match;
    const patternResults: Array<{productId: number, productName: string}> = [];
    
    while ((match = pattern.exec(html)) !== null && patternResults.length < 10) {
      const productId = parseInt(match[1]);
      const productName = match[2].trim().replace(/\s+/g, ' ');
      
      console.log('Found potential match:', { productId, productName });
      
      // Filter for sealed products - be more permissive
      if (productName && (
          productName.toLowerCase().includes('booster') || 
          productName.toLowerCase().includes('bundle') || 
          productName.toLowerCase().includes('box') ||
          productName.toLowerCase().includes('deck') ||
          productName.toLowerCase().includes('case') ||
          productName.toLowerCase().includes('collector') ||
          productName.toLowerCase().includes('draft') ||
          productName.toLowerCase().includes('set booster')
        )) {
        patternResults.push({
          productId,
          productName
        });
      }
    }
    
    if (patternResults.length > 0) {
      console.log(`Pattern found ${patternResults.length} results`);
      results.push(...patternResults);
      break; // Use first successful pattern
    }
  }
  
  // If no patterns work, log some HTML content for debugging
  if (results.length === 0) {
    console.log('No matches found. HTML sample:', html.substring(0, 1000));
    
    // Try a very broad search to see if there are any product IDs at all
    const broadPattern = /(\d{6,})/g;
    const potentialIds = [];
    let broadMatch;
    while ((broadMatch = broadPattern.exec(html)) !== null && potentialIds.length < 5) {
      potentialIds.push(broadMatch[1]);
    }
    console.log('Potential product IDs found:', potentialIds);
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

  console.log('Searching for:', query);

  // Try correct TCGplayer API payload formats
  const variants = [
    // v1: Current working format (array of name/values objects)
    {
      sort: 'productName',
      limit: 10,
      offset: 0,
      filters: [
        { name: 'productLineName', values: ['magic'] },
        { name: 'categoryName', values: ['Sealed Products'] }
      ],
      context: {
        shippingCountry: 'US',
        language: 'en'
      },
      search: query
    },
    // v2: Alternative with query field
    {
      sort: 'productName',
      limit: 10,
      offset: 0,
      filters: [
        { name: 'productLineName', values: ['magic'] },
        { name: 'categoryName', values: ['Sealed Products'] }
      ],
      query
    },
    // v3: Minimal working format
    {
      limit: 10,
      filters: [
        { name: 'productLineName', values: ['magic'] }
      ],
      search: query
    }
  ];

  // Try JSON variants first
  for (const payload of variants) {
    const items = await tryJson(payload);
    if (items.length > 0) {
      console.log(`Success with ${items.length} results`);
      return new Response(JSON.stringify({ results: items }), { headers: cors });
    }
    // Brief pause between attempts
    await new Promise(r => setTimeout(r, 300));
  }

  // Try HTML fallback only if JSON completely fails
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