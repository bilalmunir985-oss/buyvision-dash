import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CARDTRADER_BASE_URL = 'https://api.cardtrader.com/api/v2';

async function callCardTraderAPI(endpoint: string, method = 'GET') {
  const jwt = Deno.env.get('CARDTRADER_JWT');
  if (!jwt) {
    throw new Error('CardTrader JWT token not found');
  }

  const response = await fetch(`${CARDTRADER_BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error(`CardTrader API error: ${response.status} ${response.statusText}`);
    throw new Error(`CardTrader API error: ${response.status}`);
  }

  return response.json();
}

async function searchBlueprints(query: string, setCode?: string) {
  console.log(`Searching CardTrader blueprints for: ${query} (set: ${setCode || 'N/A'})`);
  
  try {
    // First get MTG game ID (should be 1)
    const games = await callCardTraderAPI('/games');
    const mtgGame = games.find((g: any) => g.name.toLowerCase().includes('magic'));
    
    if (!mtgGame) {
      throw new Error('MTG game not found in CardTrader');
    }

    // Get expansions for MTG
    const expansions = await callCardTraderAPI(`/expansions?game_id=${mtgGame.id}`);
    
    // Filter by set code if provided
    let targetExpansions = expansions;
    if (setCode) {
      targetExpansions = expansions.filter((exp: any) => 
        exp.code?.toLowerCase() === setCode.toLowerCase()
      );
    }

    const allResults: any[] = [];

    // Search blueprints for each relevant expansion
    for (const expansion of targetExpansions.slice(0, 5)) { // Limit to prevent timeout
      try {
        const blueprints = await callCardTraderAPI(`/blueprints/export?expansion_id=${expansion.id}`);
        
        // Filter blueprints by query
        const filtered = blueprints.filter((bp: any) => {
          const name = bp.name?.toLowerCase() || '';
          const queryLower = query.toLowerCase();
          return name.includes(queryLower) || queryLower.includes(name.substring(0, 20));
        });

        allResults.push(...filtered.slice(0, 3)); // Max 3 per expansion
      } catch (error) {
        console.error(`Error fetching blueprints for expansion ${expansion.id}:`, error);
      }
    }

    // Score and sort results by relevance
    const scoredResults = allResults.map(bp => {
      const name = bp.name?.toLowerCase() || '';
      const queryLower = query.toLowerCase();
      
      let score = 0;
      if (name === queryLower) score = 100;
      else if (name.includes(queryLower)) score = 80;
      else if (queryLower.includes(name.substring(0, 15))) score = 60;
      else score = 40;

      return { ...bp, relevanceScore: score };
    });

    scoredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return scoredResults.slice(0, 10).map(bp => ({
      blueprintId: bp.id,
      blueprintName: bp.name,
      expansionId: bp.expansion_id,
      categoryId: bp.category_id,
      imageUrl: bp.image_url,
      cardtraderUrl: `https://www.cardtrader.com/cards/${bp.id}`,
    }));

  } catch (error) {
    console.error('CardTrader search error:', error);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { query, setName } = await req.json();
    
    if (!query) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const results = await searchBlueprints(query, setName);

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});