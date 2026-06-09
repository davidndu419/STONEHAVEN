import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { ArrowDownToLine, ArrowUpFromLine, BellRing, Clock3 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { dataService } from "../lib/dataService";
import { processInvestmentTimers } from "../lib/investmentEngine";
import { INVESTMENT_MODES, investmentModeLabel } from "../lib/investmentMode";
import { loadTransactionHistory } from "../lib/transactionHistory";
import { calculateLiveLockedBalance, calculateTotalLockedBalance, calculateTotalPortfolio } from "../lib/lockedBalance";
import { InvestmentCard, money } from "./InvestmentUI";
import { PageHeader, StatusBadge } from "./UI";

const dateTime = (value) => new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
}).format(new Date(value));

export default function DashboardHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { activeInvestmentMode, setActiveInvestmentMode } = useOutletContext();
  const [investments, setInvestments] = useState([]);
  const [announcement, setAnnouncement] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    processInvestmentTimers(user.userId).then(setInvestments).catch((loadError) => {
      console.error("Unable to load investments:", loadError);
      setError("Your investment activity could not be loaded.");
    });
  }, [user.userId]);

  useEffect(() => {
    Promise.all([
      dataService.list("announcements", user.adminId).catch(() => []),
      dataService.list("announcements", "GLOBAL").catch(() => []),
      loadTransactionHistory(user.userId),
    ]).then(([adminAnnouncements, globalAnnouncements, transactionItems]) => {
      setAnnouncement([...adminAnnouncements, ...globalAnnouncements].filter((item) => item.status === "published").sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))[0] || null);
      setTransactions(transactionItems.slice(0, 4));
    }).catch((loadError) => console.error("Unable to load dashboard summaries:", loadError));
  }, [user.adminId, user.userId]);

  const modeLabel = investmentModeLabel(activeInvestmentMode);
  const modeInvestments = investments.filter((item) => item.type === activeInvestmentMode && !["deleted", "cancelled"].includes(item.status));
  const activeInvestments = modeInvestments.filter((item) => !["completed", "flash done"].includes(item.status)).slice(0, 2);
  const lockedBalance = calculateTotalLockedBalance(investments, now);
  const total = calculateTotalPortfolio(user, investments, now);
  const liveInvestments = investments.filter((item) => {
    const metrics = calculateLiveLockedBalance(item, now);
    return ["active", "flash active"].includes(item.status) && !metrics.isMatured && !metrics.isPaymentOverdue;
  });
  const pausedInvestments = investments.filter((item) => {
    const metrics = calculateLiveLockedBalance(item, now);
    return ["paused", "frozen"].includes(item.status) || metrics.isPaymentOverdue;
  });
  const lockedStatus = liveInvestments.length ? "Accumulating" : pausedInvestments.length ? "Paused" : "No active accrual";

  return (
    <div className="space-y-4 md:space-y-5">
      {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</div>}

      <PageHeader
        eyebrow="Private client"
        title={`Good day, ${user.name?.split(" ")[0]}.`}
        description={`Your ${modeLabel.toLowerCase()} investment ecosystem is ready.`}
        action={
          <button onClick={() => navigate("/dashboard/kyc")} className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-2 text-xs font-bold capitalize ${user.kycStatus === "verified" ? "bg-emerald-100 text-emerald-800" : user.kycStatus === "pending" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${user.kycStatus === "verified" ? "bg-emerald-500" : user.kycStatus === "pending" ? "bg-amber-500" : "bg-red-500"}`} />
            KYC: {user.kycStatus}
          </button>
        }
      />

      <section className="relative overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-br from-[#0F172A] via-[#18243a] to-[#0F172A] p-5 text-white shadow-heritage md:p-6">
        <div className="hero-grid pointer-events-none absolute inset-0 opacity-[0.04]" />
        <div className="relative grid gap-5 lg:grid-cols-[1.15fr_1.6fr_auto] lg:items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold">Total portfolio value</p>
            <p className="display-title mt-2 text-4xl md:text-5xl">{money(total)}</p>
            <p className="mt-2 text-xs text-white/45">Your private wealth summary.</p>
          </div>
          <div className="grid grid-cols-3 gap-3 border-y border-white/10 py-4 lg:border-x lg:border-y-0 lg:px-6 lg:py-1">
            {[["Available balance", user.availableBalance], ["Locked balance", lockedBalance], ["Referral earnings", user.referralBalance]].map(([label, value]) => (
              <div key={label} className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/40">{label}</p>
                <p className="mt-1 truncate font-display text-lg font-bold md:text-xl">{money(value)}</p>
                {label === "Locked balance" && <p className="mt-1 flex items-center gap-1.5 text-[9px] text-white/40"><span className={`h-1.5 w-1.5 rounded-full ${liveInvestments.length ? "animate-pulse bg-emerald-400" : "bg-gold"}`} />{lockedStatus}</p>}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 lg:w-40 lg:grid-cols-1">
            <button onClick={() => navigate("/dashboard/deposit")} className="btn-primary min-h-11 px-4"><ArrowDownToLine size={16} /> Deposit Funds</button>
            <button onClick={() => navigate("/dashboard/withdraw")} className="btn-secondary min-h-11 border-white/15 px-4 text-white"><ArrowUpFromLine size={16} /> Withdraw Funds</button>
          </div>
        </div>
      </section>

      <section className="glass-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Investment mode</p><p className="mt-1 text-sm text-slate-500">Content is personalized to your selected ecosystem.</p></div>
        <select value={activeInvestmentMode} onChange={(event) => setActiveInvestmentMode(event.target.value)} className="field min-h-11 sm:w-44">
          {INVESTMENT_MODES.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
        </select>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div><p className="section-kicker">Plan activity</p><h2 className="display-title mt-1 text-2xl text-navy">Active {modeLabel} investments</h2></div>
          <button onClick={() => navigate("/dashboard/portfolio")} className="text-xs font-bold text-gold">View portfolio</button>
        </div>
        {activeInvestments.length ? <div className="grid gap-4 xl:grid-cols-2">{activeInvestments.map((investment) => <InvestmentCard key={investment.id} investment={investment} onDeposit={(item) => navigate(`/dashboard/deposit?investment=${item.id}&week=${(item.completedWeeks || 0) + 1}&amount=${item.capital || item.weeklyCapital}&asset=${item.ticker}`)} onDetails={() => navigate("/dashboard/portfolio")} />)}</div> : <div className="glass-card p-7 text-center"><Clock3 className="mx-auto text-gold" /><h3 className="display-title mt-3 text-xl text-navy">No active investments yet.</h3><button onClick={() => navigate("/dashboard/investments")} className="btn-primary mt-4">Explore Investment Opportunities</button></div>}
      </section>

      <section className="glass-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 p-5"><div><p className="section-kicker">Recent activity</p><h2 className="display-title mt-1 text-2xl text-navy">Transactions</h2></div><button onClick={() => navigate("/dashboard/transactions")} className="text-xs font-bold text-gold">View all</button></div>
        {transactions.length ? <div className="divide-y divide-slate-100">{transactions.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-4"><div className="min-w-0"><p className="truncate text-sm font-bold text-navy">{item.label}</p><p className="mt-1 text-xs text-slate-400">{dateTime(item.createdAt)}</p></div><div className="text-right"><p className="text-sm font-bold text-navy">{money(item.amount)}</p><StatusBadge status={item.status} /></div></div>)}</div> : <p className="p-6 text-sm text-slate-400">No transactions yet.</p>}
      </section>

      {announcement && <section className="flex items-start justify-between gap-4 rounded-2xl border border-gold/30 bg-gradient-to-r from-gold/10 to-white p-5"><div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold text-navy"><BellRing size={19} /></span><div><p className="font-display text-lg font-bold text-navy">{announcement.title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{announcement.message}</p></div></div><button onClick={() => setAnnouncement(null)} className="text-xs font-bold text-gold">Dismiss</button></section>}
    </div>
  );
}
