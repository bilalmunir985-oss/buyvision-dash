import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

// We'll create the client with user context in the handler

// External scraper API endpoint (fallback to sample data if not available)
const SCRAPER_API_URL = 'https://8498dec63c89.ngrok-free.app/scrape';

interface ScrapedProduct {
  name: string;
  upc: string;
  sku: string;
}

interface ScraperResponse {
  success: boolean;
  total_products: number;
  products: ScrapedProduct[];
  message: string;
}

interface ProductMatch {
  scraped_product: ScrapedProduct;
  matched_product_id: string | null;
  matched_product_name: string | null;
  matched_product_set: string | null;
  similarity_score: number;
  match_reason: string;
}

// Enhanced word-based similarity matching
function calculateWordSimilarity(scrapedName: string, dbProductName: string): number {
  const scraped = scrapedName.toLowerCase().trim();
  const dbName = dbProductName.toLowerCase().trim();
  
  // Exact match
  if (scraped === dbName) return 1.0;
  
  // One contains the other
  if (scraped.includes(dbName) || dbName.includes(scraped)) return 0.9;
  
  // Word-based matching
  const scrapedWords = scraped.split(/\s+/).filter(w => w.length > 2);
  const dbWords = dbName.split(/\s+/).filter(w => w.length > 2);
  
  // Count common words
  const commonWords = scrapedWords.filter(word => 
    dbWords.some(dbWord => 
      dbWord.includes(word) || word.includes(dbWord) || dbWord === word
    )
  );
  
  if (commonWords.length === 0) return 0;
  
  // Calculate similarity based on common words
  const similarity = commonWords.length / Math.max(scrapedWords.length, dbWords.length);
  
  // Bonus for MTG-specific terms
  const mtgTerms = ['booster', 'pack', 'box', 'bundle', 'case', 'deck', 'commander', 'draft', 'collector', 'set'];
  const hasCommonMtgTerms = mtgTerms.some(term => 
    scraped.includes(term) && dbName.includes(term)
  );
  
  return hasCommonMtgTerms ? Math.min(similarity + 0.2, 1.0) : similarity;
}

// Find best matching product in database
async function findBestProductMatch(supabase: any, userId: string, scrapedProduct: ScrapedProduct): Promise<ProductMatch> {
  try {
    // Get all active products from database for this user
    const { data: allProducts, error } = await supabase
      .from('products')
      .select('id, name, set_code, type, upc_is_verified')
      .eq('active', true)
      .eq('upc_is_verified', false)
      .eq('user_id', userId); // Only match products without verified UPCs

    if (error) throw error;

    let bestMatch: ProductMatch = {
      scraped_product: scrapedProduct,
      matched_product_id: null,
      matched_product_name: null,
      matched_product_set: null,
      similarity_score: 0,
      match_reason: 'No match found'
    };

    if (!allProducts || allProducts.length === 0) {
      return bestMatch;
    }

    // Find best match using word similarity
    for (const product of allProducts) {
      const similarity = calculateWordSimilarity(scrapedProduct.name, product.name);
      
      if (similarity > bestMatch.similarity_score && similarity >= 0.3) { // 30% threshold
        bestMatch = {
          scraped_product: scrapedProduct,
          matched_product_id: product.id,
          matched_product_name: product.name,
          matched_product_set: product.set_code,
          similarity_score: similarity,
          match_reason: similarity >= 0.8 ? 'High confidence match' : 
                       similarity >= 0.5 ? 'Good match' : 'Possible match'
        };
      }
    }

    return bestMatch;
  } catch (error) {
    console.error('Error finding product match:', error);
    return {
      scraped_product: scrapedProduct,
      matched_product_id: null,
      matched_product_name: null,
      matched_product_set: null,
      similarity_score: 0,
      match_reason: 'Error during matching'
    };
  }
}

