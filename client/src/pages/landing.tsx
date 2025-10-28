import { useLocation } from "wouter";
import { 
  Shield,
  Activity,
  TrendingUp,
  Zap,
  ExternalLink
} from "lucide-react";
import { SiX } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Landing() {
  const [, setLocation] = useLocation();

  const handleEnter = () => {
    localStorage.setItem('memeter_authenticated', 'true');
    setLocation('/dashboard');
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
      icon: <Shield className="h-8 w-8 text-purple-500" />,
      title: "Advanced Risk Score",
      description: "AI-powered risk assessment and detailed summary for every token."
    },
    {
      icon: <Zap className="h-8 w-8 text-orange-500" />,
      title: "Tracked KOL Wallets",
      description: "Monitor key opinion leader wallets and their trading activity in real-time."
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white">

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <img 
              src="/memeter-logo.png" 
              alt="Memeter Logo" 
              className="w-96 h-96 mx-auto object-contain"
            />
          </div>
          
          <p className="text-2xl text-white mb-8 font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Real-time Token Risk Analysis & Summary Tool
          </p>
          
          <p className="text-lg text-white mb-12 max-w-2xl mx-auto" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Advanced AI-powered risk scoring and comprehensive token analysis for smarter trading decisions.
          </p>

          <Button
            onClick={handleEnter}
            size="lg"
            className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-6 text-lg font-bold rounded-xl shadow-2xl hover:shadow-orange-500/50 transition-all duration-300 hover:scale-105"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            Enter Dashboard
            <ExternalLink className="ml-2 h-5 w-5" />
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-20 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <Card key={index} className="bg-black border-white/10 hover:border-purple-500/50 transition-all duration-300 hover:scale-105">
              <CardContent className="p-6 text-center">
                <div className="flex justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold mb-2 text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {feature.title}
                </h3>
                <p className="text-sm text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 mt-20 bg-black">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-8">
            {/* Product */}
            <div>
              <h3 className="text-white font-bold mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>Product</h3>
              <ul className="space-y-2">
                <li><a href="/dashboard" className="text-white hover:text-white transition-colors">Dashboard</a></li>
                <li><a href="#" className="text-white hover:text-white transition-colors">Screener</a></li>
                <li><a href="/agent" className="text-white hover:text-white transition-colors">Agent</a></li>
                <li><a href="#" className="text-white hover:text-white transition-colors">Documentation</a></li>
              </ul>
            </div>

            {/* Community */}
            <div>
              <h3 className="text-white font-bold mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>Community</h3>
              <ul className="space-y-2">
                <li>
                  <a 
                    href="https://x.com/Memeterdotfun" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-white hover:text-white transition-colors flex items-center"
                  >
                    <SiX className="h-3 w-3 mr-2" />
                    X / Twitter
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-white font-bold mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>Legal</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-white hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-white hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-white hover:text-white transition-colors">Risk Disclaimer</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 text-center">
            <p className="text-white">© 2025 Memeter</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

