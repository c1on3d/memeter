import { useEffect, useRef } from 'react';

interface TradingViewChartProps {
  symbol?: string;
  width?: string | number;
  height?: string | number;
  theme?: 'light' | 'dark';
  chartType?: 'chart' | 'overview' | 'screener' | 'market-overview' | 'crypto-mkt-screener';
  locale?: string;
  autosize?: boolean;
}

export function TradingViewChart({
  symbol = 'CRYPTOCAP:SOL',
  width = '100%',
  height = 400,
  theme = 'dark',
  chartType = 'chart',
  locale = 'en',
  autosize = true
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear any existing widgets
    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;

    const config = {
      autosize: autosize,
      width: autosize ? undefined : width,
      height: autosize ? undefined : height,
      symbol: symbol,
      interval: '15',
      timezone: 'Etc/UTC',
      theme: theme,
      style: '1',
      locale: locale,
      toolbar_bg: '#f1f3f6',
      enable_publishing: false,
      allow_symbol_change: true,
      container_id: `tradingview_${Math.random().toString(36).substr(2, 9)}`
    };

    script.innerHTML = JSON.stringify(config);
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol, width, height, theme, chartType, locale, autosize]);

  return (
    <div 
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ 
        width: autosize ? '100%' : width, 
        height: autosize ? '100%' : height,
        minHeight: '400px'
      }}
    >
      <div className="tradingview-widget-container__widget"></div>
    </div>
  );
}

// Crypto Market Overview Widget
export function TradingViewCryptoOverview({
  width = '100%',
  height = 400,
  theme = 'dark'
}: Omit<TradingViewChartProps, 'symbol' | 'chartType'>) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-crypto-mkt-screener.js';
    script.type = 'text/javascript';
    script.async = true;

    const config = {
      width: width,
      height: height,
      defaultColumn: "overview",
      screener_type: "crypto_mkt",
      displayCurrency: "USD",
      colorTheme: theme,
      locale: "en",
      isTransparent: false
    };

    script.innerHTML = JSON.stringify(config);
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [width, height, theme]);

  return (
    <div ref={containerRef} className="tradingview-widget-container">
      <div className="tradingview-widget-container__widget"></div>
    </div>
  );
}

// Mini Chart Widget for token rows
export function TradingViewMiniChart({
  symbol = 'CRYPTOCAP:SOL',
  width = 300,
  height = 70,
  theme = 'dark'
}: Pick<TradingViewChartProps, 'symbol' | 'width' | 'height' | 'theme'>) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
    script.type = 'text/javascript';
    script.async = true;

    const config = {
      symbol: symbol,
      width: width,
      height: height,
      locale: "en",
      dateRange: "1D",
      colorTheme: theme,
      isTransparent: false,
      autosize: false,
      largeChartUrl: ""
    };

    script.innerHTML = JSON.stringify(config);
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol, width, height, theme]);

  return (
    <div ref={containerRef} className="tradingview-widget-container inline-block">
      <div className="tradingview-widget-container__widget"></div>
    </div>
  );
}

// Market Data Widget
export function TradingViewMarketData({
  width = '100%',
  height = 400,
  theme = 'dark'
}: Omit<TradingViewChartProps, 'symbol' | 'chartType'>) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js';
    script.type = 'text/javascript';
    script.async = true;

    const config = {
      colorTheme: theme,
      dateRange: "1D",
      showChart: true,
      locale: "en",
      width: width,
      height: height,
      largeChartUrl: "",
      isTransparent: false,
      showSymbolLogo: true,
      showFloatingTooltip: false,
      plotLineColorGrowing: "rgba(41, 98, 255, 1)",
      plotLineColorFalling: "rgba(41, 98, 255, 1)",
      gridLineColor: "rgba(240, 243, 250, 0)",
      scaleFontColor: "rgba(120, 123, 134, 1)",
      belowLineFillColorGrowing: "rgba(41, 98, 255, 0.12)",
      belowLineFillColorFalling: "rgba(41, 98, 255, 0.12)",
      belowLineFillColorGrowingBottom: "rgba(41, 98, 255, 0)",
      belowLineFillColorFallingBottom: "rgba(41, 98, 255, 0)",
      symbolActiveColor: "rgba(41, 98, 255, 0.12)",
      tabs: [
        {
          title: "Crypto",
          symbols: [
            { s: "CRYPTOCAP:BTC", d: "Bitcoin" },
            { s: "CRYPTOCAP:ETH", d: "Ethereum" },
            { s: "CRYPTOCAP:SOL", d: "Solana" },
            { s: "COINBASE:DOGEUSDT", d: "Dogecoin" },
            { s: "BINANCE:ADAUSDT", d: "Cardano" }
          ],
          originalTitle: "Crypto"
        }
      ]
    };

    script.innerHTML = JSON.stringify(config);
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [width, height, theme]);

  return (
    <div ref={containerRef} className="tradingview-widget-container">
      <div className="tradingview-widget-container__widget"></div>
    </div>
  );
}