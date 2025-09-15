// supabase/functions/fetch-prices/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function fetchProductPricing(tcgplayerId: number) {
  try {
    const url = `https://mp-search-api.tcgplayer.com/v2/product/${tcgplayerId}/details?mpfev=4251`;
    console.log(`🌐 Fetching details for product ${tcgplayerId}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Origin: "https://www.tcgplayer.com",
        Referer: `https://www.tcgplayer.com/product/${tcgplayerId}`,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      console.error(`❌ Failed to fetch details for ${tcgplayerId}`);
      return null;
    }

    const data = await response.json();

    return {
      tcgplayer_id: tcgplayerId,
      product_name: data.productUrlName ?? null,
      product_type: data.productTypeName ?? null,
      sealed: data.sealed ?? null,
      market_price: data.marketPrice ?? null,
      release_date: data.customAttributes?.releaseDate ?? null,
      product_url: `https://www.tcgplayer.com/product/${tcgplayerId}`,
    };
  } catch (err) {
    console.error(`❌ Error fetching product ${tcgplayerId}:`, err);
    return null;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get all verified products with TCGplayer IDs
    const { data: products, error } = await supabase
      .from("products")
      .select("id, name, tcgplayer_product_id")
      .eq("tcg_is_verified", true)
      .not("tcgplayer_product_id", "is", null);

    if (error) {
      throw error;
    }

    console.log(`📦 Found ${products.length} products to update`);

    const today = new Date().toISOString().split("T")[0];
    const results = [];

    for (const product of products) {
      const priceData = await fetchProductPricing(product.tcgplayer_product_id);
      if (!priceData) continue;

      // Upsert into daily_metrics
      const { error: upsertError } = await supabase
        .from("daily_metrics")
        .upsert(
          {
            product_id: product.id,
            as_of_date: today,
            product_url: priceData.product_url,
            lowest_total_price: priceData.market_price, // details API only gives marketPrice
            lowest_item_price: priceData.market_price,
            num_listings: null, // details API doesn’t return listings
            total_quantity_listed: null,
            target_product_cost: priceData.market_price
              ? priceData.market_price * 0.6
              : null,
            max_product_cost: priceData.market_price
              ? priceData.market_price * 0.8
              : null,
          },
          { onConflict: "product_id,as_of_date" }
        );

      if (upsertError) {
        console.error(`❌ Failed to upsert metrics for ${product.name}`, upsertError);
      } else {
        results.push({
          id: product.id,
          name: product.name,
          marketPrice: priceData.market_price,
        });
      }

      // avoid hammering the API
      await new Promise((r) => setTimeout(r, 1500));
    }

    return new Response(
      JSON.stringify({ status: "ok", updated: results.length, results }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err) {
    console.error("❌ Edge function error", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
