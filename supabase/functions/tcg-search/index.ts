// deno-lint-ignore-file no-explicit-any
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
};

const JSON_URL = 'https://www.tcgplayer.com/api/catalog/categories/1/search';

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
  
  // Handle the new API response format
  const results = Array.isArray(json?.results) ? json.results : [];
  console.log('Found results:', results.length);
  console.log('Fallback status:', json?.fallback);
  
  return results.map((it: any) => ({ 
    productId: it.productId, 
    productName: it.name || it.cleanName || it.productName 
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
  
  // Extract all product IDs from href="/product/123456" links
  const productIds = [...html.matchAll(/\/product\/(\d+)/g)]
    .map(m => parseInt(m[1]))
    .filter(id => id > 0)
    .slice(0, 10); // Limit to 10 results
  
  console.log('Product IDs found:', productIds);
  
  const results: Array<{productId: number, productName: string}> = [];
  
  // For each ID, try to find the associated product name
  for (const productId of productIds) {
    let productName = `TCG Product #${productId}`;
    
    // Look for product names in common patterns
    const patterns = [
      new RegExp(`href="/product/${productId}[^"]*"[^>]*title="([^"]+)"`, 'i'),
      new RegExp(`data-productid="${productId}"[^>]*>\\s*([^<]+)`, 'i'),
      new RegExp(`/product/${productId}[^"]*"[^>]*>([^<]+(?:booster|bundle|box|deck|case)[^<]*)<`, 'i')
    ];
    
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1] && match[1].trim().length > 3) {
        productName = match[1].trim();
        break;
      }
    }
    
    results.push({
      productId,
      productName
    });
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
  const setName = (body?.setName ?? '').toString().trim();
  if (!query) return new Response(JSON.stringify({ error: 'missing_query' }), { status: 400, headers: cors });

  console.log('Searching for:', query, setName ? `(set: ${setName})` : '');

  // Correct payload format for TCGPlayer catalog API
  const variants = [
    // v1: Search by product name
    {
      sort: "name",
      limit: 24,
      offset: 0,
      filters: [
        {
          name: "productName",
          values: [query]
        }
      ],
      context: {
        shippingCountry: "US",
        language: "en"
      }
    },
    
    // v2: Add set filter if provided
    ...(setName ? [{
      sort: "name",
      limit: 24,
      offset: 0,
      filters: [
        {
          name: "productName",
          values: [query]
        },
        {
          name: "setName",
          values: [setName]
        }
      ],
      context: {
        shippingCountry: "US",
        language: "en"
      }
    }] : []),
    
    // v3: Broader search without product name filter
    {
      sort: "name",
      limit: 24,
      offset: 0,
      filters: [],
      context: {
        shippingCountry: "US",
        language: "en"
      }
    }
  ];

  // Try JSON variants with retry logic
  for (let i = 0; i < variants.length; i++) {
    const payload = variants[i];
    console.log(`Trying variant ${i + 1}/${variants.length}`);
    
    const items = await tryJson(payload);
    if (items.length > 0) {
      console.log(`JSON success with variant ${i + 1}: ${items.length} results`);
      return new Response(JSON.stringify({ results: items }), { headers: cors });
    }
    
    // Brief pause between attempts
    if (i < variants.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // Fallback to HTML scraping
  console.log('All JSON variants failed, trying HTML fallback');
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