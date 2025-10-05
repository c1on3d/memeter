import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { usePhantomWallet } from "@/hooks/usePhantomWallet";
import { 
  Wallet, 
  Moon, 
  Sun, 
  ArrowRight,
  Shield,
  Activity,
  TrendingUp,
  Zap,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  BarChart3
} from "lucide-react";
import { SiX, SiSolana } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/ThemeContext";

export default function Landing() {
  const [, setLocation] = useLocation();
  const [isConnecting, setIsConnecting] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);

  const { publicKey, connected, connect, disconnect, isPhantomInstalled } = usePhantomWallet();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();

  // Redirect to dashboard if already connected (optional - user can still access without wallet)
  useEffect(() => {
    console.log('Landing page - Wallet state:', { connected, publicKey: publicKey?.slice(0, 8) + '...' });
    if (connected && publicKey) {
      console.log('Redirecting to dashboard...');
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
      toast({
        title: "Welcome to MEMETER!",
        description: "Successfully connected to your Phantom wallet.",
      });
      // Immediate redirect after successful connection
      console.log('Connection successful, redirecting to dashboard...');
      setTimeout(() => {
        console.log('Executing redirect to dashboard');
        setLocation('/dashboard');
      }, 300); // Small delay to show the success toast
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
                onClick={toggleTheme}
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                className="hover:scale-105 hover:shadow-md transition-all duration-200 hover:bg-yellow-500/10 hover:text-yellow-500 hover:border-yellow-500/20"
              >
                {theme === 'light' ? (
                  <Moon className="h-4 w-4 transition-transform duration-200 hover:scale-110 hover:rotate-12" />
                ) : (
                  <Sun className="h-4 w-4 transition-transform duration-200 hover:scale-110 hover:rotate-45" />
                )}
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
              {/* Logo - Memeter logo SVG - Maximizing space */}
              <div className="relative w-80 h-80 mx-auto mb-6">
                <img 
                  src="/memeter-logo.svg" 
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

            {/* Connection Status */}
            <Card className="max-w-md mx-auto mb-8 border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-blue-600/10">
              <CardContent className="p-8">
                <div className="flex items-center justify-center mb-6">
                  <Wallet className="h-12 w-12 text-blue-500" />
                </div>
                
                {!isPhantomInstalled ? (
                  <div className="text-center space-y-4">
                    <AlertCircle className="h-8 w-8 text-orange-500 mx-auto" />
                    <h3 className="text-lg font-semibold">Phantom Wallet Required</h3>
                    <p className="text-sm text-muted-foreground">
                      Install Phantom wallet to access MEMETER's advanced analytics
                    </p>
                    <Button 
                      onClick={() => window.open("https://phantom.app/", "_blank")}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Install Phantom Wallet
                    </Button>
                  </div>
                ) : connected ? (
                  <div className="text-center space-y-4">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto" />
                    <h3 className="text-lg font-semibold">Wallet Connected</h3>
                    <p className="text-sm text-muted-foreground">
                      {publicKey?.slice(0, 8)}...{publicKey?.slice(-8)}
                    </p>
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin h-4 w-4 border-2 border-green-500 border-t-transparent rounded-full"></div>
                      <span className="text-sm text-muted-foreground">Redirecting to dashboard...</span>
                    </div>
                    <Button 
                      onClick={() => setLocation('/dashboard')}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Enter Dashboard Now
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <h3 className="text-lg font-semibold">Connect Your Wallet</h3>
                    <p className="text-sm text-muted-foreground">
                      Connect your Phantom wallet to access the platform
                    </p>
                    <Button 
                      onClick={handleConnect}
                      disabled={isConnecting}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-sm px-4 py-2"
                    >
                      {isConnecting ? (
                        <>
                          <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Wallet className="h-3 w-3 mr-2" />
                          Connect Wallet
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Direct Dashboard Access */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Button
                variant="outline"
                onClick={() => setShowFeatures(!showFeatures)}
                className="px-6 py-2"
              >
                {showFeatures ? 'Hide Features' : 'Explore Features'}
              </Button>
              <Button
                asChild
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-6 py-2"
              >
                <Link href="/dashboard">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Continue to Dashboard
                </Link>
              </Button>
            </div>
          </div>

          {/* Features Section */}
          {showFeatures && (
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
          )}

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
