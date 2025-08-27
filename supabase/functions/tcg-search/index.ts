// deno-lint-ignore-file no-explicit-any
const cors = {
  'Access-Control-Allow-Origin': '*', // or your domain
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
    'user-agent': 'Mozilla/5.0',
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'en-US,en;q=0.9'
  };
}

async function tryJson(payload: any) {
  const r = await fetch(JSON_URL, { method: 'POST', headers: headers(), body: JSON.stringify(payload) });
  const text = await r.text();
  if (!r.ok) {
    console.log('TCG JSON search fail', r.status, text.slice(0, 300));
    return [];
  }
  let json: any;
  try { json = JSON.parse(text); } catch { console.log('non-JSON body'); return []; }
  const results = Array.isArray(json?.results) ? json.results : [];
  return results.map((it: any) => ({ productId: it.productId, productName: it.productName }));
}

// ultra-simple HTML fallback to find /product/{id} links
async function tryHtml(query: string) {
  const url = 'https://www.tcgplayer.com/search/magic/product?productLineName=magic&productTypeName=Sealed%20Products&q='
    + encodeURIComponent(query);
  const r = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0',
      'referer': 'https://www.tcgplayer.com/',
      'accept': 'text/html'
    }
  });
  if (!r.ok) return [];
  const html = await r.text();
  const ids = [...html.matchAll(/\/product\/(\d+)[^"'<>]*/g)].map(m => m[1]);
  const unique = [...new Set(ids)].slice(0, 10);
  return unique.map(id => ({ productId: Number(id), productName: `TCG #${id}` }));
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: cors });

  let body: any = {};
  try { body = await req.json(); } catch {}
  const query = (body?.query ?? '').toString().trim();
  const setName = (body?.setName ?? '').toString().trim();
  if (!query) return new Response(JSON.stringify({ error: 'missing_query' }), { status: 400, headers: cors });

  // 1) JSON variants TCG uses internally
  const variants = [
    { sort: 'productName', limit: 12, filters: { productLineName: 'magic', productTypeName: 'Sealed Products', ...(setName ? { setName } : {}) }, query },
    { from: 0, size: 12, sort: 'productName',
      filters: [
        { type: 'term', name: 'productLineName', values: ['magic'] },
        { type: 'term', name: 'productTypeName', values: ['Sealed Products'] },
        ...(setName ? [{ type: 'term', name: 'setName', values: [setName] }] : [])
      ],
      search: { kind: 'string', query },
      context: { shippingCountry: 'US' }
    },
    // Loosen if above returns nothing:
    { sort: 'productName', limit: 12, filters: { productLineName: 'magic' }, query }
  ];

  for (const p of variants) {
    const items = await tryJson(p);
    if (items.length) return new Response(JSON.stringify({ results: items }), { headers: cors });
    // polite backoff
    await new Promise(r => setTimeout(r, 500 + Math.random() * 300));
  }

  // 2) HTML fallback
  const htmlItems = await tryHtml(query);
  return new Response(JSON.stringify({ results: htmlItems }), { headers: cors });
});