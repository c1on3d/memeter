import { createContext, useContext, useState, useEffect } from "react";

interface HiddenTokensContextType {
  hiddenTokens: string[];
  hideToken: (tokenAddress: string) => void;
  unhideToken: (tokenAddress: string) => void;
  isHidden: (tokenAddress: string) => boolean;
  toggleHidden: (tokenAddress: string) => void;
}

const HiddenTokensContext = createContext<HiddenTokensContextType | undefined>(undefined);

export function HiddenTokensProvider({ children }: { children: React.ReactNode }) {
  const [hiddenTokens, setHiddenTokens] = useState<string[]>([]);

  // Load hidden tokens from localStorage on mount
  useEffect(() => {
    const storedHidden = localStorage.getItem('memeter-hidden-tokens');
    if (storedHidden) {
      try {
        const parsed = JSON.parse(storedHidden);
        setHiddenTokens(Array.isArray(parsed) ? parsed : []);
      } catch (error) {
        console.warn('Failed to parse stored hidden tokens:', error);
        setHiddenTokens([]);
      }
    }
  }, []);

  // Save hidden tokens to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('memeter-hidden-tokens', JSON.stringify(hiddenTokens));
  }, [hiddenTokens]);

  const hideToken = (tokenAddress: string) => {
    setHiddenTokens(prev => {
      if (!prev.includes(tokenAddress)) {
        return [...prev, tokenAddress];
      }
      return prev;
    });
  };

  const unhideToken = (tokenAddress: string) => {
    setHiddenTokens(prev => prev.filter(addr => addr !== tokenAddress));
  };

  const isHidden = (tokenAddress: string) => {
    return hiddenTokens.includes(tokenAddress);
  };

  const toggleHidden = (tokenAddress: string) => {
    if (isHidden(tokenAddress)) {
      unhideToken(tokenAddress);
    } else {
      hideToken(tokenAddress);
    }
  };

  return (
    <HiddenTokensContext.Provider value={{
      hiddenTokens,
      hideToken,
      unhideToken,
      isHidden,
      toggleHidden
    }}>
      {children}
    </HiddenTokensContext.Provider>
  );
}

export function useHiddenTokens() {
  const context = useContext(HiddenTokensContext);
  if (context === undefined) {
    throw new Error('useHiddenTokens must be used within a HiddenTokensProvider');
  }
  return context;
}