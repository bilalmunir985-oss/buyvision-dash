import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Download, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function ImportStatus() {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const handleRunJob = async (jobName: string, endpoint: string) => {
    setLoadingStates(prev => ({ ...prev, [jobName]: true }));

    try {
      // Get the current session to ensure we have auth
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Not authenticated. Please log in again.');
      }

      const response = await supabase.functions.invoke(endpoint, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw response.error;
      }

      // Show detailed success message with response data
      const result = response.data;
      const message = result?.message || `${jobName} completed successfully.`;
      
      toast({
        title: "Import Successful",
        description: message,
      });
    } catch (error: any) {
      const errorMessage = error?.message || `${jobName} failed to run.`;
      
      toast({
        title: "Import Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, [jobName]: false }));
    }
  };

  const jobs = [
    {
      name: "MTGJSON Import",
      endpoint: "mtgjson-import",
      description: "Import product catalog from MTGJSON (single batch)",
      schedule: "Daily at 4:00 AM UTC",
      icon: Download,
    },
    {
      name: "Fetch Prices",
      endpoint: "fetch-prices",
      description: "Collect daily pricing data from TCGplayer",
      schedule: "Daily at 4:01 AM UTC",
      icon: CheckCircle,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Import Status</h1>
        <p className="text-muted-foreground">Monitor and trigger data import jobs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {jobs.map((job) => (
          <Card key={job.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{job.name}</CardTitle>
              <job.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">{job.description}</p>
                  <Badge variant="outline">{job.schedule}</Badge>
                </div>
                <Button 
                  onClick={() => handleRunJob(job.name, job.endpoint)} 
                  disabled={loadingStates[job.name]}
                  className="w-full"
                >
                  {loadingStates[job.name] ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    'Run Now'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}