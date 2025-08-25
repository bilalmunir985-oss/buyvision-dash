import { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import '../styles/ag-grid-theme.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { getDashboardMetrics } from '@/utils/mockData';
import { useNavigate } from 'react-router-dom';

interface DashboardRow {
  id: string;
  name: string;
  set_code: string;
  type: string;
  lowest_total_price: number;
  lowest_item_price_only: number;
  target_product_cost: number;
  max_product_cost: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const metrics = getDashboardMetrics();

  const columnDefs: ColDef<DashboardRow>[] = useMemo(() => [
    {
      field: 'name',
      headerName: 'Product Name',
      flex: 2,
      minWidth: 250,
      cellRenderer: (params: any) => (
        <Button
          variant="ghost"
          className="h-auto p-0 justify-start font-medium text-primary hover:text-primary-hover"
          onClick={() => navigate(`/products/${params.data.id}`)}
        >
          {params.value}
        </Button>
      ),
    },
    {
      field: 'set_code',
      headerName: 'Set Code',
      width: 120,
      cellRenderer: (params: any) => (
        <Badge variant="outline" className="font-mono">
          {params.value}
        </Badge>
      ),
    },
    {
      field: 'type',
      headerName: 'Product Type', 
      flex: 1,
      minWidth: 150,
    },
    {
      field: 'lowest_total_price',
      headerName: 'Lowest Total Price',
      width: 160,
      cellRenderer: (params: any) => (
        <span className="font-medium text-success">
          ${params.value?.toFixed(2)}
        </span>
      ),
    },
    {
      field: 'lowest_item_price_only',
      headerName: 'Lowest Item Price',
      width: 160,
      cellRenderer: (params: any) => (
        <span className="text-foreground">
          ${params.value?.toFixed(2)}
        </span>
      ),
    },
    {
      field: 'target_product_cost',
      headerName: 'Target Cost',
      width: 130,
      cellRenderer: (params: any) => (
        <span className="text-muted-foreground">
          ${params.value?.toFixed(2)}
        </span>
      ),
    },
    {
      field: 'max_product_cost',
      headerName: 'Max Cost',
      width: 120,
      cellRenderer: (params: any) => (
        <span className="text-warning">
          ${params.value?.toFixed(2)}
        </span>
      ),
    },
  ], [navigate]);

  const onGridReady = (params: GridReadyEvent) => {
    params.api.sizeColumnsToFit();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Today's product metrics and pricing data
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.length}</div>
            <p className="text-xs text-muted-foreground">
              Products being tracked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Savings</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              ${(
                metrics.reduce((acc, item) => 
                  acc + (item.max_product_cost - item.lowest_total_price), 0
                ) / metrics.length
              ).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Per product savings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Deal</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              ${Math.max(...metrics.map(item => 
                item.max_product_cost - item.lowest_total_price
              )).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Maximum savings found
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priced</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {metrics.filter(item => 
                item.lowest_total_price > item.target_product_cost
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Above target price
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Data Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Metrics</CardTitle>
          <CardDescription>
            Current pricing data for all tracked products. Click on a product name to view details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="ag-theme-alpine" style={{ height: '500px', width: '100%' }}>
            <AgGridReact<DashboardRow>
              rowData={metrics}
              columnDefs={columnDefs}
              defaultColDef={{
                sortable: true,
                filter: true,
                resizable: true,
              }}
              animateRows={true}
              rowSelection="single"
              onGridReady={onGridReady}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;