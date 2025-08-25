import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Link, 
  Search, 
  CheckCircle, 
  ExternalLink,
  Loader2
} from 'lucide-react';
import { getUnverifiedProducts, getTCGSearchResults, type TCGSearchResult } from '@/utils/mockData';
import { useToast } from '@/hooks/use-toast';

interface SearchState {
  productId: string | null;
  results: TCGSearchResult[];
  isLoading: boolean;
}

const TCGMapping = () => {
  const { toast } = useToast();
  const [unverifiedProducts, setUnverifiedProducts] = useState(getUnverifiedProducts());
  const [searchState, setSearchState] = useState<SearchState>({
    productId: null,
    results: [],
    isLoading: false,
  });

  const handleFindMatches = async (productId: string) => {
    setSearchState({
      productId,
      results: [],
      isLoading: true,
    });

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const results = getTCGSearchResults(productId);
    setSearchState({
      productId,
      results,
      isLoading: false,
    });

    toast({
      title: "Search Complete",
      description: `Found ${results.length} potential matches`,
    });
  };

  const handleVerifyMatch = async (productId: string, tcgResult: TCGSearchResult) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    // Remove from unverified list
    setUnverifiedProducts(prev => 
      prev.filter(p => p.id !== productId)
    );

    // Clear search results
    setSearchState({
      productId: null,
      results: [],
      isLoading: false,
    });

    toast({
      title: "Match Verified",
      description: `Successfully mapped to TCGplayer product: ${tcgResult.productName}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">TCGplayer Mapping</h1>
        <p className="text-muted-foreground">
          Verify and map products to their TCGplayer listings
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unverified Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Link className="h-5 w-5 mr-2 text-warning" />
              Unverified Products
            </CardTitle>
            <CardDescription>
              Products that need TCGplayer ID verification ({unverifiedProducts.length} remaining)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {unverifiedProducts.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">All Products Verified!</h3>
                <p className="text-muted-foreground">
                  All products have been successfully mapped to TCGplayer.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {unverifiedProducts.map((product) => (
                  <div key={product.id} className="p-4 border border-border rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium">{product.name}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {product.set_code}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {product.type}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      onClick={() => handleFindMatches(product.id)}
                      disabled={searchState.isLoading && searchState.productId === product.id}
                      className="w-full"
                    >
                      {searchState.isLoading && searchState.productId === product.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          Find Matches
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Search Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="h-5 w-5 mr-2 text-primary" />
              Search Results
            </CardTitle>
            <CardDescription>
              {searchState.productId 
                ? "Select the correct TCGplayer product match"
                : "Click 'Find Matches' on a product to see potential TCGplayer listings"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!searchState.productId && searchState.results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a product to search for TCGplayer matches</p>
              </div>
            ) : searchState.isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Searching TCGplayer...</p>
              </div>
            ) : searchState.results.length > 0 ? (
              <div className="space-y-4">
                {searchState.results.map((result, index) => (
                  <div key={index} className="p-4 border border-border rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">{result.productName}</h4>
                        <div className="text-sm text-muted-foreground mb-2">
                          Set: {result.setName}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs font-mono">
                            ID: {result.productId}
                          </Badge>
                          <span className="text-sm font-medium text-success">
                            ${result.price.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <Separator className="my-3" />
                    
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => handleVerifyMatch(searchState.productId!, result)}
                        className="flex-1"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Verify Match
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                        <a 
                          href={`https://tcgplayer.com/product/${result.productId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : searchState.productId && searchState.results.length === 0 ? (
              <div className="text-center py-8">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Matches Found</h3>
                <p className="text-muted-foreground">
                  No TCGplayer products found for this item. Try searching manually on TCGplayer.
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TCGMapping;