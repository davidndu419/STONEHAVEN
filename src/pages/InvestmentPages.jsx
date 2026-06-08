import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { ArrowRight, BriefcaseBusiness, CheckCircle2, Clock3, Eye, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { dataService } from "../lib/dataService";
import { calculatePlan, createFlashInvestment, createWeeklyInvestment, processInvestmentTimers } from "../lib/investmentEngine";
import { EmptyState, Modal, PageHeader, StatusBadge } from "../components/UI";
import { TradingViewChart } from "../components/TradingViewWidget";
import { FlashCalculator, InvestmentCard, InvestmentDetail, MiniBarChart, money, PlanCalculator, Timeline } from "../components/InvestmentUI";
import { investmentModeLabel } from "../lib/investmentMode";

function AssetMark({ asset, square = false }) {
  return <span className={`grid h-10 w-10 shrink-0 place-items-center overflow-hidden bg-navy font-display text-sm font-bold text-gold ${square ? "rounded-xl" : "rounded-full"}`}>{asset.logoUrl ? <img src={asset.logoUrl} alt="" className="h-full w-full object-cover" /> : asset.ticker?.[0]}</span>;
}

function AssetSelector({ assets, selected, onSelect, square = false }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between"><div><p className="section-kicker">Approved opportunities</p><h2 className="display-title mt-1 text-xl text-navy">Select an asset</h2></div><span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{assets.length} available</span></div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {assets.map((asset) => <button key={asset.id} onClick={() => onSelect(asset)} className={`flex min-w-fit items-center gap-2 rounded-xl border bg-white px-3 py-2.5 text-left shadow-sm transition ${selected?.id === asset.id ? "border-gold bg-gold/[.07] ring-2 ring-gold/15" : "border-slate-200 hover:border-gold/50"}`}><AssetMark asset={asset} square={square} /><span><strong className="block text-sm text-navy">{asset.ticker}</strong><span className="block max-w-28 truncate text-[10px] text-slate-400">{asset.name}</span></span></button>)}
      </div>
    </section>
  );
}

function AssetOverview({ asset, kind, marketOpen, onChart }) {
  const price = asset.referencePrice ? money(asset.referencePrice) : "Market linked";
  const risk = kind === "stock" ? "Moderate" : "Growth";
  const status = kind === "stock" ? (marketOpen ? "Market open" : "Market closed") : "24/7 market";
  return (
    <section className="glass-card overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3"><AssetMark asset={asset} square={kind === "stock"} /><div><p className="font-display text-xl font-bold text-navy">{asset.name}</p><p className="text-xs text-slate-400">{asset.ticker}{asset.sector ? ` · ${asset.sector}` : ""}</p></div></div>
        <button onClick={onChart} className="btn-secondary min-h-10 bg-white px-4 text-navy"><Eye size={15} /> View Live Chart</button>
      </div>
      <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-5">
        {[["Reference price", price], ["Market status", status], ["Risk profile", risk], ["Availability", "Open"], ["Plan style", "Weekly capital"]].map(([label, value]) => <div key={label} className="bg-white p-4"><p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</p><p className="mt-2 text-sm font-bold text-navy">{value}</p></div>)}
      </div>
    </section>
  );
}

