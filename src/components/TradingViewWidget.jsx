import { useEffect, useRef, useState } from "react";

export function TradingViewTicker() {
  const items = ["BTC $67,420 ▲ 2.4%", "AAPL $189.23 ▲ 0.8%", "ETH $3,241 ▲ 1.7%", "NVDA $121.00 ▲ 3.1%", "SOL $146.22 ▲ 2.0%"];
  return (
    <div className="ticker-mask overflow-hidden border-b border-white/10 bg-[#09101f] py-2.5 text-[11px] font-semibold tracking-wider text-white/80">
      <div className="ticker-track flex gap-12">
        {[...items, ...items].map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}
      </div>
    </div>
  );
}

export function TradingViewChart({ symbol = "NASDAQ:AAPL" }) {
  const container = useRef(null);
  const containerId = useRef(`tv-chart-${Math.random().toString(36).slice(2, 9)}`);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!symbol) return;
    const currentContainer = container.current;
    if (!currentContainer) return;

    // Clear previous widget/scripts
    currentContainer.innerHTML = "";
    setError(false);

    try {
      const widgetContainer = document.createElement("div");
      widgetContainer.id = containerId.current;
      widgetContainer.style.height = "100%";
      widgetContainer.style.width = "100%";
      currentContainer.appendChild(widgetContainer);

      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
      script.type = "text/javascript";
      script.async = true;
      script.innerHTML = JSON.stringify({
        autosize: true,
        symbol,
        interval: "D",
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        backgroundColor: "rgba(15, 23, 42, 1)",
        gridColor: "rgba(200, 165, 90, 0.08)",
        hide_top_toolbar: false,
        allow_symbol_change: true,
        save_image: false,
        container_id: containerId.current,
      });

      script.onerror = () => {
        setError(true);
      };

      widgetContainer.appendChild(script);
    } catch (err) {
      console.error("TradingView widget initialization failed:", err);
      setError(true);
    }

    return () => {
      if (currentContainer) {
        currentContainer.innerHTML = "";
      }
    };
  }, [symbol]);

  if (error || !symbol) {
    return (
      <div className="flex h-[390px] flex-col items-center justify-center rounded-2xl bg-navy p-6 text-center text-white">
        <p className="text-sm font-semibold text-slate-400">Failed to load live chart</p>
        <p className="mt-1 text-xs text-slate-500">Please check your connection or try again later.</p>
      </div>
    );
  }

  return (
    <div 
      ref={container} 
      className="tradingview-widget-container h-[390px] overflow-hidden rounded-2xl bg-navy" 
    />
  );
}
