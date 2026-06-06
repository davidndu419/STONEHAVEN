import { useEffect, useRef } from "react";

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

  useEffect(() => {
    if (!container.current) return;
    container.current.innerHTML = "";
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
    });
    container.current.appendChild(script);
  }, [symbol]);

  return <div ref={container} className="tradingview-widget-container h-[390px] overflow-hidden rounded-2xl bg-navy" />;
}
