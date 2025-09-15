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

    // Debug: Log page structure to understand what we're working with
    console.log(`Page title: ${$('title').text()}`);
    console.log(`Total elements found: ${$('*').length}`);
    
    // Helper function to find text by label with more flexible matching
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

    // Enhanced UPC extraction function
    const extractUPCFromText = (text: string): string | null => {
      if (!text) return null;
      
      // Look for UPC patterns in the text
      const upcPatterns = [
        /UPC[:\s]*(\d{12,13})/i,
        /EAN[:\s]*(\d{12,13})/i,
        /(\d{12,13})/,
        /(\d{3}-\d{6}-\d{3})/,
        /(\d{3}\s\d{6}\s\d{3})/
      ];
      
      for (const pattern of upcPatterns) {
        const match = text.match(pattern);
        if (match) {
          const upc = match[1] || match[0];
          const cleaned = upc.replace(/\D+/g, "");
          if (cleaned.length === 12 || cleaned.length === 13) {
            return cleaned;
          }
        }
      }
      
      return null;
    };

    // Multiple selectors for product cards - expanded list
    const cardSelectors = [
      ".product-card", 
      ".wpn-product-card", 
      "[class*='product']",
      ".card",
      ".product-item",
      ".item",
      "[class*='card']",
      "article",
      ".product"
    ];

    let totalCardsFound = 0;
    let cardsWithNames = 0;
    let cardsWithUPCs = 0;

    for (const cardSelector of cardSelectors) {
      const cards = $(cardSelector);
      console.log(`Found ${cards.length} elements with selector: ${cardSelector}`);
      totalCardsFound += cards.length;
      
      cards.each((_, el) => {
        const $card = $(el);

        // Extract product name with multiple fallbacks
        const name = $card.find(".product-card__title").text().trim() ||
                     $card.find(".title, .product-title, h2, h3, h4").first().text().trim() ||
                     $card.find("strong").first().text().trim() ||
                     $card.find("a").first().text().trim() ||
                     $card.text().substring(0, 100).trim(); // Fallback to first 100 chars

        if (name && name.length > 3) {
          cardsWithNames++;
          
          // Extract UPC with multiple methods - enhanced
          let upcText = $card.find(".product-card__upc").text().trim() ||
                        readFieldByLabel($card, "UPC") ||
                        readFieldByLabel($card, "UPC / EAN") ||
                        readFieldByLabel($card, "EAN") ||
                        $card.find("*:contains('UPC')").last().text().trim() ||
                        $card.find("*:contains('EAN')").last().text().trim();

          // If no specific UPC text found, search the entire card text
          if (!upcText) {
            upcText = $card.text();
          }

          const upc = upcText ? extractUPCFromText(upcText) : null;

          if (upc) {
            cardsWithUPCs++;
            console.log(`Found UPC: ${upc} for product: ${name.substring(0, 50)}...`);
          }

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
        }
      });
    }

    console.log(`Debug stats - Total cards: ${totalCardsFound}, With names: ${cardsWithNames}, With UPCs: ${cardsWithUPCs}`);
    console.log(`Found ${products.length} products with UPCs on ${url}`);
    
    // If no products found, let's see what's actually on the page
    if (products.length === 0) {
      console.log("No products found. Page content sample:");
      console.log($('body').text().substring(0, 500));
    }
    
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
  const startTime = Date.now();
  const maxExecutionTime = 4 * 60 * 1000; // 4 minutes max execution time

  console.log("Starting enhanced WPN UPC scraper with fuzzy matching...");

  try {
    // Scrape limited pages to stay within compute limits
    const maxPages = 3; // Reduced from 10 to 3 to prevent WORKER_LIMIT
    const maxSetsPerPage = 5; // Limit sets per page to prevent timeout
    const maxProductsPerSet = 10; // Limit products per set to prevent timeout
    
    for (let page = 0; page < maxPages; page++) {
      // Check execution time limit
      if (Date.now() - startTime > maxExecutionTime) {
        console.log(`Execution time limit reached (${maxExecutionTime/1000}s), stopping gracefully`);
        break;
      }
      
      console.log(`\n--- Processing page ${page + 1}/${maxPages} ---`);
      
      const setLinks = await scrapeSetPage(page);
      if (setLinks.length === 0) {
        console.log(`No more sets found on page ${page}, stopping`);
        break;
      }

      // Limit the number of sets processed per page
      const limitedSetLinks = setLinks.slice(0, maxSetsPerPage);
      console.log(`Found ${setLinks.length} set links, processing first ${limitedSetLinks.length}`);

      for (const [linkIndex, link] of limitedSetLinks.entries()) {
        try {
          console.log(`Processing set ${linkIndex + 1}/${limitedSetLinks.length}: ${link}`);
          
          const products = await scrapeProductPage(link);
          totalScraped += products.length;

          if (products.length === 0) {
            console.log("No products with UPCs found on this page");
            continue;
          }

          // Limit the number of products processed per set
          const limitedProducts = products.slice(0, maxProductsPerSet);
          console.log(`Found ${products.length} products, processing first ${limitedProducts.length}`);

          for (const [productIndex, product] of limitedProducts.entries()) {
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

              // Reduced rate limiting: 100ms between products
              await sleep(100);
            } catch (error) {
              console.error(`Error processing product "${product.name}":`, error);
            }
          }

          // Reduced rate limiting: 200ms between set pages
          await sleep(200);
        } catch (error) {
          console.error(`Error processing set link ${link}:`, error);
        }
      }

      // Reduced rate limiting: 500ms between pages
      await sleep(500);
    }
  } catch (error) {
    console.error("Critical error in scraper:", error);
    throw error;
  }

  const executionTime = (Date.now() - startTime) / 1000;
  console.log("\n=== Scraping Summary ===");
  console.log(`Execution time: ${executionTime.toFixed(1)}s`);
  console.log(`Total products scraped: ${totalScraped}`);
  console.log(`Total products matched: ${totalMatched}`);
  console.log(`Total candidates staged: ${totalStaged}`);
  console.log("WPN UPC scraping completed successfully");

  return {
    scraped: totalScraped,
    matched: totalMatched,
    staged: totalStaged,
    executionTime: executionTime,
  };
}