function InvestmentProposal({ asset, tier, tiers, duration, onTierChange, onDurationChange, onReview, kind }) {
  const projection = tier ? calculatePlan(tier, duration) : null;
  if (!projection) return null;
  return (
    <div className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
      <section className="glass-card p-5">
        <p className="section-kicker">Investment configuration</p>
        <h2 className="display-title mt-1 text-xl text-navy">Define your commitment</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <div><label className="label">Weekly capital</label><select className="field min-h-11 bg-white" value={tier.weeklyCapital} onChange={(event) => onTierChange(tiers.find((item) => Number(item.weeklyCapital) === Number(event.target.value)))}>{tiers.map((item) => <option key={item.weeklyCapital} value={item.weeklyCapital}>{money(item.weeklyCapital)}</option>)}</select></div>
          <div><label className="label">Duration</label><select className="field min-h-11 bg-white" value={duration} onChange={(event) => onDurationChange(Number(event.target.value))}><option value={2}>2 months · 8 weeks</option><option value={3}>3 months · 13 weeks</option></select></div>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-stone p-3 text-xs leading-5 text-slate-500"><ShieldCheck className="mt-0.5 shrink-0 text-gold" size={16} /> Terms are fixed when the plan is created and remain subject to administrator funding approval.</div>
        {kind === "stock" && asset.whyInvest && <p className="mt-4 line-clamp-3 text-xs leading-5 text-slate-500">{asset.whyInvest}</p>}
      </section>

      <section className="overflow-hidden rounded-2xl bg-navy text-white shadow-heritage">
        <div className="border-b border-white/10 px-5 py-4"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-gold">Investment projection</p><p className="mt-1 text-xs text-white/45">{asset.ticker} · {duration}-month structured plan</p></div>
        <div className="grid grid-cols-2 gap-px bg-white/10">
          <div className="bg-navy p-4"><p className="text-[9px] uppercase tracking-widest text-white/35">Total capital</p><p className="mt-2 font-display text-xl font-bold">{money(projection.totalCapital)}</p></div>
          <div className="bg-navy p-4"><p className="text-[9px] uppercase tracking-widest text-white/35">ROI</p><p className="mt-2 font-display text-xl font-bold">{projection.roi.toFixed(1)}%</p></div>
          <div className="bg-navy p-4"><p className="text-[9px] uppercase tracking-widest text-white/35">Expected profit</p><p className="mt-2 font-display text-2xl font-bold text-gold">{money(projection.netProfit)}</p></div>
          <div className="bg-navy p-4"><p className="text-[9px] uppercase tracking-widest text-white/35">Expected return</p><p className="mt-2 font-display text-3xl font-bold text-gold">{money(projection.projectedReturn)}</p></div>
        </div>
        <div className="p-4"><button onClick={onReview} className="btn-primary w-full py-3.5">Review Investment <ArrowRight size={17} /></button></div>
      </section>
    </div>
  );
}

function StructuredInvestmentPage({ kind, assets, selected, tier, duration, onSelect, onTierChange, onDurationChange, onReview, marketOpen = true }) {
  const [chartOpen, setChartOpen] = useState(false);
  if (!selected) return <EmptyState icon={TrendingUp} title={`No ${kind} opportunities available`} text="Your advisor has not published an active investment opportunity yet." />;
  const tiers = selected.tiers.filter((item) => item.active);
  return (
    <div className="space-y-4">
      <AssetSelector assets={assets} selected={selected} onSelect={onSelect} square={kind === "stock"} />
      <AssetOverview asset={selected} kind={kind} marketOpen={marketOpen} onChart={() => setChartOpen(true)} />
      <InvestmentProposal asset={selected} kind={kind} tier={tier} tiers={tiers} duration={duration} onTierChange={onTierChange} onDurationChange={onDurationChange} onReview={onReview} />
      <Modal open={chartOpen} onClose={() => setChartOpen(false)} title={`${selected.name} Market Analysis`} wide><TradingViewChart symbol={selected.tradingViewSymbol} /></Modal>
    </div>
  );
}

function useLibrary(name, adminId) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  useEffect(() => { 
    dataService.list(name, adminId)
      .then((result) => {
        setItems(result.filter((item) => item.active));
        setError(null);
      })
      .catch((err) => {
        console.error(`Failed to load ${name} library:`, err);
        setError(`Insufficient permissions to access the ${name} library.`);
      });
  }, [name, adminId]);
  return { items, error };
}

function beginDeposit(navigate, investment, amount) {
  void amount;
  navigate(`/dashboard/fund-investment?investment=${investment.id}`);
}

export function InvestmentsPage() {
  const { activeInvestmentMode } = useOutletContext();
  if (activeInvestmentMode === "flash") return <FlashInvestmentPage />;
  if (activeInvestmentMode === "stock") return <StockInvestmentPage />;
  return <CryptoInvestmentPage />;
}

