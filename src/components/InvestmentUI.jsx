import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Clock3, DollarSign, TrendingUp } from "lucide-react";
import { calculatePlan } from "../lib/investmentEngine";
import { StatusBadge } from "./UI";

export const money = (value = 0) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

export function Countdown({ target, prefix = "" }) {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    function tick() {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) return setRemaining("Due now");
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      setRemaining(days ? `${days}d ${hours}h` : `${hours}h ${minutes}m`);
    }
    tick(); const timer = setInterval(tick, 30000); return () => clearInterval(timer);
  }, [target]);
  return <span>{prefix}{remaining}</span>;
}

export function PlanCalculator({ tiers, selectedTier, onTierChange, duration, onDurationChange, compact = false }) {
  const tier = selectedTier || tiers?.[0];
  const values = useMemo(() => tier ? calculatePlan(tier, duration) : null, [tier, duration]);
  if (!tier || !values) return null;
  return (
    <div className={`rounded-2xl bg-navy text-white ${compact ? "p-5" : "p-7"}`}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-white/35">Weekly capital</label><select className="w-full rounded-xl border border-white/10 bg-white/[.07] px-4 py-3 text-sm outline-none" value={tier.weeklyCapital} onChange={(event) => onTierChange?.(tiers.find((item) => Number(item.weeklyCapital) === Number(event.target.value)))}>{tiers.map((item) => <option className="text-navy" key={item.weeklyCapital} value={item.weeklyCapital}>{money(item.weeklyCapital)}</option>)}</select></div>
        <div><label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-white/35">Duration</label><select className="w-full rounded-xl border border-white/10 bg-white/[.07] px-4 py-3 text-sm outline-none" value={duration} onChange={(event) => onDurationChange?.(Number(event.target.value))}><option className="text-navy" value={2}>2 months · 8 weeks</option><option className="text-navy" value={3}>3 months · 13 weeks</option></select></div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/10 sm:grid-cols-4">
        {[["Total capital", money(values.totalCapital)], ["Projected return", money(values.projectedReturn)], ["Net profit", money(values.netProfit)], ["ROI", `${values.roi.toFixed(1)}%`]].map(([label, value]) => <div key={label} className="bg-navy p-4"><p className="text-[9px] uppercase tracking-widest text-white/35">{label}</p><p className="mt-2 font-display text-xl font-bold text-gold">{value}</p></div>)}
      </div>
    </div>
  );
}

export function FlashCalculator({ tiers, durationHours, selectedTier, onTierChange }) {
  const tier = selectedTier || tiers?.[0];
  if (!tier) return null;
  const profit = Number(tier.returnAmount) - Number(tier.capital);
  return <div className="rounded-2xl bg-navy p-6 text-white"><label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-white/35">Capital amount</label><select className="w-full rounded-xl border border-white/10 bg-white/[.07] px-4 py-3 text-sm" value={tier.capital} onChange={(event) => onTierChange?.(tiers.find((item) => Number(item.capital) === Number(event.target.value)))}>{tiers.map((item) => <option className="text-navy" key={item.capital} value={item.capital}>{money(item.capital)}</option>)}</select><div className="mt-5 grid grid-cols-3 gap-2">{[["Return", money(tier.returnAmount)], ["Profit", money(profit)], ["Duration", `${durationHours}h`]].map(([label, value]) => <div key={label} className="rounded-xl bg-white/[.06] p-4"><p className="text-[9px] uppercase tracking-wider text-white/35">{label}</p><p className="mt-2 font-display text-xl font-bold text-gold">{value}</p></div>)}</div></div>;
}

