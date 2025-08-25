import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Barcode, 
  CheckCircle, 
  X, 
  Package,
  TrendingUp
} from 'lucide-react';
import { mockUPCCandidates, type UPCCandidate } from '@/utils/mockData';
import { useToast } from '@/hooks/use-toast';

const UPCMapping = () => {
  const { toast } = useToast();
  const [candidates, setCandidates] = useState<UPCCandidate[]>(mockUPCCandidates);

  const handleAcceptCandidate = async (candidateId: string) => {
    const candidate = candidates.find(c => c.id === candidateId);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    setCandidates(prev => prev.filter(c => c.id !== candidateId));

    toast({
      title: "UPC Accepted",
      description: `Successfully mapped UPC for ${candidate?.matched_product.name}`,
    });
  };

  const handleRejectCandidate = async (candidateId: string) => {
    const candidate = candidates.find(c => c.id === candidateId);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));

    setCandidates(prev => prev.filter(c => c.id !== candidateId));

    toast({
      title: "UPC Rejected", 
      description: `Rejected UPC mapping for ${candidate?.matched_product.name}`,
      variant: "destructive",
    });
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return "text-success";
    if (score >= 0.8) return "text-warning";
    return "text-destructive";
  };

  const getConfidenceBadgeVariant = (score: number) => {
    if (score >= 0.9) return "default" as const;
    if (score >= 0.8) return "secondary" as const;
    return "destructive" as const;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">UPC Mapping</h1>
        <p className="text-muted-foreground">
          Review and approve UPC mappings from scraped data
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending UPCs</CardTitle>
            <Barcode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{candidates.length}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Confidence</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {candidates.filter(c => c.confidence_score >= 0.9).length}
            </div>
            <p className="text-xs text-muted-foreground">
              90%+ confidence
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Confidence</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {candidates.length > 0 
                ? Math.round((candidates.reduce((acc, c) => acc + c.confidence_score, 0) / candidates.length) * 100)
                : 0
              }%
            </div>
            <p className="text-xs text-muted-foreground">
              Overall accuracy
            </p>
          </CardContent>
        </Card>
      </div>

      {/* UPC Candidates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Barcode className="h-5 w-5 mr-2 text-primary" />
            UPC Candidates
          </CardTitle>
          <CardDescription>
            Review scraped UPCs and their matched products
          </CardDescription>
        </CardHeader>
        <CardContent>
          {candidates.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">All UPCs Processed!</h3>
              <p className="text-muted-foreground">
                No pending UPC mappings to review.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {candidates
                .sort((a, b) => b.confidence_score - a.confidence_score)
                .map((candidate) => (
                <div key={candidate.id} className="p-6 border border-border rounded-lg">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium text-lg">
                          {candidate.scraped_name}
                        </h4>
                        <Badge 
                          variant={getConfidenceBadgeVariant(candidate.confidence_score)}
                          className="ml-auto"
                        >
                          {Math.round(candidate.confidence_score * 100)}% Match
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground mb-3">
                        <span className="font-mono bg-muted px-2 py-1 rounded">
                          UPC: {candidate.scraped_upc}
                        </span>
                      </div>

                      {/* Confidence Score Bar */}
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Confidence Score</span>
                          <span className={getConfidenceColor(candidate.confidence_score)}>
                            {Math.round(candidate.confidence_score * 100)}%
                          </span>
                        </div>
                        <Progress 
                          value={candidate.confidence_score * 100} 
                          className="h-2"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  {/* Matched Product */}
                  <div className="mb-4">
                    <h5 className="font-medium mb-2">Matched Product:</h5>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h6 className="font-medium">
                            {candidate.matched_product.name}
                          </h6>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {candidate.matched_product.set_code}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              ID: {candidate.matched_product.id}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-3">
                    <Button
                      onClick={() => handleAcceptCandidate(candidate.id)}
                      className="flex-1 bg-gradient-success hover:opacity-90"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Accept Mapping
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleRejectCandidate(candidate.id)}
                      className="flex-1"
                    >
                      <X className="h-4 w-4 mr-2" />
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
};

export default UPCMapping;