export function FlashInvestmentPage() {
  const { user } = useAuth(); 
  const navigate = useNavigate(); 
  const [settings, setSettings] = useState(null); 
  const [tiers, setTiers] = useState([]); 
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { 
    Promise.all([
      dataService.list("flashSettings", user.adminId), 
      dataService.list("flashTiers", user.adminId)
    ])
      .then(([config, tierItems]) => { 
        setSettings(config[0]); 
        const active = tierItems.filter((item) => item.active); 
        setTiers(active); 
        setSelected(active[0]); 
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to load flash configuration:", err);
        setError("Insufficient permissions to access flash investment configurations.");
      }); 
  }, [user.adminId]);

  async function invest() { 
    const investment = await createFlashInvestment({ user, settings, tier: selected }); 
    beginDeposit(navigate, investment, selected.capital); 
  }

  if (error) {
    return (
      <div>
        <PageHeader eyebrow="Short horizon" title="Flash Investment" description="One deposit, a fixed maturity window, and a return credited only when the countdown completes." />
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  if (!settings?.active) return <EmptyState icon={Clock3} title="Flash investment is currently unavailable" text="Your advisor will announce when new flash opportunities become available." />;
  return <div><PageHeader eyebrow="Short horizon" title={settings.name || "Flash Investment"} description="One deposit, a fixed maturity window, and a return credited only when the countdown completes." /><div className="grid gap-6 xl:grid-cols-[1fr_.8fr]"><div className="glass-card overflow-hidden"><div className="bg-navy p-7 text-white"><Sparkles className="text-gold" /><h2 className="display-title mt-6 text-3xl">Select a flash tier</h2><p className="mt-2 text-sm text-white/45">Each approved plan keeps its original capital, return, and duration.</p></div><div className="table-scroll overflow-x-auto"><table className="w-full"><thead><tr className="text-left text-[10px] uppercase tracking-widest text-slate-400"><th className="px-6 py-4">Capital</th><th>Return after {settings.durationHours} hours</th><th /></tr></thead><tbody>{tiers.map((tier) => <tr key={tier.id} className={`border-t border-slate-100 ${selected?.id === tier.id ? "bg-gold/[.06]" : ""}`}><td className="px-6 py-5 font-bold text-navy">{money(tier.capital)}</td><td className="font-bold text-forest">{money(tier.returnAmount)}</td><td className="pr-6 text-right"><button onClick={() => setSelected(tier)} className="text-xs font-bold text-gold">{selected?.id === tier.id ? "Selected" : "Select"}</button></td></tr>)}</tbody></table></div></div><div><FlashCalculator tiers={tiers} durationHours={settings.durationHours} selectedTier={selected} onTierChange={setSelected} /><button onClick={invest} disabled={!selected} className="btn-primary mt-4 w-full py-4">Invest Now <ArrowRight size={17} /></button></div></div></div>;
}

export function CryptoInvestmentPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { items: coins, error } = useLibrary("coins", user.adminId);
  const [selected, setSelected] = useState(null);
  const [tier, setTier] = useState(null);
  const [duration, setDuration] = useState(3);

  useEffect(() => {
    if (coins.length && !selected) {
      setSelected(coins[0]);
      setTier(coins[0].tiers.find((item) => item.active));
    }
  }, [coins, selected]);

  function choose(coin) {
    setSelected(coin);
    setTier(coin.tiers.find((item) => item.active));
  }

  async function invest() {
    const investment = await createWeeklyInvestment({ user, asset: selected, tier, durationMonths: duration, type: "crypto" });
    beginDeposit(navigate, investment, tier.weeklyCapital);
  }

  return <div><PageHeader eyebrow="Digital asset wealth" title="Crypto investments" description="Allocate capital to an approved digital asset plan with clear terms and a guided funding review." />{error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}<StructuredInvestmentPage kind="crypto" assets={coins} selected={selected} tier={tier} duration={duration} onSelect={choose} onTierChange={setTier} onDurationChange={setDuration} onReview={invest} /></div>;
}

