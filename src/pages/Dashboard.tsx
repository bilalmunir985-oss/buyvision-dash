import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  ExternalLink
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
}

export default function Dashboard() {
  const [rowData, setRowData] = useState<DashboardRow[]>([]);
  const [filteredData, setFilteredData] = useState<DashboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    totalProducts: 0,
    avgSavings: 0,
    bestDeal: 0,
    highPriced: 0
  });
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
      headerName: 'Market Price',
      width: 140,
      cellRenderer: (params: any) => <PriceCell value={params.value} type="market" />,
      sort: 'desc',
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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Search functionality
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredData(rowData);
      return;
    }

    const filtered = rowData.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.set_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.type.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredData(filtered);
  }, [searchQuery, rowData]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
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
    } finally {
      setLoading(false);
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

      {/* Data Grid */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Today's Pricing Metrics
              </CardTitle>
              <CardDescription>
                Current pricing data for MTG sealed products ({filteredData.length} items)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchDashboardData}
                className="flex items-center gap-2"
              >
                <DollarSign className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="ag-theme-alpine h-[600px] w-full rounded-lg border">
            <AgGridReact
              rowData={filteredData}
              columnDefs={columnDefs}
              defaultColDef={{
                sortable: true,
                filter: true,
                resizable: true,
                menuTabs: ['filterMenuTab', 'generalMenuTab'],
              }}
              onGridReady={onGridReady}
              animateRows={true}
              rowSelection="single"
              suppressRowClickSelection={true}
              getRowClass={(params) => {
                if (params.data.profit_margin >= 30) return 'ag-row-profit-high';
                if (params.data.profit_margin >= 20) return 'ag-row-profit-medium';
                if (params.data.profit_margin >= 10) return 'ag-row-profit-low';
                return 'ag-row-profit-none';
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}