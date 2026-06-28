"use client";

import { useEffect, useRef } from "react";

interface StockChartProps {
  ticker: string;
  resolvedName: string;
}

export function StockChart({ ticker, resolvedName }: StockChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !ticker) return;

    // Clear any previous widget
    el.innerHTML = "";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = "100%";
    widgetDiv.style.width = "100%";
    el.appendChild(widgetDiv);

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [[ticker]],
      chartOnly: false,
      width: "100%",
      height: "100%",
      locale: "en",
      colorTheme: "light",
      autosize: true,
      showVolume: false,
      showMA: false,
      hideDateRanges: false,
      hideMarketStatus: false,
      hideSymbolLogo: false,
      scalePosition: "right",
      scaleMode: "Normal",
      fontFamily: "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
      fontSize: "10",
      noTimeScale: false,
      valuesTracking: "1",
      changeMode: "price-and-percent",
      chartType: "area",
      lineWidth: 2,
      lineType: 0,
      dateRanges: ["3m|1D", "12m|1W", "60m|1M", "all|1M"],
    });
    el.appendChild(script);

    return () => { el.innerHTML = ""; };
  }, [ticker]);

  if (!ticker) {
    return null;
  }

  return (
    <div className="flex h-full flex-col rounded-[18px] border-[3px] border-ink bg-white shadow-brutal overflow-hidden">
      {/* Chart header */}
      <div className="flex items-center justify-between border-b-[3px] border-ink px-4 py-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate">Stock Chart</p>
          <p className="mt-0.5 text-base font-black tracking-[-0.03em]">{resolvedName}</p>
        </div>
        <span className="rounded border-2 border-ink bg-ink px-2 py-1 text-[10px] font-black text-white">
          {ticker}
        </span>
      </div>

      {/* TradingView widget */}
      <div
        ref={containerRef}
        className="tradingview-widget-container flex-1"
        style={{ minHeight: 0 }}
      />

      {/* TradingView attribution (required) */}
      <p className="border-t-2 border-[#DCE1E8] px-4 py-2 text-[9px] text-slate text-right">
        Powered by TradingView
      </p>
    </div>
  );
}