export function LegacyCryptoInvestmentPage() {
  const { user } = useAuth(); 
  const navigate = useNavigate(); 
  const { items: coins, error } = useLibrary("coins", user.adminId); 
  const [selected, setSelected] = useState(null); 
  const [tier, setTier] = useState(null); 
  const [duration, setDuration] = useState(3);

  useEffect(() => { 
    if (coins.length && !selected) { 
      setSelected(coins[0]); 
      setTier(coins[0].tiers.find((item) => item.active)); 
    } 
  }, [coins, selected]);

  function choose(coin) { 
    setSelected(coin); 
    setTier(coin.tiers.find((item) => item.active)); 
  }

  async function invest() { 
    const investment = await createWeeklyInvestment({ user, asset: selected, tier, durationMonths: duration, type: "crypto" }); 
    beginDeposit(navigate, investment, tier.weeklyCapital); 
  }

  return <div><PageHeader eyebrow="Digital asset desk" title="Crypto investments" description="Select an approved asset, choose a weekly commitment, and review funding before activation." />{error && <div className="mb-5 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>}<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{coins.map((coin) => <button key={coin.id} onClick={() => choose(coin)} className={`glass-card p-5 text-left ${selected?.id === coin.id ? "border-gold ring-4 ring-gold/10" : ""}`}><div className="flex items-center gap-4"><span className="grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-navy font-display text-xl font-bold text-gold">{coin.logoUrl ? <img src={coin.logoUrl} className="h-full w-full object-cover" /> : coin.ticker[0]}</span><div><p className="font-display text-xl font-bold text-navy">{coin.name}</p><p className="text-xs text-slate-400">{coin.ticker} · Live market</p></div></div></button>)}</div>{selected && <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_.8fr]"><div className="glass-card p-3"><TradingViewChart symbol={selected.tradingViewSymbol} /></div><div><PlanCalculator tiers={selected.tiers.filter((item) => item.active)} selectedTier={tier} onTierChange={setTier} duration={duration} onDurationChange={setDuration} /><button onClick={invest} className="btn-primary mt-4 w-full py-4">Invest Now <ArrowRight size={17} /></button></div></div>}</div>;
}

function nyseStatus() {
  const now = new Date();
  const ny = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = ny.getDay(); const minutes = ny.getHours() * 60 + ny.getMinutes();
  const open = day >= 1 && day <= 5 && minutes >= 570 && minutes < 960;
  const next = new Date(ny);
  next.setHours(9, 30, 0, 0);
  if (minutes >= 960 || day === 0 || day === 6) next.setDate(next.getDate() + (day === 5 ? 3 : day === 6 ? 2 : day === 0 ? 1 : 1));
  return { open, next };
}

export function StockInvestmentPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { items: stocks, error } = useLibrary("stocks", user.adminId);
  const market = nyseStatus();
  const [selected, setSelected] = useState(null);
  const [tier, setTier] = useState(null);
  const [duration, setDuration] = useState(3);

  useEffect(() => {
    if (stocks.length && !selected) {
      setSelected(stocks[0]);
      setTier(stocks[0].tiers.find((item) => item.active));
    }
  }, [selected, stocks]);

  function choose(stock) {
    setSelected(stock);
    setTier(stock.tiers.find((item) => item.active));
  }

  async function invest() {
    const investment = await createWeeklyInvestment({ user, asset: selected, tier, durationMonths: duration, type: "stock" });
    beginDeposit(navigate, investment, tier.weeklyCapital);
  }

  return <div><PageHeader eyebrow="Private equity allocation" title="Stock investments" description="Build a structured position in an approved global company and review the proposal before funding." />{error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}<StructuredInvestmentPage kind="stock" assets={stocks} selected={selected} tier={tier} duration={duration} marketOpen={market.open} onSelect={choose} onTierChange={setTier} onDurationChange={setDuration} onReview={invest} /></div>;
}

