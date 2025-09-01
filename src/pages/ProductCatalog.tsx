import { useState, useEffect, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import { ColDef, GridReadyEvent, SelectionChangedEvent } from "ag-grid-community";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Package, FileText, ExternalLink, Filter, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

interface Product {
  id: string;
  name: string;
  set_code: string | null;
  type: string;
  release_date: string | null;
  language: string | null;
  mtgjson_uuid: string;
  tcgplayer_product_id: number | null;
  tcg_is_verified: boolean;
  upc: string | null;
  upc_is_verified: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
  raw_json: any;
}

interface ProductContent {
  contained_name: string;
  quantity: number | null;
  rarity: string | null;
}

const ProductCatalog = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [verificationFilter, setVerificationFilter] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productContents, setProductContents] = useState<ProductContent[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProductContents = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from('product_contents')
        .select('contained_name, quantity, rarity')
        .eq('product_id', productId);

      if (error) throw error;
      setProductContents(data || []);
    } catch (error) {
      console.error('Error fetching product contents:', error);
      toast({
        title: "Error",
        description: "Failed to fetch product contents",
        variant: "destructive",
      });
    }
  };

  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    // Text search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) ||
        product.set_code?.toLowerCase().includes(query) ||
        product.type.toLowerCase().includes(query)
      );
    }
    
    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(product => product.type === typeFilter);
    }
    
    // Verification filter
    if (verificationFilter !== "all") {
      switch (verificationFilter) {
        case "tcg_verified":
          filtered = filtered.filter(product => product.tcg_is_verified);
          break;
        case "upc_verified":
          filtered = filtered.filter(product => product.upc_is_verified);
          break;
        case "both_verified":
          filtered = filtered.filter(product => product.tcg_is_verified && product.upc_is_verified);
          break;
        case "none_verified":
          filtered = filtered.filter(product => !product.tcg_is_verified && !product.upc_is_verified);
          break;
      }
    }
    
    return filtered;
  }, [products, searchQuery, typeFilter, verificationFilter]);

  // Get unique product types for filter dropdown
  const uniqueTypes = useMemo(() => {
    const types = [...new Set(products.map(p => p.type))].sort();
    return types;
  }, [products]);

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setVerificationFilter("all");
  };

  const columnDefs: ColDef[] = [
    { 
      field: "name", 
      headerName: "Product Name", 
      flex: 3,
      minWidth: 200,
      sortable: true,
      filter: false,
      cellRenderer: (params: any) => (
        <div className="flex items-center space-x-2 py-2 cursor-pointer hover:bg-muted/50 rounded px-2 -mx-2">
          <Package className="h-4 w-4 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-medium text-sm leading-tight truncate">{params.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {params.data.set_code && `${params.data.set_code} • `}
              <span className="capitalize">{params.data.type}</span>
            </p>
          </div>
        </div>
      )
    },
    { 
      field: "release_date", 
      headerName: "Release Date", 
      width: 140,
      sortable: true,
      filter: false,
      cellRenderer: (params: any) => (
        <div className="text-sm">
          {params.value ? (
            <div>
              <div className="font-medium">{new Date(params.value).toLocaleDateString()}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(params.value).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      )
    },
    { 
      field: "tcg_is_verified", 
      headerName: "TCG", 
      width: 80,
      sortable: true,
      filter: false,
      cellRenderer: (params: any) => (
        <div className="flex justify-center">
          <Badge 
            variant={params.value ? "default" : "secondary"} 
            className={`w-6 h-6 p-0 rounded-full flex items-center justify-center text-xs ${
              params.value ? 'bg-green-100 text-green-800 border-green-200' : ''
            }`}
          >
            {params.value ? "✓" : "—"}
          </Badge>
        </div>
      )
    },
    { 
      field: "upc_is_verified", 
      headerName: "UPC", 
      width: 80,
      sortable: true,
      filter: false,
      cellRenderer: (params: any) => (
        <div className="flex justify-center">
          <Badge 
            variant={params.value ? "default" : "secondary"} 
            className={`w-6 h-6 p-0 rounded-full flex items-center justify-center text-xs ${
              params.value ? 'bg-blue-100 text-blue-800 border-blue-200' : ''
            }`}
          >
            {params.value ? "✓" : "—"}
          </Badge>
        </div>
      )
    },
    {
      headerName: "Actions",
      width: 80,
      pinned: 'right',
      filter: false,
      sortable: false,
      cellRenderer: (params: any) => (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleRowClick(params.data);
            }}
            className="h-8 w-8 p-0 hover:bg-primary/10"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  const handleRowClick = (product: Product) => {
    setSelectedProduct(product);
    setShowDetails(true);
    fetchProductContents(product.id);
  };

  const handleSelectionChanged = (event: SelectionChangedEvent) => {
    const selectedRows = event.api.getSelectedRows();
    if (selectedRows.length > 0) {
      handleRowClick(selectedRows[0]);
    }
  };

  const onGridReady = (params: GridReadyEvent) => {
    params.api.sizeColumnsToFit();
  };

  const formatJsonValue = (value: any): string => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return String(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Package className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Product Catalog</h1>
          <p className="text-muted-foreground">Master data browser for all MTG products</p>
        </div>
        <Badge variant="outline">
          {filteredProducts.length} products
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filters</span>
            </div>
            {(searchQuery || typeFilter !== "all" || verificationFilter !== "all") && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilters}
                className="h-8 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background"
              />
            </div>
            
            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border shadow-lg z-50">
                <SelectItem value="all">All Types</SelectItem>
                {uniqueTypes.map(type => (
                  <SelectItem key={type} value={type} className="capitalize">
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Verification Filter */}
            <Select value={verificationFilter} onValueChange={setVerificationFilter}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="All Verification Status" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border shadow-lg z-50">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="tcg_verified">TCG Verified</SelectItem>
                <SelectItem value="upc_verified">UPC Verified</SelectItem>
                <SelectItem value="both_verified">Both Verified</SelectItem>
                <SelectItem value="none_verified">Not Verified</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Active Filters Display */}
          {(searchQuery || typeFilter !== "all" || verificationFilter !== "all") && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {searchQuery && (
                <Badge variant="secondary" className="text-xs">
                  Search: "{searchQuery}"
                  <X 
                    className="h-3 w-3 ml-1 cursor-pointer" 
                    onClick={() => setSearchQuery("")}
                  />
                </Badge>
              )}
              {typeFilter !== "all" && (
                <Badge variant="secondary" className="text-xs capitalize">
                  Type: {typeFilter}
                  <X 
                    className="h-3 w-3 ml-1 cursor-pointer" 
                    onClick={() => setTypeFilter("all")}
                  />
                </Badge>
              )}
              {verificationFilter !== "all" && (
                <Badge variant="secondary" className="text-xs">
                  Status: {verificationFilter.replace('_', ' ')}
                  <X 
                    className="h-3 w-3 ml-1 cursor-pointer" 
                    onClick={() => setVerificationFilter("all")}
                  />
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Products Grid */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5" />
                  <span>Products</span>
                </CardTitle>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <span>{filteredProducts.length} results</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="ag-theme-alpine w-full" style={{ height: 'calc(100vh - 300px)', minHeight: '500px' }}>
                <AgGridReact
                  rowData={filteredProducts}
                  columnDefs={columnDefs}
                  defaultColDef={{
                    resizable: true,
                    sortable: true,
                    filter: false
                  }}
                  onGridReady={onGridReady}
                  onSelectionChanged={handleSelectionChanged}
                  onRowClicked={(event) => handleRowClick(event.data)}
                  rowSelection="single"
                  suppressRowClickSelection={false}
                  animateRows={true}
                  pagination={true}
                  paginationPageSize={25}
                  paginationPageSizeSelector={[10, 25, 50, 100]}
                  suppressPaginationPanel={false}
                  rowHeight={60}
                  headerHeight={45}
                  suppressHorizontalScroll={false}
                  enableCellTextSelection={true}
                  ensureDomOrder={true}
                  rowClass="hover:bg-muted/30 cursor-pointer"
                  suppressRowHoverHighlight={false}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Product Details Panel */}
        <div className="xl:col-span-1">
          {showDetails && selectedProduct ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Product Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Basic Information</h4>
                  <div className="space-y-2">
                    <div>
                      <label className="text-sm font-medium">Name</label>
                      <p className="text-sm">{selectedProduct.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Set Code</label>
                      <p className="text-sm">{selectedProduct.set_code || "—"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Type</label>
                      <p className="text-sm capitalize">{selectedProduct.type}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Release Date</label>
                      <p className="text-sm">
                        {selectedProduct.release_date 
                          ? new Date(selectedProduct.release_date).toLocaleDateString()
                          : "—"
                        }
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Language</label>
                      <p className="text-sm">{selectedProduct.language || "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Verification Status */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Verification Status</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">TCGplayer ID</span>
                      <div className="flex items-center space-x-2">
                        {selectedProduct.tcgplayer_product_id && (
                          <span className="text-sm">{selectedProduct.tcgplayer_product_id}</span>
                        )}
                        <Badge variant={selectedProduct.tcg_is_verified ? "default" : "secondary"}>
                          {selectedProduct.tcg_is_verified ? "✓" : "—"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">UPC</span>
                      <div className="flex items-center space-x-2">
                        {selectedProduct.upc && (
                          <span className="text-sm">{selectedProduct.upc}</span>
                        )}
                        <Badge variant={selectedProduct.upc_is_verified ? "default" : "secondary"}>
                          {selectedProduct.upc_is_verified ? "✓" : "—"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Product Contents */}
                {productContents.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Contents</h4>
                    <div className="space-y-2">
                      {productContents.map((content, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span>{content.contained_name}</span>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              {content.quantity || 1}x
                            </Badge>
                            {content.rarity && (
                              <Badge variant="secondary" className="text-xs">
                                {content.rarity}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Actions</h4>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => navigate(`/products/${selectedProduct.id}`)}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Full Details
                    </Button>
                    {selectedProduct.tcgplayer_product_id && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => window.open(`https://www.tcgplayer.com/product/${selectedProduct.tcgplayer_product_id}`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        TCGplayer Page
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="sticky top-6">
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">Select a product to view details</p>
                  <p className="text-xs mt-2">Click on any row in the table to see product information, contents, and verification status.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCatalog;