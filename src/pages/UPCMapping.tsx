import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Check, X, RefreshCw } from 'lucide-react';

interface UPCCandidate {
  id: string;
  scraped_name: string;
  scraped_upc: string;
  wpn_url: string;
  products: {
    id: string;
    name: string;
    set_code: string;
  };
}

interface ScrapedProduct {
  name: string;
  upc: string;
  wpn_url: string;
  set_code?: string;
  sku?: string | null;
}

interface ProductMatch {
  scraped_product: ScrapedProduct;
  matched_product_id: string | null;
  matched_product_name: string | null;
  matched_product_set: string | null;
  similarity_score: number;
  match_reason: string;
}

export default function UPCMapping() {
  const [upcCandidates, setUpcCandidates] = useState<UPCCandidate[]>([]);
  const [productMatches, setProductMatches] = useState<ProductMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [verifyingCandidate, setVerifyingCandidate] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUPCCandidates();
  }, []);

  const fetchUPCCandidates = async () => {
    try {
      const { data, error } = await supabase
        .from('upc_candidates')
        .select(`
          *,
          products:product_id (
            id,
            name,
            set_code
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUpcCandidates(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error loading UPC candidates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptCandidate = async (candidateId: string) => {
    setVerifyingCandidate(candidateId);
    try {
      const { data, error } = await supabase.functions.invoke('wpn-upc', {
        body: { candidateId }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.message || 'Failed to approve candidate');
      }

      setUpcCandidates(prev => prev.filter(c => c.id !== candidateId));
      toast({
        title: "Success",
        description: data.message || "UPC mapping approved!",
      });

      // Refresh candidates
      await fetchUPCCandidates();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error accepting UPC",
        description: error instanceof Error ? error.message : "Failed to accept UPC",
        variant: "destructive",
      });
    } finally {
      setVerifyingCandidate(null);
    }
  };

  const handleRejectCandidate = async (candidateId: string) => {
    setVerifyingCandidate(candidateId);
    try {
      const { data, error } = await supabase.functions.invoke('wpn-upc', {
        body: { candidateId }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.message || 'Failed to reject candidate');
      }

      setUpcCandidates(prev => prev.filter(c => c.id !== candidateId));
      toast({
        title: "Rejected",
        description: data.message || "UPC candidate rejected.",
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error rejecting UPC",
        description: error instanceof Error ? error.message : "Failed to reject UPC",
        variant: "destructive",
      });
    } finally {
      setVerifyingCandidate(null);
    }
  };

  const handleStartScraping = async () => {
    setScraping(true);
    try {
      console.log('Invoking wpn-upc function...');
      const { data, error } = await supabase.functions.invoke('wpn-upc', {
        body: {}
      });

      console.log('Function response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No data received from function');
      }

      if (!data.success) {
        throw new Error(data.message || 'Function returned success: false');
      }

      // Handle new response format from the external scraper API
      const totalScraped = data?.total_scraped || 0;
      const totalMatched = data?.total_matched || 0;
      const totalStaged = data?.total_staged || 0;
      const matches = data?.matches || [];
      
      console.log('Processing response:', {
        totalScraped,
        totalMatched,
        totalStaged,
        matchesLength: matches.length
      });
      
      // Store the matches for display (includes both scraped and matched product info)
      setProductMatches(matches);
      
      const message = `UPC mapping completed! Scraped ${totalScraped} products, found ${totalMatched} matches, staged ${totalStaged} candidates for review.`;

      toast({
        title: "Success",
        description: message,
      });

      // Refresh the candidates after scraping
      await fetchUPCCandidates();
    } catch (error) {
      console.error('Error in handleStartScraping:', error);
      toast({
        title: "Error starting scraper",
        description: error instanceof Error ? error.message : "Failed to start scraping",
        variant: "destructive",
      });
    } finally {
      setScraping(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">UPC Mapping</h1>
          <p className="text-muted-foreground">Review UPC codes from WPN pages</p>
        </div>
        <Button 
          onClick={handleStartScraping} 
          disabled={scraping}
          className="flex items-center gap-2"
        >
          {scraping ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {scraping ? 'Scraping...' : 'Start WPN Scraping'}
        </Button>
      </div>

      {/* Product Matches Table */}
      {productMatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>UPC Mapping Results ({productMatches.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border border-border p-2 text-left font-medium">Scraped Product</th>
                    <th className="border border-border p-2 text-left font-medium">UPC</th>
                    <th className="border border-border p-2 text-left font-medium">SKU</th>
                    <th className="border border-border p-2 text-left font-medium">Matched Product</th>
                    <th className="border border-border p-2 text-left font-medium">Match Score</th>
                    <th className="border border-border p-2 text-left font-medium">Links</th>
                  </tr>
                </thead>
                <tbody>
                  {productMatches.map((match, index) => (
                    <tr key={index} className="hover:bg-muted/30">
                      <td className="border border-border p-2 font-medium">{match.scraped_product.name}</td>
                      <td className="border border-border p-2">
                        <Badge variant="outline" className="font-mono">
                          {match.scraped_product.upc}
                        </Badge>
                      </td>
                      <td className="border border-border p-2">
                        {match.scraped_product.sku ? (
                          <Badge variant="secondary" className="font-mono">
                            {match.scraped_product.sku}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </td>
                      <td className="border border-border p-2">
                        {match.matched_product_name ? (
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{match.matched_product_name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {match.matched_product_set || 'N/A'}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No match found</span>
                        )}
                      </td>
                      <td className="border border-border p-2">
                        {match.matched_product_id ? (
                          <div className="flex flex-col gap-1">
                            <Badge variant="default" className="text-xs">
                              {(match.similarity_score * 100).toFixed(0)}% match
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {match.match_reason}
                            </span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            No Match
                          </Badge>
                        )}
                      </td>
                      <td className="border border-border p-2">
                        <div className="flex flex-col gap-2">
                          {/* WPN Source Link */}
                          <a 
                            href={match.scraped_product.wpn_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline text-sm"
                          >
                            WPN Source
                          </a>
                          {/* TCGplayer Link (if matched) */}
                          {match.matched_product_id && (
                            <a 
                              href={`/products/${match.matched_product_id}`}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-800 underline text-sm"
                            >
                              Our Product
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>UPC Candidates ({upcCandidates.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {upcCandidates.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No UPC candidates to review</p>
          ) : (
            <div className="space-y-4">
              {upcCandidates.map((candidate) => {
                const isUnmatched = !candidate.products || candidate.products === null;
                return (
                  <div key={candidate.id} className={`border rounded-lg p-4 ${isUnmatched ? 'bg-yellow-50 border-yellow-200' : ''}`}>
                    <div className="mb-3">
                      <h3 className="font-semibold">{candidate.scraped_name}</h3>
                      <p className="text-sm text-muted-foreground">UPC: {candidate.scraped_upc}</p>
                      <p className="text-sm text-muted-foreground">
                        {isUnmatched ? (
                          <span className="text-yellow-600 font-medium">⚠️ Scraped Product - Needs manual mapping</span>
                        ) : (
                          <>Matched: {candidate.products?.name} ({candidate.products?.set_code})</>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">Source: {candidate.wpn_url}</p>
                    </div>
                    <div className="flex gap-2">
                      {isUnmatched ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                          className="opacity-50"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Accept (Manual Match Required)
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleAcceptCandidate(candidate.id)}
                          disabled={verifyingCandidate === candidate.id}
                        >
                          {verifyingCandidate === candidate.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              Accepting...
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Accept
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRejectCandidate(candidate.id)}
                        disabled={verifyingCandidate === candidate.id}
                      >
                        {verifyingCandidate === candidate.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            Rejecting...
                          </>
                        ) : (
                          <>
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}