export function LegacyStockInvestmentPage() {
  const { user } = useAuth(); 
  const navigate = useNavigate(); 
  const { items: stocks, error } = useLibrary("stocks", user.adminId); 
  const market = nyseStatus();

  return <div><PageHeader eyebrow="Global equity desk" title="Stock investments" description="Research approved companies and establish a structured equity plan." />{error && <div className="mb-5 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>}<div className={`mb-6 flex items-center justify-between rounded-2xl border p-5 ${market.open ? "border-emerald-200 bg-emerald-50" : "border-gold/30 bg-gold/10"}`}><div><p className="font-bold text-navy">NYSE market {market.open ? "open" : "closed"}</p><p className="mt-1 text-xs text-slate-500">{market.open ? "Regular session · 09:30-16:00 ET" : `Next session: ${market.next.toLocaleString()}`}</p></div><span className={`h-3 w-3 rounded-full ${market.open ? "bg-emerald-500" : "bg-gold"}`} /></div><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{stocks.map((stock) => <div key={stock.id} className="glass-card p-6"><div className="flex items-start justify-between"><span className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-navy font-display text-lg font-bold text-gold">{stock.logoUrl ? <img src={stock.logoUrl} className="h-full w-full object-cover" /> : stock.ticker[0]}</span><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">+{(Math.random() * .8 + .1).toFixed(2)}%</span></div><h2 className="display-title mt-6 text-2xl text-navy">{stock.name}</h2><p className="mt-1 text-xs text-slate-400">{stock.ticker} · {stock.sector}</p><p className="mt-5 text-sm leading-6 text-slate-500">{stock.about}</p><button onClick={() => navigate(`/dashboard/stock-investment/${stock.id}`)} className="btn-primary mt-6 w-full">Research & invest <ArrowRight size={16} /></button></div>)}</div></div>;
}

export function StockResearchPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { stockId } = useParams();
  const [stocks, setStocks] = useState([]);
  const [stock, setStock] = useState(null);
  const [tier, setTier] = useState(null);
  const [duration, setDuration] = useState(3);
  const [error, setError] = useState(null);

  useEffect(() => {
    dataService.list("stocks", user.adminId)
      .then((items) => {
        const active = items.filter((item) => item.active);
        const found = active.find((item) => item.id === stockId);
        setStocks(active);
        setStock(found);
        setTier(found?.tiers?.find((item) => item.active));
        setError(null);
      })
      .catch((loadError) => {
        console.error("Failed to load stock research details:", loadError);
        setError("Insufficient permissions to load stock research details.");
      });
  }, [stockId, user.adminId]);

  function choose(item) {
    setStock(item);
    setTier(item.tiers.find((planTier) => planTier.active));
    navigate(`/dashboard/stock-investment/${item.id}`, { replace: true });
  }

  async function invest() {
    const investment = await createWeeklyInvestment({ user, asset: stock, tier, durationMonths: duration, type: "stock" });
    beginDeposit(navigate, investment, tier.weeklyCapital);
  }

  if (error) return <div className="glass-card p-10 text-center"><p className="text-sm font-semibold text-red-700">{error}</p></div>;
  if (!stock) return <div className="glass-card p-10 text-center">Loading company research...</div>;
  return <div><PageHeader eyebrow={`${stock.sector} · ${stock.ticker}`} title={stock.name} description="Review this approved equity opportunity, configure your commitment, and proceed to funding." /><StructuredInvestmentPage kind="stock" assets={stocks} selected={stock} tier={tier} duration={duration} marketOpen={nyseStatus().open} onSelect={choose} onTierChange={setTier} onDurationChange={setDuration} onReview={invest} /></div>;
}

