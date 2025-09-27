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
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get resume parameter from URL if provided
    const url = new URL(req.url);
    const resumeFrom = parseInt(url.searchParams.get('resume') || '0');
    const maxBatches = parseInt(url.searchParams.get('maxBatches') || '3'); // Reduce to 3 batches per call to avoid WORKER_LIMIT
    
    let totalAdded = 0;
    let totalUpdated = 0;
    let totalErrors = 0;
    let currentResume = resumeFrom;
    let batchesProcessed = 0;
    
    // Process multiple batches automatically
    while (batchesProcessed < maxBatches) {
      const importUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/mtgjson-import?resume=${currentResume}`;
      
      const response = await fetch(importUrl, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Import failed with status ${response.status}`);
      }
      
      const result = await response.json();
      
      // Accumulate results
      totalAdded += result.added || 0;
      totalUpdated += result.updated || 0;
      totalErrors += result.errors || 0;
      currentResume = result.resumeFrom || currentResume;
      batchesProcessed++;
      
      // If import is complete, break
      if (result.status === 'success' || !result.resumeFrom || result.remainingProducts === 0) {
        break;
      }
      
      // Longer delay between batches to avoid WORKER_LIMIT
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    const summary = {
      status: currentResume === resumeFrom ? 'success' : 'partial_success',
      added: totalAdded,
      updated: totalUpdated,
      errors: totalErrors,
      total: totalAdded + totalUpdated,
      batchesProcessed,
      resumeFrom: currentResume,
      message: currentResume === resumeFrom 
        ? `Import completed! Processed ${totalAdded + totalUpdated} products (${totalAdded} added, ${totalUpdated} updated, ${totalErrors} errors)`
        : `Processed ${batchesProcessed} batches. ${totalAdded} added, ${totalUpdated} updated, ${totalErrors} errors. Resume from ${currentResume} to continue.`
    };
    
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