import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Check, ExternalLink, Play, DollarSign, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  set_code: string;
  type: string;
  productId?: string; // For MTGJSON products
  setCode?: string; // For MTGJSON products
  category?: string; // For MTGJSON products
}

interface TCGSearchResult {
  id: number;
  name: string;
  set?: string;
  urlName?: string;
}

export default function TCGMapping() {
  const [allUnverifiedProducts, setAllUnverifiedProducts] = useState<Product[]>([]);
  const [unverifiedProducts, setUnverifiedProducts] = useState<Product[]>([]);
  const [searchResults, setSearchResults] = useState<TCGSearchResult[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [autoMapping, setAutoMapping] = useState(false);
  const [fetchingPrices, setFetchingPrices] = useState(false);
  const [verifiedMapping, setVerifiedMapping] = useState<{productName: string, tcgId: number} | null>(null);
  const [verifyingProduct, setVerifyingProduct] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalProducts, setTotalProducts] = useState(0);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchUnverifiedProducts();
  }, []);

  // Filter products based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProducts(allUnverifiedProducts);
    } else {
      const filtered = allUnverifiedProducts.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.set_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.type.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
    setCurrentPage(1); // Reset to first page when searching
  }, [searchQuery, allUnverifiedProducts]);

  const fetchUnverifiedProducts = async () => {
    try {
      // Fetch unverified products from database
      // First, get the total count
      const { count, error: countError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('tcg_is_verified', false)
        .eq('active', true);

      if (countError) throw countError;
      setTotalProducts(count || 0);

      // Fetch all unverified products in batches
      let allProducts: Product[] = [];
      let offset = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, set_code, type')
          .eq('tcg_is_verified', false)
          .eq('active', true)
          .order('name')
          .range(offset, offset + batchSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allProducts = [...allProducts, ...data];
          offset += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      setAllUnverifiedProducts(allProducts);
      setFilteredProducts(allProducts);
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

  const updateDisplayedProducts = (page: number) => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setUnverifiedProducts(filteredProducts.slice(startIndex, endIndex));
  };

  const handleFindMatches = async (productId: string, productName: string) => {
    setSelectedProduct(productId);
    setSearching(true);
    setSearchResults([]);

    try {
      const product = unverifiedProducts.find(p => p.id === productId);
      const setName = product?.set_code; // Use database field
      
      const response = await supabase.functions.invoke('tcg-search', {
        body: { 
          query: productName,
          setName: setName // Pass set code to improve matching
        }
      });

      if (response.error) throw response.error;
      
      console.log('TCG Search Response:', response.data);
      setSearchResults(response.data?.products || []);
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

    const currentProduct = allUnverifiedProducts.find(p => p.id === selectedProduct);
    if (!currentProduct) return;

    setVerifyingProduct(tcgResult.id.toString());

    try {
      // Use the existing admin-set-tcg-id function for database products
      const response = await supabase.functions.invoke('admin-set-tcg-id', {
        body: { 
          productId: selectedProduct, 
          tcgId: tcgResult.id 
        }
      });

      if (response.error) throw response.error;

      toast({
        title: "Success",
        description: "TCGplayer mapping saved to database!",
      });

      // Remove from all products and update displayed products
      const updatedProducts = allUnverifiedProducts.filter(p => p.id !== selectedProduct);
      setAllUnverifiedProducts(updatedProducts);
      
      // Update filtered products if the removed product was in the current filter
      const updatedFiltered = filteredProducts.filter(p => p.id !== selectedProduct);
      setFilteredProducts(updatedFiltered);
      setTotalProducts(updatedFiltered.length);
      
      // Update current page if needed
      const totalPages = Math.ceil(updatedFiltered.length / itemsPerPage);
      if (currentPage > totalPages && totalPages > 0) {
        setCurrentPage(totalPages);
      }

      setVerifiedMapping({
        productName: currentProduct.name,
        tcgId: tcgResult.id
      });
      setSelectedProduct(null);
      setSearchResults([]);

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error saving mapping",
        variant: "destructive",
      });
    } finally {
      setVerifyingProduct(null);
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

  // Pagination functions
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Update displayed products when page or filtered products change
  useEffect(() => {
    updateDisplayedProducts(currentPage);
  }, [currentPage, filteredProducts]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, filteredProducts.length);

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
            Find and verify TCGplayer product matches
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
                Auto Map 20 Products
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
        <div className="flex flex-col space-y-4 overflow-y-auto">
          {/* Search Input */}
          <Card className="flex-shrink-0">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products by name, set code, or type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Products List */}
          <Card>
            <CardHeader>
              <CardTitle>
                Unverified Products ({filteredProducts.length})
                {filteredProducts.length > 0 && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    Showing {startIndex}-{endIndex} of {filteredProducts.length}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {unverifiedProducts.map((product) => (
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
                    disabled={searching}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Find Matches
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex flex-col">
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Search Results</CardTitle>
            </CardHeader>
            <CardContent className="h-full flex flex-col">
              {searching ? (
                <div className="flex items-center justify-center flex-1">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  Searching TCGplayer...
                </div>
              ) : searchResults.length === 0 && selectedProduct ? (
                <div className="flex flex-col items-center justify-center flex-1 text-center p-8">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                    <Search className="h-8 w-8 text-orange-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Matches Found</h3>
                  <p className="text-gray-600 max-w-sm">
                    This product is not available in the TCGplayer store or no matching products were found. 
                    You may need to search with different keywords or check the product name spelling.
                  </p>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>Tip:</strong> Try searching with just the product name or set code for better results.
                    </p>
                  </div>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-center p-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Search className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Search</h3>
                  <p className="text-gray-600">
                    Select a product from the left to search for TCGplayer matches
                  </p>
                </div>
              ) : (
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {searchResults.map((result) => (
                    <div key={result.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-base mb-1">{result.name}</h4>
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">TCG Product ID:</span> {result.id}
                            </p>
                            {result.set && (
                              <p className="text-sm text-muted-foreground">
                                <span className="font-medium">Set:</span> {result.set}
                              </p>
                            )}
                            {result.urlName && (
                              <p className="text-sm text-muted-foreground">
                                <span className="font-medium">URL Name:</span> {result.urlName}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`https://www.tcgplayer.com/product/${result.id}`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => handleVerifyMatch(result)}
                            disabled={verifyingProduct === result.id.toString()}
                          >
                            {verifyingProduct === result.id.toString() ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                Verifying...
                              </>
                            ) : (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Verify
                              </>
                            )}
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