export function LegacyStockResearchPage() {
  const { user } = useAuth(); 
  const navigate = useNavigate(); 
  const { stockId } = useParams(); 
  const [stock, setStock] = useState(null); 
  const [tier, setTier] = useState(null); 
  const [duration, setDuration] = useState(3);
  const [error, setError] = useState(null);

  useEffect(() => { 
    dataService.list("stocks", user.adminId)
      .then((items) => { 
        const found = items.find((item) => item.id === stockId); 
        setStock(found); 
        setTier(found?.tiers?.find((item) => item.active)); 
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to load stock research details:", err);
        setError("Insufficient permissions to load stock research details.");
      }); 
  }, [stockId, user.adminId]);

  async function invest() { 
    const investment = await createWeeklyInvestment({ user, asset: stock, tier, durationMonths: duration, type: "stock" }); 
    beginDeposit(navigate, investment, tier.weeklyCapital); 
  }

  if (error) {
    return (
      <div className="glass-card p-10 text-center">
        <p className="text-sm font-semibold text-red-700">{error}</p>
      </div>
    );
  }

  if (!stock) return <div className="glass-card p-10 text-center">Loading company research...</div>;
  return <div><PageHeader eyebrow={`${stock.sector} · ${stock.ticker}`} title={stock.name} description={stock.about} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Market cap", stock.marketCap], ["52-week high", stock.weekHigh], ["52-week low", stock.weekLow], ["P/E ratio", stock.peRatio]].map(([label, value]) => <div key={label} className="glass-card p-5"><p className="text-[10px] uppercase tracking-widest text-slate-400">{label}</p><p className="display-title mt-2 text-2xl text-navy">{value}</p></div>)}</div><div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_.8fr]"><div className="glass-card p-3"><TradingViewChart symbol={stock.tradingViewSymbol} /></div><div className="space-y-6"><div className="glass-card p-6"><h2 className="display-title text-2xl text-navy">Why invest</h2><p className="mt-3 text-sm leading-7 text-slate-500">{stock.whyInvest}</p><p className="mt-4 border-t border-slate-100 pt-4 text-xs font-bold text-gold">{stock.historicalReturns}</p></div><PlanCalculator tiers={stock.tiers.filter((item) => item.active)} selectedTier={tier} onTierChange={setTier} duration={duration} onDurationChange={setDuration} /><button onClick={invest} className="btn-primary w-full py-4">Invest Now <BriefcaseBusiness size={17} /></button></div></div></div>;
}

export function PortfolioPage() {
  const { user } = useAuth(); const navigate = useNavigate(); const [investments, setInvestments] = useState([]); const [detail, setDetail] = useState(null);
  const { activeInvestmentMode } = useOutletContext();
  const load = useCallback(async () => { const items = await processInvestmentTimers(user.userId); setInvestments(items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))); }, [user.userId]);
  useEffect(() => { load(); }, [load]);
  const visibleInvestments = investments.filter((item) => item.type === activeInvestmentMode && item.status !== "cancelled");
  const stocks = visibleInvestments.filter((item) => item.type === "stock" && !["deleted"].includes(item.status));
  const modeLabel = investmentModeLabel(activeInvestmentMode);
  return <div><PageHeader eyebrow={`${modeLabel} ecosystem`} title={`${modeLabel} portfolio`} description={`Monitor active, paused, and completed plans inside your ${modeLabel.toLowerCase()} investment mode.`} /><div className="grid gap-5 xl:grid-cols-2">{visibleInvestments.map((item) => <InvestmentCard key={item.id} investment={item} onDeposit={(investment) => beginDeposit(navigate, investment, investment.capital || investment.weeklyCapital)} onDetails={setDetail} />)}</div>{!visibleInvestments.length && <div className="glass-card p-8 text-center"><TrendingUp className="mx-auto text-gold" /><h2 className="display-title mt-4 text-2xl text-navy">No {modeLabel.toLowerCase()} investments yet</h2><p className="mt-2 text-sm text-slate-500">Explore opportunities in your current investment ecosystem.</p><button onClick={() => navigate("/dashboard/investments")} className="btn-primary mt-5">Explore investment opportunities</button></div>}{stocks.length > 0 && <div className="glass-card mt-7 table-scroll overflow-x-auto"><div className="p-6"><h2 className="display-title text-2xl text-navy">Equity holdings</h2></div><table className="w-full min-w-[700px]"><thead><tr className="bg-navy text-left text-[10px] uppercase tracking-widest text-white/45"><th className="px-6 py-4">Stock</th><th>Shares</th><th>Bought at</th><th>Current value</th><th>P&L</th><th>Projected return</th></tr></thead><tbody>{stocks.map((item) => { const invested = item.completedWeeks * item.weeklyCapital; const fluctuation = 1 + (((item.id.length % 7) - 3) / 1000); const current = invested * fluctuation; return <tr key={item.id} className="border-b border-slate-100 text-sm"><td className="px-6 py-5 font-bold text-navy">{item.ticker}</td><td>{item.referencePrice ? (invested / item.referencePrice).toFixed(2) : "-"}</td><td>{money(invested)}</td><td>{money(current)}</td><td className={current >= invested ? "text-forest" : "text-burgundy"}>{money(current - invested)}</td><td>{money(item.projectedReturn)} locked</td></tr>; })}</tbody></table></div>}<Modal open={Boolean(detail)} onClose={() => setDetail(null)} title={detail?.planName || "Investment details"}>{detail && <InvestmentDetail investment={detail} />}</Modal></div>;
}

