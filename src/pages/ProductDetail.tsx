import { useParams, Navigate } from 'react-router-dom';
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
  CheckCircle2
} from 'lucide-react';
import { getProductById, getDailyMetricsByProductId } from '@/utils/mockData';

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  
  if (!id) {
    return <Navigate to="/" replace />;
  }

  const product = getProductById(id);
  const metrics = getDailyMetricsByProductId(id);

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
            <Badge variant="outline" className="font-mono">
              {product.set_code}
            </Badge>
            <Badge variant="secondary">
              {product.type}
            </Badge>
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 mr-1" />
              {new Date(product.release_date).toLocaleDateString()}
            </div>
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
                <ul className="space-y-1">
                  {product.product_contents.map((content, index) => (
                    <li key={index} className="flex items-center text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success mr-2 flex-shrink-0" />
                      {content}
                    </li>
                  ))}
                </ul>
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
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">External Links</h4>
                  {product.tcgplayer_product_url ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      asChild
                      className="text-primary"
                    >
                      <a 
                        href={product.tcgplayer_product_url} 
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
                    Latest pricing data from {metrics.date}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-2xl font-bold text-success">
                      ${metrics.lowest_total_price.toFixed(2)}
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
                        ${metrics.lowest_item_price_only.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Target Cost</span>
                      <span className="font-medium flex items-center">
                        <Target className="h-3 w-3 mr-1" />
                        ${metrics.target_product_cost.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Max Cost</span>
                      <span className="font-medium text-warning">
                        ${metrics.max_product_cost.toFixed(2)}
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
                      ${(metrics.max_product_cost - metrics.lowest_total_price).toFixed(2)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Savings vs. Max Cost
                    </p>
                    <div className="mt-2">
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