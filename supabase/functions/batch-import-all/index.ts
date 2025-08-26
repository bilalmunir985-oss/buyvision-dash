import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting automated batch import of all products...');
    
    let resumeFrom = 0;
    let totalAdded = 0;
    let totalUpdated = 0;
    let totalErrors = 0;
    let totalProducts = 0;
    let iterations = 0;
    const maxIterations = 15; // Safety limit
    
    while (iterations < maxIterations) {
      iterations++;
      console.log(`\n--- Batch ${iterations} starting from set ${resumeFrom} ---`);
      
      // Call the mtgjson-import function with resume parameter
      const importUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/mtgjson-import${resumeFrom > 0 ? `?resume=${resumeFrom}` : ''}`;
      
      const response = await fetch(importUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Import failed with status ${response.status}`);
      }
      
      const result = await response.json();
      console.log(`Batch ${iterations} result:`, result);
      
      // Accumulate totals
      totalAdded += result.added || 0;
      totalUpdated += result.updated || 0;
      totalErrors += result.errors || 0;
      totalProducts += result.total || 0;
      
      // Check if we're done or need to continue
      if (result.status === 'success') {
        console.log('✅ Complete import finished successfully!');
        break;
      } else if (result.status === 'partial_success' && result.resumeFrom !== undefined) {
        resumeFrom = result.resumeFrom;
        console.log(`📄 Partial completion - will resume from set ${resumeFrom}`);
        
        // Small delay between batches to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        throw new Error(`Unexpected result status: ${result.status}`);
      }
    }
    
    if (iterations >= maxIterations) {
      console.warn(`⚠️ Stopped after ${maxIterations} iterations to prevent infinite loop`);
    }
    
    const summary = {
      status: 'completed',
      totalBatches: iterations,
      totalAdded,
      totalUpdated,
      totalErrors,
      totalProducts,
      message: `Import completed in ${iterations} batches. Total: ${totalProducts} products processed (${totalAdded} added, ${totalUpdated} updated, ${totalErrors} errors)`
    };
    
    console.log('🎉 Final summary:', summary);
    
    return new Response(
      JSON.stringify(summary),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
    
  } catch (error) {
    console.error('Batch import error:', error);
    return new Response(
      JSON.stringify({
        status: 'error',
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});