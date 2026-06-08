import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Clock3, DollarSign, TrendingUp } from "lucide-react";
import { calculatePlan } from "../lib/investmentEngine";
import { calculateLiveLockedBalance, formatInvestmentTime } from "../lib/lockedBalance";
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
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const metrics = calculateLiveLockedBalance(investment, now);
  const progress = metrics.progressPercent;
  const flash = investment.type === "flash";
  const awaitingFunding = investment.status === "awaiting_funding";
  const canDeposit = ["awaiting_funding", "pending", "active", "paused"].includes(investment.status) && (!flash || ["awaiting_funding", "pending"].includes(investment.status));
  return (
    <div className="glass-card p-6">
      <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-widest text-gold">{investment.type} investment</p><h3 className="display-title mt-2 text-2xl text-navy">{investment.planName}</h3><p className="mt-1 text-xs text-slate-400">{investment.ticker} · {flash ? money(investment.capital) : `${money(investment.weeklyCapital)} weekly`}</p></div><StatusBadge status={investment.status} /></div>
      <div className="mt-6"><div className="flex justify-between text-xs"><span className="text-slate-400">{flash ? "Maturity progress" : `Weeks ${investment.completedWeeks || 0} of ${investment.totalWeeks}`}</span><span className="font-bold text-navy">{Math.round(progress)}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gold transition-all" style={{ width: `${progress}%` }} /></div></div>
      <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-stone p-4"><DollarSign size={15} className="text-gold" /><p className="mt-2 text-[9px] uppercase tracking-wider text-slate-400">Current locked earnings</p><p className="mt-1 font-display text-xl font-bold text-navy">{money(metrics.lockedEarned)}</p></div><div className="rounded-xl bg-stone p-4"><Clock3 size={15} className="text-gold" /><p className="mt-2 text-[9px] uppercase tracking-wider text-slate-400">Time remaining</p><p className="mt-1 text-sm font-bold text-navy">{formatInvestmentTime(metrics.remainingSeconds)}</p></div></div>
      {!flash && <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl border border-slate-100 bg-white p-3 text-xs"><div><p className="text-slate-400">Current week</p><p className="mt-1 font-bold text-navy">{investment.currentWeek || investment.completedWeeks || 0} of {investment.totalWeeks}</p></div><div><p className="text-slate-400">Next deposit due</p><p className="mt-1 font-bold text-navy">{investment.nextDueAt ? new Date(investment.nextDueAt).toLocaleDateString() : "After approval"}</p></div></div>}
      {(investment.status === "paused" || metrics.isPaymentOverdue) && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">Earnings are paused until the overdue weekly funding is approved.</p>}
      <div className="mt-5 flex gap-2">{canDeposit && <button onClick={() => onDeposit?.(investment)} className="btn-primary flex-1">{awaitingFunding ? "Fund Investment" : "Make deposit"} <ArrowRight size={15} /></button>}<button onClick={() => onDetails?.(investment)} className="btn-secondary flex-1 bg-white text-navy">View details</button></div>
    </div>
  );
}

export function InvestmentDetail({ investment }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const metrics = calculateLiveLockedBalance(investment, now);
  const paused = investment.status === "paused" || metrics.isPaymentOverdue;
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-navy p-4 text-white">
          <p className="text-[9px] uppercase tracking-widest text-white/40">Live locked earnings</p>
          <p className="mt-2 font-display text-2xl font-bold text-gold">{money(metrics.lockedEarned)}</p>
        </div>
        <div className="rounded-xl bg-stone p-4">
          <p className="text-[9px] uppercase tracking-widest text-slate-400">Projected return</p>
          <p className="mt-2 font-display text-2xl font-bold text-navy">{money(investment.projectedReturn)}</p>
        </div>
        <div className="rounded-xl bg-stone p-4">
          <p className="text-[9px] uppercase tracking-widest text-slate-400">Capital contributed</p>
          <p className="mt-2 font-display text-xl font-bold text-navy">{money(investment.capitalAmount || 0)}</p>
        </div>
        <div className="rounded-xl bg-stone p-4">
          <p className="text-[9px] uppercase tracking-widest text-slate-400">Remaining time</p>
          <p className="mt-2 text-sm font-bold text-navy">{formatInvestmentTime(metrics.remainingSeconds)}</p>
        </div>
      </div>
      <div className="mt-5">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Active progress</span>
          <strong>{metrics.progressPercent.toFixed(1)}%</strong>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-gold" style={{ width: `${metrics.progressPercent}%` }} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-500">
          <p>Active elapsed: <strong className="text-navy">{formatInvestmentTime(metrics.activeElapsedSeconds)}</strong></p>
          <p>Status: <strong className="capitalize text-navy">{investment.status}</strong></p>
          <p>Maturity: <strong className="text-navy">{investment.maturityAt ? new Date(investment.maturityAt).toLocaleDateString() : "After activation"}</strong></p>
          {investment.type !== "flash" && <p>Week: <strong className="text-navy">{investment.currentWeek || investment.completedWeeks || 0}/{investment.totalWeeks}</strong></p>}
        </div>
      </div>
      {paused && (
        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
          This plan is paused. Locked earnings remain frozen until the overdue weekly deposit is approved.
        </p>
      )}
      <div className="mt-6 border-t border-slate-200 pt-5">
        <Timeline investment={investment} />
      </div>
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