// Test function to debug a specific page
async function testSpecificPage(url: string) {
  console.log(`Testing specific page: ${url}`);
  
  try {
    const { data } = await axios.get(url, getHeaders());
    const $ = cheerio.load(data);
    
    console.log(`Page title: ${$('title').text()}`);
    console.log(`Page URL: ${url}`);
    
    // Look for any text that might contain UPCs
    const bodyText = $('body').text();
    const upcMatches = bodyText.match(/\d{12,13}/g);
    console.log(`Found ${upcMatches ? upcMatches.length : 0} potential UPC numbers in page text`);
    
    if (upcMatches) {
      console.log(`Potential UPCs: ${upcMatches.slice(0, 5).join(', ')}`);
    }
    
    // Look for specific elements that might contain product info
    const productElements = $('[class*="product"], [class*="card"], [class*="item"]');
    console.log(`Found ${productElements.length} potential product elements`);
    
    // Sample some text content
    productElements.slice(0, 3).each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 10) {
        console.log(`Element ${i + 1} text sample: ${text.substring(0, 200)}...`);
      }
    });
    
    return {
      success: true,
      pageTitle: $('title').text(),
      potentialUPCs: upcMatches ? upcMatches.length : 0,
      productElements: productElements.length,
      sampleUPCs: upcMatches ? upcMatches.slice(0, 5) : []
    };
  } catch (error) {
    console.error(`Error testing page ${url}:`, error);
    return { success: false, error: error.message };
  }
}

// Serve HTTP endpoint
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle GET requests for testing specific pages
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const testUrl = url.searchParams.get('test');
    
    if (testUrl) {
      const result = await testSpecificPage(testUrl);
      return new Response(
        JSON.stringify(result),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
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
          executionTime: results.executionTime,
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
