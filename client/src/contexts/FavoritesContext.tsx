import { createContext, useContext, useState, useEffect } from "react";

export interface FavoriteToken {
  mint: string;
  category: 'new' | 'migrated' | 'trending';
  name?: string;
  symbol?: string;
  image?: string;
  marketCap?: number;
  pool?: string;
}

interface FavoritesContextType {
  favorites: string[];
  categorizedFavorites: FavoriteToken[];
  addToFavorites: (tokenAddress: string) => void;
  addToCategorizedFavorites: (token: FavoriteToken) => void;
  removeFromFavorites: (tokenAddress: string) => void;
  removeFromCategorizedFavorites: (tokenAddress: string) => void;
  isFavorite: (tokenAddress: string) => boolean;
  toggleFavorite: (tokenAddress: string) => void;
  toggleCategorizedFavorite: (token: FavoriteToken) => void;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [categorizedFavorites, setCategorizedFavorites] = useState<FavoriteToken[]>([]);

  // Load favorites from localStorage on mount
  useEffect(() => {
    const storedFavorites = localStorage.getItem('memeter-favorites');
    if (storedFavorites) {
      try {
        const parsed = JSON.parse(storedFavorites);
        setFavorites(Array.isArray(parsed) ? parsed : []);
      } catch (error) {
        console.warn('Failed to parse stored favorites:', error);
        setFavorites([]);
      }
    }

    const storedCategorizedFavorites = localStorage.getItem('memeter-categorized-favorites');
    if (storedCategorizedFavorites) {
      try {
        const parsed = JSON.parse(storedCategorizedFavorites);
        setCategorizedFavorites(Array.isArray(parsed) ? parsed : []);
      } catch (error) {
        console.warn('Failed to parse stored categorized favorites:', error);
        setCategorizedFavorites([]);
      }
    }
  }, []);

  // Save favorites to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('memeter-favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('memeter-categorized-favorites', JSON.stringify(categorizedFavorites));
  }, [categorizedFavorites]);

  const addToFavorites = (tokenAddress: string) => {
    setFavorites(prev => {
      if (!prev.includes(tokenAddress)) {
        return [...prev, tokenAddress];
      }
      return prev;
    });
  };

  const addToCategorizedFavorites = (token: FavoriteToken) => {
    setCategorizedFavorites(prev => {
      if (!prev.some(fav => fav.mint === token.mint)) {
        return [...prev, token];
      }
      return prev;
    });
  };

  const removeFromFavorites = (tokenAddress: string) => {
    setFavorites(prev => prev.filter(addr => addr !== tokenAddress));
  };

  const removeFromCategorizedFavorites = (tokenAddress: string) => {
    setCategorizedFavorites(prev => prev.filter(token => token.mint !== tokenAddress));
  };

  const isFavorite = (tokenAddress: string) => {
    return favorites.includes(tokenAddress) || categorizedFavorites.some(token => token.mint === tokenAddress);
  };

  const toggleFavorite = (tokenAddress: string) => {
    if (isFavorite(tokenAddress)) {
      removeFromFavorites(tokenAddress);
      removeFromCategorizedFavorites(tokenAddress);
    } else {
      addToFavorites(tokenAddress);
    }
  };

  const toggleCategorizedFavorite = (token: FavoriteToken) => {
    const isCurrentlyFavorite = categorizedFavorites.some(fav => fav.mint === token.mint);
    if (isCurrentlyFavorite) {
      removeFromCategorizedFavorites(token.mint);
      removeFromFavorites(token.mint);
    } else {
      addToCategorizedFavorites(token);
      addToFavorites(token.mint);
    }
  };

  return (
    <FavoritesContext.Provider value={{
      favorites,
      categorizedFavorites,
      addToFavorites,
      addToCategorizedFavorites,
      removeFromFavorites,
      removeFromCategorizedFavorites,
      isFavorite,
      toggleFavorite,
      toggleCategorizedFavorite
    }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}