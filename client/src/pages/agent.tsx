import { useState } from "react";
import { Link } from "wouter";
import { Bot, Send, Sparkles, TrendingUp, Search, BarChart3, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useTheme } from "@/contexts/ThemeContext";

export default function Agent() {
  const { theme } = useTheme();
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'agent'; content: string }>>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    // Simulate AI response (replace with actual API call later)
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'agent', 
        content: 'AI Agent is coming soon! This will analyze tokens, provide insights, and help you find alpha.' 
      }]);
      setIsLoading(false);
    }, 1000);
  };

  const quickActions = [
    { icon: TrendingUp, label: "Find trending tokens", query: "Show me trending tokens" },
    { icon: Search, label: "Analyze token", query: "Analyze this token for me" },
    { icon: BarChart3, label: "Market overview", query: "Give me a market overview" },
    { icon: Sparkles, label: "Find gems", query: "Find potential gems" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-black sticky top-0 z-50 border-b border-border/20">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <Bot className="h-6 w-6 text-purple-500" />
                <h1 className="text-xl font-bold">Memeter AI Agent</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {messages.length === 0 ? (
          // Welcome Screen
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-500/10 mb-4">
                <Bot className="h-10 w-10 text-purple-500" />
              </div>
              <h2 className="text-3xl font-bold">AI-Powered Token Analysis</h2>
              <p className="text-muted-foreground max-w-md">
                Ask me anything about tokens, market trends, or get personalized insights to find your next alpha.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
              {quickActions.map((action, index) => (
                <Card 
                  key={index}
                  className="cursor-pointer hover:bg-accent/50 transition-colors border-border/20"
                  onClick={() => setInput(action.query)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-purple-500/10">
                        <action.icon className="h-5 w-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="font-medium">{action.label}</p>
                        <p className="text-xs text-muted-foreground">{action.query}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          // Chat Messages
          <div className="space-y-4 mb-24">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-purple-500 text-white'
                      : 'bg-card border border-border/20'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {message.role === 'agent' && (
                      <Bot className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-card border border-border/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Bot className="h-5 w-5 text-purple-500" />
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input Area */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border/20 p-4">
          <div className="container mx-auto max-w-4xl">
            <div className="flex items-center space-x-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask me anything about tokens..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="bg-purple-500 hover:bg-purple-600"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              AI Agent is in development. Coming soon!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
