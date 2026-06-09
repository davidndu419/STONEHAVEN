import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { dataService } from "../lib/dataService";

const money = (value) => `$${Number(value || 0).toLocaleString()}`;
let libraryRequest;
let libraryRequestedAt = 0;

function loadPublicLibrary() {
  if (!libraryRequest || Date.now() - libraryRequestedAt > 30000) {
    libraryRequestedAt = Date.now();
    libraryRequest = Promise.all([
      dataService.listPublic("flashSettings"),
      dataService.listPublic("flashTiers"),
      dataService.listPublic("coins"),
      dataService.listPublic("stocks"),
    ]).then(([flashSettings, flashTiers, coins, stocks]) => ({
      flashSettings: flashSettings[0] || null,
      flashTiers: flashTiers.sort((a, b) => Number(a.capital) - Number(b.capital)),
      coins: coins
        .map((asset) => ({ ...asset, tiers: (asset.tiers || []).filter((tier) => tier.active).sort((a, b) => Number(a.weeklyCapital) - Number(b.weeklyCapital)) }))
        .filter((asset) => asset.tiers.length)
        .sort((a, b) => a.name.localeCompare(b.name)),
      stocks: stocks
        .map((asset) => ({ ...asset, tiers: (asset.tiers || []).filter((tier) => tier.active).sort((a, b) => Number(a.weeklyCapital) - Number(b.weeklyCapital)) }))
        .filter((asset) => asset.tiers.length)
        .sort((a, b) => a.name.localeCompare(b.name)),
    })).catch((error) => {
      libraryRequest = undefined;
      throw error;
    });
  }
  return libraryRequest;
}