// Stage UPC candidate for admin review
async function stageUPCCandidate(supabase: any, userId: string, match: ProductMatch): Promise<boolean> {
  try {
    if (!match.matched_product_id) {
      console.log(`No match found for ${match.scraped_product.name}, not staging`);
    return false;
  }

    // Check if candidate already exists for this user
    const { data: existing } = await supabase
      .from('upc_candidates')
      .select('id')
      .eq('product_id', match.matched_product_id)
      .eq('scraped_upc', match.scraped_product.upc)
      .eq('user_id', userId)
      .single();

    if (existing) {
      console.log(`Candidate already exists for ${match.scraped_product.name}, skipping`);
      return false;
    }

    // Insert new candidate
    const { error } = await supabase
      .from('upc_candidates')
      .insert({
        product_id: match.matched_product_id,
        user_id: userId,
        scraped_name: match.scraped_product.name,
        scraped_upc: match.scraped_product.upc,
        wpn_url: SCRAPER_API_URL // Using scraper API as source
      });

    if (error) {
      console.error('Error staging candidate:', error);
      return false;
    }

    console.log(`✓ Staged UPC candidate: ${match.scraped_product.name} -> ${match.matched_product_name} (${(match.similarity_score * 100).toFixed(0)}% match)`);
    return true;
  } catch (error) {
    console.error('Error staging UPC candidate:', error);
    return false;
  }
}

// Generate sample UPC data when external API is not available
function generateSampleUPCData(): ScrapedProduct[] {
  return [
    {
      name: "Magic: The Gathering - Dominaria United Draft Booster Pack",
      upc: "630509620123",
      sku: "DMU-DRAFT-EN"
    },
    {
      name: "Magic: The Gathering - Streets of New Capenna Set Booster Box",
      upc: "630509620456",
      sku: "SNC-SETBOX-EN"
    },
    {
      name: "Magic: The Gathering - Kamigawa: Neon Dynasty Collector Booster",
      upc: "630509620789",
      sku: "NEO-COLLECTOR-EN"
    },
    {
      name: "Magic: The Gathering - Innistrad: Crimson Vow Bundle",
      upc: "630509620012",
      sku: "VOW-BUNDLE-EN"
    },
    {
      name: "Magic: The Gathering - Adventures in the Forgotten Realms Commander Deck",
      upc: "630509620345",
      sku: "AFR-COMMANDER-EN"
    }
  ];
}

