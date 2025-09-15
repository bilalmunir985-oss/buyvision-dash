import axios from "https://deno.land/x/axiod@0.26.2/mod.ts";
import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 🔑 Supabase connection
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE_URL = "https://wpn.wizards.com/en/products";

// Utility functions
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractUPC(raw: string): string | null {
  if (!raw) return null;
  
  // First try: extract digits and check for 12/13 digit UPC/EAN
  const digits = raw.replace(/\D+/g, "");
  if (digits.length === 12 || digits.length === 13) return digits;
  
  // Second try: look for pattern with spaces/dashes
  const match = raw.match(/(\d[\d\-\s]{10,}\d)/);
  if (match) {
    const cleaned = match[1].replace(/\D+/g, "");
    if (cleaned.length === 12 || cleaned.length === 13) return cleaned;
  }
  
  return null;
}

function getHeaders() {
  return {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; UPCBot/1.0; +https://bl.proxyprintr.com)",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
    },
  };
}

async function scrapeSetPage(page = 0): Promise<string[]> {
  const url = `${BASE_URL}?page=${page}`;
  console.log("Fetching set list:", url);

  try {
    const { data } = await axios.get(url, getHeaders());
    const $ = cheerio.load(data);

    const setLinks = new Set<string>();
    
    // Multiple selectors for resilience
    const selectors = [
      "a.card__link", 
      "a[href^='/en/products/']", 
      ".product-card a", 
      ".wpn-product-card a"
    ];
    
    for (const selector of selectors) {
      $(selector).each((_, el) => {
        const href = $(el).attr("href");
        if (href?.startsWith("/en/products/") && !href.includes("?page=")) {
          setLinks.add("https://wpn.wizards.com" + href);
        }
      });
    }

    return [...setLinks];
  } catch (error) {
    console.error(`Error scraping set page ${page}:`, error);
    return [];
  }
}

async function scrapeProductPage(url: string) {
  console.log("Scraping products from:", url);
  
  try {
    const { data } = await axios.get(url, getHeaders());
    const $ = cheerio.load(data);

    const setCode = url.split("/").pop()!.trim();
    const products: Array<{ name: string; upc: string; set_code: string; wpn_url: string }> = [];

    // Helper function to find text by label
    const readFieldByLabel = ($card: cheerio.Cheerio, label: string): string | null => {
      const labelElements = $card.find("*").filter((_, el) => {
        const text = $(el).text().trim().toLowerCase();
        return text.includes(label.toLowerCase()) || text.startsWith(label.toLowerCase());
      });
      
      if (labelElements.length > 0) {
        const parent = $(labelElements[0]).parent();
        const text = parent.text().trim();
        // Extract the value after the label
        const colonIndex = text.indexOf(':');
        return colonIndex > -1 ? text.substring(colonIndex + 1).trim() : text;
      }
      return null;
    };

    // Multiple selectors for product cards
    const cardSelectors = [
      ".product-card", 
      ".wpn-product-card", 
      "[class*='product']",
      ".card"
    ];

    for (const cardSelector of cardSelectors) {
      $(cardSelector).each((_, el) => {
        const $card = $(el);

        // Extract product name with multiple fallbacks
        const name = $card.find(".product-card__title").text().trim() ||
                     $card.find(".title, .product-title, h2, h3").first().text().trim() ||
                     $card.find("strong").first().text().trim();

        // Extract UPC with multiple methods
        let upcText = $card.find(".product-card__upc").text().trim() ||
                      readFieldByLabel($card, "UPC") ||
                      readFieldByLabel($card, "UPC / EAN") ||
                      readFieldByLabel($card, "EAN") ||
                      $card.find("*:contains('UPC')").last().text().trim();

        const upc = upcText ? extractUPC(upcText) : null;

        if (name && upc) {
          // Avoid duplicates
          const isDuplicate = products.some(p => p.name === name && p.upc === upc);
          if (!isDuplicate) {
            products.push({
              name: name.trim(),
              upc,
              set_code: setCode,
              wpn_url: url,
            });
          }
        }
      });
    }

    console.log(`Found ${products.length} products with UPCs on ${url}`);
    return products;
  } catch (error) {
    console.error(`Error scraping product page ${url}:`, error);
    return [];
  }
}

