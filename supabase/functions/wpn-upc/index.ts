import axios from "axios";
import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";

// 🔑 Supabase connection
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // Needs row insert access
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE_URL = "https://wpn.wizards.com/en/products";

async function scrapeSetPage(page = 0) {
  const url = `${BASE_URL}?page=${page}`;
  console.log("Fetching set list:", url);

  const { data } = await axios.get(url);
  const $ = cheerio.load(data);

  // Collect all set links
  const setLinks = [];
  $("a.card__link").each((_, el) => {
    const href = $(el).attr("href");
    if (href?.startsWith("/en/products/")) {
      setLinks.push("https://wpn.wizards.com" + href);
    }
  });

  return setLinks;
}

async function scrapeProductPage(url) {
  console.log("Scraping set:", url);
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);

  // Example set_code: take last part of URL
  const setCode = url.split("/").pop();

  const products = [];
  $(".product-card").each((_, el) => {
    const name = $(el).find(".product-card__title").text().trim();
    const sku = $(el).find(".product-card__sku").text().trim();
    const upc = $(el).find(".product-card__upc").text().trim();

    if (name && upc) {
      products.push({
        name,
        sku,
        upc,
        set_code: setCode,
        wpn_url: url,
      });
    }
  });

  return products;
}

async function runScraper() {
  let allResults = [];

  // Example: scrape first 3 pages
  for (let i = 0; i < 3; i++) {
    const setLinks = await scrapeSetPage(i);

    for (const link of setLinks) {
      const products = await scrapeProductPage(link);

      for (const p of products) {
        // Try to match product in Supabase (by name + set_code)
        const { data: match } = await supabase
          .from("products")
          .select("id")
          .eq("set_code", p.set_code)
          .ilike("name", `%${p.name}%`)
          .maybeSingle();

        if (match?.id) {
          await supabase.from("upc_candidates").insert({
            product_id: match.id,
            scraped_name: p.name,
            scraped_upc: p.upc,
            wpn_url: p.wpn_url,
          });
          console.log("Inserted candidate:", p.name, p.upc);
        } else {
          console.log("No match found for:", p.name);
        }
      }

      allResults = allResults.concat(products);
    }
  }

  console.log("Scraping done. Total products:", allResults.length);
}

// Serve HTTP endpoint
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }), 
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    console.log('Starting WPN UPC scraper...');
    await runScraper();
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'WPN UPC scraping completed successfully' 
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in WPN scraper:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
