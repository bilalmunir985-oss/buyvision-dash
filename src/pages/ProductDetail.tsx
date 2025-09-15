import { useParams, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  Calendar, 
  ExternalLink, 
  Barcode, 
  TrendingUp,
  Target,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Product {
  id: string;
  name: string;
  set_code: string | null;
  type: string;
  release_date: string | null;
  language: string | null;
  tcgplayer_product_id: number | null;
  tcg_is_verified: boolean;
  upc: string | null;
  upc_is_verified: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProductContent {
  contained_name: string;
  quantity: number | null;
  rarity: string | null;
}

interface DailyMetric {
  id: string;
  product_id: string;
  as_of_date: string;
  product_url: string | null;
  lowest_total_price: number | null;
  lowest_item_price: number | null;
  num_listings: number | null;
  total_quantity_listed: number | null;
  target_product_cost: number | null;
  max_product_cost: number | null;
  created_at: string;
}

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [productContents, setProductContents] = useState<ProductContent[]>([]);
  const [metrics, setMetrics] = useState<DailyMetric | null>(null);
  const [loading, setLoading] = useState(true);
  
  if (!id) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    const fetchProductData = async () => {
      try {
        setLoading(true);
        
        // Fetch product data
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();

        if (productError) {
          console.error('Error fetching product:', productError);
          return;
        }

        setProduct(productData);

        // Fetch product contents
        const { data: contentsData, error: contentsError } = await supabase
          .from('product_contents')
          .select('contained_name, quantity, rarity')
          .eq('product_id', id);

        if (contentsError) {
          console.error('Error fetching product contents:', contentsError);
        } else {
          setProductContents(contentsData || []);
        }

        // Fetch latest metrics
        const { data: metricsData, error: metricsError } = await supabase
          .from('daily_metrics')
          .select('*')
          .eq('product_id', id)
          .order('as_of_date', { ascending: false })
          .limit(1)
          .single();

        if (metricsError) {
          console.error('Error fetching metrics:', metricsError);
        } else {
          setMetrics(metricsData);
        }
      } catch (error) {
        console.error('Error fetching product data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProductData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading product details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Product Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The product with ID "{id}" could not be found.
        </p>
        <Button onClick={() => window.history.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{product.name}</h1>
          <div className="flex items-center space-x-4 mt-2">
            {product.set_code && (
              <Badge variant="outline" className="font-mono">
                {product.set_code}
              </Badge>
            )}
            <Badge variant="secondary">
              {product.type}
            </Badge>
            {product.release_date && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="h-4 w-4 mr-1" />
                {new Date(product.release_date).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
        <Button onClick={() => window.history.back()} variant="outline">
          Back to Dashboard
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
              <CardDescription>
                Basic product details and contents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Product Contents</h4>
                {productContents.length > 0 ? (
                  <ul className="space-y-1">
                    {productContents.map((content, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <CheckCircle2 className="h-4 w-4 text-success mr-2 flex-shrink-0" />
                        <span className="flex-1">{content.contained_name}</span>
                        {content.quantity && (
                          <Badge variant="outline" className="text-xs ml-2">
                            {content.quantity}x
                          </Badge>
                        )}
                        {content.rarity && (
                          <Badge variant="secondary" className="text-xs ml-1">
                            {content.rarity}
                          </Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No contents information available</p>
                )}
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Identifiers</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <Barcode className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-muted-foreground">UPC:</span>
                      <span className="ml-2 font-mono">
                        {product.upc || 'Not mapped'}
                      </span>
                      {product.upc_is_verified && (
                        <Badge variant="default" className="ml-2 text-xs">
                          ✓ Verified
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center">
                      <ExternalLink className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-muted-foreground">TCGplayer ID:</span>
                      <span className="ml-2 font-mono">
                        {product.tcgplayer_product_id || 'Not mapped'}
                      </span>
                      {product.tcg_is_verified && (
                        <Badge variant="default" className="ml-2 text-xs">
                          ✓ Verified
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">External Links</h4>
                  {product.tcgplayer_product_id ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      asChild
                      className="text-primary"
                    >
                      <a 
                        href={`https://www.tcgplayer.com/product/${product.tcgplayer_product_id}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View on TCGplayer
                      </a>
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      TCGplayer link not available
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Verification Status</h4>
                <div className="flex items-center">
                  {product.tcg_is_verified ? (
                    <CheckCircle2 className="h-4 w-4 text-success mr-2" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-warning mr-2" />
                  )}
                  <span className="text-sm">
                    TCGplayer mapping is {product.tcg_is_verified ? 'verified' : 'pending verification'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pricing Metrics Sidebar */}
        <div className="space-y-6">
          {metrics ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-success" />
                    Current Pricing
                  </CardTitle>
                  <CardDescription>
                    Latest pricing data from {new Date(metrics.as_of_date).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-2xl font-bold text-success">
                      ${metrics.lowest_total_price?.toFixed(2) || 'N/A'}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Lowest Total Price
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Item Price Only</span>
                      <span className="font-medium">
                        ${metrics.lowest_item_price?.toFixed(2) || 'N/A'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Number of Listings</span>
                      <span className="font-medium">
                        {metrics.num_listings || 0}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Quantity Listed</span>
                      <span className="font-medium">
                        {metrics.total_quantity_listed || 0}
                      </span>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Target Cost</span>
                      <span className="font-medium flex items-center">
                        <Target className="h-3 w-3 mr-1" />
                        ${metrics.target_product_cost?.toFixed(2) || 'N/A'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Max Cost</span>
                      <span className="font-medium text-warning">
                        ${metrics.max_product_cost?.toFixed(2) || 'N/A'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Savings Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-success">
                      ${metrics.max_product_cost && metrics.lowest_total_price 
                        ? (metrics.max_product_cost - metrics.lowest_total_price).toFixed(2)
                        : 'N/A'
                      }
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Savings vs. Max Cost
                    </p>
                    <div className="mt-2">
                      {metrics.lowest_total_price && metrics.target_product_cost ? (
                        <Badge 
                          variant={
                            metrics.lowest_total_price <= metrics.target_product_cost 
                              ? "default" 
                              : "destructive"
                          }
                        >
                          {metrics.lowest_total_price <= metrics.target_product_cost 
                            ? "Within Target" 
                            : "Above Target"
                          }
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          No Target Data
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Pricing Data</CardTitle>
                <CardDescription>
                  No metrics available for this product
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Pricing data will appear here once the daily metrics are collected.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;