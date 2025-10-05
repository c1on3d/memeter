import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ExternalLink, TrendingUp, Users, Brain, Twitter, Activity } from "lucide-react";
import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import type { TokenWithMetrics } from "@/types";
import { buildApiUrl } from "@/lib/api";

interface TokenSummaryProps {
  token: TokenWithMetrics | null;
  open: boolean;
  onClose: () => void;
}

interface TokenAnalysis {
  overallScore?: number;
  thesis?: string;
  sentiment: {
    score: number;
    label: string;
    confidence: number;
  };
  socialMetrics: {
    mentions: number;
    engagement: number;
    influencerMentions: number;
    trendingScore?: number;
  };
  riskAssessment: {
    overallRisk: number;
    factors: string[];
    recommendation: string;
  };
  marketInsights: {
    momentum: string;
    volumePattern: string;
    holderDistribution: string;
    projectedGrowth?: string;
  };
  conceptAnalysis?: {
    originality: number;
    marketFit: number;
    timing: number;
    branding: number;
  };
}

export function TokenSummary({ token, open, onClose }: TokenSummaryProps) {
  const [analysis, setAnalysis] = useState<TokenAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token && open) {
      fetchTokenAnalysis();
    }
  }, [token, open]);

  const fetchTokenAnalysis = async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(buildApiUrl(`/api/tokens/${token.address}/analysis`));
      if (!response.ok) {
        throw new Error('Failed to fetch token analysis');
      }
      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (score: number) => {
    if (score >= 0.6) return "text-green-500";
    if (score >= 0.3) return "text-yellow-500";
    return "text-red-500";
  };

  const getRiskColor = (risk: number) => {
    if (risk <= 30) return "text-green-500";
    if (risk <= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-blue-500";
    if (score >= 40) return "text-yellow-500";
    if (score >= 20) return "text-orange-500";
    return "text-red-500";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="text-xl">{token?.name}</span>
              <Badge variant="outline">{token?.symbol}</Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              asChild
            >
              <a
                href={`https://solscan.io/token/${token?.address}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Analyzing token with AI...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={fetchTokenAnalysis} variant="outline">
              Try Again
            </Button>
          </div>
        )}

        {analysis && !loading && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-sm text-muted-foreground">Created</div>
                  <div className="text-lg font-semibold">
                    {token?.createdAt ? formatInTimeZone(new Date(token.createdAt), 'America/New_York', 'MMM dd, HH:mm') + ' ET' : 'Unknown'}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-sm text-muted-foreground">Risk Score</div>
                  <div className="text-lg font-semibold">
                    <Badge variant={token?.metrics?.riskScore ? (token.metrics.riskScore <= 3 ? 'default' : token.metrics.riskScore <= 6 ? 'secondary' : 'destructive') : 'outline'}>
                      {token?.metrics?.riskScore ? `${token.metrics.riskScore}/10` : 'N/A'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pump.fun Chart Link */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Activity className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Live Trading Chart</h3>
                </div>
                
                <div className="text-center space-y-4">
                  <p className="text-muted-foreground">
                    View live price chart and trading activity for {token?.name}
                  </p>
                  
                  <Button 
                    className="rounded-full px-6 py-2 flex items-center gap-2" 
                    asChild
                    data-testid={`button-open-pumpfun-${token?.address}`}
                  >
                    <a 
                      href={`https://pump.fun/coin/${token?.address}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      aria-label={`Open ${token?.name} on Pump.fun`}
                    >
                      <Activity className="h-4 w-4" />
                      Open on Pump.fun
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                  
                  <div className="text-xs text-muted-foreground">
                    Opens in new tab
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Analysis Score & Thesis */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Brain className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">AI Analysis & Investment Thesis</h3>
                </div>
                
                {/* Overall Score */}
                <div className="text-center mb-6">
                  <div className="text-sm text-muted-foreground mb-2">Overall Investment Score</div>
                  <div className={`text-6xl font-bold ${getScoreColor(analysis.overallScore || 0)}`}>
                    {analysis.overallScore || 0}/100
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Based on concept, social sentiment, and market data
                  </div>
                </div>

                {/* Investment Thesis */}
                {analysis.thesis && (
                  <div className="bg-muted/50 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold mb-2">ChatGPT Investment Thesis</h4>
                    <p className="text-sm leading-relaxed">{analysis.thesis}</p>
                  </div>
                )}

                {/* Concept Analysis from ChatGPT */}
                {analysis.conceptAnalysis && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold mb-3 flex items-center text-black">
                      <Brain className="h-4 w-4 mr-2" />
                      ChatGPT Concept Analysis
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Originality</div>
                        <div className="text-lg font-bold text-blue-600">{analysis.conceptAnalysis.originality}/100</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Market Fit</div>
                        <div className="text-lg font-bold text-green-600">{analysis.conceptAnalysis.marketFit}/100</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Timing</div>
                        <div className="text-lg font-bold text-purple-600">{analysis.conceptAnalysis.timing}/100</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Branding</div>
                        <div className="text-lg font-bold text-orange-600">{analysis.conceptAnalysis.branding}/100</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Sentiment</div>
                    <div className={`text-xl font-bold ${getSentimentColor(analysis.sentiment.score)}`}>
                      {analysis.sentiment.label}
                    </div>
                    <div className="text-xs">Score: {Math.round(analysis.sentiment.score * 100)}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Confidence</div>
                    <div className="text-xl font-bold">
                      {Math.round(analysis.sentiment.confidence * 100)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Risk Level</div>
                    <div className={`text-xl font-bold ${getRiskColor(analysis.riskAssessment.overallRisk)}`}>
                      {analysis.riskAssessment.overallRisk}/100
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Twitter Analysis */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Twitter className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Twitter Analysis</h3>
                </div>
                
                {/* Twitter Sentiment Summary */}
                <div className="bg-twitter-50 dark:bg-twitter-900/20 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold mb-2 flex items-center">
                    <Twitter className="h-4 w-4 mr-2" />
                    Twitter Sentiment Summary
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Based on {analysis.socialMetrics.mentions} recent tweets, sentiment is <strong>{analysis.sentiment.label}</strong> with {analysis.socialMetrics.influencerMentions} high-engagement mentions from potential influencers.
                  </p>
                </div>

                {/* Twitter Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Total Mentions</div>
                    <div className="text-xl font-semibold">{analysis.socialMetrics.mentions}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Engagement Score</div>
                    <div className="text-xl font-semibold">{analysis.socialMetrics.engagement}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Influencer Mentions</div>
                    <div className="text-xl font-semibold">{analysis.socialMetrics.influencerMentions}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Trending Score</div>
                    <div className="text-xl font-semibold">{analysis.socialMetrics.trendingScore || 0}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Risk Assessment */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <TrendingUp className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Risk Assessment</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Risk Factors</div>
                    <div className="flex flex-wrap gap-2">
                      {analysis.riskAssessment.factors.map((factor, index) => (
                        <Badge key={index} variant="outline">{factor}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Recommendation</div>
                    <p className="text-sm">{analysis.riskAssessment.recommendation}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ChatGPT Market Insights */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Users className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">ChatGPT Market Insights</h3>
                </div>
                
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold mb-2 flex items-center text-black">
                    <Brain className="h-4 w-4 mr-2" />
                    AI Market Analysis Summary
                  </h4>
                  {analysis.marketInsights.projectedGrowth && (
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Growth Projection:</strong> {analysis.marketInsights.projectedGrowth}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-muted-foreground">Momentum: </span>
                      <span className="text-sm font-medium">{analysis.marketInsights.momentum}</span>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Volume Pattern: </span>
                      <span className="text-sm font-medium">{analysis.marketInsights.volumePattern}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-muted-foreground">Holder Distribution: </span>
                      <span className="text-sm font-medium">{analysis.marketInsights.holderDistribution}</span>
                    </div>
                    {analysis.marketInsights.projectedGrowth && (
                      <div>
                        <span className="text-sm text-muted-foreground">Growth Outlook: </span>
                        <span className="text-sm font-medium">{analysis.marketInsights.projectedGrowth}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}