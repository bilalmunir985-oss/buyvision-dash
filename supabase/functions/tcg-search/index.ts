import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // change "*" to your frontend domain for security
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { query } = await req.json()
    if (!query) {
      return new Response(JSON.stringify({ error: "Missing query" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const sessionId = crypto.randomUUID()

    const apiUrl = `https://data.tcgplayer.com/autocomplete?q=${encodeURIComponent(
      query
    )}&session-id=${sessionId}&product-line-affinity=All&algorithm=product_line_affinity`

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        accept: "application/json",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        origin: "https://www.tcgplayer.com",
        referer: "https://www.tcgplayer.com/",
      },
    })

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: `TCG request failed with status ${response.status}`,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const data = await response.json()
    const products =
      (Array.isArray(data) ? data[0]?.products : data?.products) || []

    const mapped = products
      .filter((p: any) => p["product-line-name"] === "Magic: The Gathering")
      .map((p: any) => ({
        id: p["product-id"],
        name: p["product-name"],
        set: p["set-name"],
        urlName: p["product-url-name"],
      }))

    return new Response(JSON.stringify({ query, products: mapped }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
