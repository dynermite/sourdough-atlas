import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ScrapeStatus {
  isRunning: boolean;
  lastRun: string;
  nextRun: string;
}

export default function Admin() {
  const [searchQuery, setSearchQuery] = useState("");
  const [maxResults, setMaxResults] = useState(20);
  const { toast } = useToast();

  // Get scraping status
  const { data: status, isLoading: statusLoading } = useQuery<ScrapeStatus>({
    queryKey: ['/api/scrape/status'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Manual scrape mutation
  const scrapeMutation = useMutation({
    mutationFn: async (data: { searchQuery: string; maxResults: number }) => {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start scraping');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Scraping Started",
        description: data.message,
      });
      setSearchQuery("");
      queryClient.invalidateQueries({ queryKey: ['/api/scrape/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants'] });
    },
    onError: (error: any) => {
      toast({
        title: "Scraping Failed",
        description: error.message || "Failed to start scraping",
        variant: "destructive",
      });
    },
  });

  const handleStartScraping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      toast({
        title: "Error",
        description: "Please enter a search query",
        variant: "destructive",
      });
      return;
    }

    scrapeMutation.mutate({
      searchQuery: searchQuery.trim(),
      maxResults,
    });
  };

  const popularQueries = [
    "San Francisco California",
    "New York New York",
    "Portland Oregon",
    "Austin Texas",
    "Chicago Illinois",
    "Seattle Washington"
  ];

  return (
    <div className="min-h-screen bg-warm-white">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
          <p className="text-gray-600">Manage restaurant scraping and data collection</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Scraping Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <i className="fas fa-robot text-warm-orange"></i>
                Scraping Status
              </CardTitle>
              <CardDescription>
                Current status of the restaurant scraping system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statusLoading ? (
                <div className="text-center py-4">
                  <i className="fas fa-spinner fa-spin text-warm-orange text-2xl"></i>
                  <p className="mt-2 text-gray-600">Loading status...</p>
                </div>
              ) : status ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Status:</span>
                    <Badge className={status.isRunning ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                      <i className={`fas ${status.isRunning ? 'fa-cog fa-spin' : 'fa-check'} mr-1`}></i>
                      {status.isRunning ? 'Running' : 'Idle'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Last Run:</span>
                    <span className="text-sm text-gray-600">{status.lastRun}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Next Scheduled:</span>
                    <span className="text-sm text-gray-600">{status.nextRun}</span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600">Unable to load status</p>
              )}
            </CardContent>
          </Card>

          {/* Manual Scraping */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <i className="fas fa-search text-warm-orange"></i>
                Manual Scraping
              </CardTitle>
              <CardDescription>
                Trigger a manual scrape for a specific location
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStartScraping} className="space-y-4">
                <div>
                  <label htmlFor="searchQuery" className="block text-sm font-medium text-gray-700 mb-1">
                    Search Query
                  </label>
                  <Input
                    id="searchQuery"
                    type="text"
                    placeholder="e.g., San Francisco California"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    disabled={scrapeMutation.isPending || status?.isRunning}
                  />
                </div>
                
                <div>
                  <label htmlFor="maxResults" className="block text-sm font-medium text-gray-700 mb-1">
                    Max Results (1-50)
                  </label>
                  <Input
                    id="maxResults"
                    type="number"
                    min="1"
                    max="50"
                    value={maxResults}
                    onChange={(e) => setMaxResults(parseInt(e.target.value) || 20)}
                    disabled={scrapeMutation.isPending || status?.isRunning}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-warm-orange text-white hover:bg-opacity-90 transition-colors"
                  disabled={scrapeMutation.isPending || status?.isRunning}
                >
                  {scrapeMutation.isPending ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Starting Scrape...
                    </>
                  ) : status?.isRunning ? (
                    <>
                      <i className="fas fa-cog fa-spin mr-2"></i>
                      Scraping in Progress
                    </>
                  ) : (
                    <>
                      <i className="fas fa-play mr-2"></i>
                      Start Scraping
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6">
                <p className="text-sm font-medium text-gray-700 mb-2">Popular Queries:</p>
                <div className="flex flex-wrap gap-2">
                  {popularQueries.map((query) => (
                    <Button
                      key={query}
                      variant="outline"
                      size="sm"
                      onClick={() => setSearchQuery(query)}
                      disabled={scrapeMutation.isPending || status?.isRunning}
                      className="text-xs"
                    >
                      {query}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <i className="fas fa-info-circle text-warm-orange"></i>
              How Scraping Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-warm-orange text-white w-12 h-12 rounded-full flex items-center justify-center text-xl mx-auto mb-3">
                  <i className="fas fa-map-marker-alt"></i>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Search Google Maps</h3>
                <p className="text-sm text-gray-600">Searches for pizza restaurants in the specified location using Google Maps data</p>
              </div>
              
              <div className="text-center">
                <div className="bg-warm-orange text-white w-12 h-12 rounded-full flex items-center justify-center text-xl mx-auto mb-3">
                  <i className="fas fa-search"></i>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Analyze Content</h3>
                <p className="text-sm text-gray-600">Examines reviews, descriptions, and websites for sourdough keywords like "naturally leavened"</p>
              </div>
              
              <div className="text-center">
                <div className="bg-warm-orange text-white w-12 h-12 rounded-full flex items-center justify-center text-xl mx-auto mb-3">
                  <i className="fas fa-database"></i>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Save Results</h3>
                <p className="text-sm text-gray-600">Verified sourdough restaurants are added to the database for travelers to discover</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}