export function InvestmentCard({ investment, onDeposit, onDetails }) {
  const progress = Math.min(100, ((investment.completedWeeks || 0) / (investment.totalWeeks || 1)) * 100);
  const flash = investment.type === "flash";
  const canDeposit = ["pending", "active", "paused"].includes(investment.status) && (!flash || investment.status === "pending");
  return (
    <div className="glass-card p-6">
      <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-widest text-gold">{investment.type} investment</p><h3 className="display-title mt-2 text-2xl text-navy">{investment.planName}</h3><p className="mt-1 text-xs text-slate-400">{investment.ticker} · {flash ? money(investment.capital) : `${money(investment.weeklyCapital)} weekly`}</p></div><StatusBadge status={investment.status} /></div>
      <div className="mt-6"><div className="flex justify-between text-xs"><span className="text-slate-400">{flash ? "Maturity progress" : `Weeks ${investment.completedWeeks || 0} of ${investment.totalWeeks}`}</span><span className="font-bold text-navy">{Math.round(progress)}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gold transition-all" style={{ width: `${progress}%` }} /></div></div>
      <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-stone p-4"><DollarSign size={15} className="text-gold" /><p className="mt-2 text-[9px] uppercase tracking-wider text-slate-400">Projected return</p><p className="mt-1 font-display text-xl font-bold text-navy">{money(investment.projectedReturn)}</p></div><div className="rounded-xl bg-stone p-4"><Clock3 size={15} className="text-gold" /><p className="mt-2 text-[9px] uppercase tracking-wider text-slate-400">{flash ? "Matures in" : "Next deposit"}</p><p className="mt-1 text-sm font-bold text-navy">{investment.maturityAt || investment.nextDueAt ? <Countdown target={flash ? investment.maturityAt : investment.nextDueAt} /> : "After approval"}</p></div></div>
      <div className="mt-5 flex gap-2">{canDeposit && <button onClick={() => onDeposit?.(investment)} className="btn-primary flex-1">Make deposit <ArrowRight size={15} /></button>}<button onClick={() => onDetails?.(investment)} className="btn-secondary flex-1 bg-white text-navy">View details</button></div>
    </div>
  );
}

export function Timeline({ investment }) {
  const nodes = Array.from({ length: investment.totalWeeks || 1 }, (_, index) => {
    const week = index + 1;
    return investment.timeline?.find((item) => item.week === week) || { week, status: week <= (investment.completedWeeks || 0) ? "approved" : "upcoming" };
  });
  return <div className="space-y-0">{nodes.map((node, index) => <details key={node.week} className="group relative pl-10"><span className={`absolute left-0 top-1 grid h-7 w-7 place-items-center rounded-full border-4 border-white text-[10px] font-bold ${node.status === "approved" ? "bg-forest text-white" : node.status === "rejected" || node.status === "missed" ? "bg-burgundy text-white" : "bg-slate-200 text-slate-500"}`}>{node.week}</span>{index < nodes.length - 1 && <span className="absolute left-[13px] top-7 h-full w-px bg-slate-200" />}<summary className="cursor-pointer list-none pb-7"><div className="flex items-center justify-between rounded-xl bg-stone px-4 py-3"><div><p className="text-sm font-bold text-navy">{investment.type === "flash" ? "Flash deposit" : `Week ${node.week}`}</p><p className="mt-1 text-xs capitalize text-slate-400">{node.status}</p></div>{node.approvedAt && <span className="text-xs text-slate-400">{new Date(node.approvedAt).toLocaleDateString()}</span>}</div></summary>{(node.depositId || node.amount) && <div className="-mt-5 mb-7 rounded-xl border border-slate-200 bg-white p-4 text-xs leading-6 text-slate-500"><p>Amount: <strong className="text-navy">{money(node.amount)}</strong></p>{node.submittedAt && <p>Submitted: {new Date(node.submittedAt).toLocaleString()}</p>}{node.approvedAt && <p>Approved: {new Date(node.approvedAt).toLocaleString()}</p>}</div>}</details>)}</div>;
}

export function MiniBarChart({ values }) {
  const max = Math.max(...values.map((item) => item.value), 1);
  return <div className="flex h-56 items-end gap-3">{values.map((item) => <div key={item.label} className="flex h-full flex-1 flex-col justify-end"><div title={money(item.value)} className="rounded-t-lg bg-gold transition hover:bg-[#d8b86e]" style={{ height: `${Math.max(4, (item.value / max) * 100)}%` }} /><p className="mt-3 text-center text-[9px] uppercase text-slate-400">{item.label}</p></div>)}</div>;
}
