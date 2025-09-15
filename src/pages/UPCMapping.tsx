import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Check, X } from 'lucide-react';

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

export default function UPCMapping() {
  const [upcCandidates, setUpcCandidates] = useState<UPCCandidate[]>([]);
  const [loading, setLoading] = useState(true);
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
        `);

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

  const handleAcceptCandidate = async (candidateId: string, upc: string, productId: string) => {
    try {
      await supabase.from('products').update({
        upc: upc,
        upc_is_verified: true
      }).eq('id', productId);

      await supabase.from('upc_candidates').delete().eq('id', candidateId);

      setUpcCandidates(prev => prev.filter(c => c.id !== candidateId));
      toast({
        title: "Success",
        description: "UPC mapping accepted!",
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error accepting UPC",
        variant: "destructive",
      });
    }
  };

  const handleRejectCandidate = async (candidateId: string) => {
    try {
      await supabase.from('upc_candidates').delete().eq('id', candidateId);
      setUpcCandidates(prev => prev.filter(c => c.id !== candidateId));
      toast({
        title: "Rejected",
        description: "UPC candidate rejected.",
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error rejecting UPC",
        variant: "destructive",
      });
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
      <div>
        <h1 className="text-3xl font-bold">UPC Mapping</h1>
        <p className="text-muted-foreground">Review UPC codes from WPN pages</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>UPC Candidates ({upcCandidates.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {upcCandidates.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No UPC candidates to review</p>
          ) : (
            <div className="space-y-4">
              {upcCandidates.map((candidate) => (
                <div key={candidate.id} className="border rounded-lg p-4">
                  <div className="mb-3">
                    <h3 className="font-semibold">{candidate.scraped_name}</h3>
                    <p className="text-sm text-muted-foreground">UPC: {candidate.scraped_upc}</p>
                    <p className="text-sm text-muted-foreground">
                      Matched: {candidate.products.name} ({candidate.products.set_code})
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAcceptCandidate(
                        candidate.id,
                        candidate.scraped_upc,
                        candidate.products.id
                      )}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRejectCandidate(candidate.id)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}