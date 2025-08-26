import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
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
}

export default function Dashboard() {
  const [rowData, setRowData] = useState<DashboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    avgSavings: 0,
    bestDeal: 0,
    highPriced: 0
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  const columnDefs: ColDef[] = useMemo(() => [
    {
      field: 'name',
      headerName: 'Product Name',
      flex: 2,
      cellRenderer: (params: any) => (
        <button
          onClick={() => navigate(`/products/${params.data.id}`)}
          className="text-left text-primary hover:underline w-full"
        >
          {params.value}
        </button>
      )
    },
    {
      field: 'set_code',
      headerName: 'Set Code',
      width: 120,
      cellRenderer: (params: any) => (
        <Badge variant="secondary">{params.value}</Badge>
      )
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 130,
      cellRenderer: (params: any) => (
        <Badge variant="outline">{params.value}</Badge>
      )
    },
    {
      field: 'lowest_total_price',
      headerName: 'Lowest Total',
      width: 130,
      valueFormatter: (params) => params.value ? `$${params.value.toFixed(2)}` : 'N/A'
    },
    {
      field: 'lowest_item_price',
      headerName: 'Lowest Item',
      width: 130,
      valueFormatter: (params) => params.value ? `$${params.value.toFixed(2)}` : 'N/A'
    },
    {
      field: 'target_product_cost',
      headerName: 'Target Cost',
      width: 130,
      valueFormatter: (params) => params.value ? `$${params.value.toFixed(2)}` : 'N/A'
    },
    {
      field: 'max_product_cost',
      headerName: 'Max Cost',
      width: 130,
      valueFormatter: (params) => params.value ? `$${params.value.toFixed(2)}` : 'N/A'
    }
  ], [navigate]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

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

      // Transform data for ag-Grid
      const transformedData = (metricsData || []).map(metric => ({
        id: metric.products?.id || '',
        name: metric.products?.name || 'Unknown Product',
        set_code: metric.products?.set_code || 'N/A',
        type: metric.products?.type || 'unknown',
        lowest_total_price: metric.lowest_total_price,
        lowest_item_price: metric.lowest_item_price,
        target_product_cost: metric.target_product_cost,
        max_product_cost: metric.max_product_cost,
      }));

      setRowData(transformedData);

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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Products with pricing data
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Savings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgSavings.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Average potential margin
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Deal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.bestDeal.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Highest margin opportunity
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.highPriced}</div>
            <p className="text-xs text-muted-foreground">
              Products over $100
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Data Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Pricing Metrics</CardTitle>
          <CardDescription>
            Current pricing data for MTG sealed products
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="ag-theme-alpine h-96 w-full">
            <AgGridReact
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={{
                sortable: true,
                filter: true,
                resizable: true,
              }}
              onGridReady={onGridReady}
              animateRows={true}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}