function usePublicInvestmentLibrary() {
  const [library, setLibrary] = useState({ flashSettings: null, flashTiers: [], coins: [], stocks: [] });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    loadPublicLibrary()
      .then((result) => { if (active) setLibrary(result); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return { ...library, loading };
}

function registrationLink({ type, asset, capital, duration }) {
  const params = new URLSearchParams({ planType: type });
  if (asset) params.set("asset", asset);
  if (capital) params.set(type === "flash" ? "capital" : "weeklyCapital", capital);
  if (duration) params.set("duration", duration);
  return `/register?${params.toString()}`;
}

export function ManagedInvestmentCalculator() {
  const { flashSettings, flashTiers, coins, stocks, loading } = usePublicInvestmentLibrary();
  const availableTypes = useMemo(() => [
    ...(flashSettings && flashTiers.length ? ["flash"] : []),
    ...(coins.length ? ["crypto"] : []),
    ...(stocks.length ? ["stock"] : []),
  ], [coins.length, flashSettings, flashTiers.length, stocks.length]);
  const [type, setType] = useState("");
  const [assetId, setAssetId] = useState("");
  const [tierCapital, setTierCapital] = useState("");
  const [duration, setDuration] = useState(3);

  useEffect(() => {
    if (!type && availableTypes.length) setType(availableTypes[0]);
  }, [availableTypes, type]);

  const assets = useMemo(() => type === "crypto" ? coins : type === "stock" ? stocks : [], [coins, stocks, type]);
  const asset = assets.find((item) => item.id === assetId) || assets[0];
  const tiers = type === "flash" ? flashTiers : asset?.tiers || [];
  const tier = tiers.find((item) => Number(item.capital ?? item.weeklyCapital) === Number(tierCapital)) || tiers[0];

  useEffect(() => {
    if (assets.length && !assets.some((item) => item.id === assetId)) setAssetId(assets[0].id);
  }, [assetId, assets]);

  const capital = type === "flash" ? Number(tier?.capital || 0) : Number(tier?.weeklyCapital || 0) * (duration === 2 ? 8 : 13);
  const projectedReturn = type === "flash"
    ? Number(tier?.returnAmount || 0)
    : Number(duration === 2 ? tier?.return2Months : tier?.return3Months) || 0;
  const profit = projectedReturn - capital;
  const roi = capital > 0 ? (profit / capital) * 100 : 0;
  const hasPlans = availableTypes.length > 0;

  return (
    <section className="bg-navy px-5 py-28 text-white">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[.75fr_1.25fr]">
        <div className="max-w-2xl">
          <p className="section-kicker">Investment calculator</p>
          <h2 className="display-title mt-3 text-3xl sm:text-4xl md:text-5xl">Model your plan before you begin.</h2>
          <p className="mt-4 text-sm leading-7 text-white/55 md:text-base">Calculations use the active plans currently published in the Stonehaven Investment Library.</p>
        </div>
        <div className="dark-glass p-7">
          {!loading && hasPlans && tier ? (
            <>
              <div className={`grid gap-4 ${type === "flash" ? "sm:grid-cols-2" : "sm:grid-cols-4"}`}>
                <div><label className="mb-2 block text-[10px] uppercase tracking-widest text-white/35">Plan type</label><select className="w-full rounded-xl border border-white/10 bg-white/[.07] px-4 py-3 capitalize" value={type} onChange={(event) => { setType(event.target.value); setAssetId(""); setTierCapital(""); }}><option className="text-navy" value="flash" disabled={!flashSettings || !flashTiers.length}>Flash</option><option className="text-navy" value="crypto" disabled={!coins.length}>Crypto</option><option className="text-navy" value="stock" disabled={!stocks.length}>Stock</option></select></div>
                {type !== "flash" && <div><label className="mb-2 block text-[10px] uppercase tracking-widest text-white/35">Asset</label><select className="w-full rounded-xl border border-white/10 bg-white/[.07] px-4 py-3" value={asset?.id || ""} onChange={(event) => { setAssetId(event.target.value); setTierCapital(""); }} >{assets.map((item) => <option className="text-navy" key={item.id} value={item.id}>{item.name} ({item.ticker})</option>)}</select></div>}
                <div><label className="mb-2 block text-[10px] uppercase tracking-widest text-white/35">{type === "flash" ? "Capital" : "Weekly capital"}</label><select className="w-full rounded-xl border border-white/10 bg-white/[.07] px-4 py-3" value={tier?.capital ?? tier?.weeklyCapital ?? ""} onChange={(event) => setTierCapital(event.target.value)}>{tiers.map((item) => { const value = item.capital ?? item.weeklyCapital; return <option className="text-navy" key={value} value={value}>{money(value)}</option>; })}</select></div>
                {type !== "flash" && <div><label className="mb-2 block text-[10px] uppercase tracking-widest text-white/35">Duration</label><select className="w-full rounded-xl border border-white/10 bg-white/[.07] px-4 py-3" value={duration} onChange={(event) => setDuration(Number(event.target.value))}><option className="text-navy" value={2}>2 months</option><option className="text-navy" value={3}>3 months</option></select></div>}
              </div>
              <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/10 sm:grid-cols-5">
                {[["Capital", money(capital)], ["Duration", type === "flash" ? `${flashSettings.durationHours} hours` : `${duration} months`], ["Projected return", money(projectedReturn)], ["Profit", money(profit)], ["ROI", `${roi.toFixed(1)}%`]].map(([label, value]) => <div key={label} className="bg-navy p-4"><p className="text-[9px] uppercase tracking-widest text-white/35">{label}</p><p className="mt-2 font-display text-lg font-bold text-gold">{value}</p></div>)}
              </div>
              <Link to={registrationLink({ type, asset: asset?.id, capital: tier?.capital ?? tier?.weeklyCapital, duration: type === "flash" ? flashSettings.durationHours : duration })} className="btn-primary mt-6 w-full">Start earning now <ArrowRight size={16} /></Link>
            </>
          ) : <p className="rounded-xl border border-white/10 bg-white/[.04] p-6 text-sm text-white/55">{loading ? "Loading active plans..." : "Calculator plans are being updated. Please check back shortly."}</p>}
        </div>
      </div>
    </section>
  );
}

export function ManagedInvestmentPlans() {
  const { coins, stocks, loading } = usePublicInvestmentLibrary();
  const [type, setType] = useState("crypto");
  const [assetId, setAssetId] = useState("");
  const assets = useMemo(() => type === "crypto" ? coins : stocks, [coins, stocks, type]);
  const asset = assets.find((item) => item.id === assetId) || assets[0];
  const tiers = asset?.tiers || [];

  useEffect(() => {
    if (assets.length && !assets.some((item) => item.id === assetId)) setAssetId(assets[0].id);
  }, [assetId, assets]);

  return (
    <section id="plans" className="bg-white px-5 py-28">
      <div className="mx-auto max-w-6xl">
        <p className="section-kicker">Investment plans</p>
        <h2 className="display-title mt-3 text-3xl text-navy sm:text-4xl md:text-5xl">Clarity at every horizon.</h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500 md:text-base">Select a weekly commitment from the active plans published in our Investment Library.</p>
        <div className="mt-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="flex gap-2">{["crypto", "stock"].map((item) => <button key={item} onClick={() => { setType(item); setAssetId(""); }} className={`rounded-full px-5 py-2 text-xs font-bold capitalize ${type === item ? "bg-navy text-white" : "bg-stone text-slate-500"}`}>{item}</button>)}</div>
          {assets.length > 0 && <div className="w-full sm:max-w-xs"><label className="label">Select {type === "crypto" ? "coin" : "stock"}</label><select className="field bg-white" value={asset?.id || ""} onChange={(event) => setAssetId(event.target.value)}>{assets.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.ticker})</option>)}</select></div>}
        </div>
        {tiers.length ? (
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {tiers.map((tier) => (
              <article key={tier.weeklyCapital} className="glass-card flex flex-col p-4 sm:p-5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Weekly Capital</p>
                <p className="font-display text-xl font-bold text-navy sm:text-2xl">{money(tier.weeklyCapital)}</p>
                <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                  <div><p className="text-[9px] uppercase tracking-wider text-slate-400">2 Months (8 Weeks)</p><p className="font-display font-semibold text-slate-700">{money(tier.return2Months)}</p></div>
                  <div><p className="text-[9px] uppercase tracking-wider text-slate-400">3 Months (13 Weeks)</p><p className="font-display font-semibold text-slate-700">{money(tier.return3Months)}</p></div>
                </div>
                <Link to={registrationLink({ type, asset: asset.id, capital: tier.weeklyCapital })} className="btn-primary mt-4">Select</Link>
              </article>
            ))}
          </div>
        ) : <p className="mt-8 rounded-xl bg-stone p-6 text-sm text-slate-500">{loading ? "Loading active plans..." : `No active ${type} plans are currently published.`}</p>}
        <p className="mt-4 text-xs leading-5 text-slate-400">Illustrative plan values are subject to the applicable plan agreement and risk disclosures.</p>
      </div>
    </section>
  );
}