// Fuzzy match using the new database function
async function findBestMatch(setCode: string, scrapedName: string) {
  try {
    const { data, error } = await supabase.rpc("find_best_product_match", {
      p_set_code: setCode,
      p_scraped_name: scrapedName,
    });

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error("Error in fuzzy matching:", error);
    return null;
  }
}

// Check if product already has verified UPC
async function hasVerifiedUPC(productId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("upc_is_verified")
      .eq("id", productId)
      .maybeSingle();

    if (error) throw error;
    return data?.upc_is_verified === true;
  } catch (error) {
    console.error("Error checking verified UPC:", error);
    return false;
  }
}

// Stage candidate for admin review
async function stageCandidate(
  productId: string, 
  scrapedName: string, 
  scrapedUpc: string, 
  wpnUrl: string
): Promise<boolean> {
  try {
    // Check if already verified
    if (await hasVerifiedUPC(productId)) {
      console.log(`Skipping ${scrapedName} - UPC already verified`);
      return false;
    }

    // Use upsert to handle duplicates gracefully
    const { error } = await supabase.from("upc_candidates").upsert(
      {
        product_id: productId,
        scraped_name: scrapedName,
        scraped_upc: scrapedUpc,
        wpn_url: wpnUrl,
      },
      {
        onConflict: "product_id,scraped_upc",
        ignoreDuplicates: true,
      }
    );

    if (error) {
      console.error("Error staging candidate:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in stageCandidate:", error);
    return false;
  }
}

async function runScraper() {
  let totalScraped = 0;
  let totalStaged = 0;
  let totalMatched = 0;

  console.log("Starting enhanced WPN UPC scraper with fuzzy matching...");

  try {
    // Scrape multiple pages until no more sets found
    for (let page = 0; page < 10; page++) { // Increased from 3 to 10 pages
      console.log(`\n--- Processing page ${page} ---`);
      
      const setLinks = await scrapeSetPage(page);
      if (setLinks.length === 0) {
        console.log(`No more sets found on page ${page}, stopping`);
        break;
      }

      console.log(`Found ${setLinks.length} set links on page ${page}`);

      for (const [linkIndex, link] of setLinks.entries()) {
        try {
          console.log(`Processing set ${linkIndex + 1}/${setLinks.length}: ${link}`);
          
          const products = await scrapeProductPage(link);
          totalScraped += products.length;

          if (products.length === 0) {
            console.log("No products with UPCs found on this page");
            continue;
          }

          for (const [productIndex, product] of products.entries()) {
            try {
              // Use fuzzy matching with similarity threshold
              const match = await findBestMatch(product.set_code, product.name);
              
              if (match && match.sim >= 0.85) { // 0.85 similarity threshold as specified
                totalMatched++;
                console.log(
                  `Match found (${match.sim.toFixed(2)} similarity): "${product.name}" -> "${match.name}"`
                );

                const staged = await stageCandidate(
                  match.id,
                  product.name,
                  product.upc,
                  product.wpn_url
                );

                if (staged) {
                  totalStaged++;
                  console.log(`✓ Staged candidate: ${product.name} (UPC: ${product.upc})`);
                }
              } else {
                const sim = match?.sim || 0;
                console.log(
                  `No good match for "${product.name}" in set ${product.set_code} (best similarity: ${sim.toFixed(2)})`
                );
              }

              // Rate limiting: 200ms between products
              await sleep(200);
            } catch (error) {
              console.error(`Error processing product "${product.name}":`, error);
            }
          }

          // Rate limiting: 400ms between set pages
          await sleep(400);
        } catch (error) {
          console.error(`Error processing set link ${link}:`, error);
        }
      }

      // Rate limiting: 1 second between pages
      await sleep(1000);
    }
  } catch (error) {
    console.error("Critical error in scraper:", error);
    throw error;
  }

  console.log("\n=== Scraping Summary ===");
  console.log(`Total products scraped: ${totalScraped}`);
  console.log(`Total products matched: ${totalMatched}`);
  console.log(`Total candidates staged: ${totalStaged}`);
  console.log("WPN UPC scraping completed successfully");

  return {
    scraped: totalScraped,
    matched: totalMatched,
    staged: totalStaged,
  };
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
    console.log('Starting enhanced WPN UPC scraper...');
    const results = await runScraper();
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'WPN UPC scraping completed successfully',
        stats: {
          totalScraped: results.scraped,
          totalMatched: results.matched,
          candidatesStaged: results.staged,
        }
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
