import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { usePhantomWallet } from "@/hooks/usePhantomWallet";
import { 
  Wallet, 
  Shield,
  Activity,
  TrendingUp,
  Zap,
  CheckCircle,
  ExternalLink
} from "lucide-react";
import { SiX } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Landing() {
  const [, setLocation] = useLocation();
  const [isConnecting, setIsConnecting] = useState(false);

  const { publicKey, connected, connect, isPhantomInstalled } = usePhantomWallet();
  const { toast } = useToast();

  // Redirect to dashboard if already connected
  useEffect(() => {
    if (connected && publicKey) {
      localStorage.setItem('memeter_authenticated', 'true');
      setLocation('/dashboard');
    }
  }, [connected, publicKey, setLocation]);

  const handleConnect = async () => {
    if (!isPhantomInstalled) {
      toast({
        title: "Phantom Wallet Required",
        description: "Please install the Phantom wallet extension to access MEMETER.",
        variant: "destructive",
      });
      window.open("https://phantom.app/", "_blank");
      return;
    }

    setIsConnecting(true);
    
    try {
      await connect();
      localStorage.setItem('memeter_authenticated', 'true');
      toast({
        title: "Welcome to MEMETER!",
        description: "Successfully connected to your Phantom wallet.",
      });
      setTimeout(() => {
        setLocation('/dashboard');
      }, 300);
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect wallet",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const features = [
    {
      icon: <Activity className="h-8 w-8 text-blue-500" />,
      title: "Live Token Tracking",
      description: "Monitor real-time token creation and migration events across the Solana ecosystem."
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-green-500" />,
      title: "Advanced Analytics",
      description: "Comprehensive metrics, risk analysis, and migration threshold tracking."
    },
    {
      icon: <Zap className="h-8 w-8 text-purple-500" />,
      title: "Smart Alerts",
      description: "Get notified when tokens are ready to migrate or reach important milestones."
    },
    {
      icon: <Shield className="h-8 w-8 text-orange-500" />,
      title: "Secure & Private",
      description: "Your wallet connection is secure. We never store your private keys."
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-black sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
            </div>
            
            <div className="flex items-center space-x-4">
              <Button 
                variant="secondary" 
                size="sm" 
                asChild
                title="View Documentation"
                className="hover:scale-105 hover:shadow-md transition-all duration-200 hover:bg-blue-500/10 hover:text-blue-500 hover:border-blue-500/20"
              >
                <a
                  href="https://docs.memeter.fun"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 transition-transform duration-200 hover:scale-110 hover:rotate-6" />
                </a>
              </Button>

              <Button 
                variant="secondary" 
                size="sm" 
                asChild
                title="Follow us on X/Twitter"
                className="hover:scale-105 hover:shadow-md transition-all duration-200 hover:bg-black/10 hover:text-black dark:hover:bg-white/10 dark:hover:text-white hover:border-gray-500/20"
              >
                <a
                  href="https://x.com/Memeterdotfun"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <SiX className="h-4 w-4 transition-transform duration-200 hover:scale-110 hover:rotate-6" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="mb-8">
              {/* Logo - Memeter logo PNG - Maximizing space */}
              <div className="relative w-80 h-80 mx-auto mb-6">
                <img 
                  src="/memeter-logo.png" 
                  alt="Memeter Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-xl md:text-2xl text-white mb-4">
                The Ultimate Solana Token Analytics Platform
              </p>
              <p className="text-lg text-white/80 max-w-3xl mx-auto mb-8">
                Track, analyze, and monitor token creation events, migration patterns, and market dynamics across the Solana ecosystem in real-time.
              </p>
            </div>

            {/* Wallet Connect Button */}
            <div className="mb-8">
              {!isPhantomInstalled ? (
                <Button 
                  onClick={() => window.open("https://phantom.app/", "_blank")}
                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 px-8 py-6 text-lg"
                >
                  <ExternalLink className="h-5 w-5 mr-2" />
                  Install Phantom Wallet
                </Button>
              ) : connected ? (
                <div className="flex items-center justify-center space-x-2 text-green-500">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-lg">Connected: {publicKey?.slice(0, 4)}...{publicKey?.slice(-4)}</span>
                </div>
              ) : (
                <Button 
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 px-8 py-6 text-lg"
                >
                  {isConnecting ? (
                    <>
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Wallet className="h-5 w-5 mr-2" />
                      Connect Wallet to Access Dashboard
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Features Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {features.map((feature, index) => (
              <Card key={index} className="border-border hover:border-purple-500/20 transition-all duration-300 hover:shadow-lg hover:scale-105">
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-blue-600/10">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2">Live</div>
                <div className="text-sm text-muted-foreground">Real-time Token Tracking</div>
              </CardContent>
            </Card>
            
            <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-green-600/10">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">Secure</div>
                <div className="text-sm text-muted-foreground">Phantom Wallet Integration</div>
              </CardContent>
            </Card>
            
            <Card className="border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-orange-600/10">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-orange-400 mb-2">Advanced</div>
                <div className="text-sm text-muted-foreground">Analytics & Insights</div>
              </CardContent>
            </Card>
          </div>

          {/* Footer */}
          <div className="text-center text-muted-foreground">
            <p className="mb-2">
              Powered by <span className="text-blue-500 font-semibold">Solana</span> • 
              Secured by <span className="text-green-500 font-semibold">Phantom</span>
            </p>
            <p className="text-sm">
              Connect your wallet to start monitoring the Solana ecosystem
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
