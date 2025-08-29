import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Check, ExternalLink, Play, DollarSign } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  set_code: string;
  type: string;
}

interface TCGSearchResult {
  productId: number;
  productName: string;
}

export default function TCGMapping() {
  const [unverifiedProducts, setUnverifiedProducts] = useState<Product[]>([]);
  const [searchResults, setSearchResults] = useState<TCGSearchResult[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [autoMapping, setAutoMapping] = useState(false);
  const [fetchingPrices, setFetchingPrices] = useState(false);
  const [verifiedMapping, setVerifiedMapping] = useState<{productName: string, tcgId: number} | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUnverifiedProducts();
  }, []);

  const fetchUnverifiedProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('vw_unmapped_products')
        .select('*')
        .limit(200);

      if (error) throw error;
      setUnverifiedProducts(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error loading products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFindMatches = async (productId: string, productName: string) => {
    setSelectedProduct(productId);
    setSearching(true);
    setSearchResults([]);

    try {
      const product = unverifiedProducts.find(p => p.id === productId);
      const response = await supabase.functions.invoke('tcg-search', {
        body: { 
          query: productName,
          setName: product?.set_code // Pass set code to improve matching
        }
      });

      if (response.error) throw response.error;
      setSearchResults(response.data?.results || []);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Search failed",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  const handleVerifyMatch = async (tcgResult: TCGSearchResult) => {
    if (!selectedProduct) return;

    const currentProduct = unverifiedProducts.find(p => p.id === selectedProduct);
    if (!currentProduct) return;

    try {
      const response = await supabase.functions.invoke('admin-set-tcg-id', {
        body: { 
          productId: selectedProduct, 
          tcgId: tcgResult.productId 
        }
      });

      if (response.error) throw response.error;

      setUnverifiedProducts(prev => prev.filter(p => p.id !== selectedProduct));
      setVerifiedMapping({
        productName: currentProduct.name,
        tcgId: tcgResult.productId
      });
      setSelectedProduct(null);
      setSearchResults([]);

      toast({
        title: "Success",
        description: "TCGplayer mapping saved!",
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error saving mapping",
        variant: "destructive",
      });
    }
  };

  const handleAutoMapping = async () => {
    setAutoMapping(true);
    try {
      const response = await supabase.functions.invoke('auto-tcg-mapping', {
        body: { limit: 20 }
      });

      if (response.error) throw response.error;

      const result = response.data;
      toast({
        title: "Auto Mapping Complete",
        description: `Mapped ${result.mapped} of ${result.processed} products`,
      });

      // Refresh the list
      fetchUnverifiedProducts();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Auto mapping failed",
        variant: "destructive",
      });
    } finally {
      setAutoMapping(false);
    }
  };

  const handleFetchPrices = async () => {
    setFetchingPrices(true);
    try {
      const response = await supabase.functions.invoke('fetch-prices');

      if (response.error) throw response.error;

      const result = response.data;
      toast({
        title: "Price Fetch Complete",
        description: `Updated prices for ${result.processed} products`,
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Price fetch failed",
        variant: "destructive",
      });
    } finally {
      setFetchingPrices(false);
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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">TCGplayer Mapping</h1>
          <p className="text-muted-foreground">
            Find and verify TCGplayer product matches using the official search API
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={handleAutoMapping}
            disabled={autoMapping || unverifiedProducts.length === 0}
            variant="default"
          >
            {autoMapping ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Auto Mapping...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Auto Map {Math.min(20, unverifiedProducts.length)} Products
              </>
            )}
          </Button>
          <Button 
            onClick={handleFetchPrices}
            disabled={fetchingPrices}
            variant="outline"
          >
            {fetchingPrices ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Fetching...
              </>
            ) : (
              <>
                <DollarSign className="h-4 w-4 mr-2" />
                Import Prices
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Unverified Products ({unverifiedProducts.length})</CardTitle>
            <p className="text-sm text-muted-foreground">
              Products from MTGJSON that need TCGplayer product ID mapping
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {unverifiedProducts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  🎉 All products have been mapped to TCGplayer!
                </p>
              </div>
            ) : (
              unverifiedProducts.map((product) => (
                <div key={product.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">{product.name}</h3>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary">{product.set_code}</Badge>
                        <Badge variant="outline">{product.type}</Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleFindMatches(product.id, product.name)}
                    disabled={searching && selectedProduct === product.id}
                  >
                    {searching && selectedProduct === product.id ? (
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
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Search Results</CardTitle>
            <p className="text-sm text-muted-foreground">
              TCGplayer matches found using their official API
            </p>
          </CardHeader>
          <CardContent>
            {searching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Searching TCGplayer...
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-8">
                <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Select a product and click "Find Matches" to search TCGplayer
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {searchResults.map((result) => (
                  <div key={result.productId} className="border rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">{result.productName}</h4>
                        <p className="text-sm text-muted-foreground">TCG ID: {result.productId}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`https://www.tcgplayer.com/product/${result.productId}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button size="sm" onClick={() => handleVerifyMatch(result)}>
                          <Check className="h-4 w-4 mr-1" />
                          Verify
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {verifiedMapping && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-green-800">Recently Verified</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-green-900">{verifiedMapping.productName}</h3>
                <p className="text-sm text-green-700">TCG ID: {verifiedMapping.tcgId}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://www.tcgplayer.com/product/${verifiedMapping.tcgId}`, '_blank')}
                className="border-green-300 text-green-800 hover:bg-green-100"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View on TCGplayer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}