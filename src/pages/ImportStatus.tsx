import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Download, CheckCircle, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function ImportStatus() {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const handleRunJob = async (jobName: string, endpoint: string) => {
    setLoadingStates(prev => ({ ...prev, [jobName]: true }));

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
      name: "Complete Batch Import",
      endpoint: "batch-import-all",
      description: "Automatically import ALL products in multiple batches",
      schedule: "Manual only",
      icon: Zap,
      variant: "destructive" as const,
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
          <Card key={job.name} className={job.variant === "destructive" ? "border-orange-200" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{job.name}</CardTitle>
              <job.icon className={`h-4 w-4 ${job.variant === "destructive" ? "text-orange-600" : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">{job.description}</p>
                  <Badge variant={job.variant === "destructive" ? "secondary" : "outline"}>{job.schedule}</Badge>
                </div>
                <Button 
                  onClick={() => handleRunJob(job.name, job.endpoint)} 
                  disabled={loadingStates[job.name]}
                  className="w-full"
                  variant={job.variant || "default"}
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