export function EarningsPage() {
  const { user } = useAuth(); const [items, setItems] = useState([]);
  const { activeInvestmentMode } = useOutletContext();
  useEffect(() => { dataService.listForUser("investments", user.userId).then((result) => setItems(result.filter((item) => ["completed", "flash done"].includes(item.status) && item.type === activeInvestmentMode))); }, [activeInvestmentMode, user.userId]);
  const total = items.reduce((sum, item) => sum + Number(item.projectedReturn || 0), 0);
  const best = Math.max(...items.map((item) => Number(item.projectedReturn || 0)), 0);
  const rates = items.map((item) => { const capital = item.type === "flash" ? item.capital : item.weeklyCapital * item.totalWeeks; return capital ? ((item.projectedReturn - capital) / capital) * 100 : 0; });
  const average = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
  const months = useMemo(() => Array.from({ length: 12 }, (_, index) => { const date = new Date(); date.setMonth(date.getMonth() - (11 - index)); const value = items.filter((item) => { const completed = new Date(item.completedAt); return completed.getMonth() === date.getMonth() && completed.getFullYear() === date.getFullYear(); }).reduce((sum, item) => sum + item.projectedReturn, 0); return { label: date.toLocaleString("en-US", { month: "short" }), value }; }), [items]);
  const assets = Object.entries(items.reduce((acc, item) => ({ ...acc, [item.ticker]: (acc[item.ticker] || 0) + item.projectedReturn }), {})).sort((a, b) => b[1] - a[1]);
  const modeLabel = investmentModeLabel(activeInvestmentMode);
  return <div><PageHeader eyebrow={`${modeLabel} ecosystem`} title={`${modeLabel} earnings`} description={`Completed-plan returns and maturity history for your ${modeLabel.toLowerCase()} investments.`} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Total earned", money(total)], ["Best single return", money(best)], ["Average return rate", `${average.toFixed(1)}%`], ["Plans completed", items.length]].map(([label, value]) => <div key={label} className="glass-card p-6"><p className="text-[10px] uppercase tracking-widest text-slate-400">{label}</p><p className="display-title mt-3 text-3xl text-navy">{value}</p></div>)}</div><div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.65fr]"><div className="glass-card p-7"><h2 className="display-title text-2xl text-navy">Monthly earnings</h2><MiniBarChart values={months} /></div><div className="glass-card p-7"><h2 className="display-title text-2xl text-navy">Per asset</h2><div className="mt-6 space-y-5">{assets.map(([asset, value]) => <div key={asset}><div className="flex justify-between text-sm"><span className="font-bold text-navy">{asset}</span><span>{money(value)}</span></div><div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-gold" style={{ width: `${total ? (value / total) * 100 : 0}%` }} /></div></div>)}{!assets.length && <p className="text-sm text-slate-400">Completed {modeLabel.toLowerCase()} plans will populate this breakdown.</p>}</div></div></div><div className="glass-card mt-6 table-scroll overflow-x-auto"><table className="w-full min-w-[700px]"><thead><tr className="bg-navy text-left text-[10px] uppercase tracking-widest text-white/45"><th className="px-6 py-4">Plan</th><th>Asset</th><th>Capital</th><th>Return</th><th>Completed</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-b border-slate-100 text-sm"><td className="px-6 py-5 font-bold text-navy">{item.planName}</td><td>{item.ticker}</td><td>{money(item.capital || item.weeklyCapital * item.totalWeeks)}</td><td className="font-bold text-forest">{money(item.projectedReturn)}</td><td>{new Date(item.completedAt).toLocaleDateString()}</td></tr>)}</tbody></table></div></div>;
}