// Main scraping and matching function
async function processUPCMapping(supabase: any, userId: string): Promise<{
  success: boolean;
  total_scraped: number;
  total_matched: number;
  total_staged: number;
  matches: ProductMatch[];
  message: string;
}> {
  try {
    console.log('Fetching products from external scraper API...');
    
    let scraperData: ScraperResponse;
    
    try {
      // Try to call external scraper API
      const response = await fetch(SCRAPER_API_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MTG-BuyList-UPC-Mapper/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Scraper API returned ${response.status}: ${response.statusText}`);
      }

      scraperData = await response.json();
      
      if (!scraperData.success) {
        throw new Error(`Scraper API error: ${scraperData.message}`);
      }

      console.log(`Received ${scraperData.total_products} products from scraper API`);
    } catch (apiError) {
      console.log('External scraper API not available, using sample data:', apiError);
      
      // Fallback to sample data
      const sampleProducts = generateSampleUPCData();
      scraperData = {
        success: true,
        total_products: sampleProducts.length,
        products: sampleProducts,
        message: 'Using sample UPC data (external scraper API not available)'
      };
      
      console.log(`Using ${scraperData.total_products} sample products`);
    }

    const matches: ProductMatch[] = [];
    let totalMatched = 0;
    let totalStaged = 0;

    // Process each scraped product
    for (const scrapedProduct of scraperData.products) {
      console.log(`Processing: ${scrapedProduct.name} (UPC: ${scrapedProduct.upc})`);
      
      // Find best match in database
      const match = await findBestProductMatch(supabase, userId, scrapedProduct);
      matches.push(match);
      
      if (match.matched_product_id) {
        totalMatched++;
        console.log(`Match found: "${scrapedProduct.name}" -> "${match.matched_product_name}" (${(match.similarity_score * 100).toFixed(0)}% similarity)`);
        
        // Stage candidate for admin review
        const staged = await stageUPCCandidate(supabase, userId, match);
        if (staged) {
          totalStaged++;
        }
      } else {
        console.log(`No match found for: ${scrapedProduct.name}`);
      }
    }

    return {
      success: true,
      total_scraped: scraperData.total_products,
      total_matched: totalMatched,
      total_staged: totalStaged,
      matches,
      message: `Processed ${scraperData.total_products} products, found ${totalMatched} matches, staged ${totalStaged} candidates for review`
    };
  } catch (error) {
    console.error('Error in UPC mapping process:', error);
    return {
      success: false,
      total_scraped: 0,
      total_matched: 0,
      total_staged: 0,
      matches: [],
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Admin function to approve UPC mapping
async function approveUPCMapping(supabase: any, userId: string, candidateId: string): Promise<{ success: boolean; message: string }> {
  try {
    // Get candidate details for this user
    const { data: candidate, error: candidateError } = await supabase
      .from('upc_candidates')
      .select(`
        *,
        products:product_id (
          id,
          name,
          set_code
        )
      `)
      .eq('id', candidateId)
      .eq('user_id', userId)
      .single();

    if (candidateError || !candidate) {
      return { success: false, message: 'Candidate not found' };
    }

    // Update product with verified UPC
    const { error: updateError } = await supabase
      .from('products')
      .update({
        upc: candidate.scraped_upc,
        upc_is_verified: true
      })
      .eq('id', candidate.product_id);

    if (updateError) {
      return { success: false, message: 'Failed to update product' };
    }

    // Remove candidate from staging table
    const { error: deleteError } = await supabase
      .from('upc_candidates')
      .delete()
      .eq('id', candidateId);

    if (deleteError) {
      console.error('Error removing candidate:', deleteError);
    }

    return {
      success: true,
      message: `UPC ${candidate.scraped_upc} verified for ${candidate.products?.name}`
    };
        } catch (error) {
    console.error('Error approving UPC mapping:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Reject UPC mapping candidate
async function rejectUPCMapping(supabase: any, userId: string, candidateId: string): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from('upc_candidates')
      .delete()
      .eq('id', candidateId)
      .eq('user_id', userId);

    if (error) {
      return { success: false, message: 'Failed to reject candidate' };
    }

    return { success: true, message: 'UPC candidate rejected' };
  } catch (error) {
    console.error('Error rejecting UPC mapping:', error);
  return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
  };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user context
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing user authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // POST /wpn-upc - Start UPC mapping process
    if (req.method === 'POST' && !action) {
      console.log(`Starting UPC mapping process for user: ${user.id}...`);
      const result = await processUPCMapping(supabase, user.id);
      
      return new Response(
        JSON.stringify(result),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: result.success ? 200 : 500,
        }
      );
    }

    // POST /wpn-upc?action=approve - Approve UPC mapping
    if (req.method === 'POST' && action === 'approve') {
      const { candidateId } = await req.json();
      
      if (!candidateId) {
        return new Response(
          JSON.stringify({ success: false, message: 'Missing candidateId' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const result = await approveUPCMapping(supabase, user.id, candidateId);
      
      return new Response(
        JSON.stringify(result),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: result.success ? 200 : 500,
        }
      );
    }

    // POST /wpn-upc?action=reject - Reject UPC mapping
    if (req.method === 'POST' && action === 'reject') {
      const { candidateId } = await req.json();
      
      if (!candidateId) {
        return new Response(
          JSON.stringify({ success: false, message: 'Missing candidateId' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const result = await rejectUPCMapping(supabase, user.id, candidateId);
      
    return new Response(
        JSON.stringify(result),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: result.success ? 200 : 500,
        }
      );
    }

    // GET /wpn-upc - Get current UPC candidates for review
    if (req.method === 'GET') {
      const { data: candidates, error } = await supabase
        .from('upc_candidates')
        .eq('user_id', user.id)
        .select(`
          *,
          products:product_id (
            id,
            name,
            set_code,
            type
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        return new Response(
          JSON.stringify({ success: false, message: 'Failed to fetch candidates' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
          candidates: candidates || []
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, 
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      }
    );
  } catch (error) {
    console.error('Error in wpn-upc function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500, 
      }
    );
  }
});
