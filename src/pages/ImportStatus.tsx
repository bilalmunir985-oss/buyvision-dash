import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  RefreshCw, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  Database,
  DollarSign,
  Calendar
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface JobStatus {
  name: string;
  lastRun: string;
  status: 'success' | 'running' | 'failed' | 'idle';
  duration?: string;
  recordsProcessed?: number;
}

const ImportStatus = () => {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<JobStatus[]>([
    {
      name: 'MTGJSON Import',
      lastRun: '2024-01-15T08:30:00Z',
      status: 'success',
      duration: '2m 34s',
      recordsProcessed: 1247,
    },
    {
      name: 'Pricing Scrape',
      lastRun: '2024-01-15T10:15:00Z', 
      status: 'success',
      duration: '5m 12s',
      recordsProcessed: 892,
    },
  ]);

  const [runningJobs, setRunningJobs] = useState<Set<string>>(new Set());

  const handleRunJob = async (jobName: string) => {
    if (runningJobs.has(jobName)) return;

    setRunningJobs(prev => new Set([...prev, jobName]));
    
    setJobs(prev => prev.map(job => 
      job.name === jobName 
        ? { ...job, status: 'running' as const }
        : job
    ));

    toast({
      title: "Job Started",
      description: `${jobName} has been queued for execution`,
    });

    // Simulate job execution
    await new Promise(resolve => setTimeout(resolve, 3000));

    const now = new Date().toISOString();
    const duration = `${Math.floor(Math.random() * 5) + 1}m ${Math.floor(Math.random() * 60)}s`;
    const recordsProcessed = Math.floor(Math.random() * 1000) + 500;

    setJobs(prev => prev.map(job => 
      job.name === jobName 
        ? { 
            ...job, 
            status: 'success' as const,
            lastRun: now,
            duration,
            recordsProcessed,
          }
        : job
    ));

    setRunningJobs(prev => {
      const newSet = new Set(prev);
      newSet.delete(jobName);
      return newSet;
    });

    toast({
      title: "Job Completed",
      description: `${jobName} finished successfully`,
    });
  };

  const getStatusIcon = (status: JobStatus['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-primary animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'idle':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: JobStatus['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-success text-success-foreground">Success</Badge>;
      case 'running':
        return <Badge className="bg-primary text-primary-foreground">Running</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'idle':
        return <Badge variant="secondary">Idle</Badge>;
    }
  };

  const formatLastRun = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Import Status</h1>
        <p className="text-muted-foreground">
          Monitor and manage data ingestion jobs
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <RefreshCw className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{runningJobs.size}</div>
            <p className="text-xs text-muted-foreground">
              Currently running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Success</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {jobs.filter(j => j.status === 'success').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Jobs completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {jobs.reduce((acc, job) => acc + (job.recordsProcessed || 0), 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Records processed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Job Status Cards */}
      <div className="space-y-4">
        {jobs.map((job, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center">
                  {job.name === 'MTGJSON Import' ? (
                    <Database className="h-5 w-5 mr-2" />
                  ) : (
                    <DollarSign className="h-5 w-5 mr-2" />
                  )}
                  {job.name}
                </CardTitle>
                {getStatusBadge(job.status)}
              </div>
              <CardDescription>
                {job.name === 'MTGJSON Import' 
                  ? 'Import product data and metadata from MTGJSON'
                  : 'Scrape current pricing data from various sources'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="flex items-center text-sm text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4 mr-1" />
                    Last Run
                  </div>
                  <div className="font-medium">
                    {formatLastRun(job.lastRun)}
                  </div>
                </div>

                <div>
                  <div className="flex items-center text-sm text-muted-foreground mb-1">
                    {getStatusIcon(job.status)}
                    <span className="ml-1">Status</span>
                  </div>
                  <div className="font-medium capitalize">
                    {job.status}
                  </div>
                </div>

                {job.duration && (
                  <div>
                    <div className="flex items-center text-sm text-muted-foreground mb-1">
                      <Clock className="h-4 w-4 mr-1" />
                      Duration
                    </div>
                    <div className="font-medium">
                      {job.duration}
                    </div>
                  </div>
                )}

                {job.recordsProcessed && (
                  <div>
                    <div className="flex items-center text-sm text-muted-foreground mb-1">
                      <Database className="h-4 w-4 mr-1" />
                      Records
                    </div>
                    <div className="font-medium">
                      {job.recordsProcessed.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              <div className="flex justify-end">
                <Button
                  onClick={() => handleRunJob(job.name)}
                  disabled={runningJobs.has(job.name)}
                  variant={job.status === 'running' ? 'secondary' : 'default'}
                >
                  {job.status === 'running' ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Run Now
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Next Scheduled Runs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2 text-primary" />
            Scheduled Jobs
          </CardTitle>
          <CardDescription>
            Automatic job execution schedule
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <div>
                <h4 className="font-medium">MTGJSON Import</h4>
                <p className="text-sm text-muted-foreground">Daily at 6:00 AM UTC</p>
              </div>
              <Badge variant="outline">Automatic</Badge>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <div>
                <h4 className="font-medium">Pricing Scrape</h4>
                <p className="text-sm text-muted-foreground">Every 4 hours</p>
              </div>
              <Badge variant="outline">Automatic</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImportStatus;