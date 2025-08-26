import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { RefreshCw, Download, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function ImportStatus() {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const handleRunJob = async (jobName: string, endpoint: string) => {
    setLoading(jobName);

    try {
      const response = await supabase.functions.invoke(endpoint);

      if (response.error) throw response.error;

      toast({
        title: "Import Successful",
        description: `${jobName} completed successfully.`,
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Import Failed",
        description: `${jobName} failed to run.`,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Import Status</h1>
        <p className="text-muted-foreground">Monitor data import jobs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MTGJSON Import</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Import sealed products</p>
                <Badge variant="outline">Daily 4:00 AM</Badge>
              </div>
              <Button
                size="sm"
                onClick={() => handleRunJob('MTGJSON Import', 'mtgjson-import')}
                disabled={loading === 'MTGJSON Import'}
              >
                {loading === 'MTGJSON Import' ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  'Run Now'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Price Scraping</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Fetch TCGplayer prices</p>
                <Badge variant="outline">Daily 4:01 AM</Badge>
              </div>
              <Button
                size="sm"
                onClick={() => handleRunJob('Price Scraping', 'fetch-prices')}
                disabled={loading === 'Price Scraping'}
              >
                {loading === 'Price Scraping' ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  'Run Now'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}