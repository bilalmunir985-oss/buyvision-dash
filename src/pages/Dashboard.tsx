import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Package,
  Target,
  BarChart3,
  ArrowUpRight,
  ExternalLink,
  Filter,
  X
} from 'lucide-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

interface DashboardRow {
  id: string;
  name: string;
  set_code: string;
  type: string;
  lowest_total_price: number | null;
  lowest_item_price: number | null;
  target_product_cost: number | null;
  max_product_cost: number | null;
  profit_margin?: number | null;
  // Additional fields from fetch prices
  market_price?: number | null;
  num_listings?: number | null;
  product_url?: string;
  tcgplayer_id?: number;
}

export default function Dashboard() {
  const [rowData, setRowData] = useState<DashboardRow[]>([]);
  const [filteredData, setFilteredData] = useState<DashboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter states
  const [selectedType, setSelectedType] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [marginRange, setMarginRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [selectedSetCode, setSelectedSetCode] = useState<string>('all');
  
  const [stats, setStats] = useState({
    totalProducts: 0,
    avgSavings: 0,
    bestDeal: 0,
    highPriced: 0
  });
  const [isFetchingPrices, setIsFetchingPrices] = useState(false);
  const [priceResponseData, setPriceResponseData] = useState<any[]>([]);
  const [hasFetchPricesData, setHasFetchPricesData] = useState(() => {
    // Check if we have fetch prices data in localStorage
    const storedData = localStorage.getItem('fetchPricesData');
    return !!storedData;
  });
  
  // Debug: Log when priceResponseData changes
  useEffect(() => {
    console.log('priceResponseData updated:', priceResponseData);
    console.log('priceResponseData length:', priceResponseData.length);
  }, [priceResponseData]);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Profit margin badge component
  const ProfitMarginBadge = ({ value }: { value: number | null }) => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground text-sm">N/A</span>;
    }
    
    const getVariant = (margin: number) => {
      if (margin >= 30) return "default";  // Green for high margin
      if (margin >= 20) return "secondary"; // Yellow for medium margin
      return "destructive"; // Red for low margin
    };

    const getIcon = (margin: number) => {
      return margin >= 20 ? TrendingUp : TrendingDown;
    };

    const Icon = getIcon(value);
    
    return (
      <Badge variant={getVariant(value)} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {value.toFixed(1)}%
      </Badge>
    );
  };

  // Price cell component
  const PriceCell = ({ value, type }: { value: number | null; type: 'market' | 'target' | 'max' }) => {
    if (!value) return <span className="text-muted-foreground">N/A</span>;
    
    const colorClass = type === 'market' ? 'text-foreground font-medium' : 
                      type === 'target' ? 'text-success font-medium' : 'text-warning';
    
    return (
      <div className="flex items-center gap-1">
        <DollarSign className="h-3 w-3 text-muted-foreground" />
        <span className={colorClass}>${value.toFixed(2)}</span>
      </div>
    );
  };

  const columnDefs: ColDef[] = useMemo(() => [
    {
      field: 'name',
      headerName: 'Product Name',
      flex: 2,
      minWidth: 200,
      cellRenderer: (params: any) => (
        <div className="flex items-center gap-2 py-1">
          <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <button
            onClick={() => navigate(`/admin/products/${params.data.id}`)}
            className="text-left text-primary hover:text-primary/80 font-medium hover:underline flex-1 transition-colors"
          >
            {params.value}
          </button>
          <ArrowUpRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      ),
      cellClass: 'group cursor-pointer',
    },
    {
      field: 'set_code',
      headerName: 'Set',
      width: 100,
      cellRenderer: (params: any) => (
        <Badge variant="secondary" className="font-mono text-xs">
          {params.value}
        </Badge>
      )
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 130,
      cellRenderer: (params: any) => {
        const typeColors: Record<string, string> = {
          'booster_box': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
          'bundle': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
          'commander_deck': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
          'pack': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
        };
        
        return (
          <Badge 
            variant="outline" 
            className={`${typeColors[params.value] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'} border-0`}
          >
            {params.value.replace('_', ' ')}
          </Badge>
        );
      }
    },
    {
      field: 'lowest_total_price',
      headerName: 'Lowest Price',
      width: 140,
      cellRenderer: (params: any) => <PriceCell value={params.value} type="market" />,
      sort: 'desc',
    },
    {
      field: 'market_price',
      headerName: 'Market Price',
      width: 140,
      cellRenderer: (params: any) => <PriceCell value={params.value} type="market" />,
    },
    {
      field: 'num_listings',
      headerName: 'Listings',
      width: 100,
      cellRenderer: (params: any) => (
        <Badge variant="outline">
          {params.value || 0}
        </Badge>
      ),
    },
    {
      field: 'target_product_cost',
      headerName: 'Target Cost',
      width: 140,
      cellRenderer: (params: any) => <PriceCell value={params.value} type="target" />,
    },
    {
      field: 'max_product_cost',
      headerName: 'Max Cost',
      width: 130,
      cellRenderer: (params: any) => <PriceCell value={params.value} type="max" />,
    },
    {
      field: 'profit_margin',
      headerName: 'Profit Margin',
      width: 140,
      cellRenderer: (params: any) => <ProfitMarginBadge value={params.value} />,
      sort: 'desc',
    },
    {
      headerName: 'Actions',
      width: 100,
      cellRenderer: (params: any) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/admin/products/${params.data.id}`)}
            className="h-7 w-7 p-0"
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      ),
      sortable: false,
      filter: false,
    }
  ], [navigate]);

  // Load stored fetch prices data on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      
      const storedData = localStorage.getItem('fetchPricesData');
      const storedRowData = localStorage.getItem('fetchPricesRowData');
      
      console.log('Checking localStorage on mount:');
      console.log('storedData exists:', !!storedData);
      console.log('storedRowData exists:', !!storedRowData);
      
      if (storedData && storedRowData) {
        try {
          const parsedData = JSON.parse(storedData);
          const parsedRowData = JSON.parse(storedRowData);
          
          setPriceResponseData(parsedData);
          setRowData(parsedRowData);
          setFilteredData(parsedRowData);
          setHasFetchPricesData(true);
          
          console.log('Loaded stored fetch prices data:', parsedData);
        } catch (error) {
          console.error('Error parsing stored fetch prices data:', error);
          // Clear corrupted data
          localStorage.removeItem('fetchPricesData');
          localStorage.removeItem('fetchPricesRowData');
          setHasFetchPricesData(false);
          // Load daily metrics as fallback
          await fetchDashboardData();
        }
      } else {
        // No stored data, load daily metrics
        await fetchDashboardData();
      }
      
      setLoading(false);
    };
    
    loadInitialData();
  }, []);

  // Get unique values for filters
  const uniqueTypes = useMemo(() => {
    const types = [...new Set(rowData.map(item => item.type))];
    return types.sort();
  }, [rowData]);

  const uniqueSetCodes = useMemo(() => {
    const setCodes = [...new Set(rowData.map(item => item.set_code))];
    return setCodes.sort();
  }, [rowData]);

  // Combined search and filter functionality
  useEffect(() => {
    let filtered = rowData;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.set_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(item => item.type === selectedType);
    }

    // Apply set code filter
    if (selectedSetCode !== 'all') {
      filtered = filtered.filter(item => item.set_code === selectedSetCode);
    }

    // Apply price range filter
    if (priceRange.min || priceRange.max) {
      filtered = filtered.filter(item => {
        const price = item.lowest_total_price;
        if (!price) return false;
        
        const minPrice = priceRange.min ? parseFloat(priceRange.min) : 0;
        const maxPrice = priceRange.max ? parseFloat(priceRange.max) : Infinity;
        
        return price >= minPrice && price <= maxPrice;
      });
    }

    // Apply margin range filter
    if (marginRange.min || marginRange.max) {
      filtered = filtered.filter(item => {
        const margin = item.profit_margin;
        if (margin === null || margin === undefined) return false;
        
        const minMargin = marginRange.min ? parseFloat(marginRange.min) : -Infinity;
        const maxMargin = marginRange.max ? parseFloat(marginRange.max) : Infinity;
        
        return margin >= minMargin && margin <= maxMargin;
      });
    }

    setFilteredData(filtered);
  }, [searchQuery, rowData, selectedType, selectedSetCode, priceRange, marginRange]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedType('all');
    setSelectedSetCode('all');
    setPriceRange({ min: '', max: '' });
    setMarginRange({ min: '', max: '' });
  };

  // Check if any filters are active
  const hasActiveFilters = searchQuery.trim() || selectedType !== 'all' || selectedSetCode !== 'all' || 
    priceRange.min || priceRange.max || marginRange.min || marginRange.max;

  const clearStoredData = async () => {
    setLoading(true);
    localStorage.removeItem('fetchPricesData');
    localStorage.removeItem('fetchPricesRowData');
    setHasFetchPricesData(false);
    setPriceResponseData([]);
    setRowData([]);
    setFilteredData([]);
    // Reload daily metrics data
    await fetchDashboardData();
    setLoading(false);
  };

  const fetchPrices = async () => {
    try {
      setIsFetchingPrices(true);
      
      toast({
        title: "Fetching latest prices...",
        description: "This may take a few minutes to complete",
      });

      const { data, error } = await supabase.functions.invoke('fetch-prices');

      if (error) {
        console.error('Error fetching prices:', error);
        toast({
          title: "Error fetching prices",
          description: error.message || "Please try again later",
          variant: "destructive",
        });
        return;
      }

      console.log('Price fetch result:', data);
      console.log('Prices array:', data.prices);
      console.log('Prices length:', data.prices?.length);
      
      // Store the detailed response data for display
      if (data.prices) {
        console.log('Setting price response data:', data.prices);
        setPriceResponseData(data.prices);
        
        // Transform fetch prices data to DashboardRow format and update the main table
        await updateDashboardWithFetchPricesData(data.prices);
      } else {
        console.log('No prices found in response');
      }
      
      toast({
        title: "Price fetch completed",
        description: `Processed ${data.processed || 0} products with ${data.errors || 0} errors`,
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error fetching prices",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsFetchingPrices(false);
    }
  };

  const updateDashboardWithFetchPricesData = async (pricesData: any[]) => {
    try {
      // Get product information for the TCGPlayer IDs
      const tcgplayerIds = pricesData.map(p => p.tcgplayer_id);
      
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          set_code,
          type,
          tcgplayer_product_id
        `)
        .in('tcgplayer_product_id', tcgplayerIds);

      if (productsError) {
        console.error('Error fetching products for TCGPlayer IDs:', productsError);
        return;
      }

      // Create a map of TCGPlayer ID to product info
      const productMap = new Map();
      products?.forEach(product => {
        productMap.set(product.tcgplayer_product_id, product);
      });

      // Transform fetch prices data to DashboardRow format
      const transformedData = pricesData.map(priceItem => {
        const product = productMap.get(priceItem.tcgplayer_id);
        
        // Calculate target and max costs (simplified calculation)
        const targetCost = priceItem.lowest_price ? priceItem.lowest_price * 0.60 : null;
        const maxCost = priceItem.lowest_price ? priceItem.lowest_price * 0.80 : null;
        
        // Calculate profit margin
        const profitMargin = priceItem.lowest_price && targetCost
          ? ((priceItem.lowest_price - targetCost) / priceItem.lowest_price * 100)
          : null;

        return {
          id: product?.id || `tcg-${priceItem.tcgplayer_id}`,
          name: priceItem.product_name || 'Unknown Product',
          set_code: product?.set_code || 'N/A',
          type: product?.type || 'unknown',
          lowest_total_price: priceItem.lowest_price_with_shipping,
          lowest_item_price: priceItem.lowest_price,
          target_product_cost: targetCost,
          max_product_cost: maxCost,
          profit_margin: profitMargin,
          // Additional data from fetch prices
          market_price: priceItem.market_price,
          num_listings: priceItem.num_listings,
          product_url: priceItem.product_url,
          tcgplayer_id: priceItem.tcgplayer_id
        };
      });

      console.log('Transformed fetch prices data:', transformedData);
      
      // Update the main dashboard data
      setRowData(transformedData);
      setFilteredData(transformedData);
      setHasFetchPricesData(true);
      
      // Store data in localStorage for persistence across refreshes
      localStorage.setItem('fetchPricesData', JSON.stringify(pricesData));
      localStorage.setItem('fetchPricesRowData', JSON.stringify(transformedData));
      
      // Update stats
      const validPrices = transformedData.filter(item => item.lowest_total_price);
      setStats({
        totalProducts: transformedData.length,
        avgSavings: validPrices.length > 0 
          ? validPrices.reduce((sum, item) => sum + (item.lowest_total_price - (item.target_product_cost || 0)), 0) / validPrices.length
          : 0,
        bestDeal: validPrices.length > 0 
          ? Math.max(...validPrices.map(item => item.lowest_total_price - (item.target_product_cost || 0)))
          : 0,
        highPriced: validPrices.filter(item => item.lowest_total_price > 100).length
      });
      
    } catch (error) {
      console.error('Error updating dashboard with fetch prices data:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      
      // Fetch today's metrics with product data
      const { data: metricsData, error: metricsError } = await supabase
        .from('daily_metrics')
        .select(`
          *,
          products:product_id (
            id,
            name,
            set_code,
            type
          )
        `)
        .eq('as_of_date', new Date().toISOString().split('T')[0])
        .order('lowest_total_price', { ascending: false });

      if (metricsError) {
        console.error('Error fetching metrics:', metricsError);
        toast({
          title: "Error loading dashboard data",
          description: "Please try again later",
          variant: "destructive",
        });
        return;
      }

      // Transform data for ag-Grid with profit margin calculation
      const transformedData = (metricsData || []).map(metric => {
        const profitMargin = metric.lowest_total_price && metric.target_product_cost
          ? ((metric.lowest_total_price - metric.target_product_cost) / metric.lowest_total_price * 100)
          : null;
        
        return {
          id: metric.products?.id || '',
          name: metric.products?.name || 'Unknown Product',
          set_code: metric.products?.set_code || 'N/A',
          type: metric.products?.type || 'unknown',
          lowest_total_price: metric.lowest_total_price,
          lowest_item_price: metric.lowest_item_price,
          target_product_cost: metric.target_product_cost,
          max_product_cost: metric.max_product_cost,
          profit_margin: profitMargin,
        };
      });

      setRowData(transformedData);
      setFilteredData(transformedData);
      setHasFetchPricesData(false);
      
      // Clear stored fetch prices data when loading daily metrics
      localStorage.removeItem('fetchPricesData');
      localStorage.removeItem('fetchPricesRowData');

      // Calculate stats
      const totalProducts = transformedData.length;
      const validPrices = transformedData.filter(item => item.lowest_total_price && item.target_product_cost);
      const avgSavings = validPrices.length > 0 
        ? validPrices.reduce((sum, item) => sum + ((item.lowest_total_price! - item.target_product_cost!) / item.lowest_total_price! * 100), 0) / validPrices.length
        : 0;
      const bestDeal = validPrices.length > 0 
        ? Math.max(...validPrices.map(item => (item.lowest_total_price! - item.target_product_cost!) / item.lowest_total_price! * 100))
        : 0;
      const highPriced = transformedData.filter(item => item.lowest_total_price && item.lowest_total_price > 100).length;

      setStats({
        totalProducts,
        avgSavings,
        bestDeal,
        highPriced
      });

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error loading dashboard data",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  const onGridReady = (params: any) => {
    params.api.sizeColumnsToFit();
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
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Today's MTG product pricing metrics and analytics
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Products</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Products with pricing data
            </p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Margin</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.avgSavings.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Average potential margin
            </p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Best Deal</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
              <Target className="h-4 w-4 text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.bestDeal.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Highest margin opportunity
            </p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Premium Items</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.highPriced}</div>
            <p className="text-xs text-muted-foreground">
              Products over $100
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Filters */}
      <Card className="shadow-sm border-border/40">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-lg">Advanced Filters</CardTitle>
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2">
                  {filteredData.length} results
                </Badge>
              )}
            </div>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Row 1: Search and Type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products, sets, types..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Product Type</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Set Code</label>
              <Select value={selectedSetCode} onValueChange={setSelectedSetCode}>
                <SelectTrigger>
                  <SelectValue placeholder="All sets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sets</SelectItem>
                  {uniqueSetCodes.map(setCode => (
                    <SelectItem key={setCode} value={setCode}>
                      {setCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Price and Margin Ranges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Price Range ($)</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={priceRange.min}
                  onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                  className="flex-1"
                />
                <span className="text-muted-foreground text-sm">to</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Profit Margin (%)</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={marginRange.min}
                  onChange={(e) => setMarginRange(prev => ({ ...prev, min: e.target.value }))}
                  className="flex-1"
                />
                <span className="text-muted-foreground text-sm">to</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={marginRange.max}
                  onChange={(e) => setMarginRange(prev => ({ ...prev, max: e.target.value }))}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Metrics Table */}
      <Card className="shadow-sm border-border/40">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Daily Metrics
              </CardTitle>
              <CardDescription>
                Daily pricing metrics for TCG verified products
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchPrices}
                disabled={isFetchingPrices}
                className="flex items-center gap-2"
              >
                {isFetchingPrices ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <TrendingUp className="h-4 w-4" />
                )}
                {isFetchingPrices ? 'Fetching...' : 'Fetch Prices'}
              </Button>
              {hasFetchPricesData && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearStoredData}
                  className="flex items-center gap-2 text-orange-600 hover:text-orange-700"
                >
                  <X className="h-4 w-4" />
                  Clear Data
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        {priceResponseData.length > 0 && (
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border border-border p-2 text-left font-medium">Product Name</th>
                    <th className="border border-border p-2 text-left font-medium">TCG ID</th>
                    <th className="border border-border p-2 text-left font-medium">Lowest Price</th>
                    <th className="border border-border p-2 text-left font-medium">Price + Shipping</th>
                    <th className="border border-border p-2 text-left font-medium">Market Price</th>
                    <th className="border border-border p-2 text-left font-medium">Listings</th>
                    <th className="border border-border p-2 text-left font-medium">Product URL</th>
                  </tr>
                </thead>
                <tbody>
                  {priceResponseData.map((item, index) => (
                    <tr key={index} className="hover:bg-muted/30">
                      <td className="border border-border p-2 font-medium">{item.product_name || 'N/A'}</td>
                      <td className="border border-border p-2">
                        <Badge variant="outline" className="font-mono">
                          {item.tcgplayer_id || 'N/A'}
                        </Badge>
                      </td>
                      <td className="border border-border p-2">
                        {item.lowest_price ? (
                          <div className="flex items-center gap-1 text-success font-medium">
                            <DollarSign className="h-3 w-3" />
                            {typeof item.lowest_price === 'number' ? item.lowest_price.toFixed(2) : item.lowest_price}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </td>
                      <td className="border border-border p-2">
                        {item.lowest_price_with_shipping ? (
                          <div className="flex items-center gap-1 text-blue-600 font-medium">
                            <DollarSign className="h-3 w-3" />
                            {typeof item.lowest_price_with_shipping === 'number' ? item.lowest_price_with_shipping.toFixed(2) : item.lowest_price_with_shipping}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </td>
                      <td className="border border-border p-2">
                        {item.market_price ? (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3 text-muted-foreground" />
                            {typeof item.market_price === 'number' ? item.market_price.toFixed(2) : item.market_price}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </td>
                      <td className="border border-border p-2">
                        <Badge variant="outline">
                          {item.num_listings || 0}
                        </Badge>
                      </td>
                      <td className="border border-border p-2">
                        <a 
                          href={item.product_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline text-sm"
                        >
                          View on TCGPlayer
                          <ExternalLink className="h-3 w-3 inline ml-1" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}